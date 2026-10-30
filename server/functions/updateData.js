'use strict'

const { database } = require('../lib/db')

exports.main = async (event) => {
  const db = database()
  const { collection, id, data } = event || {}

  try {
    await db.collection(collection).doc(id).update({
      ...data,
      update_time: Date.now()
    })
    return { code: 0, message: '更新成功' }
  } catch (e) {
    console.error('[updateData] 更新失败:', e)
    return { code: -1, message: '更新失败' }
  }
}
