'use strict';

exports.main = async (event, context) => {
    const db = uniCloud.database()
    const { collection, id, data } = event
    
    try {
        await db.collection(collection).doc(id).update({
            ...data,
            update_time: new Date().getTime()
        })
        return {
            code: 0,
            message: '更新成功'
        }
    } catch (e) {
        return {
            code: -1,
            message: '更新失败'
        }
    }
}
