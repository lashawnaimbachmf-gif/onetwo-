'use strict'

const { database } = require('../lib/db')

exports.main = async (event) => {
  const db = database()
  const { collection, data } = event || {}

  try {
    const res = await db.collection(collection).add({
      ...data,
      create_time: Date.now()
    })
    return { code: 0, data: { id: res.id } }
  } catch (e) {
    console.error('[addData] 添加失败:', e)
    return { code: -1, message: '添加失败' }
  }
}
