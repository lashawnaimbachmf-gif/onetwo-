const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
    const { collection, data } = event

    try {
        const res = await db.collection(collection).add({
            ...data,
            create_time: Date.now()
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
