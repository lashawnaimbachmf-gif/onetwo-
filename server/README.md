# 自建后端（替代 uniCloud）

把原来跑在 uniCloud 上的 13 个云函数移植成普通 Node 服务，可以部署到任意一台自己的服务器。

## 为什么需要这一层

`uniCloud-aliyun/cloudfunctions/` 只是云函数源码，运行它的 Node 运行时、MongoDB、文件存储都由 DCloud 的服务空间提供，无法直接搬到自己的 ECS 上跑。官方唯一的「零改代码」私有化方案是 [uniCloud 软件版](https://doc.dcloud.net.cn/uniCloud/software/)，面向企业销售、仅支持 Linux + MongoDB 4.0，个人项目不划算。

所以这里做的是：**后端重写为普通 Node 服务，前端通过一个同签名的适配层继续调用**。

## 目录结构

```text
server/
├── app.js                 # HTTP 入口：/fn/:name 云函数路由、/upload、/uploads 静态
├── config.js              # 环境变量读取（自带极简 .env 解析）
├── .env.example           # 配置模板
├── lib/
│   ├── db/
│   │   ├── index.js       # uniCloud.database() 兼容层（collection/where/orderBy/doc/add...）
│   │   ├── mongo-driver.js# 生产：MongoDB
│   │   └── file-driver.js # 本地：JSON 文件存储，免装 MongoDB
│   ├── ids.js             # 24 位十六进制 _id
│   └── upload.js          # multer 磁盘存储
├── functions/             # 12 个接口实现，从云函数近乎原样移植
└── test/smoke.js          # 冒烟测试（36 项断言）
```

## 本地运行

```bash
cd server
npm install
cp .env.example .env      # 可选；不配也能跑
npm start                 # 默认 http://127.0.0.1:3000
```

不配 `MONGO_URL` 时数据写在 `server/data/*.json`，适合先把项目跑起来看看效果。要接数据库就装 MongoDB 并设置 `MONGO_URL=mongodb://127.0.0.1:27017`。

自测：

```bash
npm run smoke
```

## 接口

和 `uniCloud.callFunction({ name, data })` 一一对应，返回 `{ "result": { code, message, data } }`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/fn/dataService` | 主业务聚合 CRUD（add/get/update/delete） |
| POST | `/fn/checkPairStatus` | 查询或创建配对记录 |
| POST | `/fn/verifyInviteCode` | 校验邀请码并绑定 |
| POST | `/fn/inviteCode` | 邀请码 create/check/bind/checkReverse |
| POST | `/fn/wxLogin` | code 换 openid 并落库 |
| POST | `/fn/sendMessage` | 微信订阅消息 |
| POST | `/fn/getList` `/fn/addData` `/fn/updateData` `/fn/deleteData` | 备用单表 CRUD |
| POST | `/fn/getWeather` | 占位天气 |
| POST | `/fn/initDatabase` | 建集合 |
| POST | `/upload?cloudPath=images` | 上传文件，返回 `{ fileID, url }` |
| GET | `/uploads/<fileID>` | 文件访问 |
| GET | `/health` | 健康检查 + 当前存储类型 |

`GET /fn/getWeather` 也可以直接访问，方便浏览器调试。

## 配置项

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | 3000 | 监听端口 |
| `HOST` | 0.0.0.0 | 生产建议 `127.0.0.1`，只让 Nginx 访问 |
| `MONGO_URL` | 空 | 留空则用 JSON 文件存储 |
| `MONGO_DB` | onetwo | 数据库名 |
| `DATA_DIR` | `server/data` | 文件存储目录 |
| `UPLOAD_DIR` | `server/uploads` | 上传目录 |
| `PUBLIC_BASE` | 空 | 对外域名，用于拼图片绝对地址；留空则用请求头推断 |
| `WX_APP_ID` / `WX_APP_SECRET` | 空 | 不配 Secret 时登录走 `openid_` 哈希降级 |
| `WX_TEMPLATE_ID` | 内置 | 订阅消息模板 |
| `MAX_UPLOAD_MB` | 20 | 单文件上限 |

## 数据模型

沿用原集合：`users`、`invite_codes`、`anniversary`、`capsule`、`tree`、`leaf`、`dish`、`order`、`photo`、`pair`、`config`。字段语义不变，`_id` 仍是 24 位十六进制字符串，与 uniCloud 导出的数据兼容，可以直接 `mongoimport`。

## 已知限制（与原项目一致）

1. **接口没有服务端鉴权**：原项目 token 就是 `token_<时间戳>_<随机串>`，服务端从不校验，数据隔离靠客户端传的 `openid`。自建后端保持了同样的语义，因此**不适合直接公网开放**。自己两个人用可以，想公开运营需要补 JWT + 服务端取 openid。
2. `getWeather` 仍是占位数据，前端实际走和风天气 HTTP 接口。
3. 上传文件存本机磁盘，记得配合 ECS 快照或定期备份；图片多了再换 OSS。
