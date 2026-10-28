const axios = require('axios')

exports.main = async (event, context) => {
    const { code, userInfo } = event
    
    // 小程序配置（AppSecret 需要在微信小程序后台获取）
    // 注意：appid 需要从客户端传入，context.APPID 在微信小程序中可能为空
    const appid = event.appid || context.APPID || ''

    // AppSecret 不写入仓库：优先读云函数环境变量 WX_APP_SECRET，
    // 其次读本地的 config.local.js（已被 .gitignore 忽略，参考 config.example.js）
    let localConfig = {}
    try {
        localConfig = require('./config.local.js')
    } catch (e) {
        // 未提供本地配置文件，继续尝试环境变量
    }
    const secret = process.env.WX_APP_SECRET || localConfig.appSecret || ''
    
    try {
        let openid = ''
        
        // 如果有配置 AppSecret，调用微信接口获取真实 openid
        if (secret) {
            const wxRes = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
                params: {
                    appid: appid,
                    secret: secret,
                    js_code: code,
                    grant_type: 'authorization_code'
                }
            })
            
            if (wxRes.data.errcode) {
                return {
                    code: -1,
                    message: '微信登录失败: ' + wxRes.data.errmsg
                }
            }
            
            openid = wxRes.data.openid
        } else {
            // 没有配置 AppSecret，使用用户信息的哈希生成稳定 openid（降级方案）
            // 这样同一用户每次登录都会得到相同的 openid
            const crypto = require('crypto')
            const hash = crypto.createHash('md5')
            hash.update(userInfo.nickName + '_' + (userInfo.avatarUrl || ''))
            const userHash = hash.digest('hex').substring(0, 16)
            openid = 'openid_' + userHash
            console.log('未配置 AppSecret，使用降级方案生成稳定 openid:', openid)
        }
        
        // 生成自定义登录态 token
        const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2)
        
        // 获取数据库实例
        const db = uniCloud.database()
        const userCollection = db.collection('users')
        
        // 查找或创建用户
        let user = await userCollection.where({ openid }).get()
        
        if (user.data.length === 0) {
            // 新用户，创建记录
            await userCollection.add({
                openid: openid,
                nickName: userInfo.nickName,
                avatarUrl: userInfo.avatarUrl,
                createTime: Date.now()
            })
        } else {
            // 更新用户信息
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
