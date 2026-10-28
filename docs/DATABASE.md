# 数据库设计

数据存储于 **uniCloud 阿里云版云数据库**（MongoDB 兼容）。Schema 文件位于 `uniCloud-aliyun/database/`，上传后作用于云端集合。

## 1. 集合总览

| 集合 | Schema | 业务域 | 数据归属 |
| --- | --- | --- | --- |
| `users` | ✅ | 用户与配对 | 单用户一行 |
| `invite_codes` | ✅ | 邀请码 | 邀请码一行 |
| `anniversary` | ✅ | 纪念日 | 双人共享 |
| `capsule` | ✅ | 时间胶囊 | 双人共享 |
| `tree` | ✅ | 树洞 | 双人共享 |
| `leaf` | ✅ | 树洞叶子（备用） | 双人共享 |
| `dish` | ✅ | 菜谱 | 双人共享 |
| `order` | ✅ | 订单 | 双人共享 |
| `photo` | ✅ | 爱情墙照片（备用） | 双人共享 |
| `pair` | ❌ 无 | 配对准入控制 | 全局单条 |
| `config` | ❌ 无 | 微信配置（`doc('wxConfig')`） | 全局单条 |
| `settings` | ❌ 无 | `getWeather` 预留 | — |

> `pair` / `config` / `settings` 由云函数按需创建（`db.createCollection`）或直接写入，没有 Schema 约束。

## 2. 权限模型

`permission` 字段决定客户端（clientDB）直连时的读写权限；**云函数使用 admin 权限，不受此限制**。本项目业务读写全部经云函数，因此该配置的实际影响有限，但仍是安全基线：

| 集合 | read | create | update | delete |
| --- | --- | --- | --- | --- |
| `users` | ❌ | ❌ | ❌ | ❌ |
| `invite_codes` | ✅ | ✅ | ❌ | ❌ |
| 其余 7 个 | ✅ | ✅ | ✅ | ✅ |

`users` 全禁是正确选择（含 openid 等身份信息）；但 `anniversary`、`capsule`、`tree`、`order` 等开放读写意味着**任何持有 AppID 的客户端理论上可直连读取**，隔离完全依赖云函数内的 `openids` 过滤。若要对外运营，应改为：

```json
{
  "permission": {
    "read": "doc.creatorOpenid == auth.openid",
    "create": "auth.openid != null",
    "update": "doc.creatorOpenid == auth.openid",
    "delete": "doc.creatorOpenid == auth.openid"
  }
}
```

## 3. 集合详细结构

### 3.1 users

用户主表，同时承载配对关系与个性化字段。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `_id` | string | — | 系统生成 |
| `openid` | string | ✅ | 微信唯一标识；无 AppSecret 时为 `openid_<md5前16位>` |
| `nickName` | string | | 昵称 |
| `avatarUrl` | string | | 头像 |
| `createTime` | timestamp | | 创建时间 |
| `lastLoginTime` | timestamp | | 最后登录 |
| `partnerOpenid` | string | | 伴侣 openid |
| `partnerInfo` | object | | 伴侣资料快照 |
| `isBind` | bool | | 是否已绑定 |
| `bindTime` | timestamp | | 绑定时间 |

**代码使用但 Schema 未声明的字段**（建议补齐）：

| 字段 | 使用位置 | 说明 |
| --- | --- | --- |
| `togetherDate` | `pages/home/index.vue`、`pages/home/settings.vue`、`us/edit-info` | 「在一起」起始日期，缺省回退 `2023-03-22` |
| `loveWallPhotos` | `pages/us/index.vue` | 爱情墙照片 fileID 数组 |

> Schema 未声明的字段在 admin 权限下仍可写入，但缺少类型校验与文档说明，属于隐性契约。

### 3.2 invite_codes

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `code` | string | ✅ | 6 位大写邀请码 |
| `creatorOpenid` | string | ✅ | 创建者 |
| `creatorInfo` | object | | 创建者资料快照 |
| `createTime` | timestamp | | |
| `isUsed` | bool | | 是否已被使用 |
| `partnerOpenid` | string | | 使用者 openid |
| `partnerInfo` | object | | 使用者资料快照 |
| `bindTime` | timestamp | | 绑定时间 |
| `isReverse` | bool | | 代码写入但**未在 Schema 声明**；反向绑定标记 |

### 3.3 anniversary

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | ✅ | 纪念日名称 |
| `date` | string | ✅ | 日期字符串（`YYYY-MM-DD`） |
| `icon` | string | | 图标键：`birthday` / `couple` / `love` / `gift` / `rose` / `celebrate`，也兼容 emoji |
| `creatorOpenid` | string | ✅ | 创建者 |
| `creatorName` | string | | 创建者昵称 |
| `createTime` / `updateTime` | timestamp | | |

倒计时不落库，由前端 `getCountdown()` 实时计算。

### 3.4 capsule

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string | ✅ | 标题 |
| `type` | string | ✅ | `text` / `voice` / `image` |
| `content` | string | | 文字内容 |
| `voiceUrl` | string | | 语音 fileID |
| `imageUrl` | string | | 图片 fileID |
| `openTime` | string | | 开启时间 |
| `isOpened` | bool | | 是否已解封 |
| `color` | string | | 卡片主题色 |
| `creatorOpenid` / `creatorName` | string | | 创建者 |
| `createTime` | timestamp | | |

### 3.5 tree（树洞）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `content` | string | ✅ | 正文 |
| `tag` | string | | 标签文本 |
| `tagColor` | string | | 标签色值 |
| `anonymous` | bool | | 是否匿名展示 |
| `creatorOpenid` / `creatorName` | string | ✅ / | |
| `hugCount` | int | | 抱抱数 |
| `replyCount` | int | | 回复数 |
| `replies` | array | | 回复列表 |
| `createTime` | timestamp | | |

### 3.6 leaf（备用）

早期「吐槽」模型的遗留结构，字段为蛇形命名（`is_anonymous`、`hugs`、`create_time`），当前页面未使用。与 `tree` 语义重叠，可考虑归档。

### 3.7 dish（菜谱）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | ✅ | 菜品名 |
| `price` | int | ✅ | 价格，单位「熊熊币」（整数） |
| `img` | string | | 图片 fileID |
| `creatorOpenid` / `creatorName` | string | ✅ / | |
| `createTime` | timestamp | | |

### 3.8 order

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `goods` | array | ✅ | 商品快照数组，元素含 `name` / `price` / `count` |
| `total` | int | ✅ | 合计（熊熊币） |
| `status` | string | | 订单状态文案 |
| `creatorOpenid` / `creatorName` | string | ✅ / | 下单人 |
| `createTime` | timestamp | | |
| `remark` | string | | 备注 —— **代码写入但 Schema 未声明**，建议补充 |

### 3.9 photo（备用）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `url` | string | 图片地址 |
| `create_time` | timestamp | 创建时间 |

当前爱情墙照片实际存于 `users.loveWallPhotos` 数组，`photo` 集合未启用。

### 3.10 pair（无 Schema）

```json
{
  "_id": "auto",
  "user1": { "openid": "xxx", "createTime": 1690000000000 },
  "user2": { "openid": "yyy", "bindTime": 1690000000000 },
  "inviteCode": "A1B2C3",
  "createTime": 1690000000000
}
```

全局仅一条记录（`checkPairStatus` 用 `.limit(1)` 取第一条），用于限制只有两名用户可以进入。注意该设计与「多对情侣」场景不兼容。

## 4. 索引建议

当前 Schema 未声明索引。数据量增大后建议在 uniCloud 控制台补充：

| 集合 | 索引 | 理由 |
| --- | --- | --- |
| `users` | `openid`（唯一） | 登录、绑定、资料查询的高频条件 |
| `invite_codes` | `code`（唯一） | 邀请码校验 |
| `invite_codes` | `creatorOpenid + isUsed` | `checkReverse` 兼容查询 |
| `anniversary` / `capsule` / `tree` / `dish` / `order` | `creatorOpenid` | 双人数据过滤 |
| `anniversary` / `capsule` / `tree` / `dish` / `order` | `createTime`（降序） | `dataService` 默认按 `createTime` 倒序 |

## 5. 调试工具

`uniCloud-aliyun/database/JQL查询.jql` 是 HBuilderX 的 JQL 运行文件，可在 IDE 内直接对云数据库执行查询，**不受 Schema 权限限制**，仅用于本地调试。

示例：

```js
// 查看所有用户
db.collection('users').get();

// 查看某用户的纪念日
db.collection('anniversary').where({ creatorOpenid: 'oXXXX' }).orderBy('createTime', 'desc').get();
```

## 6. 数据初始化

首次部署后需要：

1. 上传全部 Schema（右键 database → 上传所有 DB Schema）
2. 运行 `initDatabase` 云函数，创建 `pair` 集合
3. 用任意业务操作触发一次 `dataService`，其内部会对白名单集合执行 `createCollection` 兜底
4. `config` 集合若无 `wxConfig` 文档，`sendMessage` 会回退到环境变量配置

`users`、`anniversary` 等集合无需预置数据，由业务流程自动写入。
