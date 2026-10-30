'use strict'

const { database } = require('../lib/db')

exports.main = async (event) => {
  const db = database()
  const { collection, id } = event || {}

  try {
    await db.collection(collection).doc(id).remove()
    return { code: 0, message: '删除成功' }
  } catch (e) {
    console.error('[deleteData] 删除失败:', e)
    return { code: -1, message: '删除失败' }
  }
}
