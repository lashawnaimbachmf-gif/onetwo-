'use strict'

const { database } = require('../lib/db')

exports.main = async (event) => {
  const db = database()
  const { openid } = event || {}

  if (!openid) return { code: -1, message: '缺少openid' }

  try {
    const pairRes = await db.collection('pair').limit(1).get()

    // 还没有配对记录：当前用户成为创建者
    if (!pairRes.data || pairRes.data.length === 0) {
      const inviteCode = generateInviteCode()
      await db.collection('pair').add({
        user1: { openid, createTime: Date.now() },
        user2: null,
        inviteCode,
        createTime: Date.now()
      })
      return { code: 0, status: 'creator', message: '创建配对成功', inviteCode }
    }

    const pair = pairRes.data[0]

    if ((pair.user1 && pair.user1.openid === openid) || (pair.user2 && pair.user2.openid === openid)) {
      return { code: 0, status: 'allowed', message: '已绑定', pairId: pair._id }
    }

    if (pair.user1 && pair.user1.openid && pair.user2 && pair.user2.openid) {
      return { code: -1, status: 'full', message: '名额已满，此小程序仅限特定用户使用' }
    }

    return { code: 0, status: 'needInvite', message: '需要输入邀请码', pairId: pair._id }
  } catch (err) {
    console.error('[checkPairStatus] 检查配对状态失败:', err)
    return { code: -1, message: '检查失败: ' + err.message }
  }
}

function generateInviteCode () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
