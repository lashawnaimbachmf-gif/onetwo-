'use strict'

const { database } = require('../lib/db')

exports.main = async (event) => {
  const db = database()
  const { collection, where = {} } = event || {}

  try {
    let query = db.collection(collection)
    if (where && Object.keys(where).length > 0) {
      query = query.where(where)
    }
    const res = await query.get()
    return { code: 0, data: res.data }
  } catch (e) {
    console.error('[getList] 获取列表失败:', e)
    return { code: -1, message: '获取列表失败' }
  }
}
