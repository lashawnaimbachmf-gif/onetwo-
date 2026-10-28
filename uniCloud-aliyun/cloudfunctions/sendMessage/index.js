'use strict';

// 获取微信配置（从数据库或硬编码）
async function getWxConfig() {
  try {
    // 方式1：从数据库读取配置（推荐）
    const db = uniCloud.database()
    const configRes = await db.collection('config').doc('wxConfig').get()
    
    if (configRes.data && configRes.data.length > 0) {
      const config = configRes.data[0]
      if (config.appId && config.appSecret) {
        console.log('从数据库读取配置成功')
        return {
          appId: config.appId,
          appSecret: config.appSecret
        }
      }
    }
  } catch (err) {
    console.log('从数据库读取配置失败，使用备用配置')
  }
  
  // 方式2：环境变量 / 本地配置文件（密钥不写入仓库）
  // 参考同目录 config.example.js 创建 config.local.js，或在云函数环境变量中配置
  let localConfig = {}
  try {
    localConfig = require('./config.local.js')
  } catch (err) {
    // 未提供本地配置文件，继续读取环境变量
  }

  const appId = process.env.WX_APP_ID || localConfig.appId || ''
  const appSecret = process.env.WX_APP_SECRET || localConfig.appSecret || ''

  if (!appId || !appSecret) {
    console.error('[sendMessage] 缺少 AppID 或 AppSecret：请配置云函数环境变量 WX_APP_ID / WX_APP_SECRET，或创建 config.local.js')
  }

  return { appId, appSecret }
}

// 获取微信 access_token
async function getAccessToken() {
  try {
    const wxConfig = await getWxConfig()
    const { appId, appSecret } = wxConfig
    
    if (!appId || !appSecret) {
      console.error('缺少 AppID 或 AppSecret，请在代码中填写或数据库中配置')
      return null
    }
    
    console.log('使用 AppID:', appId)
    
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
    
    const res = await uniCloud.httpclient.request(url, {
      method: 'GET',
      dataType: 'json'
    })
    
    if (res.data && res.data.access_token) {
      console.log('获取 access_token 成功')
      return res.data.access_token
    } else {
      console.error('获取 access_token 失败:', res.data)
      return null
    }
  } catch (err) {
    console.error('获取 access_token 异常:', err)
    return null
  }
}

exports.main = async (event, context) => {
  const { action, data } = event
  
  try {
    if (action === 'sendOrderNotification') {
      const { orderId, receiverOpenid, creatorName, goodsList, total, remark, createTime } = data
      
      console.log('发送订阅消息:', { orderId, receiverOpenid, creatorName, goodsList, total, remark, createTime })
      
      // 参数校验
      if (!receiverOpenid) {
        console.error('接收者openid为空')
        return {
          code: -1,
          message: '接收者openid不能为空'
        }
      }
      
      // 获取 access_token
      const accessToken = await getAccessToken()
      
      if (!accessToken) {
        console.error('获取access_token失败')
        return {
          code: -1,
          message: '获取access_token失败，请检查 AppID 和 AppSecret 配置'
        }
      }
      
      // 生成订单号（使用订单ID的后8位）
      const orderNumber = orderId ? orderId.substring(orderId.length - 8).toUpperCase() : '00000000'
      
      // 格式化时间（使用订单创建时间，转换为北京时间）
      let timeStr
      if (createTime) {
        const orderDate = new Date(createTime)
        // 使用 toLocaleString 直接格式化为北京时间
        timeStr = orderDate.toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).replace(/\//g, '-')
      } else {
        // 如果没有创建时间，使用当前时间（北京时间）
        const now = new Date()
        timeStr = now.toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).replace(/\//g, '-')
      }
      
      // 准备消息数据
      const messageData = {
        touser: receiverOpenid,
        template_id: '0IKc45bcYw7j_ASZPc8ajIZ7pJ05ruH0c3zbGFbqEzE',
        page: 'pages/dining/index',
        data: {
          character_string1: {
            value: orderNumber
          },
          thing2: {
            value: goodsList.substring(0, 20) || '订单商品'
          },
          time4: {
            value: timeStr
          },
          thing9: {
            value: (remark && remark.substring(0, 20)) || '无备注'
          },
          amount10: {
            value: `${total}元`
          }
        }
      }
      
      console.log('发送消息数据:', JSON.stringify(messageData))
      
      // 发送订阅消息
      const result = await uniCloud.httpclient.request(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        {
          method: 'POST',
          contentType: 'json',
          data: messageData
        }
      )
      
      console.log('微信API返回结果:', result)
      
      // 解析返回结果
      const resData = result.data
      if (typeof resData === 'string') {
        try {
          const parsed = JSON.parse(resData)
          console.log('解析后的结果:', parsed)
          
          if (parsed.errcode === 0) {
            return {
              code: 0,
              message: '消息发送成功',
              data: parsed
            }
          } else {
            console.error('微信返回错误:', parsed)
            return {
              code: -1,
              message: `微信错误: ${parsed.errmsg || '未知错误'}`,
              data: parsed
            }
          }
        } catch (e) {
          console.error('解析结果失败:', resData)
          return {
            code: -1,
            message: '解析微信返回结果失败',
            data: resData
          }
        }
      }
      
      return {
        code: 0,
        message: '消息发送成功',
        data: resData
      }
    }
    
    return {
      code: -1,
      message: '未知操作'
    }
  } catch (err) {
    console.error('发送消息失败:', err)
    return {
      code: -1,
      message: err.message || '发送消息失败'
    }
  }
}
