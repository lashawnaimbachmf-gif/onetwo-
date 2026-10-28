const db = uniCloud.database()

exports.main = async (event, context) => {
    const { action, code, userInfo } = event
    
    // 提前定义 users 集合引用，避免重复定义
    const userCollection = db.collection('users')
    
    try {
        // 确保集合存在
        try {
            await db.createCollection('invite_codes')
        } catch (e) {
            // 集合已存在，忽略错误
        }
        
        switch(action) {
            case 'create':
                // 生成邀请码
                const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
                
                // 保存到数据库
                await db.collection('invite_codes').add({
                    code: newCode,
                    creatorOpenid: userInfo.openid,
                    creatorInfo: userInfo,
                    createTime: Date.now(),
                    isUsed: false
                })
                
                return {
                    code: 0,
                    message: '生成成功',
                    data: { code: newCode }
                }
                
            case 'check':
                // 查询邀请码
                const result = await db.collection('invite_codes').where({
                    code: code,
                    isUsed: false
                }).get()
                
                if (result.data.length === 0) {
                    return {
                        code: -1,
                        message: '邀请码不存在或已被使用'
                    }
                }
                
                const inviteData = result.data[0]
                
                // 检查是否是自己
                if (inviteData.creatorOpenid === userInfo.openid) {
                    return {
                        code: -1,
                        message: '不能绑定自己'
                    }
                }
                
                return {
                    code: 0,
                    message: '查询成功',
                    data: {
                        creatorInfo: inviteData.creatorInfo,
                        creatorOpenid: inviteData.creatorOpenid
                    }
                }
                
            case 'bind':
                // 绑定 - 标记邀请码为已使用，并创建双向绑定记录
                const checkResult = await db.collection('invite_codes').where({
                    code: code,
                    isUsed: false
                }).get()
                
                if (checkResult.data.length === 0) {
                    return {
                        code: -1,
                        message: '邀请码不存在或已被使用'
                    }
                }
                
                const inviteInfo = checkResult.data[0]
                
                if (inviteInfo.creatorOpenid === userInfo.openid) {
                    return {
                        code: -1,
                        message: '不能绑定自己'
                    }
                }
                
                // 更新为已使用
                await db.collection('invite_codes').doc(inviteInfo._id).update({
                    isUsed: true,
                    partnerOpenid: userInfo.openid,
                    partnerInfo: userInfo,
                    bindTime: Date.now()
                })
                
                // 创建反向绑定记录（让B用户也能看到A用户）
                const reverseCode = Math.random().toString(36).substring(2, 8).toUpperCase()
                await db.collection('invite_codes').add({
                    code: reverseCode,
                    creatorOpenid: userInfo.openid,
                    creatorInfo: userInfo,
                    isUsed: true,
                    partnerOpenid: inviteInfo.creatorOpenid,
                    partnerInfo: inviteInfo.creatorInfo,
                    bindTime: Date.now(),
                    isReverse: true // 标记为反向绑定记录
                })
                
                // 同时在 users 表中更新双方的绑定关系（更稳定的存储）
                // 更新A用户（邀请码创建者）的绑定信息
                await userCollection.where({ openid: inviteInfo.creatorOpenid }).update({
                    isBind: true,
                    partnerOpenid: userInfo.openid,
                    partnerInfo: userInfo,
                    bindTime: Date.now()
                })
                
                // 更新B用户（当前用户）的绑定信息
                await userCollection.where({ openid: userInfo.openid }).update({
                    isBind: true,
                    partnerOpenid: inviteInfo.creatorOpenid,
                    partnerInfo: inviteInfo.creatorInfo,
                    bindTime: Date.now()
                })
                
                return {
                    code: 0,
                    message: '绑定成功',
                    data: {
                        partnerInfo: inviteInfo.creatorInfo,
                        partnerOpenid: inviteInfo.creatorOpenid
                    }
                }
                
            case 'checkReverse':
                // 检查是否有反向绑定记录（别人绑定了自己）
                console.log('checkReverse 被调用，userInfo:', userInfo)
                
                if (!userInfo || !userInfo.openid) {
                    console.log('userInfo 或 openid 为空')
                    return {
                        code: -1,
                        message: '用户信息不完整',
                        data: { hasBind: false }
                    }
                }
                
                // 优先从 users 表查询绑定关系（更稳定）
                const userResult = await userCollection.where({
                    openid: userInfo.openid,
                    isBind: true
                }).get()
                
                console.log('users表查询结果:', userResult)
                
                if (userResult.data.length > 0 && userResult.data[0].partnerInfo) {
                    const userData = userResult.data[0]
                    console.log('从users表找到绑定记录:', userData)
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
                
                // 兼容旧数据：从 invite_codes 表查询
                const reverseResult = await db.collection('invite_codes').where({
                    creatorOpenid: userInfo.openid,
                    isUsed: true,
                    isReverse: true
                }).get()
                
                console.log('invite_codes表查询结果:', reverseResult)
                
                if (reverseResult.data.length > 0) {
                    const reverseData = reverseResult.data[0]
                    console.log('从invite_codes表找到反向绑定记录:', reverseData)
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
                
                console.log('未找到绑定记录')
                return {
                    code: 0,
                    message: '查询成功',
                    data: {
                        hasBind: false
                    }
                }
                
            default:
                return {
                    code: -1,
                    message: '未知操作'
                }
        }
    } catch (err) {
        console.error('邀请码操作失败:', err)
        return {
            code: -1,
            message: '操作失败: ' + err.message
        }
    }
}
