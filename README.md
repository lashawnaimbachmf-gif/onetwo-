# 恋爱小窝 · onetwo

> 一款面向情侣的微信小程序：记录纪念日、封存时间胶囊、匿名树洞、双人点餐与爱情墙。
> 基于 **uni-app (Vue 2)** + **uniCloud 阿里云** 构建，一套代码可编译到微信小程序与 H5。

---

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [密钥配置](#密钥配置)
- [目录结构](#目录结构)
- [数据模型](#数据模型)
- [云函数](#云函数)
- [文档索引](#文档索引)
- [已知限制](#已知限制)
- [许可证](#许可证)

---

## 项目简介

「恋爱小窝」是一个双人私密空间类小程序。两名用户通过**邀请码配对**建立绑定关系，绑定后共享纪念日、时间胶囊、树洞、菜谱与订单等数据。所有业务数据存放在 uniCloud 云端数据库中，客户端通过云函数读写。

项目定位为**个人/小范围使用**：`checkPairStatus` 云函数对配对名额做了限制，避免被无关用户占用。

## 功能特性

### 小窝（首页 `pages/home/index`）

- 「在一起第 N 天」实时天数计算，以 `users.togetherDate` 为基准
- 天气卡片：定位当前城市 → 和风天气实况 → 穿衣/带伞建议，支持点击查看详情弹窗
- 重要纪念日横向滚动列表，自动计算「N 天后 / 今天」
- 未登录时展示提示条，允许游客浏览，互动功能再引导登录

### 时间胶囊（`pages/capsule/*`）

- 支持**文字 / 语音 / 图片**三种内容形态
- 设定开启时间，到期前内容对双方不可见
- 胶囊详情页展示封面、剩余时间与解封状态

### 树洞（`pages/tree/*`）

- 匿名或实名发布心情内容，支持标签与标签配色
- 「抱抱」互动计数
- 详情页可回复，形成轻量留言板

### 点餐（`pages/dining/*`）

- 自定义菜谱：名称、价格（「熊熊币」）、图片
- 购物车加减，实时合计
- 提交订单（含备注），订单列表按创建者区分
- 下单后可触发微信订阅消息通知对方（`sendMessage`）

### 我们（`pages/us/index`）

- 个人与伴侣资料卡：封情书数量、累计吐槽次数
- 爱情墙照片上传（uniCloud 云存储）
- 邀请码：生成专属邀请码 / 输入对方邀请码完成绑定
- 入口：编辑信息、纪念日设置

## 技术栈

| 层次 | 选型 | 说明 |
| --- | --- | --- |
| 前端框架 | uni-app 2.0.2（Vue 2） | `manifest.json` 中 `vueVersion: "2"` |
| UI 组件 | uni-ui `^1.5.8`、uni-popup、uni-transition、uni-scss | uni_modules 内置 |
| 状态管理 | Vuex | `store/index.js`，用户与购物车持久化到 Storage |
| 后端 | uniCloud 阿里云版 | 云函数 + 云数据库 + 云存储 |
| 天气服务 | 和风天气（QWeather） | `geoapi.qweather.com` 城市查询 + `devapi.qweather.com` 实况 |
| 构建 | HBuilderX 或 @vue/cli-service 4.x | `vue.config.js` 关闭生产 sourcemap |

**运行环境要求**

- HBuilderX 3.x 及以上（推荐，uniCloud 需通过 HBuilderX 关联服务空间）
- Node.js 16+（若使用 CLI 方式编译）
- 微信开发者工具（预览/真机调试）
- 一个 uniCloud 阿里云服务空间

## 快速开始

### 1. 获取代码

```bash
git clone https://github.com/lashawnaimbachmf-gif/onetwo-.git
cd onetwo-
```

### 2. 安装依赖

项目同时存在 `package.json` 与 `pnpm-lock.yaml`，推荐使用 pnpm：

```bash
pnpm install
```

> 若仅使用 HBuilderX 编译小程序，`node_modules` 非必需；`uni_modules` 已被完整提交。

### 3. 配置密钥（必做）

仓库不包含任何真实密钥。首次运行前需按下节 [密钥配置](#密钥配置) 创建两个本地配置文件，否则天气接口不会返回真实数据、微信登录会退化为本地哈希方案。

### 4. 关联 uniCloud 服务空间

1. 用 HBuilderX 打开项目根目录
2. 右键 `uniCloud-aliyun` → **关联云服务空间或项目** → 选择/新建阿里云服务空间
3. 右键 `uniCloud-aliyun/cloudfunctions` → **上传所有云函数、公共模块及 Action**
4. 右键 `uniCloud-aliyun/database` → **上传所有 DB Schema**

首次使用还需创建 `pair` 集合，可运行云函数 `initDatabase`，或对任意集合发起一次 `dataService` 请求（内部会自动 `createCollection`）。

### 5. 运行

**HBuilderX 方式（推荐）**

- 微信小程序：`运行` → `运行到小程序模拟器` → `微信开发者工具`
- H5：`运行` → `运行到浏览器` → `Chrome`

**CLI 方式**

```bash
pnpm dev:mp-weixin    # 产物输出到 unpackage/dist/dev/mp-weixin
pnpm dev:h5
pnpm build:mp-weixin  # 生产构建
pnpm build:h5
```

CLI 产物需用微信开发者工具手动导入 `unpackage/dist/dev/mp-weixin`。

### 6. 微信小程序配置

`manifest.json` 中已声明：

| 配置项 | 值 |
| --- | --- |
| AppID | `wx6504ea4a7c468135`（请替换为自己的） |
| 位置权限 | `scope.userLocation` — 用于天气定位 |
| 录音权限 | `scope.record` — 用于录制语音情书 |
| 隐私接口 | `requiredPrivateInfos: ["getLocation"]` |

若使用自己的小程序，需同步修改 `manifest.json` 的 `mp-weixin.appid` 与 `project.config.json` 的 `appid`。

## 密钥配置

仓库通过 `.gitignore` 屏蔽三类本地配置，仅提交 `*.example.js` 模板。

### 和风天气 Key

```bash
cp config/keys.example.js config/keys.js
```

编辑 `config/keys.js`：

```js
export const WEATHER_KEY = '你的和风天气Key'
```

申请地址：<https://console.qweather.com/>

> 未配置时 `api/weather.js` 会在控制台输出警告，天气卡片回退到内置默认值，不影响其他功能。

### 微信小程序 AppSecret

云函数 `wxLogin` 与 `sendMessage` 需要 AppSecret。**两种方式任选其一，优先推荐环境变量**：

**方式 A：云函数环境变量（推荐，密钥不落盘）**

在 uniCloud 控制台为 `wxLogin`、`sendMessage` 配置：

| 变量名 | 说明 |
| --- | --- |
| `WX_APP_ID` | 小程序 AppID |
| `WX_APP_SECRET` | 小程序 AppSecret |

**方式 B：本地配置文件**

```bash
cp uniCloud-aliyun/cloudfunctions/wxLogin/config.example.js uniCloud-aliyun/cloudfunctions/wxLogin/config.local.js
cp uniCloud-aliyun/cloudfunctions/sendMessage/config.example.js uniCloud-aliyun/cloudfunctions/sendMessage/config.local.js
```

填入 `appId` / `appSecret` 后，随云函数一起上传即可。

> `config.local.js` 被 `.gitignore` 忽略；`.example.js` 模板需要提交。

### 密钥泄露后的处置

如果曾将真实密钥提交到公开仓库，**仅删除文件不足以消除风险**，必须：

1. 到微信公众平台**重置 AppSecret**
2. 到和风天气控制台**删除并新建 Key**
3. 如需清理历史，使用 `git filter-repo` 重写提交记录后强制推送

## 目录结构

```text
onetwo/
├── api/                          # 接口层
│   ├── baseUrl.js                #   HTTP 基址（点餐模板遗留，当前未使用）
│   ├── request.js                #   uniCloud.callFunction 封装（request/getList/addData...）
│   ├── weather.js                #   和风天气：定位、城市查询、实况、建议文案
│   ├── user.js / category.js     #   点餐模板遗留模块，页面未引用
│   └── product.js
├── config/
│   ├── keys.example.js           # 天气 Key 模板（提交）
│   └── keys.js                   # 真实 Key（忽略，不入库）
├── pages/
│   ├── login.vue                 # 登录页（自定义导航）
│   ├── login/complete-info.vue   # 完善资料
│   ├── invite/index.vue          # 邀请码配对
│   ├── home/                     # 小窝：首页、设置、纪念日增改与详情
│   ├── capsule/                  # 时间胶囊：列表、创建、详情
│   ├── tree/                     # 树洞：列表、发布、详情
│   ├── dining/                   # 点餐：菜单/订单、新增菜品、编辑菜品
│   └── us/                       # 我们：资料主页、编辑信息
├── store/index.js                # Vuex：user / cart
├── utils/
│   ├── user.js                   # UserManager：openid、token、伴侣信息、双人 openid
│   ├── cloudData.js              # dataService 云函数封装（按业务域组织）
│   ├── upload.js                 # 图片上传至 uniCloud 云存储
│   ├── timeFormat.js             # 时间格式化
│   └── auth.js                   # 登录守卫 checkLogin()
├── static/                       # 图标、tabbar、插画资源
├── uniCloud-aliyun/
│   ├── cloudfunctions/           # 13 个云函数（详见 docs/CLOUD_FUNCTIONS.md）
│   └── database/                 # 9 个集合 Schema + JQL 示例
├── uni_modules/                  # uni-popup / uni-transition / uni-scss / uni-config-center / uni-id-common
├── App.vue / main.js / pages.json / manifest.json
└── vue.config.js
```

## 数据模型

9 个集合已在 `uniCloud-aliyun/database/` 定义 Schema；代码中另有 `pair`、`config`、`settings` 三个集合无 Schema 文件（动态创建）。

| 集合 | 用途 | 关键字段 |
| --- | --- | --- |
| `users` | 用户与配对关系 | `openid`、`nickName`、`partnerOpenid`、`togetherDate` |
| `invite_codes` | 邀请码 | `code`、`creatorOpenid`、`isUsed`、`partnerOpenid` |
| `anniversary` | 纪念日 | `name`、`date`、`icon`、`creatorOpenid` |
| `capsule` | 时间胶囊 | `title`、`type`(text/voice/image)、`openTime`、`isOpened` |
| `tree` | 树洞 | `content`、`tag`、`anonymous`、`hugCount` |
| `leaf` | 树洞叶子（备用） | `content`、`mood`、`hugs`、`replies` |
| `dish` | 菜谱 | `name`、`price`、`img` |
| `order` | 订单 | `goods[]`、`total`、`status`、`remark` |
| `photo` | 爱情墙照片 | `url`、`create_time` |
| `pair` | 配对关系（无 Schema） | `user1`、`user2`、`inviteCode` |

字段级说明见 [docs/DATABASE.md](docs/DATABASE.md)。

## 云函数

| 云函数 | 调用方 | 作用 |
| --- | --- | --- |
| `dataService` | 主业务（12 处） | 聚合 CRUD：`add` / `get` / `update` / `delete`，集合白名单 + `openids` 情侣数据过滤 |
| `inviteCode` | 邀请页、首页 | 邀请码 `create` / `check` / `checkReverse` |
| `checkPairStatus` | 首页 | 查询或创建 `pair` 记录，返回 `creator` / `allowed` / `full` |
| `verifyInviteCode` | 邀请页 | 校验邀请码并将当前用户绑定为 `user2` |
| `wxLogin` | 登录页 | `code` 换 `openid`，落库 `users` 并返回 token |
| `sendMessage` | 点餐页 | 微信订阅消息：`sendOrderNotification` |
| `getList` / `addData` / `updateData` / `deleteData` | 备用 | 单表 CRUD（蛇形 `create_time`） |
| `getWeather` | 备用 | 返回固定天气数据（占位实现） |
| `initDatabase` | 手动 | 创建 `pair` 集合 |

入参、出参与错误码见 [docs/CLOUD_FUNCTIONS.md](docs/CLOUD_FUNCTIONS.md)。

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 技术架构、数据流、鉴权与配对机制、页面路由表 |
| [docs/DATABASE.md](docs/DATABASE.md) | 集合结构、字段语义、权限策略、索引建议 |
| [docs/CLOUD_FUNCTIONS.md](docs/CLOUD_FUNCTIONS.md) | 云函数接口契约与调用示例 |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 环境搭建、云函数部署、小程序上线清单、H5 部署 |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | 常见报错排查与仓库已知问题 |

## 已知限制

作为个人项目，以下问题在文档中如实记录，供后续迭代参考：

1. **`getWeather` 云函数为占位实现**，返回写死的天气数据；前端实际调用的是和风天气 HTTP 接口，两者逻辑重复。
2. **数据权限全部放开**：除 `users` 外，Schema 的 `read/create/update/delete` 均为 `true`，隔离依赖客户端传入的 `openid` 过滤，不适合规模化的公开运营场景。
3. **登录态为自定义 token**（`token_<时间戳>_<随机串>`），无服务端校验与过期机制；`utils/auth.js` 的守卫仅检查本地 Storage。
4. **`utils/cloudData.js` 中文注释编码已损坏**（UTF-8 文件内含乱码字符），逻辑不受影响但可读性差，建议后续重写该文件注释。
5. **模板残留**：`pages/{address,admin,index,order,product,test,user}` 为空目录；`api/{user,category,product}.js` 与 `api/baseUrl.js` 未被任何页面引用。
6. **`pair`、`config`、`settings` 集合缺少 Schema 文件**，字段约束只能在代码层保证。
7. `initConfig` 为空目录（无 `index.js`），不会随 git 提交。

## 许可证

本仓库未附开源许可证，默认保留所有权利。如需开放协作，可补充 `LICENSE`（如 MIT）。

---

**致谢**：uni-app / uniCloud 生态、和风天气开放平台。
