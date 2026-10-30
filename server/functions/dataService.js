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

// 默认限制条数，避免一次查太多
const DEFAULT_LIMIT = 100

exports.main = async (event) => {
  const db = database()
  const { action, collection, data, id, where, openids, openid } = event || {}

  if (!action) return { code: -1, message: '缺少action参数' }
  if (!collection) return { code: -1, message: '缺少collection参数' }

  // ── 鉴权：所有操作需要登录 ────────────────────
  if (!openid) return { code: -1, message: '请先登录' }

  const collectionName = COLLECTIONS[collection] || collection
  const collectionRef = db.collection(collectionName)

  try {
    // 写入操作校验 openid 合法性（必须是 wxLogin 落库过的用户）
    if (['add', 'update', 'delete'].includes(action)) {
      const userCheck = await db.collection('users').where({ openid }).get()
      if (userCheck.data.length === 0) {
        return { code: -1, message: '用户不存在，请先登录' }
      }
    }

    switch (action) {
      case 'add': {
        const addRes = await collectionRef.add({
          ...data,
          createTime: Date.now()
        })
        return { code: 0, message: '添加成功', data: { _id: addRes.id } }
      }

      case 'get': {
        if (id) {
          const getRes = await collectionRef.doc(id).get()
          return { code: 0, message: '查询成功', data: getRes.data }
        }

        let query = collectionRef

        if (where) {
          // 数组值自动转成 in 查询，客户端无需传 command 对象
          const processedWhere = {}
          for (const key of Object.keys(where)) {
            const val = where[key]
            processedWhere[key] = Array.isArray(val) ? db.command.in(val) : val
          }
          query = query.where(processedWhere)
        }

        if (openids && openids.length > 0) {
          query = query.where({ creatorOpenid: db.command.in(openids) })
        }

        const listRes = await query.orderBy('createTime', 'desc').limit(DEFAULT_LIMIT).get()
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
