# 排错与已知问题

本文分为两部分：**运行时排查**（环境/网络/权限）和**仓库已知问题**（代码层面的事实记录）。已知问题均为代码审阅结论，未经额外验证的部分会明确标注。

---

## 一、运行时排查

### 1. 页面无数据 / 列表一直为空

按顺序确认：

1. **是否关联了 uniCloud 服务空间** —— 未关联时 `uniCloud.callFunction` 会抛 `uniCloud is not defined` 或 `cloud function not found`
2. **云函数是否上传** —— 右键 `cloudfunctions` → 上传所有云函数
3. **集合是否创建** —— 云数据库里是否能看到对应集合
4. **是否已配对** —— 未绑定伴侣时 `UserManager.getCoupleOpenids()` 只返回自己，`dataService` 过滤后本应只看到自己的数据；若一条都没有，说明 `creatorOpenid` 写入时为空

排查手段：HBuilderX 控制台 → 云函数日志，查看 `dataService` 的返回。

### 2. 天气卡片停在「加载中 / 定位中」

| 检查项 | 说明 |
| --- | --- |
| `getLocation` 是否授权 | 首次进入应弹权限框；拒绝后不再弹，需到设置里手动开启 |
| 隐私保护指引 | 微信 2022 年后要求声明「位置信息」，未声明时接口直接失败且**不弹权限框** |
| `config/keys.js` 是否存在 | 缺失时控制台有 `[weather] 未配置 WEATHER_KEY` 警告，数据回退默认值 |
| 和风天气 Key 是否有效 | 免费版有每日调用上限；Key 失效时 `devapi` 返回 `code: "401"` |
| 开发者工具定位 | 工具内定位可能返回默认坐标，建议真机验证 |

即使全部失败，`getWeather()` 也会返回内置默认值（26° 晴转多云 北京），因此「显示北京天气」通常意味着**定位或 Key 出了问题**，而非渲染问题。

### 3. 登录后 openid 是 `openid_` 开头

说明 `wxLogin` 走了降级分支（未取到 AppSecret）。检查：

- 云函数环境变量名是否为 `WX_APP_SECRET`（不是 `APPSECRET`）
- 修改环境变量后是否**重新部署/重启**了云函数
- `config.local.js` 是否随云函数一起上传（该文件被 git 忽略，但 uniCloud 上传不依赖 git）

降级 openid 的后果：同一微信用户换手机、改昵称或头像后会得到不同 openid，历史数据「丢失」。

### 4. 邀请码绑不上

| 返回 | 原因 |
| --- | --- |
| `邀请码错误` | 码输错，或 `pair` 集合里没有该码（两套邀请码机制不互通，见下文） |
| `邀请码已被使用` | `pair.user2` 已占用，全局只能有两名用户 |
| `不能绑定自己` | 用了自己生成的码 |
| `此小程序仅限特定用户使用` | 名额已满 |

### 5. 编译报错 `Cannot find module '../config/keys.js'`

密钥抽离后新增的依赖。执行：

```bash
cp config/keys.example.js config/keys.js
```

### 6. `unpackage` 里的路径指向旧目录

`unpackage/dist/**` 是构建产物，内含源码绝对路径的 webpack 注释。仓库已忽略该目录，无需处理；若本地残留旧产物，删除后重新编译即可。

---

## 二、仓库已知问题

以下为代码审阅时确认的问题，**尚未修改**，如实记录以便后续迭代。

### 逻辑问题

#### 1. 「名额已满」分支不可达

`pages/home/index.vue` 的 `checkPairStatus` 处理逻辑：

```js
if (result.code === 0) {
  if (result.status === 'creator' || result.status === 'needInvite') { ... }
  else if (result.status === 'full') { uni.showModal(...); uni.exitMiniProgram() }
}
```

但 `checkPairStatus` 在 `status: 'full'` 时返回的是 `{ code: -1, status: 'full' }`。由于 `code !== 0`，**外层判断直接跳过，`full` 分支永远不会执行**。

影响：第三名用户进入小程序时不会有任何提示，只是停留在首页且无数据。

修复方向（二选一）：

```js
// 方案 A：云函数端把 full 也返回 code: 0
return { code: 0, status: 'full', message: '名额已满' }

// 方案 B：前端先判断 code，再判断 status
const r = res.result
if (r.status === 'full') { uni.showModal(...) }
else if (r.code === 0) { ... }
```

#### 2. 两套配对待遇不一致

`checkPairStatus` / `verifyInviteCode` 使用 `pair` 集合，而 `inviteCode` 的 `create` / `bind` 使用 `invite_codes` 集合。两套邀请码互不识别：

- 邀请页（`pages/invite/index`）走 `pair` 体系
- 「我们」页的邀请码走 `invite_codes` 体系

用户如果在一处生成码、另一处输入，会得到「邀请码错误」。实际数据共享最终依赖 `inviteCode.bind` 写入 `users.partnerOpenid`。

#### 3. `sendMessage` 读取数据库配置的分支存在缺陷

```js
const configRes = await db.collection('config').doc('wxConfig').get()
if (configRes.data && configRes.data.length > 0) {
  const config = configRes.data[0]   // ← doc().get() 返回的是单对象，不是数组
  if (config.appId && config.appSecret) { ... }
}
```

`doc(id).get()` 的 `data` 是对象数组（uniCloud 中通常为数组），但文档主键为 `wxConfig` 时若该文档不存在会抛异常并进入 `catch`，随后回退到环境变量。实际影响：**数据库配置基本不会生效**，必须用环境变量或 `config.local.js`。此处未做真机验证，仅从代码路径推断。

### 安全相关

#### 4. 数据隔离依赖客户端传参

`dataService` 的 `openids` 由前端传入：

```js
// utils/cloudData.js
async getAnniversaries(openids) {
  return this.callDataService('get', 'anniversary', { openids })
}
```

服务端直接信任该数组，未与登录态比对。任何能调用云函数的客户端都可以构造任意 `openids` 读取他人数据。

#### 5. Schema 权限过宽

除 `users` 外，所有集合 `read/create/update/delete` 均为 `true`。虽有云函数中转，但 clientDB 直连通道未关闭。

#### 6. 自定义 token 无校验

`token` 仅存储于本地 Storage，云函数不校验。清空 Storage 或手动写入任意 `openid` 即可「以他人身份」操作。

### 代码质量

#### 7. `utils/cloudData.js` 中文注释编码损坏

文件为 UTF-8 编码，但中文注释内容已是乱码（形如 `�ƶ����ݹ���������`），含 U+FFFD 替换字符，**不可逆还原**。代码逻辑（ASCII 部分）完全正常，仅可读性受损。建议重写该文件注释。

#### 8. 模板遗留文件

| 路径 | 状态 |
| --- | --- |
| `pages/{address,admin,index,order,product,test,user}/` | 空目录，不会随 git 提交 |
| `api/{user,category,product}.js` | 未被任何页面 import |
| `api/baseUrl.js` | 定义 `http://localhost:8080`，未被使用 |
| `uniCloud-aliyun/cloudfunctions/initConfig/` | 空目录，无 `index.js` |
| `uniCloud-aliyun/database/{leaf,photo}.schema.json` | 集合未被业务使用 |

#### 9. 字段与 Schema 不一致

| 集合 | 代码使用字段 | Schema 声明 |
| --- | --- | --- |
| `users` | `togetherDate`、`loveWallPhotos` | ❌ |
| `order` | `remark` | ❌ |
| `invite_codes` | `isReverse` | ❌ |

admin 权限下可写入，但缺少类型校验，且新接手的开发者无法从 Schema 得知这些字段存在。

#### 10. 历史遗留的项目元信息

- `package.json` 的 `name` 为 `dian-can-uniapp`、`displayName` 为「点餐程序」——项目已从「点餐」演进为「情侣空间」，元信息未同步
- `manifest.json` 的 `name` 已是「恋爱小窝」，但 `appid` `wx6504ea4a7c468135` 若为他人小程序，需替换

### 密钥处理说明

本次提交前已将两处硬编码密钥抽离为本地配置文件：

| 原位置 | 现值来源 |
| --- | --- |
| `api/weather.js` | `config/keys.js`（模板 `keys.example.js`） |
| `wxLogin/index.js` | `process.env.WX_APP_SECRET` → `config.local.js` |
| `sendMessage/index.js` | `config` 集合 → 环境变量 → `config.local.js` |

> **若这些密钥曾经出现在公开仓库**，仅删除文件不足以止损，必须在微信公众平台重置 AppSecret、在和风天气控制台重建 Key。本仓库为私有仓库，首次提交即不包含明文密钥。

---

## 三、如何重置本地配置

误删或换机后重新配置：

```bash
# 天气
cp config/keys.example.js config/keys.js
# 云函数（若不用环境变量）
cp uniCloud-aliyun/cloudfunctions/wxLogin/config.example.js \
   uniCloud-aliyun/cloudfunctions/wxLogin/config.local.js
cp uniCloud-aliyun/cloudfunctions/sendMessage/config.example.js \
   uniCloud-aliyun/cloudfunctions/sendMessage/config.local.js
```

填入真实值后重新上传 `wxLogin`、`sendMessage` 两个云函数。

## 四、报告问题

提交 Issue 时请附上：

1. 运行端（微信小程序 / H5 / 开发者工具版本）
2. 复现步骤与预期结果
3. HBuilderX 控制台报错截图或云函数日志
4. 是否已按 [DEPLOYMENT.md](DEPLOYMENT.md) 完成云函数与 Schema 部署

**请勿在 Issue 中贴出 AppSecret、天气 Key 或完整 openid。**
