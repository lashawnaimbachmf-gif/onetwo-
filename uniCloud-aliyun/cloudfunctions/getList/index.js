'use strict';

exports.main = async (event, context) => {
    const db = uniCloud.database()
    const { collection, where = {} } = event
    
    try {
        let query = db.collection(collection)
        if (where && Object.keys(where).length > 0) {
            query = query.where(where)
        }
        const res = await query.get()
        return {
            code: 0,
            data: res.data
        }
    } catch (e) {
        return {
            code: -1,
            message: '获取列表失败'
        }
    }
}
