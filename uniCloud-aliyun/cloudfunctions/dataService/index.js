const db = uniCloud.database()

// 集合名称映射
const COLLECTIONS = {
    anniversary: 'anniversary',
    capsule: 'capsule',
    tree: 'tree',
    dish: 'dish',
    order: 'order'
}

exports.main = async (event, context) => {
    const { action, collection, data, id, where, openids } = event
    
    // 检查必要参数
    if (!action) {
        return { code: -1, message: '缺少action参数' }
    }
    if (!collection) {
        return { code: -1, message: '缺少collection参数' }
    }
    
    // 获取集合名称
    const collectionName = COLLECTIONS[collection] || collection
    
    // 确保集合存在
    try {
        await db.createCollection(collectionName)
    } catch (e) {
        // 集合已存在，忽略错误
    }
    
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
                // 获取添加的完整记录
                const getRes = await collectionRef.doc(addRes.id).get()
                return {
                    code: 0,
                    message: '添加成功',
                    data: getRes.data[0]
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
                    query = query.where(where)
                }
                
                // 如果指定了openid列表（用于查询情侣双方的数据）
                if (openids && openids.length > 0) {
                    query = query.where({
                        creatorOpenid: db.command.in(openids)
                    })
                }
                
                const listRes = await query.orderBy('createTime', 'desc').get()
                return {
                    code: 0,
                    message: '查询成功',
                    data: listRes.data
                }
                
            case 'update':
                // 更新数据
                // 删除可能存在的 _id 字段，避免报错
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
