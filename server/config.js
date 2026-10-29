'use strict'

const fs = require('fs')
const path = require('path')

/**
 * 极简 .env 加载器，避免为了一行配置引入 dotenv 依赖。
 * 已存在于 process.env 的变量优先，不会被文件覆盖。
 */
function loadEnvFile (file) {
  if (!fs.existsSync(file)) return
  const text = fs.readFileSync(file, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    const quoted = (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    if (quoted) value = value.slice(1, -1)
    if (process.env[key] === undefined) process.env[key] = value
  }
}

const root = __dirname
loadEnvFile(path.join(root, '.env'))

const config = {
  root,
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',

  // 不配 MONGO_URL 时使用本地 JSON 文件存储，方便没有 MongoDB 的机器直接跑通
  mongoUrl: process.env.MONGO_URL || '',
  mongoDb: process.env.MONGO_DB || 'onetwo',

  dataDir: path.resolve(root, process.env.DATA_DIR || 'data'),
  uploadDir: path.resolve(root, process.env.UPLOAD_DIR || 'uploads'),

  // 对外可访问的域名，用于拼图片/云存储文件的绝对地址；留空则用请求头推断
  publicBase: (process.env.PUBLIC_BASE || '').replace(/\/+$/, ''),

  wxAppId: process.env.WX_APP_ID || '',
  wxAppSecret: process.env.WX_APP_SECRET || '',
  wxTemplateId: process.env.WX_TEMPLATE_ID || '0IKc45bcYw7j_ASZPc8ajIZ7pJ05ruH0c3zbGFbqEzE',

  logRequests: process.env.LOG_REQUESTS !== '0',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 20)
}

module.exports = config
