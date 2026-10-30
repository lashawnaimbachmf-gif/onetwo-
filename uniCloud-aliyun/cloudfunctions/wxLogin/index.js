exports.main = async (event, context) => {
    const { code, userInfo } = event

    const appid = event.appid || context.APPID || ''
    const secret = process.env.WX_APP_SECRET || ''

    try {
        let openid = ''

        if (secret) {
            // 使用 uniCloud.httpclient 替代 axios，节省整个 node_modules 的加载时间
            const wxRes = await uniCloud.httpclient.request(
                'https://api.weixin.qq.com/sns/jscode2session',
                {
                    method: 'GET',
                    dataType: 'json',
                    data: {
                        appid: appid,
                        secret: secret,
                        js_code: code,
                        grant_type: 'authorization_code'
                    }
                }
            )

            const resData = wxRes.data
            if (resData.errcode) {
                return {
                    code: -1,
                    message: '微信登录失败: ' + resData.errmsg
                }
            }

            openid = resData.openid
        } else {
            // 降级方案
            const crypto = require('crypto')
            const hash = crypto.createHash('md5')
            hash.update(userInfo.nickName + '_' + (userInfo.avatarUrl || ''))
            const userHash = hash.digest('hex').substring(0, 16)
            openid = 'openid_' + userHash
        }

        const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2)

        const db = uniCloud.database()
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
