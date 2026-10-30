'use strict'

const axios = require('axios')
const crypto = require('crypto')
const config = require('../config')
const { database } = require('../lib/db')

exports.main = async (event, context = {}) => {
  const db = database()
  const { code, userInfo } = event || {}

  const appid = (event && event.appid) || context.APPID || config.wxAppId
  const secret = config.wxAppSecret
  const profile = userInfo || {}

  try {
    let openid = ''

    if (secret) {
      const wxRes = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
        params: {
          appid,
          secret,
          js_code: code,
          grant_type: 'authorization_code'
        },
        timeout: 10000
      })

      if (wxRes.data.errcode) {
        return { code: -1, message: '微信登录失败: ' + wxRes.data.errmsg }
      }
      openid = wxRes.data.openid
    } else {
      // 没有 AppSecret 时降级：用昵称+头像哈希生成稳定 openid，仅适合开发自测
      const hash = crypto.createHash('md5')
      hash.update(String(profile.nickName || '') + '_' + String(profile.avatarUrl || ''))
      openid = 'openid_' + hash.digest('hex').substring(0, 16)
      console.log('[wxLogin] 未配置 WX_APP_SECRET，使用降级 openid:', openid)
    }

    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).slice(2)

    const userCollection = db.collection('users')
    const user = await userCollection.where({ openid }).get()

    if (user.data.length === 0) {
      await userCollection.add({
        openid,
        nickName: profile.nickName,
        avatarUrl: profile.avatarUrl,
        createTime: Date.now()
      })
    } else {
      await userCollection.doc(user.data[0]._id).update({
        nickName: profile.nickName,
        avatarUrl: profile.avatarUrl,
        lastLoginTime: Date.now()
      })
    }

    return {
      code: 0,
      message: '登录成功',
      data: { token, openid, userInfo: profile }
    }
  } catch (err) {
    console.error('[wxLogin] 登录错误:', err)
    return { code: -1, message: '登录失败: ' + err.message }
  }
}
