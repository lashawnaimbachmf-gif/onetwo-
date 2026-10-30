const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 集合名称映射
const COLLECTIONS = {
    anniversary: 'anniversary',
    capsule: 'capsule',
    tree: 'tree',
    dish: 'dish',
    order: 'order'
}

// 默认限制条数，避免一次查太多数据浪费资源
const DEFAULT_LIMIT = 100

exports.main = async (event, context) => {
    const { action, collection, data, id, where, openids, openid } = event

    // 检查必要参数
    if (!action) {
        return { code: -1, message: '缺少action参数' }
    }
    if (!collection) {
        return { code: -1, message: '缺少collection参数' }
    }

    // ── 鉴权：所有操作需要登录 ────────────────────
    if (!openid) {
        return { code: -1, message: '请先登录' }
    }
    // 写入操作校验 openid 来源合法性（通过 wxLogin 返回的 openid 才有效）
    if (['add', 'update', 'delete'].includes(action)) {
        const userCheck = await db.collection('users').where({ openid }).get()
        if (userCheck.data.length === 0) {
            return { code: -1, message: '用户不存在，请先登录' }
        }
    }

    // 获取集合名称
    const collectionName = COLLECTIONS[collection] || collection
    const collectionRef = db.collection(collectionName)

    try {
        switch(action) {
            case 'add':
                // 添加数据
                const addData = {
                    ...data,
                    createTime: Date.now()
                }
                const addRes = await collectionRef.add(addData)
                return {
                    code: 0,
                    message: '添加成功',
                    data: { _id: addRes.id }
                }

            case 'get':
                // 查询数据
                let query = collectionRef

                // 如果有指定ID
                if (id) {
                    const getRes = await collectionRef.doc(id).get()
                    return {
                        code: 0,
                        message: '查询成功',
                        data: getRes.data
                    }
                }

                // 如果有查询条件
                if (where) {
                    // 自动将数组值转换为 db.command.in()，客户端无需传递 command 对象
                    const processedWhere = {}
                    for (const [key, val] of Object.entries(where)) {
                        if (Array.isArray(val)) {
                            processedWhere[key] = _.in(val)
                        } else {
                            processedWhere[key] = val
                        }
                    }
                    query = query.where(processedWhere)
                }

                // 如果指定了openid列表（用于查询情侣双方的数据）
                if (openids && openids.length > 0) {
                    query = query.where({
                        creatorOpenid: _.in(openids)
                    })
                }

                // 添加 limit 限制查询条数，减少资源消耗
                const listRes = await query.orderBy('createTime', 'desc').limit(DEFAULT_LIMIT).get()
                return {
                    code: 0,
                    message: '查询成功',
                    data: listRes.data
                }

            case 'update':
                // 更新数据
                if (data._id) delete data._id
                if (data.id) delete data.id

                if (id) {
                    // 通过ID更新
                    await collectionRef.doc(id).update({
                        ...data,
                        updateTime: Date.now()
                    })
                    return {
                        code: 0,
                        message: '更新成功'
                    }
                } else if (where) {
                    // 通过条件更新
                    const updateRes = await collectionRef.where(where).update({
                        ...data,
                        updateTime: Date.now()
                    })
                    return {
                        code: 0,
                        message: '更新成功',
                        data: { updated: updateRes.updated }
                    }
                } else {
                    return {
                        code: -1,
                        message: '缺少ID或where条件'
                    }
                }

            case 'delete':
                // 删除数据
                if (!id) {
                    return {
                        code: -1,
                        message: '缺少ID'
                    }
                }

                await collectionRef.doc(id).remove()

                return {
                    code: 0,
                    message: '删除成功'
                }

            default:
                return {
                    code: -1,
                    message: '未知操作'
                }
        }
    } catch (err) {
        console.error('数据库操作失败:', err)
        return {
            code: -1,
            message: '操作失败: ' + err.message
        }
    }
}
