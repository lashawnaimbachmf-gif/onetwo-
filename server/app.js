'use strict'

const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const multer = require('multer')

const config = require('./config')
const { describeDriver } = require('./lib/db')
const { upload } = require('./lib/upload')

fs.mkdirSync(config.uploadDir, { recursive: true })
fs.mkdirSync(config.dataDir, { recursive: true })

const handlers = {
  dataService: require('./functions/dataService'),
  checkPairStatus: require('./functions/checkPairStatus'),
  verifyInviteCode: require('./functions/verifyInviteCode'),
  inviteCode: require('./functions/inviteCode'),
  wxLogin: require('./functions/wxLogin'),
  sendMessage: require('./functions/sendMessage'),
  getList: require('./functions/getList'),
  addData: require('./functions/addData'),
  updateData: require('./functions/updateData'),
  deleteData: require('./functions/deleteData'),
  getWeather: require('./functions/getWeather'),
  initDatabase: require('./functions/initDatabase')
}

const app = express()
app.disable('x-powered-by')
app.use(cors())
app.use(express.json({ limit: '4mb' }))
app.use(express.urlencoded({ extended: false }))

if (config.logRequests) {
  app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`)
    })
    next()
  })
}

function absoluteUrl (req, pathname) {
  const base = config.publicBase || `${req.protocol}://${req.get('host')}`
  return base.replace(/\/+$/, '') + pathname
}

app.get('/health', (req, res) => {
  res.json({ ok: true, driver: describeDriver(), uptime: Math.round(process.uptime()), time: Date.now() })
})

/**
 * 云函数统一入口，返回结构与 uniCloud.callFunction 一致：{ result: {...} }
 * 支持 GET（?openid=xxx，方便浏览器/curl 调试）和 POST（JSON body）。
 */
app.all('/fn/:name', async (req, res) => {
  const name = req.params.name
  const handler = handlers[name]

  if (!handler) {
    return res.status(404).json({ result: { code: -1, message: `云函数 ${name} 不存在` } })
  }

  const event = { ...(req.query || {}), ...(req.body || {}) }
  const context = { APPID: config.wxAppId }

  try {
    const result = await handler.main(event, context)
    res.json({ result })
  } catch (err) {
    console.error(`[${name}] 执行异常:`, err)
    res.status(500).json({ result: { code: -1, message: err.message || '云函数执行异常' } })
  }
})

app.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return next(err)
    if (!req.file) return res.status(400).json({ code: -1, message: '未收到文件（字段名应为 file）' })

    const fileID = path.relative(config.uploadDir, req.file.path).split(path.sep).join('/')
    res.json({ fileID, url: absoluteUrl(req, '/uploads/' + fileID) })
  })
})

app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d' }))

app.use((req, res) => {
  res.status(404).json({ code: -1, message: `接口不存在: ${req.method} ${req.path}` })
})

// 统一错误处理：multer 体积超限等
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? `文件超过 ${config.maxUploadMb}MB 限制` : err.message
    return res.status(413).json({ code: -1, message })
  }
  console.error('未捕获异常:', err)
  res.status(500).json({ code: -1, message: err.message || '服务器内部错误' })
})

const server = app.listen(config.port, config.host, () => {
  console.log('--------------------------------------------------')
  console.log('恋爱小窝后端已启动')
  console.log(`  监听地址 : http://${config.host}:${config.port}`)
  console.log(`  数据存储 : ${describeDriver()}`)
  console.log(`  上传目录 : ${config.uploadDir}`)
  console.log(`  微信 AppID: ${config.wxAppId || '(未配置，登录将走降级 openid)'}`)
  console.log('--------------------------------------------------')
})

function shutdown (signal) {
  console.log(`\n收到 ${signal}，正在关闭...`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

module.exports = app
