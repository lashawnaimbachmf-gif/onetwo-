'use strict';

exports.main = async (event, context) => {
    const db = uniCloud.database()
    const { collection, id } = event
    
    try {
        await db.collection(collection).doc(id).remove()
        return {
            code: 0,
            message: '删除成功'
        }
    } catch (e) {
        return {
            code: -1,
            message: '删除失败'
        }
    }
}
