'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')
const config = require('../config')

fs.mkdirSync(config.uploadDir, { recursive: true })

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'audio/mpeg': '.mp3',
  'audio/aac': '.aac',
  'audio/wav': '.wav',
  'video/mp4': '.mp4'
}

/**
 * 把客户端传来的 cloudPath（如 images/1698_ab.jpg）变成安全的子目录。
 * 只保留 1-3 层字母数字目录，其余丢弃，避免路径穿越。
 */
function safeSubdir (raw) {
  const parts = String(raw || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)

  if (parts.length > 0 && /\.[a-zA-Z0-9]{1,8}$/.test(parts[parts.length - 1])) {
    parts.pop() // 去掉文件名部分，目录由服务端自己生成
  }

  const cleaned = parts.filter(part => /^[A-Za-z0-9_-]+$/.test(part))
  return cleaned.slice(0, 3).join('/') || 'images'
}

const storage = multer.diskStorage({
  destination (req, file, cb) {
    const raw = (req.query && req.query.cloudPath) || (req.body && req.body.cloudPath) || 'images'
    const dir = path.join(config.uploadDir, safeSubdir(raw))
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename (req, file, cb) {
    let ext = path.extname(file.originalname || '')
    if (!ext) ext = MIME_EXT[file.mimetype] || '.bin'
    cb(null, `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 }
})

module.exports = { upload, safeSubdir }
