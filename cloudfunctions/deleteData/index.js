const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
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
