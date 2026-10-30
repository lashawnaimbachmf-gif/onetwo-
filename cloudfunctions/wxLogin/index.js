const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
    const { userInfo } = event

    try {
        // 直接从云函数上下文获取 openid（无需调用微信 API）
        const wxContext = cloud.getWXContext()
        const openid = wxContext.OPENID

        if (!openid) {
            return {
                code: -1,
                message: '获取 openid 失败'
            }
        }

        const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2)

        const userCollection = db.collection('users')

        let user = await userCollection.where({ openid }).get()

        if (user.data.length === 0) {
            await userCollection.add({
                openid: openid,
                nickName: userInfo.nickName,
                avatarUrl: userInfo.avatarUrl,
                createTime: Date.now()
            })
        } else {
            await userCollection.doc(user.data[0]._id).update({
                nickName: userInfo.nickName,
                avatarUrl: userInfo.avatarUrl,
                lastLoginTime: Date.now()
            })
        }

        return {
            code: 0,
            message: '登录成功',
            data: {
                token: token,
                openid: openid,
                userInfo: userInfo
            }
        }
    } catch (err) {
        console.error('登录错误:', err)
        return {
            code: -1,
            message: '登录失败: ' + err.message
        }
    }
}
