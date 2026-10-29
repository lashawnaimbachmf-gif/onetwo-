'use strict'

const crypto = require('crypto')

// 与 ObjectId 同构的 24 位十六进制 ID：4 字节时间戳 + 5 字节随机 + 3 字节自增
const MACHINE = crypto.randomBytes(5).toString('hex')
let counter = crypto.randomBytes(3).readUIntBE(0, 3)

function objectId () {
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0')
  counter = (counter + 1) % 0x1000000
  return ts + MACHINE + counter.toString(16).padStart(6, '0')
}

module.exports = { objectId }
