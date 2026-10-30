'use strict'

const { database } = require('../lib/db')

exports.main = async () => {
  const db = database()

  try {
    await db.collection('pair').limit(1).get()
    return { code: 0, message: '数据库集合初始化成功' }
  } catch (err) {
    try {
      await db.createCollection('pair')
      return { code: 0, message: 'pair 集合创建成功' }
    } catch (createErr) {
      return { code: -1, message: '创建失败: ' + createErr.message }
    }
  }
}
