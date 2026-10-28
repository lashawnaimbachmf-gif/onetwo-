'use strict';

exports.main = async (event, context) => {
    const db = uniCloud.database()
    const { collection, data } = event
    
    try {
        const res = await db.collection(collection).add({
            ...data,
            create_time: new Date().getTime()
        })
        return {
            code: 0,
            data: {
                id: res.id
            }
        }
    } catch (e) {
        return {
            code: -1,
            message: '添加失败'
        }
    }
}
