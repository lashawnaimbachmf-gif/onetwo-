# 云函数接口说明

目录：`uniCloud-aliyun/cloudfunctions/`

## 约定

- 统一通过 `uniCloud.callFunction({ name, data })` 调用
- 返回结构：

```ts
{
  code: 0 | -1,       // 0 成功，-1 失败
  message?: string,   // 提示文案
  data?: any          // 业务数据
}
```

- `code === -1` 时前端应提示 `message`
- 时间字段存在**两种风格**：`dataService` 用驼峰 `createTime` / `updateTime`；`addData` / `getList` / `updateData` / `deleteData` 用蛇形 `create_time` / `update_time`

---

## 1. dataService

主业务聚合接口，承载了前端 12 处调用。

**入参**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `action` | string | ✅ | `add` / `get` / `update` / `delete` |
| `collection` | string | ✅ | 集合名，见白名单 |
| `data` | object | add/update 必填 | 写入或更新的字段 |
| `id` | string | update/delete 按 id 操作时必填 | 记录 `_id` |
| `where` | object | 可选 | 查询/更新条件 |
| `openids` | string[] | 可选 | 情侣双方 openid，服务端转为 `creatorOpenid in [...]` |

**集合白名单**：`anniversary`、`capsule`、`tree`、`dish`、`order`；其他名称原样透传（如 `users`）。

**action: add**

```js
{ action: 'add', collection: 'anniversary', data: { name: '周年', date: '2026-10-29', creatorOpenid: 'oXxx' } }
// → { code: 0, message: '添加成功', data: { ...完整记录 } }
```

服务端自动补 `createTime: Date.now()`，返回插入后的完整文档。

**action: get**

```js
// 按 id
{ action: 'get', collection: 'capsule', id: '64f...' }
// 按条件 + 双人过滤
{ action: 'get', collection: 'anniversary', openids: ['oA', 'oB'] }
```

结果按 `createTime` 降序。`where` 与 `openids` 可叠加。

**action: update**

```js
{ action: 'update', collection: 'tree', id: '64f...', data: { hugCount: 3 } }
// → { code: 0, message: '更新成功' }
```

自动剔除 `data._id` / `data.id` 并补 `updateTime`。也支持 `where` 批量更新，返回 `data.updated` 计数。

**action: delete**

```js
{ action: 'delete', collection: 'dish', id: '64f...' }
// → { code: 0, message: '删除成功' }
```

**注意**：每次调用都会尝试 `db.createCollection(collectionName)`（已存在则忽略），方便首次部署自动建表，但会带来一次多余的 RTT。

---

## 2. checkPairStatus

查询或建立配对准入记录，全局仅一条 `pair` 文档。

**入参**：`{ openid: string }`（必填）

**返回分支**

| 场景 | code | status | 其他字段 |
| --- | --- | --- | --- |
| 无配对记录 → 创建，当前用户为 `user1` | 0 | `creator` | `inviteCode`（6 位）、`message` |
| 当前用户已是 `user1`/`user2` | 0 | `allowed` | `pairId` |
| `user1`、`user2` 均已存在 | **-1** | `full` | `message` |
| 已有 1 人，等待对方输入邀请码 | 0 | `needInvite` | `pairId` |

邀请码字符集：`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`（排除易混淆的 I/O/0/1）。

> ⚠️ `status: 'full'` 时 `code` 为 `-1`，而调用方（`pages/home/index.vue`）仅在 `code === 0` 内判断 `status`，导致「名额已满」分支实际不会触发。详见 [TROUBLESHOOTING.md](TROUBLESHOOTING.md#已知逻辑问题)。

---

## 3. verifyInviteCode

校验 `pair.inviteCode` 并绑定当前用户为 `user2`。

**入参**

| 字段 | 类型 | 必填 |
| --- | --- | --- |
| `openid` | string | ✅ |
| `inviteCode` | string | ✅ |

**返回**

| 场景 | code | 说明 |
| --- | --- | --- |
| 绑定成功 | 0 | `status: 'allowed'` |
| 当前用户已是成员 | 0 | `status: 'allowed'`，幂等 |
| 邀请码不存在 | -1 | `邀请码错误` |
| `user2` 已占用 | -1 | `邀请码已被使用` |
| 缺参 | -1 | `缺少参数` |

---

## 4. inviteCode

基于 `invite_codes` 集合的邀请码生命周期管理，并承担**双人数据绑定关系**的写入。

**入参**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `action` | string | ✅ | `create` / `check` / `bind` / `checkReverse` |
| `code` | string | check/bind 必填 | 邀请码 |
| `userInfo` | object | ✅ | 至少含 `openid`，建议带 `nickName` / `avatarUrl` |

**action: create**

```js
{ action: 'create', userInfo: { openid: 'oA', nickName: '小A' } }
// → { code: 0, message: '生成成功', data: { code: 'K7M2QP' } }
```

生成 6 位大写码（`Math.random().toString(36)` 截取），写入 `invite_codes`，`isUsed: false`。

**action: check**

返回 `data: { creatorInfo, creatorOpenid }`；邀请码不存在/已使用返回 `code: -1`；不能校验自己的码。

**action: bind**

绑定流程（一个事务内完成 4 次写入，无原子性保证）：

1. 校验码可用、非本人
2. 原记录置 `isUsed: true` + `partnerOpenid/partnerInfo/bindTime`
3. 新增一条 `isReverse: true` 的反向记录（让对方也能查到自己）
4. 双向更新 `users`：`isBind`、`partnerOpenid`、`partnerInfo`、`bindTime`

返回 `data: { partnerInfo, partnerOpenid }`。

**action: checkReverse**

用于「对方绑定了我」的自动识别，被 5 个页面在 `onShow` 时调用。

- 优先查 `users`：`{ openid, isBind: true }` → 取 `partnerInfo`
- 兼容旧数据查 `invite_codes`：`{ creatorOpenid, isUsed: true, isReverse: true }`
- 均未命中返回 `data: { hasBind: false }`

---

## 5. wxLogin

微信登录，`code` 换 `openid`，落库并返回 token。

**入参**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `code` | string | ✅ | `uni.login()` 返回的 code |
| `appid` | string | 推荐 | 小程序 AppID；缺省读 `context.APPID` |
| `userInfo` | object | ✅ | `nickName`、`avatarUrl` |

**AppSecret 解析顺序**：`process.env.WX_APP_SECRET` → `./config.local.js` 的 `appSecret` → 空

**降级策略**：无 AppSecret 时不调用微信接口，改用 `md5(nickName + '_' + avatarUrl)` 前 16 位生成 `openid_<hash>`，保证同一用户多次登录得到相同 openid（仅适合开发自测，无法跨设备识别真实用户）。

**返回**

```js
{ code: 0, message: '登录成功', data: { token, openid, userInfo } }
```

token 形如 `token_1690000000000_ab12cd`，服务端不校验。

---

## 6. sendMessage

微信订阅消息推送，目前仅一个场景：下单通知。

**入参**

```js
{
  action: 'sendOrderNotification',
  data: {
    orderId: '64f...',
    receiverOpenid: 'oB',      // 必填，为空直接返回 -1
    creatorName: '小A',
    goodsList: [ ... ],
    total: 52,
    remark: '少辣',
    createTime: 1690000000000
  }
}
```

**内部流程**

1. `getWxConfig()`：优先读 `config` 集合 `doc('wxConfig')` → 否则读 `process.env.WX_APP_ID/WX_APP_SECRET` → 否则 `config.local.js`
2. `getAccessToken()`：`cgi-bin/token`
3. `subscribe/send`：组装模板数据并发送，订单号取 `orderId` 后 8 位大写

**返回**

| 场景 | code | message |
| --- | --- | --- |
| 发送成功（`errcode === 0`） | 0 | `消息发送成功` |
| 接收者为空 | -1 | `接收者openid不能为空` |
| 取 token 失败 | -1 | `获取access_token失败，请检查 AppID 和 AppSecret 配置` |
| 微信返回错误 | -1 | `微信错误: <errmsg>` |

> 订阅消息需要用户在小程序内**主动授权**对应模板，且模板 ID 需与代码中一致，否则会返回 `errcode: 43101`。

---

## 7. 单表 CRUD（备用）

四个通用云函数，当前前端**未调用**，保留作为简化版接口。

| 云函数 | 入参 | 成功返回 |
| --- | --- | --- |
| `getList` | `{ collection, where? }` | `{ code: 0, data: [...] }` |
| `addData` | `{ collection, data }` | `{ code: 0, data: { id } }`，自动写 `create_time` |
| `updateData` | `{ collection, id, data }` | `{ code: 0, message: '更新成功' }`，自动写 `update_time` |
| `deleteData` | `{ collection, id }` | `{ code: 0, message: '删除成功' }` |

与 `dataService` 的差异：字段命名用蛇形、不做 `openids` 过滤、失败时只返回 `{ code: -1, message }`。

---

## 8. getWeather（占位）

无入参，直接返回固定数据：

```js
{ code: 0, data: { temp: '26', text: '晴转多云', humidity: '45%', wind: '东南风 2级' } }
```

前端实际走 `api/weather.js` 直连和风天气，此函数未被调用。建议补齐实现或删除。

---

## 9. initDatabase

无入参，尝试访问 `pair` 集合，失败则 `createCollection('pair')`。

```js
{ code: 0, message: '数据库集合初始化成功' }   // 或 'pair 集合创建成功'
```

首次部署后手动执行一次即可。

---

## 10. 云函数目录状态

| 云函数 | 文件完整 |
| --- | --- |
| `addData` / `deleteData` / `getList` / `updateData` / `dataService` | ✅ |
| `checkPairStatus` / `verifyInviteCode` / `inviteCode` / `wxLogin` / `sendMessage` | ✅ |
| `getWeather` / `initDatabase` | ✅ |
| `initConfig` | ❌ 空目录，无 `index.js`，不会随仓库提交 |

## 11. 本地调试

`uniCloud-aliyun/cloudfunctions/*/*.param.json` 是 HBuilderX 的运行参数文件，可填入 `event` 后直接在 IDE 内运行云函数：

- `inviteCode/inviteCode.param.json`
- `wxLogin/wxLogin.param.json`
