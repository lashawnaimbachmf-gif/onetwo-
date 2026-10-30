const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
    const { collection, id, data } = event

    try {
        await db.collection(collection).doc(id).update({
            ...data,
            update_time: Date.now()
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
