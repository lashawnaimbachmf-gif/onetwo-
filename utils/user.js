/**
 * 用户管理工具类
 * 管理用户信息、配对关系、数据共享
 */

const USER_KEY = 'user_info'
const PARTNER_KEY = 'partner_info'
const IS_BIND_KEY = 'is_bind'
const TOKEN_KEY = 'token'
const OPENID_KEY = 'openid'

export default {
    // 获取当前用户信息
    getUserInfo() {
        return uni.getStorageSync(USER_KEY) || {
            nickName: '我',
            avatarUrl: '/static/tabbar/user.png',
            openid: ''
        }
    },

    // 设置用户信息
    setUserInfo(userInfo) {
        uni.setStorageSync(USER_KEY, userInfo)
    },

    // 获取伴侣信息
    getPartnerInfo() {
        return uni.getStorageSync(PARTNER_KEY) || null
    },

    // 设置伴侣信息
    setPartnerInfo(partnerInfo) {
        uni.setStorageSync(PARTNER_KEY, partnerInfo)
        uni.setStorageSync(IS_BIND_KEY, true)
    },

    // 是否已配对
    isBind() {
        return uni.getStorageSync(IS_BIND_KEY) || false
    },

    // 解除配对
    unbind() {
        uni.removeStorageSync(PARTNER_KEY)
        uni.setStorageSync(IS_BIND_KEY, false)
    },

    // 获取当前用户openid
    getOpenid() {
        return uni.getStorageSync(OPENID_KEY) || ''
    },

    // 设置openid
    setOpenid(openid) {
        uni.setStorageSync(OPENID_KEY, openid)
    },

    // 获取token
    getToken() {
        return uni.getStorageSync(TOKEN_KEY) || ''
    },

    // 设置token
    setToken(token) {
        uni.setStorageSync(TOKEN_KEY, token)
    },

    // 获取双方openid列表（用于查询数据）
    getCoupleOpenids() {
        const myOpenid = this.getOpenid()
        const partner = this.getPartnerInfo()
        const openids = [myOpenid]
        if (partner && partner.openid) {
            openids.push(partner.openid)
        }
        return openids
    },

    // 检查是否是自己的数据
    isMyData(dataOpenid) {
        return dataOpenid === this.getOpenid()
    },

    // 获取显示名称（自己/对方）
    getDisplayName(dataOpenid) {
        if (this.isMyData(dataOpenid)) {
            return this.getUserInfo().nickName
        } else {
            const partner = this.getPartnerInfo()
            return partner ? partner.nickName : 'TA'
        }
    },

    // 获取显示头像
    getDisplayAvatar(dataOpenid) {
        if (this.isMyData(dataOpenid)) {
            return this.getUserInfo().avatarUrl
        } else {
            const partner = this.getPartnerInfo()
            return partner ? partner.avatarUrl : '/static/tabbar/user.png'
        }
    },

    // 生成邀请码（调用云函数）
    async generateInviteCode() {
        try {
            const userInfo = this.getUserInfo()
            console.log('生成邀请码，用户信息:', userInfo)
            
            // 检查是否有openid
            if (!userInfo.openid) {
                console.warn('用户没有openid，使用本地生成')
                const code = Math.random().toString(36).substring(2, 8).toUpperCase()
                uni.setStorageSync('my_invite_code', code)
                return code
            }
            
            const res = await uniCloud.callFunction({
                name: 'inviteCode',
                data: {
                    action: 'create',
                    userInfo: userInfo
                }
            })
            
            console.log('云函数返回:', res)
            
            if (res.result && res.result.code === 0) {
                const code = res.result.data.code
                uni.setStorageSync('my_invite_code', code)
                return code
            } else {
                const errorMsg = res.result ? res.result.message : '云函数返回异常'
                console.error('生成邀请码失败:', errorMsg)
                throw new Error(errorMsg)
            }
        } catch (err) {
            console.error('生成邀请码失败:', err)
            // 降级到本地生成
            const code = Math.random().toString(36).substring(2, 8).toUpperCase()
            uni.setStorageSync('my_invite_code', code)
            return code
        }
    },

    // 通过邀请码绑定伴侣（调用云函数）
    async bindByInviteCode(code) {
        try {
            const userInfo = this.getUserInfo()
            console.log('绑定邀请码:', code, '用户信息:', userInfo)
            
            // 检查是否有openid
            if (!userInfo.openid) {
                return { success: false, message: '您还未登录，请先登录' }
            }
            
            const res = await uniCloud.callFunction({
                name: 'inviteCode',
                data: {
                    action: 'bind',
                    code: code,
                    userInfo: userInfo
                }
            })
            
            console.log('云函数返回:', res)
            
            if (res.result && res.result.code === 0) {
                // 设置伴侣信息
                this.setPartnerInfo(res.result.data.partnerInfo)
                return { success: true, message: '绑定成功' }
            } else {
                const errorMsg = res.result ? res.result.message : '云函数返回异常'
                return { success: false, message: errorMsg }
            }
        } catch (err) {
            console.error('绑定失败:', err)
            let msg = '绑定失败: ' + (err.message || '请检查网络')
            if (err.message && err.message.includes('not found')) {
                msg = '云函数未部署，请在HBuilderX中上传部署云函数'
            }
            return { success: false, message: msg }
        }
    },

    // 清除所有用户数据（退出登录）
    clearAll() {
        uni.removeStorageSync(USER_KEY)
        uni.removeStorageSync(PARTNER_KEY)
        uni.removeStorageSync(IS_BIND_KEY)
        uni.removeStorageSync(TOKEN_KEY)
        uni.removeStorageSync(OPENID_KEY)
    }
}
