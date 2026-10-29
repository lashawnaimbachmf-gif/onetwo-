'use strict'

const { database } = require('../lib/db')

// 集合名称映射（与云函数版本保持一致）
const COLLECTIONS = {
  anniversary: 'anniversary',
  capsule: 'capsule',
  tree: 'tree',
  dish: 'dish',
  order: 'order'
}

exports.main = async (event) => {
  const db = database()
  const { action, collection, data, id, where, openids } = event || {}

  if (!action) return { code: -1, message: '缺少action参数' }
  if (!collection) return { code: -1, message: '缺少collection参数' }

  const collectionName = COLLECTIONS[collection] || collection

  try {
    await db.createCollection(collectionName)
  } catch (e) {
    // 集合已存在，忽略
  }

  const collectionRef = db.collection(collectionName)

  try {
    switch (action) {
      case 'add': {
        const addRes = await collectionRef.add({
          ...data,
          createTime: Date.now()
        })
        const getRes = await collectionRef.doc(addRes.id).get()
        return { code: 0, message: '添加成功', data: getRes.data[0] }
      }

      case 'get': {
        if (id) {
          const getRes = await collectionRef.doc(id).get()
          return { code: 0, message: '查询成功', data: getRes.data }
        }

        let query = collectionRef
        if (where) query = query.where(where)
        if (openids && openids.length > 0) {
          query = query.where({ creatorOpenid: db.command.in(openids) })
        }

        const listRes = await query.orderBy('createTime', 'desc').get()
        return { code: 0, message: '查询成功', data: listRes.data }
      }

      case 'update': {
        const patch = { ...(data || {}) }
        if (patch._id) delete patch._id
        if (patch.id) delete patch.id

        if (id) {
          await collectionRef.doc(id).update({ ...patch, updateTime: Date.now() })
          return { code: 0, message: '更新成功' }
        }
        if (where) {
          const updateRes = await collectionRef.where(where).update({ ...patch, updateTime: Date.now() })
          return { code: 0, message: '更新成功', data: { updated: updateRes.updated } }
        }
        return { code: -1, message: '缺少ID或where条件' }
      }

      case 'delete': {
        if (!id) return { code: -1, message: '缺少ID' }
        await collectionRef.doc(id).remove()
        return { code: 0, message: '删除成功' }
      }

      default:
        return { code: -1, message: '未知操作' }
    }
  } catch (err) {
    console.error('[dataService] 数据库操作失败:', err)
    return { code: -1, message: '操作失败: ' + err.message }
  }
}
