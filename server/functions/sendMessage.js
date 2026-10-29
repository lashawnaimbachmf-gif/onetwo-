'use strict'

const axios = require('axios')
const config = require('../config')
const { database } = require('../lib/db')

// 优先读数据库 config 集合的 wxConfig，其次环境变量
async function getWxConfig () {
  try {
    const db = database()
    const res = await db.collection('config').doc('wxConfig').get()
    if (res.data && res.data.length > 0) {
      const item = res.data[0]
      if (item.appId && item.appSecret) {
        return { appId: item.appId, appSecret: item.appSecret }
      }
    }
  } catch (err) {
    // 集合不存在时忽略
  }

  const appId = config.wxAppId
  const appSecret = config.wxAppSecret
  if (!appId || !appSecret) {
    console.error('[sendMessage] 缺少 AppID 或 AppSecret：请配置环境变量 WX_APP_ID / WX_APP_SECRET')
  }
  return { appId, appSecret }
}

async function getAccessToken () {
  const { appId, appSecret } = await getWxConfig()
  if (!appId || !appSecret) return null

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
  const res = await axios.get(url, { timeout: 10000 })
  if (res.data && res.data.access_token) return res.data.access_token

  console.error('[sendMessage] 获取 access_token 失败:', res.data)
  return null
}

function formatTime (createTime) {
  const date = createTime ? new Date(createTime) : new Date()
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\//g, '-')
}

exports.main = async (event) => {
  const { action, data } = event || {}

  try {
    if (action !== 'sendOrderNotification') {
      return { code: -1, message: '未知操作' }
    }

    const { orderId, receiverOpenid, creatorName, goodsList, total, remark, createTime } = data || {}

    if (!receiverOpenid) {
      return { code: -1, message: '接收者openid不能为空' }
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      return { code: -1, message: '获取access_token失败，请检查 AppID 和 AppSecret 配置' }
    }

    const orderNumber = orderId ? String(orderId).slice(-8).toUpperCase() : '00000000'
    const goodsText = Array.isArray(goodsList) ? goodsList.join('、') : String(goodsList || '')
    const timeStr = formatTime(createTime)

    const messageData = {
      touser: receiverOpenid,
      template_id: config.wxTemplateId,
      page: 'pages/dining/index',
      data: {
        character_string1: { value: orderNumber },
        thing2: { value: goodsText.substring(0, 20) || '订单商品' },
        time4: { value: timeStr },
        thing9: { value: (remark && String(remark).substring(0, 20)) || '无备注' },
        amount10: { value: `${total}元` }
      }
    }

    const result = await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      messageData,
      { timeout: 10000, headers: { 'content-type': 'application/json' } }
    )

    const resData = result.data
    const parsed = typeof resData === 'string' ? JSON.parse(resData) : resData

    if (parsed && parsed.errcode === 0) {
      return { code: 0, message: '消息发送成功', data: parsed }
    }
    console.error('[sendMessage] 微信返回错误:', parsed)
    return { code: -1, message: `微信错误: ${(parsed && parsed.errmsg) || '未知错误'}`, data: parsed }
  } catch (err) {
    console.error('[sendMessage] 发送消息失败:', err)
    return { code: -1, message: err.message || '发送消息失败' }
  }
}
