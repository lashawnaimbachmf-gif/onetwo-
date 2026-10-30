<template>
    <view class="login-page">
        <nav-back />

        <!-- Title -->
        <view class="nav-bar">
            <text class="nav-title">登录</text>
        </view>

        <!-- Brand -->
        <view class="brand-area">
            <text class="brand-wordmark">onetwo空间</text>
            <text class="brand-subtitle">二人世界</text>
        </view>

        <!-- Actions -->
        <view class="action-area">
            <view v-if="!isLogin" class="login-actions">
                <button class="btn-wechat" @click="wxLogin">微信一键登录</button>
                <text class="alt-login" @click="phoneLogin">手机号登录</text>
            </view>

            <view v-else class="welcome-actions">
                <view class="avatar-box">
                    <image class="avatar-img" :src="userInfo.avatarUrl || '/static/tabbar/user.png'" mode="aspectFill" />
                </view>
                <text class="welcome-text">{{ userInfo.nickName || '亲爱的' }}，欢迎回来</text>
                <button class="btn-enter" @click="enterHome">进入小窝</button>
            </view>
        </view>

        <!-- Footer -->
        <view class="footer-area">
            <text class="footer-text">登录即表示同意《用户协议》和《隐私政策》</text>
        </view>

        <!-- 完善资料弹框 -->
        <view class="popup-mask" v-if="showCompletePopup" @click="preventClose">
            <view class="popup-card" @click.stop>
                <text class="popup-title">完善资料</text>
                <text class="popup-desc">设置你的专属头像和昵称</text>

                <!-- 头像 -->
                <view class="popup-avatar-wrap">
                    <button class="avatar-picker" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
                        <image class="avatar-picker-img" :src="completeAvatarUrl || userInfo.avatarUrl || '/static/tabbar/user.png'" mode="aspectFill" />
                        <view class="avatar-picker-badge">
                            <text class="badge-text">点击更换</text>
                        </view>
                    </button>
                </view>

                <!-- 昵称 -->
                <view class="popup-input-wrap">
                    <input
                        class="popup-nickname-input"
                        type="nickname"
                        v-model="completeNickName"
                        placeholder="请输入昵称"
                        @blur="onNickNameBlur"
                    />
                </view>

                <!-- 保存 -->
                <button class="popup-save-btn" @click="saveCompleteInfo">保存并进入</button>

                <!-- 跳过 -->
                <text class="popup-skip" @click="skipComplete">跳过，直接进入</text>
            </view>
        </view>

    </view>
</template>

<script>
import cloud from '@/utils/cloud.js'
import UserManager from '@/utils/user.js'
import UploadUtil from '@/utils/upload.js'
import NavBack from '@/components/NavBack.vue'

export default {
    components: { NavBack },
    data() {
        return {
            isLogin: false,
            userInfo: {},
            showCompletePopup: false,
            completeAvatarUrl: '',
            completeNickName: ''
        }
    },
    onLoad() {
        this.checkLoginStatus()
    },
    onShow() {
        this.checkLoginStatus()
    },
    methods: {
        checkLoginStatus() {
            const token = UserManager.getToken()
            const userInfo = UserManager.getUserInfo()

            if (token && userInfo.openid) {
                this.isLogin = true
                this.userInfo = userInfo
            } else {
                this.isLogin = false
            }
        },
        skipLogin() {
            uni.switchTab({ url: '/pages/home/index' })
        },
        phoneLogin() {
            uni.showToast({ title: '手机号登录即将上线', icon: 'none' })
        },
        wxLogin() {
            // 微信 getUserProfile 需要在 privacy.json 中声明，已改为不调用
            // 后续可以让用户自己在"完善资料"页面填昵称头像
            this.userInfo = {
                nickName: '微信用户',
                avatarUrl: '',
                gender: 0
            }

            uni.login({
                provider: 'weixin',
                success: (loginRes) => {
                    const code = loginRes.code

                    uni.setStorageSync('token', 'love_token_' + Date.now())
                    uni.setStorageSync('user_info', this.userInfo)
                    uni.setStorageSync('user_id', 'user_' + Date.now())
                    uni.setStorageSync('wx_code', code)

                    // 调云端登录，成功后弹出完善资料弹框
                    this.requestLogin(code, this.userInfo).then(() => {
                        this.completeNickName = this.userInfo.nickName || ''
                        this.completeAvatarUrl = this.userInfo.avatarUrl || ''
                        this.showCompletePopup = true
                    })
                },
                fail: (err) => {
                    console.error('登录失败:', err)
                    uni.showToast({ title: '微信登录失败', icon: 'none' })
                }
            })
        },
        async requestLogin(code, userInfo) {
            try {
                const appid = uni.getAccountInfoSync().miniProgram.appId

                const res = await cloud.callFunction({
                    name: 'wxLogin',
                    data: {
                        code: code,
                        userInfo: userInfo,
                        appid: appid
                    }
                })

                if (res.result && res.result.code === 0) {
                    const { token, openid } = res.result.data

                    const userData = {
                        nickName: userInfo.nickName || '微信用户',
                        avatarUrl: userInfo.avatarUrl || '',
                        gender: userInfo.gender || 0,
                        openid: openid
                    }

                    UserManager.setToken(token)
                    UserManager.setOpenid(openid)
                    UserManager.setUserInfo(userData)
                    uni.setStorageSync('wx_code', code)

                    this.userInfo = userData
                } else {
                    console.warn('云端登录失败，使用本地模式:', res && res.result ? res.result.message : undefined)
                    this.localLogin(userInfo)
                }
            } catch (err) {
                console.error('云端登录失败:', err)
                this.localLogin(userInfo)
            }
        },

        localLogin(userInfo) {
            const token = 'token_' + Date.now()
            const openid = 'openid_' + Date.now()

            const userData = {
                nickName: userInfo.nickName || '微信用户',
                avatarUrl: userInfo.avatarUrl || '',
                gender: userInfo.gender || 0,
                openid: openid
            }

            UserManager.setToken(token)
            UserManager.setOpenid(openid)
            UserManager.setUserInfo(userData)

            this.userInfo = userData
        },

        enterHome() {
            uni.switchTab({ url: '/pages/home/index' })
        },

        // ── 弹框：完善资料 ──────────────────────────
        onChooseAvatar(e) {
            this.completeAvatarUrl = e.detail.avatarUrl
        },
        onNickNameBlur(e) {
            this.completeNickName = e.detail.value
        },
        async saveCompleteInfo() {
            if (!this.completeNickName.trim()) {
                uni.showToast({ title: '请输入昵称', icon: 'none' })
                return
            }

            uni.showLoading({ title: '保存中...' })

            // 上传头像到云存储
            let cloudAvatarUrl = this.completeAvatarUrl
            if (this.completeAvatarUrl && !UploadUtil.isRemoteUrl(this.completeAvatarUrl)) {
                cloudAvatarUrl = await UploadUtil.uploadImage(this.completeAvatarUrl, 'avatars')
            }

            const currentInfo = UserManager.getUserInfo()

            const userInfo = {
                nickName: this.completeNickName.trim(),
                avatarUrl: cloudAvatarUrl || '/static/tabbar/user.png',
                gender: 0,
                openid: currentInfo.openid || ''
            }

            UserManager.setUserInfo(userInfo)
            this.userInfo = userInfo

            // 更新云端 users 表
            try {
                await cloud.callFunction({
                    name: 'dataService',
                    data: {
                        action: 'update',
                        collection: 'users',
                        openid: userInfo.openid,
                        where: {
                            openid: userInfo.openid
                        },
                        data: {
                            nickName: userInfo.nickName,
                            avatarUrl: userInfo.avatarUrl,
                            updateTime: Date.now()
                        }
                    }
                })
            } catch (err) {
                console.error('云端用户信息更新失败:', err)
            }

            uni.hideLoading()
            this.showCompletePopup = false
            uni.showToast({ title: '保存成功', icon: 'success' })

            setTimeout(() => {
                uni.switchTab({ url: '/pages/home/index' })
            }, 800)
        },
        skipComplete() {
            this.showCompletePopup = false
            uni.switchTab({ url: '/pages/home/index' })
        },
        preventClose() {
            // 点击 mask 不关闭，必须选择保存或跳过
        }
    }
}
</script>

<style scoped>
/* ── Page ─────────────────────────────────────────── */
.login-page {
    min-height: 100vh;
    background: #FFFFFF;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 64rpx;
}

/* ── Nav Bar — Frosted Glass ──────────────────────── */
.nav-bar {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: calc(var(--status-bar-height) + 24rpx);
    padding-bottom: 16rpx;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(16rpx);
    -webkit-backdrop-filter: blur(16rpx);
    position: sticky;
    top: 0;
    z-index: 10;
}

.nav-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1A1A1A;
    letter-spacing: 2rpx;
}

/* ── Brand ────────────────────────────────────────── */
.brand-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 200rpx;
    padding-bottom: 120rpx;
}

.brand-wordmark {
    font-size: 40rpx;
    font-weight: 500;
    color: #1A1A1A;
    letter-spacing: 10rpx;
}

.brand-subtitle {
    font-size: 24rpx;
    color: #BBBBBB;
    margin-top: 20rpx;
    letter-spacing: 6rpx;
}

/* ── Actions ──────────────────────────────────────── */
.action-area {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.login-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.btn-wechat {
    width: 100%;
    max-width: 420rpx;
    height: 96rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30rpx;
    font-weight: 500;
    border-radius: 56rpx;
    border: none;
    background: #07C160;
    color: #FFFFFF;
    box-shadow: 0 8rpx 32rpx rgba(7, 193, 96, 0.2);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.btn-wechat::after {
    border: none;
}

.btn-wechat:active {
    opacity: 0.82;
    transform: scale(0.97);
    box-shadow: 0 4rpx 16rpx rgba(7, 193, 96, 0.16);
}

.alt-login {
    font-size: 26rpx;
    color: #B0B0B0;
    margin-top: 44rpx;
    padding: 8rpx 16rpx;
}


/* ── Welcome (already logged in) ──────────────────── */
.welcome-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.avatar-box {
    width: 112rpx;
    height: 112rpx;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: 32rpx;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.avatar-img {
    width: 100%;
    height: 100%;
}

.welcome-text {
    font-size: 32rpx;
    font-weight: 500;
    color: #1A1A1A;
    margin-bottom: 48rpx;
}

.btn-enter {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    font-weight: 500;
    padding: 28rpx 0;
    border-radius: 56rpx;
    border: none;
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    color: #FFFFFF;
    box-shadow: 0 10rpx 36rpx rgba(255, 107, 157, 0.22), 0 2rpx 8rpx rgba(255, 107, 157, 0.12);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.btn-enter:active {
    transform: scale(0.97);
    opacity: 0.92;
    box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.18);
}

/* ── Footer ───────────────────────────────────────── */
.footer-area {
    margin-top: auto;
    padding-bottom: 80rpx;
}

.footer-text {
    font-size: 22rpx;
    color: #CCCCCC;
}

/* ── 完善资料弹框 ────────────────────────────────── */
.popup-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(26, 26, 26, 0.45);
    backdrop-filter: blur(8rpx);
    -webkit-backdrop-filter: blur(8rpx);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.popup-card {
    width: 600rpx;
    background: #FFFFFF;
    border-radius: 40rpx;
    padding: 56rpx 52rpx 52rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 24rpx 80rpx rgba(0, 0, 0, 0.12), 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.popup-title {
    font-size: 34rpx;
    font-weight: 700;
    color: #1A1A1A;
    margin-bottom: 10rpx;
}

.popup-desc {
    font-size: 26rpx;
    color: #999999;
    margin-bottom: 48rpx;
}

/* Avatar picker */
.popup-avatar-wrap {
    margin-bottom: 40rpx;
}

.avatar-picker {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    padding: 0;
    margin: 0;
    background: #FFF5F8;
    border: 4rpx dashed #FFB8D0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
}

.avatar-picker::after {
    border: none;
}

.avatar-picker:active {
    transform: scale(0.96);
    border-color: #FF6B9D;
}

.avatar-picker-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
}

.avatar-picker-badge {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.45);
    padding: 10rpx 0;
    text-align: center;
}

.badge-text {
    font-size: 20rpx;
    color: #FFFFFF;
}

/* Nickname input */
.popup-input-wrap {
    width: 100%;
    margin-bottom: 48rpx;
}

.popup-nickname-input {
    width: 100%;
    height: 96rpx;
    background: #F7F8FA;
    border-radius: 20rpx;
    padding: 0 28rpx;
    font-size: 32rpx;
    color: #1A1A1A;
    text-align: center;
    box-sizing: border-box;
}

/* Save button */
.popup-save-btn {
    width: 100%;
    height: 96rpx;
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    color: #FFFFFF;
    font-size: 32rpx;
    font-weight: 600;
    border-radius: 48rpx;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 28rpx rgba(255, 107, 157, 0.25);
    transition: transform 0.15s ease, opacity 0.15s ease;
}

.popup-save-btn::after {
    border: none;
}

.popup-save-btn:active {
    transform: scale(0.97);
    opacity: 0.92;
}

/* Skip link */
.popup-skip {
    font-size: 26rpx;
    color: #B0B0B0;
    margin-top: 32rpx;
    padding: 8rpx 16rpx;
}
</style>
