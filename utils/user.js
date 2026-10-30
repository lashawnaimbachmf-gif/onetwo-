/**
 * 用户信息及关系管理
 * 包含用户信息、伴侣数据、邀请码相关功能
 */

const USER_KEY = 'user_info'
const PARTNER_KEY = 'partner_info'
const IS_BIND_KEY = 'is_bind'
const TOKEN_KEY = 'token'
const OPENID_KEY = 'openid'

export default {
    getUserInfo() {
        const stored = uni.getStorageSync(USER_KEY)
        if (stored) return stored
        return {
            nickName: '我',
            avatarUrl: '/static/tabbar/user.png',
            openid: ''
        }
    },

    setUserInfo(userInfo) {
        uni.setStorageSync(USER_KEY, userInfo)
    },

    getPartnerInfo() {
        return uni.getStorageSync(PARTNER_KEY) || null
    },

    setPartnerInfo(partnerInfo) {
        uni.setStorageSync(PARTNER_KEY, partnerInfo)
        uni.setStorageSync(IS_BIND_KEY, true)
    },

    isBind() {
        return uni.getStorageSync(IS_BIND_KEY) || false
    },

    unbind() {
        uni.removeStorageSync(PARTNER_KEY)
        uni.setStorageSync(IS_BIND_KEY, false)
    },

    getOpenid() {
        return uni.getStorageSync(OPENID_KEY) || ''
    },

    setOpenid(openid) {
        uni.setStorageSync(OPENID_KEY, openid)
    },

    getToken() {
        return uni.getStorageSync(TOKEN_KEY) || ''
    },

    setToken(token) {
        uni.setStorageSync(TOKEN_KEY, token)
    },

    getCoupleOpenids() {
        const myOpenid = this.getOpenid()
        const partner = this.getPartnerInfo()
        const openids = [myOpenid]
        if (partner && partner.openid) {
            openids.push(partner.openid)
        }
        return openids
    },

    isMyData(dataOpenid) {
        return dataOpenid === this.getOpenid()
    },

    getDisplayName(dataOpenid) {
        if (this.isMyData(dataOpenid)) {
            return this.getUserInfo().nickName
        } else {
            const partner = this.getPartnerInfo()
            return partner ? partner.nickName : 'TA'
        }
    },

    getDisplayAvatar(dataOpenid) {
        if (this.isMyData(dataOpenid)) {
            return this.getUserInfo().avatarUrl
        } else {
            const partner = this.getPartnerInfo()
            return partner ? partner.avatarUrl : '/static/tabbar/user.png'
        }
    },

    async generateInviteCode() {
        try {
            const userInfo = this.getUserInfo()
            if (!userInfo.openid) {
                const code = Math.random().toString(36).substring(2, 8).toUpperCase()
                uni.setStorageSync('my_invite_code', code)
                return code
            }
            const res = await wx.cloud.callFunction({
                name: 'inviteCode',
                data: { action: 'create', userInfo }
            })
            if (res.result && res.result.code === 0) {
                const code = res.result.data.code
                uni.setStorageSync('my_invite_code', code)
                return code
            } else {
                throw new Error(res.result ? res.result.message : '邀请码生成异常')
            }
        } catch (err) {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase()
            uni.setStorageSync('my_invite_code', code)
            return code
        }
    },

    async bindByInviteCode(code) {
        try {
            const userInfo = this.getUserInfo()
            if (!userInfo.openid) {
                return { success: false, message: '尚未登录，请先登录' }
            }
            const res = await wx.cloud.callFunction({
                name: 'inviteCode',
                data: { action: 'bind', code, userInfo }
            })
            if (res.result && res.result.code === 0) {
                const partnerInfo = {
                    ...(res.result.data.partnerInfo || {}),
                    openid: res.result.data.partnerOpenid
                }
                this.setPartnerInfo(partnerInfo)
                return { success: true, message: '绑定成功' }
            } else {
                return { success: false, message: res.result ? res.result.message : '邀请码服务异常' }
            }
        } catch (err) {
            return { success: false, message: err.message || '绑定失败' }
        }
    },

    clearAll() {
        uni.removeStorageSync(USER_KEY)
        uni.removeStorageSync(PARTNER_KEY)
        uni.removeStorageSync(IS_BIND_KEY)
        uni.removeStorageSync(TOKEN_KEY)
        uni.removeStorageSync(OPENID_KEY)
    }
}
