# 部署指南

覆盖从零搭建本地环境到微信小程序提审、H5 上线的完整流程。

## 1. 环境准备

| 工具 | 版本要求 | 用途 |
| --- | --- | --- |
| HBuilderX | 3.6 及以上（App 开发版） | 主开发工具，uniCloud 依赖它关联服务空间 |
| Node.js | 16 LTS 或 18 LTS | CLI 编译、`pnpm install` |
| pnpm | 7 及以上 | 依赖安装（仓库含 `pnpm-lock.yaml`） |
| 微信开发者工具 | 稳定版 1.06+ | 小程序预览、真机调试、上传代码 |
| uniCloud 服务空间 | 阿里云版 | 云函数、云数据库、云存储 |

> 未开通 uniCloud 时，`uniCloud.callFunction` 会直接报错，页面在 loading 后无数据。务必先完成第 4 步。

## 2. 获取代码与依赖

```bash
git clone https://github.com/lashawnaimbachmf-gif/onetwo-.git
cd onetwo-
pnpm install
```

仅用 HBuilderX 编译小程序时，可跳过 `pnpm install`——`uni_modules`（uni-popup、uni-transition、uni-scss、uni-config-center、uni-id-common）已随仓库提交。

## 3. 配置本地密钥

```bash
# 和风天气
cp config/keys.example.js config/keys.js
# 微信 AppSecret（方式 B 时使用；方式 A 走环境变量则跳过）
cp uniCloud-aliyun/cloudfunctions/wxLogin/config.example.js uniCloud-aliyun/cloudfunctions/wxLogin/config.local.js
cp uniCloud-aliyun/cloudfunctions/sendMessage/config.example.js uniCloud-aliyun/cloudfunctions/sendMessage/config.local.js
```

三个本地文件均已在 `.gitignore` 中，不会被提交。修改后建议执行一次校验：

```bash
git status --short        # 不应出现 keys.js / config.local.js
git check-ignore -v config/keys.js
```

## 4. 关联 uniCloud 服务空间

1. HBuilderX 打开项目根目录
2. 左侧 `uniCloud-aliyun` 目录右键 → **关联云服务空间或项目**
3. 选择已有空间，或点「新建」跳转 web 控制台创建阿里云免费版
4. 关联成功后目录名旁会出现空间标识

## 5. 部署云函数

在 `uniCloud-aliyun/cloudfunctions` 目录右键 → **上传所有云函数、公共模块及 Action**。

首次上传耗时较长（`wxLogin` 含 `axios` 依赖，约数百 KB）。若只改了单个函数，可右键该函数目录单独上传。

**必须上传的 13 个函数**：

```
addData  checkPairStatus  dataService  deleteData  getList
getWeather  initDatabase  inviteCode  sendMessage  updateData
verifyInviteCode  wxLogin  （initConfig 为空目录，无需上传）
```

**环境变量配置（推荐）**

uniCloud web 控制台 → 云函数 → 选择函数 → 环境变量：

| 变量名 | 作用函数 | 值 |
| --- | --- | --- |
| `WX_APP_ID` | `wxLogin` / `sendMessage` | 小程序 AppID |
| `WX_APP_SECRET` | `wxLogin` / `sendMessage` | 小程序 AppSecret |

> 阿里云版云函数环境变量在**修改后需重新上传或重启函数**才能生效。若不确定是否生效，可先看到日志中 `openid` 是否为真实值（而非 `openid_<hash>`）来判断。

## 6. 部署数据库

### 6.1 上传 Schema

`uniCloud-aliyun/database` 右键 → **上传所有 DB Schema**。

涉及 9 个集合：`users`、`invite_codes`、`anniversary`、`capsule`、`tree`、`leaf`、`dish`、`order`、`photo`。

### 6.2 创建 pair 集合

运行 `initDatabase` 云函数一次（右键 → 运行云函数）：

```js
{ code: 0, message: 'pair 集合创建成功' }
```

### 6.3 校验集合

在 uniCloud web 控制台 → 云数据库，确认至少存在：`users`、`invite_codes`、`anniversary`、`capsule`、`tree`、`dish`、`order`、`pair`。

`config` / `settings` 无需手动创建，前者在 `sendMessage` 读取失败时会自动回退到环境变量。

## 7. 运行项目

### 7.1 微信小程序

**HBuilderX**：`运行` → `运行到小程序模拟器` → `微信开发者工具`

首次运行需在 HBuilderX 设置中指定微信开发者工具安装路径。

**CLI**：

```bash
pnpm dev:mp-weixin
# 产物：unpackage/dist/dev/mp-weixin
# 微信开发者工具 → 导入项目 → 选择该目录
```

### 7.2 H5

```bash
pnpm dev:h5          # 开发
pnpm build:h5        # 生产，产物在 unpackage/dist/build/h5
```

H5 端调用 uniCloud 需在 uniCloud web 控制台 → **跨域配置 / 安全域名** 中添加部署域名，否则请求会被拦截。

## 8. 微信小程序后台配置

| 配置项 | 路径 | 说明 |
| --- | --- | --- |
| AppID | `manifest.json` → `mp-weixin.appid` | 换成自己的小程序 AppID |
| AppSecret | 云函数环境变量 `WX_APP_SECRET` | 微信公众平台 → 开发管理 → 开发设置 |
| 用户隐私保护指引 | 设置 → 服务内容声明 → 用户隐私保护指引 | 必须声明「位置信息」「麦克风」用途，否则 `getLocation` / 录音会被拒 |
| 服务器域名 | 开发管理 → 开发设置 → 服务器域名 | 加入 `https://devapi.qweather.com`、`https://geoapi.qweather.com`（request 合法域名） |
| 订阅消息模板 | 功能 → 订阅消息 | 选中「订单通知」类模板，将模板 ID 与 `sendMessage` 中保持一致 |

> `manifest.json` 已声明 `scope.userLocation`、`scope.record` 与 `requiredPrivateInfos: ["getLocation"]`。自 2022 年起，未在隐私协议中声明的位置/麦克风能力调用会被直接拦截，这是最常见的「真机白屏 + 天气一直定位中」原因。

## 9. 提审上线检查清单

- [ ] `manifest.json` 的 `appid` 已改为自己的小程序
- [ ] 云函数全部上传，`wxLogin` 能返回真实 `openid`（非 `openid_` 开头）
- [ ] 9 个 Schema 已上传，`pair` 集合已创建
- [ ] 天气 Key 已配置到 `config/keys.js`（或确认使用默认数据可接受）
- [ ] 小程序后台已添加 qweather 域名到 request 合法域名
- [ ] 隐私保护指引已声明位置、麦克风
- [ ] 订阅消息模板 ID 与 `sendMessage` 一致
- [ ] 真机验证：登录 → 生成邀请码 → 另一账号绑定 → 双方可见彼此数据
- [ ] 真机验证：创建胶囊 → 修改手机时间到开启时间后 → 可打开
- [ ] `git status` 无本地密钥文件
- [ ] 无 `console.log` 输出生产密钥或完整 openid

## 10. H5 部署

构建产物为纯静态文件，可直接托管：

```bash
pnpm build:h5
# 产物目录：unpackage/dist/build/h5
```

**GitHub Pages**：将产物推送到 `gh-pages` 分支，仓库 Settings → Pages 选择该分支。

**Vercel / Netlify**：构建命令 `pnpm build:h5`，输出目录 `unpackage/dist/build/h5`。

> H5 端登录依赖 `uni.login`，在浏览器中无法获取微信 code，`wxLogin` 会走降级 openid 分支。若需正式支持 H5，应接入 H5 版微信登录（公众号网页授权）。

## 11. 常见部署失败对照

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 所有列表为空，控制台 `uniCloud is not defined` | 未关联服务空间 | 执行第 4 步 |
| `cloud function not found` | 云函数未上传 | 重新上传全部云函数 |
| 天气一直显示「定位中」 | 未授权位置 / 未配置隐私协议 / 未配 Key | 见第 8 节 |
| 登录后 openid 为 `openid_xxx` | AppSecret 未生效 | 检查环境变量名称、重新上传函数 |
| `createCollection` 报权限错误 | 免费版空间限制 | 在控制台手动建集合 |
| 下单通知 `errcode: 43101` | 用户未授权订阅消息 | 前端需先 `requestSubscribeMessage` |

更多排查见 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)。
