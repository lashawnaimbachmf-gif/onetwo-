'use strict'

const { database } = require('../lib/db')

exports.main = async (event) => {
  const db = database()
  const { action, code, userInfo } = event || {}
  const userCollection = db.collection('users')

  try {
    try {
      await db.createCollection('invite_codes')
    } catch (e) {
      // 集合已存在，忽略
    }

    switch (action) {
      case 'create': {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        await db.collection('invite_codes').add({
          code: newCode,
          creatorOpenid: userInfo.openid,
          creatorInfo: userInfo,
          createTime: Date.now(),
          isUsed: false
        })
        return { code: 0, message: '生成成功', data: { code: newCode } }
      }

      case 'check': {
        const result = await db.collection('invite_codes').where({ code, isUsed: false }).get()
        if (result.data.length === 0) {
          return { code: -1, message: '邀请码不存在或已被使用' }
        }
        const inviteData = result.data[0]
        if (inviteData.creatorOpenid === userInfo.openid) {
          return { code: -1, message: '不能绑定自己' }
        }
        return {
          code: 0,
          message: '查询成功',
          data: { creatorInfo: inviteData.creatorInfo, creatorOpenid: inviteData.creatorOpenid }
        }
      }

      case 'bind': {
        const checkResult = await db.collection('invite_codes').where({ code, isUsed: false }).get()
        if (checkResult.data.length === 0) {
          return { code: -1, message: '邀请码不存在或已被使用' }
        }
        const inviteInfo = checkResult.data[0]
        if (inviteInfo.creatorOpenid === userInfo.openid) {
          return { code: -1, message: '不能绑定自己' }
        }

        await db.collection('invite_codes').doc(inviteInfo._id).update({
          isUsed: true,
          partnerOpenid: userInfo.openid,
          partnerInfo: userInfo,
          bindTime: Date.now()
        })

        // 反向绑定记录，让对方也能查到自己
        const reverseCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        await db.collection('invite_codes').add({
          code: reverseCode,
          creatorOpenid: userInfo.openid,
          creatorInfo: userInfo,
          isUsed: true,
          partnerOpenid: inviteInfo.creatorOpenid,
          partnerInfo: inviteInfo.creatorInfo,
          bindTime: Date.now(),
          isReverse: true
        })

        await userCollection.where({ openid: inviteInfo.creatorOpenid }).update({
          isBind: true,
          partnerOpenid: userInfo.openid,
          partnerInfo: userInfo,
          bindTime: Date.now()
        })

        await userCollection.where({ openid: userInfo.openid }).update({
          isBind: true,
          partnerOpenid: inviteInfo.creatorOpenid,
          partnerInfo: inviteInfo.creatorInfo,
          bindTime: Date.now()
        })

        return {
          code: 0,
          message: '绑定成功',
          data: { partnerInfo: inviteInfo.creatorInfo, partnerOpenid: inviteInfo.creatorOpenid }
        }
      }

      case 'checkReverse': {
        if (!userInfo || !userInfo.openid) {
          return { code: -1, message: '用户信息不完整', data: { hasBind: false } }
        }

        const userResult = await userCollection.where({ openid: userInfo.openid, isBind: true }).get()
        if (userResult.data.length > 0 && userResult.data[0].partnerInfo) {
          const userData = userResult.data[0]
          return {
            code: 0,
            message: '查询成功',
            data: {
              hasBind: true,
              partnerInfo: userData.partnerInfo,
              partnerOpenid: userData.partnerOpenid
            }
          }
        }

        const reverseResult = await db.collection('invite_codes')
          .where({ creatorOpenid: userInfo.openid, isUsed: true, isReverse: true })
          .get()
        if (reverseResult.data.length > 0) {
          const reverseData = reverseResult.data[0]
          return {
            code: 0,
            message: '查询成功',
            data: {
              hasBind: true,
              partnerInfo: reverseData.partnerInfo,
              partnerOpenid: reverseData.partnerOpenid
            }
          }
        }

        return { code: 0, message: '查询成功', data: { hasBind: false } }
      }

      default:
        return { code: -1, message: '未知操作' }
    }
  } catch (err) {
    console.error('[inviteCode] 邀请码操作失败:', err)
    return { code: -1, message: '操作失败: ' + err.message }
  }
}
