'use strict';

const db = uniCloud.database();

exports.main = async (event, context) => {
    const { openid, inviteCode } = event;
    
    if (!openid || !inviteCode) {
        return {
            code: -1,
            message: '缺少参数'
        };
    }
    
    try {
        // 查找配对记录
        const pairRes = await db.collection('pair')
            .where({
                inviteCode: inviteCode.toUpperCase()
            })
            .limit(1)
            .get();
        
        if (!pairRes.data || pairRes.data.length === 0) {
            return {
                code: -1,
                message: '邀请码错误'
            };
        }
        
        const pair = pairRes.data[0];
        
        // 检查是否已经是成员
        if (pair.user1?.openid === openid || pair.user2?.openid === openid) {
            return {
                code: 0,
                message: '已经是成员',
                status: 'allowed'
            };
        }
        
        // 检查是否已有user2
        if (pair.user2 && pair.user2.openid) {
            return {
                code: -1,
                message: '邀请码已被使用'
            };
        }
        
        // 绑定为user2
        await db.collection('pair').doc(pair._id).update({
            user2: {
                openid: openid,
                bindTime: Date.now()
            }
        });
        
        return {
            code: 0,
            message: '绑定成功',
            status: 'allowed'
        };
        
    } catch (err) {
        console.error('验证邀请码失败:', err);
        return {
            code: -1,
            message: '验证失败: ' + err.message
        };
    }
};
