const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 缓存集合引用
const userCollection = db.collection('users')
const inviteCodesCollection = db.collection('invite_codes')

exports.main = async (event, context) => {
    const { action, code, userInfo } = event

    // ── 鉴权：所有操作需要登录 ────────────────────
    if (!userInfo || !userInfo.openid) {
        return { code: -1, message: '请先登录' }
    }
    // 验证 openid 来源合法性（通过 wxLogin 写入 users 表才有效）
    const userCheck = await userCollection.where({ openid: userInfo.openid }).get()
    if (userCheck.data.length === 0) {
        return { code: -1, message: '用户不存在，请先登录' }
    }

    try {
        switch (action) {
            case 'create': {
                const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
                await inviteCodesCollection.add({
                    code: newCode,
                    creatorOpenid: userInfo.openid,
                    creatorInfo: {
                        nickName: userInfo.nickName || '',
                        avatarUrl: userInfo.avatarUrl || ''
                    },
                    createTime: Date.now(),
                    isUsed: false
                })
                return { code: 0, message: '生成成功', data: { code: newCode } }
            }

            case 'check': {
                const result = await inviteCodesCollection.where({
                    code: code,
                    isUsed: false
                }).get()

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
                    data: {
                        creatorInfo: inviteData.creatorInfo,
                        creatorOpenid: inviteData.creatorOpenid
                    }
                }
            }

            case 'bind': {
                // 查询邀请码
                const checkResult = await inviteCodesCollection.where({
                    code: code,
                    isUsed: false
                }).get()

                if (checkResult.data.length === 0) {
                    return { code: -1, message: '邀请码不存在或已被使用' }
                }

                const inviteInfo = checkResult.data[0]
                if (inviteInfo.creatorOpenid === userInfo.openid) {
                    return { code: -1, message: '不能绑定自己' }
                }

                // 构建双方信息用于互写
                let creatorInfo = inviteInfo.creatorInfo || null
                if (!creatorInfo || !creatorInfo.nickName) {
                    const creatorUser = await userCollection.where({ openid: inviteInfo.creatorOpenid }).get()
                    if (creatorUser.data.length > 0) {
                        creatorInfo = {
                            nickName: creatorUser.data[0].nickName || '',
                            avatarUrl: creatorUser.data[0].avatarUrl || ''
                        }
                    } else {
                        creatorInfo = { nickName: '', avatarUrl: '' }
                    }
                }
                const binderInfo = {
                    nickName: userInfo.nickName || '',
                    avatarUrl: userInfo.avatarUrl || ''
                }

                // 并行执行所有写操作，减少总耗时
                await Promise.all([
                    // 标记邀请码为已使用
                    inviteCodesCollection.doc(inviteInfo._id).update({
                        isUsed: true,
                        partnerOpenid: userInfo.openid,
                        partnerInfo: binderInfo,
                        bindTime: Date.now()
                    }),
                    // 创建反向绑定记录
                    inviteCodesCollection.add({
                        code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                        creatorOpenid: userInfo.openid,
                        creatorInfo: binderInfo,
                        isUsed: true,
                        partnerOpenid: inviteInfo.creatorOpenid,
                        partnerInfo: creatorInfo,
                        bindTime: Date.now(),
                        isReverse: true
                    }),
                    // 更新邀请者（A）的绑定信息
                    userCollection.where({ openid: inviteInfo.creatorOpenid }).update({
                        isBind: true,
                        partnerOpenid: userInfo.openid,
                        partnerInfo: binderInfo,
                        bindTime: Date.now()
                    }),
                    // 更新当前用户（B）的绑定信息
                    userCollection.where({ openid: userInfo.openid }).update({
                        isBind: true,
                        partnerOpenid: inviteInfo.creatorOpenid,
                        partnerInfo: creatorInfo,
                        bindTime: Date.now()
                    })
                ])

                return {
                    code: 0,
                    message: '绑定成功',
                    data: {
                        partnerInfo: creatorInfo,
                        partnerOpenid: inviteInfo.creatorOpenid
                    }
                }
            }

            case 'checkReverse': {
                if (!userInfo || !userInfo.openid) {
                    return { code: -1, message: '用户信息不完整', data: { hasBind: false } }
                }

                // 优先从 users 表查询（主数据源）
                const userResult = await userCollection.where({
                    openid: userInfo.openid,
                    isBind: true
                }).get()

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

                // 兼容旧数据：从 invite_codes 反向记录查询
                const reverseResult = await inviteCodesCollection.where({
                    creatorOpenid: userInfo.openid,
                    isUsed: true,
                    isReverse: true
                }).limit(1).get()

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
        console.error('邀请码操作失败:', err)
        return { code: -1, message: '操作失败: ' + err.message }
    }
}
