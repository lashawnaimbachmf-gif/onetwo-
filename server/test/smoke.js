'use strict'

/**
 * 冒烟测试：自己拉起一个服务进程（使用临时目录 + 文件存储），
 * 按真实前端调用顺序跑一遍所有云函数和上传接口。
 *
 * 用法：cd server && npm run smoke
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const PORT = Number(process.env.SMOKE_PORT || 3199)
const BASE = `http://127.0.0.1:${PORT}`
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'onetwo-smoke-'))

const child = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], {
  env: {
    ...process.env,
    PORT: String(PORT),
    HOST: '127.0.0.1',
    DATA_DIR: path.join(tmpRoot, 'data'),
    UPLOAD_DIR: path.join(tmpRoot, 'uploads'),
    LOG_REQUESTS: '0',
    MONGO_URL: '',
    WX_APP_ID: '',
    WX_APP_SECRET: '',
    PUBLIC_BASE: BASE
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
})

let serverLog = ''
child.stdout.on('data', chunk => { serverLog += chunk.toString() })
child.stderr.on('data', chunk => { serverLog += chunk.toString() })

const results = []
function check (name, condition, detail) {
  results.push({ name, ok: !!condition, detail })
  const mark = condition ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${name}${condition ? '' : '  << ' + JSON.stringify(detail)}`)
}

async function waitForHealth (timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`服务提前退出，退出码 ${child.exitCode}\n${serverLog}`)
    try {
      const res = await fetch(`${BASE}/health`)
      if (res.ok) return await res.json()
    } catch (e) {
      // 还没起来
    }
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw new Error('等待服务启动超时\n' + serverLog)
}

async function callFn (name, event) {
  const res = await fetch(`${BASE}/fn/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event || {})
  })
  let body = null
  try {
    body = await res.json()
  } catch (e) {
    body = null
  }
  return { status: res.status, body, result: body && body.result }
}

async function run () {
  const health = await waitForHealth()
  check('健康检查返回 ok', health.ok === true, health)
  check('使用文件存储（未配 MONGO_URL）', /本地文件存储/.test(health.driver), health.driver)

  // 1. getWeather（占位）
  const weather = await callFn('getWeather')
  check('getWeather 返回 code 0', weather.result && weather.result.code === 0, weather.body)

  // 2. wxLogin：无 AppSecret，走降级 openid
  const login = await callFn('wxLogin', {
    code: 'fake-code',
    userInfo: { nickName: '小A', avatarUrl: 'https://example.com/a.png' }
  })
  const openidA = login.result && login.result.data && login.result.data.openid
  check('wxLogin 返回 openid', !!openidA, login.body)
  check('wxLogin 降级 openid 前缀正确', String(openidA).startsWith('openid_'), openidA)
  check('wxLogin 返回 token', !!(login.result.data && login.result.data.token), login.body)

  const loginB = await callFn('wxLogin', {
    code: 'fake-code-2',
    userInfo: { nickName: '小B', avatarUrl: 'https://example.com/b.png' }
  })
  const openidB = loginB.result && loginB.result.data && loginB.result.data.openid
  check('第二个用户登录成功', !!openidB && openidB !== openidA, { openidB })

  // 3. checkPairStatus：第一个用户成为 creator
  const pair = await callFn('checkPairStatus', { openid: openidA })
  check('checkPairStatus 返回 creator', pair.result && pair.result.status === 'creator', pair.body)
  const inviteCode = pair.result && pair.result.inviteCode
  check('邀请码为 6 位', typeof inviteCode === 'string' && inviteCode.length === 6, inviteCode)

  // 4. 错误邀请码
  const badCode = await callFn('verifyInviteCode', { openid: openidB, inviteCode: 'ZZZZZZ' })
  check('错误邀请码返回 -1', badCode.result && badCode.result.code === -1, badCode.body)

  // 5. 正确邀请码绑定
  const bind = await callFn('verifyInviteCode', { openid: openidB, inviteCode })
  check('正确邀请码绑定成功', bind.result && bind.result.status === 'allowed', bind.body)

  const pairB = await callFn('checkPairStatus', { openid: openidB })
  check('绑定后状态为 allowed', pairB.result && pairB.result.status === 'allowed', pairB.body)

  // 6. inviteCode 生命周期
  const created = await callFn('inviteCode', {
    action: 'create',
    userInfo: { openid: openidA, nickName: '小A' }
  })
  const newCode = created.result && created.result.data && created.result.data.code
  check('inviteCode create 生成邀请码', !!newCode, created.body)

  const checked = await callFn('inviteCode', {
    action: 'check',
    code: newCode,
    userInfo: { openid: openidB, nickName: '小B' }
  })
  check('inviteCode check 查到创建者', checked.result && checked.result.code === 0 && checked.result.data.creatorOpenid === openidA, checked.body)

  const reverse = await callFn('inviteCode', {
    action: 'checkReverse',
    userInfo: { openid: openidA }
  })
  check('checkReverse 未绑定时 hasBind=false', reverse.result && reverse.result.data && reverse.result.data.hasBind === false, reverse.body)

  // 7. dataService 全流程
  const added = await callFn('dataService', {
    action: 'add',
    collection: 'dish',
    data: { name: '番茄炒蛋', price: 12, creatorOpenid: openidA }
  })
  const dishId = added.result && added.result.data && added.result.data._id
  check('dataService add 返回完整记录', !!dishId && added.result.data.name === '番茄炒蛋', added.body)
  check('add 自动补 createTime', !!(added.result.data && added.result.data.createTime), added.body)

  const listed = await callFn('dataService', {
    action: 'get',
    collection: 'dish',
    openids: [openidA, openidB]
  })
  check('dataService get 按 openids 过滤', listed.result && listed.result.data.length === 1, listed.body)

  const byId = await callFn('dataService', { action: 'get', collection: 'dish', id: dishId })
  check('dataService get 按 id 查询', byId.result && byId.result.data.length === 1, byId.body)

  const updated = await callFn('dataService', {
    action: 'update',
    collection: 'dish',
    id: dishId,
    data: { price: 15, _id: 'should-be-removed' }
  })
  check('dataService update 成功', updated.result && updated.result.code === 0, updated.body)

  const afterUpdate = await callFn('dataService', { action: 'get', collection: 'dish', id: dishId })
  check('更新后 price 生效', afterUpdate.result.data[0].price === 15, afterUpdate.body)
  check('更新不会写坏 _id', afterUpdate.result.data[0]._id === dishId, afterUpdate.body)

  const byWhere = await callFn('dataService', {
    action: 'update',
    collection: 'dish',
    where: { name: '番茄炒蛋' },
    data: { price: 18 }
  })
  check('dataService 按 where 批量更新', byWhere.result && byWhere.result.data.updated === 1, byWhere.body)

  const removed = await callFn('dataService', { action: 'delete', collection: 'dish', id: dishId })
  check('dataService delete 成功', removed.result && removed.result.code === 0, removed.body)

  const empty = await callFn('dataService', { action: 'get', collection: 'dish', openids: [openidA] })
  check('删除后列表为空', empty.result && empty.result.data.length === 0, empty.body)

  // 8. 备用单表 CRUD（蛇形时间字段）
  const addRes = await callFn('addData', { collection: 'photo', data: { url: '/uploads/a.jpg' } })
  const photoId = addRes.result && addRes.result.data && addRes.result.data.id
  check('addData 返回 id', !!photoId, addRes.body)

  const listRes = await callFn('getList', { collection: 'photo' })
  check('getList 能查到记录', listRes.result && listRes.result.data.length === 1, listRes.body)
  check('addData 写入 create_time', !!(listRes.result.data[0] && listRes.result.data[0].create_time), listRes.body)

  const upRes = await callFn('updateData', { collection: 'photo', id: photoId, data: { url: '/uploads/b.jpg' } })
  check('updateData 成功', upRes.result && upRes.result.code === 0, upRes.body)

  const delRes = await callFn('deleteData', { collection: 'photo', id: photoId })
  check('deleteData 成功', delRes.result && delRes.result.code === 0, delRes.body)

  // 9. initDatabase
  const init = await callFn('initDatabase')
  check('initDatabase 成功', init.result && init.result.code === 0, init.body)

  // 10. 上传与静态访问
  const bytes = Buffer.from('fake-png-bytes')
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'image/png' }), 'test.png')
  const uploadRes = await fetch(`${BASE}/upload?cloudPath=images/test.png`, { method: 'POST', body: form })
  const uploadBody = await uploadRes.json()
  check('上传返回 fileID', uploadRes.ok && !!uploadBody.fileID, uploadBody)

  const fileRes = await fetch(`${BASE}/uploads/${uploadBody.fileID}`)
  const fileBuf = Buffer.from(await fileRes.arrayBuffer())
  check('上传文件可通过 URL 访问', fileRes.ok, fileRes.status)
  check('静态文件内容一致', fileBuf.equals(bytes), { size: fileBuf.length })

  // 11. 未知云函数
  const unknown = await callFn('notExists')
  check('未知云函数返回 404', unknown.status === 404 && unknown.result.code === -1, unknown.body)

  // 12. 文件存储确实落盘
  const dataFile = path.join(tmpRoot, 'data', 'dish.json')
  check('数据已落盘到 JSON 文件', fs.existsSync(dataFile), dataFile)
}

run()
  .catch(err => {
    console.error('\n冒烟测试异常：', err.message)
    if (serverLog) console.error('\n--- 服务端日志 ---\n' + serverLog)
    process.exitCode = 1
  })
  .finally(async () => {
    child.kill()
    await new Promise(resolve => setTimeout(resolve, 300))
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true })
    } catch (e) {
      // 忽略清理失败
    }

    const failed = results.filter(item => !item.ok)
    console.log('\n--------------------------------------------------')
    console.log(`共 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`)
    if (failed.length > 0) {
      console.log('失败项：')
      for (const item of failed) console.log(`  - ${item.name}: ${JSON.stringify(item.detail)}`)
      process.exitCode = 1
    }
  })
