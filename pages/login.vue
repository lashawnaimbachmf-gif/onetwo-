<template>
    <view class="login-bg">
        <view class="login-gradient"></view>
        <view class="login-content">
            <view class="login-title-wrap">
                <text class="login-title">onetwo空间</text>
            </view>
            <text class="login-desc">记录我们的美好时光</text>
        </view>
        
        <view class="login-box">
            <!-- 未登录状态 -->
            <view v-if="!isLogin" class="login-section">
                <image class="decor-gif" src="/static/gif/decor.gif" mode="aspectFit" />
                <text class="section-title">欢迎登录</text>
                <text class="section-desc">登录后即可使用全部功能</text>
                <button class="wx-login-btn" @click="wxLogin">
                    <text>微信一键登录</text>
                </button>
            </view>
            
            <!-- 已登录状态 - 直接进入 -->
            <view v-else class="welcome-section">
                <image class="user-avatar-large" :src="userInfo.avatarUrl || '/static/tabbar/user.png'" mode="aspectFit" />
                <text class="user-name">{{ userInfo.nickName || '亲爱的' }}</text>
                <view class="welcome-row">
                    <text class="welcome-text">欢迎回来</text>
                    <image class="decor-gif-small" src="/static/gif/decor.gif" mode="aspectFit" />
                </view>
                <button class="enter-btn" @click="enterHome">进入小窝</button>
            </view>
            

        </view>
        

    </view>
</template>

<script>
import UserManager from '@/utils/user.js'

export default {
    data() {
        return {
            isLogin: false,
            userInfo: {}
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
            // 使用用户管理工具检查登录状态
            const token = UserManager.getToken()
            const userInfo = UserManager.getUserInfo()

            if (token && userInfo.openid) {
                this.isLogin = true
                this.userInfo = userInfo
            } else {
                this.isLogin = false
            }
        },
        wxLogin() {
            // 先获取用户信息（必须在用户点击按钮时直接调用）
            uni.getUserProfile({
                desc: '用于完善用户资料',
                success: (profileRes) => {
                    console.log('获取用户信息成功:', profileRes)
                    
                    // 解析 rawData（微信返回的是 JSON 字符串）
                    let userInfo = profileRes.userInfo
                    if (profileRes.rawData) {
                        try {
                            const rawData = JSON.parse(profileRes.rawData)
                            userInfo = { ...userInfo, ...rawData }
                        } catch (e) {
                            console.error('解析 rawData 失败:', e)
                        }
                    }
                    
                    // 适配不同版本的微信返回数据
                    this.userInfo = {
                        nickName: userInfo.nickName || userInfo.nickname || '微信用户',
                        avatarUrl: userInfo.avatarUrl || userInfo.avatar || '',
                        gender: userInfo.gender || 0
                    }
                    
                    console.log('处理后的用户信息:', this.userInfo)
                    
                    // 再调用登录获取 code
                    uni.login({
                        provider: 'weixin',
                        success: (loginRes) => {
                            const code = loginRes.code
                            console.log('微信登录 code:', code)
                            
                            // 保存登录状态
                            uni.setStorageSync('token', 'love_token_' + Date.now())
                            uni.setStorageSync('user_info', this.userInfo)
                            uni.setStorageSync('user_id', 'user_' + Date.now())
                            uni.setStorageSync('wx_code', code)
                            
                            // 调用登录处理
                            this.requestLogin(code, this.userInfo)
                            
                            uni.showToast({ title: '登录成功', icon: 'success' })
                            
                            // 跳转到信息完善页
                            setTimeout(() => {
                                uni.navigateTo({ url: '/pages/login/complete-info' })
                            }, 500)
                        },
                        fail: (err) => {
                            console.error('登录失败:', err)
                            uni.showToast({ title: '微信登录失败', icon: 'none' })
                        }
                    })
                },
                fail: (err) => {
                    console.error('获取用户信息失败:', err)
                    uni.showToast({ title: '获取用户信息失败，请允许授权', icon: 'none' })
                }
            })
        },
        // 登录处理（云端模式）
        async requestLogin(code, userInfo) {
            try {
                // 获取小程序 appid
                const appid = uni.getAccountInfoSync().miniProgram.appId
                
                // 调用云函数获取真实 openid
                const res = await uniCloud.callFunction({
                    name: 'wxLogin',
                    data: {
                        code: code,
                        userInfo: userInfo,
                        appid: appid
                    }
                })
                
                if (res.result && res.result.code === 0) {
                    // 使用云端返回的真实 openid
                    const { token, openid } = res.result.data
                    
                    const userData = {
                        nickName: userInfo.nickName || '微信用户',
                        avatarUrl: userInfo.avatarUrl || '',
                        gender: userInfo.gender || 0,
                        openid: openid
                    }
                    
                    // 使用 UserManager 保存用户信息
                    UserManager.setToken(token)
                    UserManager.setOpenid(openid)
                    UserManager.setUserInfo(userData)
                    uni.setStorageSync('wx_code', code)
                    
                    // 更新当前页面的用户信息
                    this.userInfo = userData
                    
                    console.log('登录成功（云端模式）:', { token, openid, userData })
                } else {
                    // 云函数失败，使用本地降级方案
                    console.warn('云端登录失败，使用本地模式:', res.result?.message)
                    this.localLogin(userInfo)
                }
            } catch (err) {
                console.error('云端登录失败:', err)
                // 使用本地降级方案
                this.localLogin(userInfo)
            }
        },
        
        // 本地降级登录（当云函数不可用时）
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
            
            console.log('登录成功（本地降级模式）:', { token, openid, userData })
        },
        enterHome() {
            uni.switchTab({ url: '/pages/home/index' })
        }
    }
}
</script>

<style scoped>
.login-bg {
    min-height: 100vh;
    background: linear-gradient(135deg, #ff6b9d 0%, #ffa8c5 100%);
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80rpx 40rpx;
}

.login-gradient {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
}

.login-content {
    text-align: center;
    z-index: 1;
    margin-bottom: 60rpx;
}

.login-title-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16rpx;
}

.login-title-img {
    width: 64rpx;
    height: 64rpx;
    margin-right: 16rpx;
}

.login-title {
    font-size: 56rpx;
    font-weight: bold;
    color: #fff;
}

.login-desc {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.9);
}

.login-box {
    width: 100%;
    max-width: 600rpx;
    background: #fff;
    border-radius: 40rpx;
    padding: 48rpx;
    z-index: 1;
    box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

/* 登录区域 */
.login-section {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.decor-gif {
    width: 200rpx;
    height: 200rpx;
    margin-bottom: 24rpx;
}

.section-title {
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 16rpx;
}

.section-desc {
    font-size: 28rpx;
    color: #999;
    margin-bottom: 48rpx;
}

.wx-login-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #07c160;
    color: #fff;
    font-size: 32rpx;
    padding: 32rpx;
    border-radius: 48rpx;
    border: none;
}

.wx-icon {
    width: 48rpx;
    height: 48rpx;
    margin-right: 16rpx;
}

/* 欢迎区域 */
.welcome-section {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.user-avatar-large {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    margin-bottom: 24rpx;
    border: 6rpx solid #ff6b9d;
    box-shadow: 0 8rpx 32rpx rgba(255, 107, 157, 0.3);
}

.user-name {
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 16rpx;
}

.welcome-row {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 48rpx;
}

.welcome-text {
    font-size: 32rpx;
    color: #666;
}

.decor-gif-small {
    width: 80rpx;
    height: 80rpx;
    margin-left: 16rpx;
}

.enter-btn {
    width: 100%;
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    font-size: 32rpx;
    padding: 32rpx;
    border-radius: 48rpx;
    border: none;
}
</style>
