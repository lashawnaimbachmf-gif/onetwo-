const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const DEFAULT_LIMIT = 100

exports.main = async (event, context) => {
    const { collection, where = {} } = event

    try {
        let query = db.collection(collection)
        if (where && Object.keys(where).length > 0) {
            query = query.where(where)
        }
        const res = await query.limit(DEFAULT_LIMIT).get()
        return { code: 0, data: res.data }
    } catch (e) {
        return { code: -1, message: '获取列表失败' }
    }
}
