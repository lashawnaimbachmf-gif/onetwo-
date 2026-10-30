'use strict'

// 微信配置（AppSecret 通过环境变量 WX_APP_SECRET 注入，不入库）
const WX_CONFIG = {
    appId: process.env.WX_APP_ID || 'wx6504ea4a7c468135',
    appSecret: process.env.WX_APP_SECRET || ''
}

// 订阅消息模板
const TEMPLATE_ORDER = '0IKc45bcYw7j_ASZPc8ajIZ7pJ05ruH0c3zbGFbqEzE'       // 点餐通知
const TEMPLATE_NOTE_ONCE = 'yRQxcy32JTUx1RntbCt0zqX8zK9o3xQn6dB_4PHxdRo'  // 便签一次性提醒（含剩余天数）
const TEMPLATE_NOTE_DAILY = 'yRQxcy32JTUx1RntbCt0zn48yYVnjMMoM7M9z0q7CVU' // 便签每天重复提醒

// 内存缓存 token（云函数冷启动后有效，节省每次都调微信接口的开销）
let cachedToken = null
let tokenExpireAt = 0

// 获取 access_token（带内存缓存，有效期2小时）
async function getAccessToken() {
    // 检查内存缓存是否有效（提前5分钟过期，留余量）
    if (cachedToken && Date.now() < tokenExpireAt - 5 * 60 * 1000) {
        return cachedToken
    }

    try {
        const { appId, appSecret } = WX_CONFIG
        if (!appId || !appSecret) return null

        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`

        const res = await uniCloud.httpclient.request(url, {
            method: 'GET',
            dataType: 'json'
        })

        if (res.data && res.data.access_token) {
            cachedToken = res.data.access_token
            // 微信返回 expires_in 单位是秒，提前5分钟视为过期
            tokenExpireAt = Date.now() + (res.data.expires_in - 300) * 1000
            return cachedToken
        }
        return null
    } catch (err) {
        return null
    }
}

// 发送单条订阅消息
async function sendSubscribeMessage(accessToken, messageData) {
    const result = await uniCloud.httpclient.request(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        { method: 'POST', contentType: 'json', data: messageData }
    )

    const resData = result.data
    if (typeof resData === 'string') {
        try {
            const parsed = JSON.parse(resData)
            return parsed
        } catch (e) {
            return { errcode: -1, errmsg: '解析微信返回结果失败' }
        }
    }
    return resData
}

// 格式化时间为中文格式
function formatTimeCN(date) {
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

// ── 发送点餐通知 ────────────────────────────────
async function handleOrderNotification(data, accessToken) {
    const { orderId, receiverOpenid, creatorName, goodsList, total, remark, createTime } = data

    if (!receiverOpenid) {
        return { code: -1, message: '接收者openid不能为空' }
    }

    const orderNumber = orderId ? orderId.substring(orderId.length - 8).toUpperCase() : '00000000'

    let timeStr
    if (createTime) {
        timeStr = formatTimeCN(new Date(createTime))
    } else {
        timeStr = formatTimeCN(new Date())
    }

    const messageData = {
        touser: receiverOpenid,
        template_id: TEMPLATE_ORDER,
        page: 'pages/dining/index',
        data: {
            character_string1: { value: orderNumber },
            thing2: { value: goodsList.substring(0, 20) || '订单商品' },
            time4: { value: timeStr },
            thing9: { value: (remark && remark.substring(0, 20)) || '无备注' },
            amount10: { value: `${total}元` }
        }
    }

    const result = await sendSubscribeMessage(accessToken, messageData)

    if (result.errcode === 0) {
        return { code: 0, message: '点餐通知发送成功', data: result }
    }
    return { code: -1, message: '微信错误: ' + (result.errmsg || '未知错误'), data: result }
}

// ── 发送便签提醒 ────────────────────────────────
async function handleNoteReminder(note, accessToken) {
    if (!note.creatorOpenid) {
        return { code: -1, message: '缺少接收者openid' }
    }

    const isDaily = note.repeatType === 'daily'
    const templateId = isDaily ? TEMPLATE_NOTE_DAILY : TEMPLATE_NOTE_ONCE

    const title = (note.title || '便签提醒').substring(0, 20)
    const content = (note.content || '点击查看详情').substring(0, 20)

    // 提醒时间格式化
    let remindTimeStr
    if (note.remindTimestamp) {
        remindTimeStr = formatTimeCN(new Date(note.remindTimestamp))
    } else if (note.remindTime) {
        // 每天重复只有时间没有日期，用今天拼一个
        const today = getDateStr(new Date())
        remindTimeStr = formatTimeCN(new Date(today + 'T' + note.remindTime))
    } else {
        remindTimeStr = formatTimeCN(new Date())
    }

    const data = {
        touser: note.creatorOpenid,
        template_id: templateId,
        page: 'pages/home/notes/index',
        data: {
            thing1: { value: title },
            thing2: { value: content },
            time3: { value: remindTimeStr }
        }
    }

    // 一次性提醒附带剩余天数
    if (!isDaily && note.remindTimestamp) {
        const remainMs = note.remindTimestamp - Date.now()
        const remainDays = Math.max(0, Math.ceil(remainMs / (1000 * 60 * 60 * 24)))
        data.data.number7 = { value: remainDays }
    }

    const result = await sendSubscribeMessage(accessToken, data)

    return {
        code: result.errcode === 0 ? 0 : -1,
        message: result.errcode === 0 ? '提醒发送成功' : '微信错误: ' + (result.errmsg || '未知错误'),
        data: result
    }
}

// ── 定时触发器：检查并发送到期提醒 ─────────────────
async function handleTimerCheck() {
    const db = uniCloud.database()
    const now = Date.now()
    const nowDateStr = getDateStr(new Date())       // "2024-06-15"
    const nowTimeStr = getTimeStr(new Date())       // "14:30"
    const results = []

    try {
        // 1. 查询一次性提醒：remindTimestamp <= now 且未发送
        const oneTimeRes = await db.collection('sticky_notes')
            .where({
                isRemindEnabled: true,
                repeatType: 'none',
                reminderSent: false,
                remindTimestamp: db.command.lte(now)
            })
            .limit(50)
            .get()

        const oneTimeNotes = oneTimeRes.data || []
        console.log(`[定时检查] 一次性提醒: ${oneTimeNotes.length} 条到期`)

        // 2. 查询每天重复提醒：提醒时间匹配当前时分（允许前后1分钟误差）
        const dailyRes = await db.collection('sticky_notes')
            .where({
                isRemindEnabled: true,
                repeatType: 'daily'
            })
            .limit(50)
            .get()

        // 筛选今天未完成且提醒时间匹配的 daily 便签
        const dailyNotes = (dailyRes.data || []).filter(note => {
            if (note.lastCompletedDate === nowDateStr) return false   // 今天已完成
            if (!note.remindTime) return false
            // remindTime 格式为 "HH:MM"，与当前时间比较（允许0-1分钟误差）
            return note.remindTime === nowTimeStr
        })
        console.log(`[定时检查] 每天重复提醒: ${dailyNotes.length} 条匹配当前时间 ${nowTimeStr}`)

        const allNotes = [...oneTimeNotes, ...dailyNotes]
        if (allNotes.length === 0) {
            return { code: 0, message: '暂无到期提醒', checkedAt: now }
        }

        const accessToken = await getAccessToken()
        if (!accessToken) {
            return { code: -1, message: '获取access_token失败' }
        }

        for (const note of allNotes) {
            const sendResult = await handleNoteReminder(note, accessToken)
            results.push({
                noteId: note._id,
                title: note.title,
                success: sendResult.code === 0,
                message: sendResult.message
            })

            // 标记已发送（一次性提醒标记为已发送，每日提醒更新最后提醒时间+重置当天时间戳）
            if (note.repeatType === 'daily') {
                // 更新 remindTimestamp 到明天同一时间
                const tomorrow = new Date(now + 24 * 60 * 60 * 1000)
                const tomorrowStr = getDateStr(tomorrow)
                const newTimestamp = new Date(tomorrowStr + 'T' + note.remindTime).getTime()
                await db.collection('sticky_notes').doc(note._id).update({
                    remindTimestamp: newTimestamp
                })
            } else {
                await db.collection('sticky_notes').doc(note._id).update({
                    reminderSent: true
                })
            }
        }

        return {
            code: 0,
            message: `处理了 ${results.length} 条提醒`,
            data: { results, checkedAt: now }
        }
    } catch (err) {
        console.error('定时检查失败:', err)
        return { code: -1, message: '定时检查失败: ' + err.message }
    }
}

function getDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getTimeStr(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// ── 主入口 ──────────────────────────────────────
exports.main = async (event, context) => {
    // 定时触发器调用
    if (event.trigger === 'timer') {
        console.log('[sendMessage] 定时触发器执行:', new Date().toISOString())
        return await handleTimerCheck()
    }

    const { action, data } = event

    try {
        if (action === 'sendOrderNotification') {
            const accessToken = await getAccessToken()
            if (!accessToken) {
                return { code: -1, message: '获取access_token失败' }
            }
            return await handleOrderNotification(data, accessToken)
        }

        if (action === 'sendNoteReminder') {
            const accessToken = await getAccessToken()
            if (!accessToken) {
                return { code: -1, message: '获取access_token失败' }
            }
            return await handleNoteReminder(data, accessToken)
        }

        // 支持手动触发定时检查（调试用）
        if (action === 'checkReminders') {
            return await handleTimerCheck()
        }

        return { code: -1, message: '未知操作' }
    } catch (err) {
        return { code: -1, message: err.message || '发送消息失败' }
    }
}
