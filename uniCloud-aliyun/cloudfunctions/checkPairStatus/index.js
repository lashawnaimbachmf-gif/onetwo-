'use strict';

const db = uniCloud.database();

exports.main = async (event, context) => {
    const { openid } = event;
    
    if (!openid) {
        return {
            code: -1,
            message: '缺少openid'
        };
    }
    
    try {
        // 查询配对记录
        const pairRes = await db.collection('pair').limit(1).get();
        
        // 情况1：还没有配对记录
        if (!pairRes.data || pairRes.data.length === 0) {
            // 生成邀请码
            const inviteCode = generateInviteCode();
            
            // 创建配对记录
            await db.collection('pair').add({
                user1: {
                    openid: openid,
                    createTime: Date.now()
                },
                user2: null,
                inviteCode: inviteCode,
                createTime: Date.now()
            });
            
            return {
                code: 0,
                status: 'creator',
                message: '创建配对成功',
                inviteCode: inviteCode
            };
        }
        
        const pair = pairRes.data[0];
        
        // 情况2：用户已经在配对中（user1 或 user2）
        if (pair.user1?.openid === openid || pair.user2?.openid === openid) {
            return {
                code: 0,
                status: 'allowed',
                message: '已绑定',
                pairId: pair._id
            };
        }
        
        // 情况3：配对已满（2人都有了）
        if (pair.user1?.openid && pair.user2?.openid) {
            return {
                code: -1,
                status: 'full',
                message: '名额已满，此小程序仅限特定用户使用'
            };
        }
        
        // 情况4：配对有1人，需要输入邀请码
        return {
            code: 0,
            status: 'needInvite',
            message: '需要输入邀请码',
            pairId: pair._id
        };
        
    } catch (err) {
        console.error('检查配对状态失败:', err);
        return {
            code: -1,
            message: '检查失败: ' + err.message
        };
    }
};

// 生成6位邀请码
function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
