# 架构说明

本文描述「恋爱小窝」的技术架构、数据流与关键机制。阅读前建议先看 [README](../README.md) 的功能与快速开始部分。

## 1. 总体架构

```text
┌─────────────────────────────────────────────────────────┐
│                      客户端（多端）                       │
│  微信小程序 (mp-weixin)          H5 (浏览器)              │
│  ─────────────────────────────────────────────           │
│  pages/*  ──  uni-app Vue2 单文件组件                     │
│     │                                                    │
│     ├── utils/UserManager     本地身份与伴侣信息           │
│     ├── utils/cloudData.js    dataService 封装            │
│     └── api/weather.js        和风天气 HTTP 直连           │
└──────────────┬──────────────────────────┬────────────────┘
               │ uniCloud.callFunction    │ uni.request
               ▼                          ▼
┌──────────────────────────────┐  ┌──────────────────────┐
│      uniCloud 阿里云          │  │  QWeather 开放平台    │
│  ┌────────────────────────┐  │  │  geoapi / devapi     │
│  │ cloudfunctions (13)    │  │  └──────────────────────┘
│  └───────────┬────────────┘  │
│              ▼               │
│  ┌────────────────────────┐  │
│  │ 云数据库  9+3 个集合     │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ 云存储（照片/语音）      │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**核心特征**：前端不直接访问数据库，全部通过云函数中转；只有天气数据由客户端直接请求第三方 HTTP 接口。

## 2. 分层职责

| 层 | 位置 | 职责 | 约束 |
| --- | --- | --- | --- |
| 视图层 | `pages/**/*.vue` | 页面渲染、交互、页面级状态 | 不直接 `uniCloud.database()` |
| 领域工具层 | `utils/` | 身份管理、云函数封装、上传、时间格式化 | 无 UI 依赖 |
| 接口层 | `api/` | HTTP 接口封装（仅天气在用） | — |
| 服务端 | `uniCloud-aliyun/cloudfunctions/` | 参数校验、数据库读写、第三方调用 | 统一返回 `{ code, message, data }` |
| 数据层 | `uniCloud-aliyun/database/` | 集合 Schema 与权限 | 见 [DATABASE.md](DATABASE.md) |

## 3. 关键数据流

### 3.1 登录

```text
pages/login.vue
  └─ uni.login() 取 code
      └─ wxLogin({ code, appid, userInfo })
          ├─ 有 AppSecret：jscode2session → 真实 openid
          └─ 无 AppSecret：md5(nickName + avatarUrl) → 稳定降级 openid
              └─ users 集合 upsert
                  └─ 返回 { token, openid, userInfo }
                      └─ UserManager.setToken / setOpenid / setUserInfo（本地 Storage）
```

`wxLogin` 生成的 token 形式为 `token_<Date.now()>_<随机串>`，仅作为本地「已登录」标记使用，服务端不校验。

### 3.2 配对绑定

仓库中存在**两条并存的配对实现**，这是历史迭代的产物：

**路径 A：`pair` 集合（邀请页与首页判断走这条）**

```text
首页 onLoad
  └─ checkPairStatus({ openid })
      ├─ pair 无记录 → 创建，返回 status=creator + inviteCode
      ├─ 当前用户在 user1/user2 → status=allowed
      └─ user2 已存在 → status=full（提示并退出小程序）

邀请页输入邀请码
  └─ verifyInviteCode({ openid, inviteCode })
      ├─ 校验 pair.inviteCode
      ├─ 已是成员 → allowed
      ├─ user2 已占用 → 邀请码已被使用
      └─ 写入 pair.user2
```

**路径 B：`invite_codes` + `users`（实际承担数据共享）**

```text
us 页「生成专属邀请码」
  └─ inviteCode({ action: 'create', userInfo })
       └─ 生成 6 位大写码，写入 invite_codes

us 页「输入对方邀请码」→ bind
  └─ inviteCode({ action: 'bind', code, userInfo })
      ├─ 标记邀请码 isUsed
      ├─ 写入一条 isReverse 反向记录
      └─ 双向更新 users：isBind / partnerOpenid / partnerInfo

各业务页 onShow
  └─ inviteCode({ action: 'checkReverse', userInfo })
       ├─ 优先查 users.isBind
       └─ 兼容旧数据查 invite_codes.isReverse
          └─ 命中则 UserManager.setPartnerInfo → 触发重新加载双人数据
```

> **技术债提示**：路径 A 与路径 B 使用不同集合、不同邀请码生成逻辑，未做统一。若后续重构，建议保留 `users` 中的双向绑定作为唯一事实来源，`pair` 集合仅用于准入控制。

### 3.3 业务数据读写

所有业务集合统一走 `dataService`：

```js
uniCloud.callFunction({
  name: 'dataService',
  data: {
    action: 'get',            // add | get | update | delete
    collection: 'anniversary',// anniversary | capsule | tree | dish | order（+ 其他）
    where: { creatorOpenid: ... },
    openids: ['A', 'B']       // 情侣双方 openid，服务端转 in 查询
  }
})
```

服务端按 `openids` 追加 `creatorOpenid in [...]` 条件，实现「双方共享、外人不可见」：

```js
if (openids && openids.length > 0) {
  query = query.where({ creatorOpenid: db.command.in(openids) })
}
```

**注意**：该过滤是客户端传入的，非服务端从登录态推导，不具备真正的安全边界（见 [TROUBLESHOOTING.md](TROUBLESHOOTING.md#安全相关)）。

### 3.4 天气

```text
首页 loadWeather()
  └─ getLocation()  uni.getLocation({ type: 'gcj02' })  → 失败回退北京
      └─ getCityName()  geoapi.qweather.com/v2/city/lookup  → 城市名
          └─ devapi.qweather.com/v7/weather/now          → 实况
              └─ getWeatherTips(temp, text)              → 建议文案
                  └─ getWeatherIcon(text)                → 本地图标
```

任一环节失败都回退到默认数据，保证首页不出现空白。

### 3.5 图片上传

```text
us 页「上传照片」
  └─ utils/upload.js uploadImage(filePath, 'images')
      └─ uniCloud.uploadFile
          └─ 返回 fileID → 写入 users.loveWallPhotos
```

## 4. 页面路由表

来自 `pages.json`，★ 为 tabBar 页面。

| 路径 | 名称 | 导航栏 |
| --- | --- | --- |
| `pages/login` | 登录 | 自定义 |
| `pages/login/complete-info` | 完善资料 | 自定义 |
| `pages/invite/index` | 邀请码配对 | 自定义 |
| `pages/home/index` ★ | 小窝 | `#fff0f5` / 黑字 |
| `pages/home/settings` | 设置（在一起的日子、纪念日管理） | `#fff0f5` |
| `pages/home/edit-anniversary` | 新增/编辑纪念日 | `#fff0f5` |
| `pages/home/anniversary-detail` | 纪念日详情 | `#fff0f5` |
| `pages/capsule/index` ★ | 时间胶囊列表 | `#ffffff` |
| `pages/capsule/create` | 创建胶囊 | `#fff0f5` |
| `pages/capsule/detail` | 胶囊详情 | `#fff0f5` |
| `pages/tree/index` ★ | 树洞列表 | `#f0f8f0` |
| `pages/tree/create` | 发布树洞 | `#f0f8f0` |
| `pages/tree/detail` | 树洞详情 | `#f0f8f0` |
| `pages/dining/index` ★ | 点餐（菜单/订单双 tab） | `#ff6b9d` / 白字 |
| `pages/dining/add-dish` | 上传新菜谱 | `#ff6b9d` |
| `pages/dining/edit-dish` | 编辑菜谱 | `#ff6b9d` |
| `pages/us/index` ★ | 我们 | `#fff0f5` |
| `pages/us/edit-info/index` | 编辑资料 | `#fff0f5` |

tabBar 选中色：`#ff6b9d`。

## 5. 状态管理

`store/index.js` 仅管理两份状态，并同步写入 Storage 以支持冷启动恢复：

| state | 持久化键 | 用途 |
| --- | --- | --- |
| `user` | `user` | 当前用户信息 |
| `cart` | `cart` | 点餐购物车 |

实际上多数页面直接使用 `utils/user.js` 的 `UserManager` 读写 Storage，Vuex 在业务中的使用较少。

### UserManager 接口

| 方法 | 说明 |
| --- | --- |
| `getUserInfo()` / `setUserInfo()` | 当前用户资料 |
| `getPartnerInfo()` / `setPartnerInfo()` | 伴侣资料 |
| `isBind()` / `unbind()` | 绑定状态读写 |
| `getOpenid()` / `setOpenid()` | 当前用户 openid |
| `getToken()` / `setToken()` | 登录标记 |
| `getCoupleOpenids()` | 返回 `[自己, 伴侣]` 的 openid 数组，供 `dataService` 过滤 |
| `isMyData(openid)` | 判断数据归属（用于列表区分「我 / TA」） |
| `getDisplayName()` / `getDisplayAvatar()` | 统一昵称头像展示，含匿名兜底 |
| `clearAll()` | 退出登录清理 |

## 6. 设计取舍

| 决策 | 理由 | 代价 |
| --- | --- | --- |
| 全部数据操作走云函数 | 避免前端拼 SQL、便于集中加逻辑 | 每次请求多一跳，冷启动有延迟 |
| `dataService` 单函数多 action | 减少云函数数量，降低部署成本 | 函数内分支多，单点故障面大 |
| Schema 权限全开 | 快速迭代，避免调试期权限阻塞 | 依赖客户端过滤，安全性弱 |
| 密钥抽离到本地配置 | 防止真实密钥进入版本库 | 新克隆需手动配置才能跑通 |
| 不提交 `unpackage/` | 构建产物可再生成，避免仓库膨胀 | 需本地编译后才能预览 |

## 7. 后续演进建议

1. 统一配对机制，废弃 `pair` 与 `invite_codes` 双写
2. 为 `pair`/`config`/`settings` 补充 Schema，收敛字段约束
3. 引入真正的鉴权：云函数内通过 `uni-id` 或自定义 token 校验，替代客户端传 openid
4. 拆分 `dataService`，按领域拆为 `anniversaryService`、`diningService` 等
5. 补齐 `getWeather` 云函数或直接删除，避免与前端 HTTP 直连逻辑重复
6. 重写 `utils/cloudData.js`，修复损坏的中文注释
