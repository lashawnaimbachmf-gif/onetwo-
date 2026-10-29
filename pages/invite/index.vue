<template>
    <view class="invite-page">
        <view class="invite-content">
            <!-- 创建者显示邀请码 -->
            <view v-if="status === 'creator'" class="creator-section">
                <image class="heart-img" src="/static/icons/icon-love.png" mode="aspectFit" />
                <text class="title">配对创建成功！</text>
                <text class="desc">请让对象输入以下邀请码</text>
                <view class="code-box">
                    <text class="invite-code">{{ inviteCode }}</text>
                </view>
                <button class="copy-btn" @click="copyCode">复制邀请码</button>
                <text class="tip">等待对象加入...</text>
            </view>
            
            <!-- 需要输入邀请码 -->
            <view v-else-if="status === 'needInvite'" class="input-section">
                <image class="heart-img" src="/static/icons/icon-love.png" mode="aspectFit" />
                <text class="title">加入配对</text>
                <text class="desc">请输入对象分享的邀请码</text>
                <input 
                    class="code-input" 
                    v-model="inputCode" 
                    placeholder="请输入6位邀请码"
                    maxlength="6"
                />
                <button class="submit-btn" @click="submitCode">确认加入</button>
                <text v-if="errorMsg" class="error-text">{{ errorMsg }}</text>
            </view>
            
            <!-- 名额已满 -->
            <view v-else-if="status === 'full'" class="error-section">
                <image class="heart-img" src="/static/icons/icon-love.png" mode="aspectFit" />
                <text class="title">名额已满</text>
                <text class="desc">此小程序仅限特定用户使用</text>
            </view>
            
            <!-- 加载中 -->
            <view v-else class="loading-section">
                <text class="loading-text">加载中...</text>
            </view>
        </view>
    </view>
</template>

<script>
import uniCloud from '@/utils/cloud.js'
import UserManager from '@/utils/user.js'

export default {
    data() {
        return {
            status: 'loading',
            inviteCode: '',
            inputCode: '',
            errorMsg: '',
            openid: ''
        }
    },
    onLoad() {
        this.checkStatus()
    },
    methods: {
        async checkStatus() {
            const openid = UserManager.getOpenid()
            if (!openid) {
                uni.showToast({ title: '请先登录', icon: 'none' })
                setTimeout(() => {
                    uni.redirectTo({ url: '/pages/login' })
                }, 1500)
                return
            }
            
            this.openid = openid
            
            try {
                const res = await uniCloud.callFunction({
                    name: 'checkPairStatus',
                    data: { openid }
                })
                
                const result = res.result
                
                if (result.code === 0) {
                    this.status = result.status
                    if (result.status === 'creator') {
                        this.inviteCode = result.inviteCode
                    } else if (result.status === 'allowed') {
                        // 已绑定，直接进入首页
                        uni.switchTab({ url: '/pages/home/index' })
                    }
                } else {
                    this.status = 'error'
                    uni.showToast({ title: result.message, icon: 'none' })
                }
            } catch (err) {
                console.error('检查状态失败:', err)
                uni.showToast({ title: '检查失败', icon: 'none' })
            }
        },
        
        copyCode() {
            uni.setClipboardData({
                data: this.inviteCode,
                success: () => {
                    uni.showToast({ title: '复制成功', icon: 'success' })
                }
            })
        },
        
        async submitCode() {
            if (!this.inputCode || this.inputCode.length !== 6) {
                this.errorMsg = '请输入6位邀请码'
                return
            }
            
            try {
                uni.showLoading({ title: '验证中...' })
                
                const res = await uniCloud.callFunction({
                    name: 'verifyInviteCode',
                    data: {
                        openid: this.openid,
                        inviteCode: this.inputCode
                    }
                })
                
                uni.hideLoading()
                
                if (res.result.code === 0) {
                    uni.showToast({ title: '绑定成功！', icon: 'success' })
                    setTimeout(() => {
                        uni.switchTab({ url: '/pages/home/index' })
                    }, 1500)
                } else {
                    this.errorMsg = res.result.message
                }
            } catch (err) {
                uni.hideLoading()
                console.error('验证失败:', err)
                this.errorMsg = '验证失败，请重试'
            }
        }
    }
}
</script>

<style scoped>
.invite-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #ff6b9d 0%, #ffa8c5 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40rpx;
}

.invite-content {
    width: 100%;
    max-width: 600rpx;
    background: #fff;
    border-radius: 40rpx;
    padding: 60rpx 40rpx;
    text-align: center;
}

.heart-img {
    width: 100rpx;
    height: 100rpx;
    margin-bottom: 30rpx;
}

.title {
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
    display: block;
    margin-bottom: 20rpx;
}

.desc {
    font-size: 28rpx;
    color: #999;
    display: block;
    margin-bottom: 40rpx;
}

/* 创建者样式 */
.code-box {
    background: linear-gradient(135deg, #ff6b9d 0%, #ffa8c5 100%);
    border-radius: 20rpx;
    padding: 40rpx;
    margin-bottom: 30rpx;
}

.invite-code {
    font-size: 56rpx;
    font-weight: bold;
    color: #fff;
    letter-spacing: 10rpx;
}

.copy-btn {
    background: #ff6b9d;
    color: #fff;
    font-size: 32rpx;
    padding: 30rpx 60rpx;
    border-radius: 48rpx;
    border: none;
    margin-bottom: 30rpx;
}

.tip {
    font-size: 26rpx;
    color: #999;
}

/* 输入样式 */
.code-input {
    width: 100%;
    height: 100rpx;
    background: #f5f5f5;
    border-radius: 20rpx;
    text-align: center;
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 40rpx;
    letter-spacing: 10rpx;
}

.submit-btn {
    width: 100%;
    background: linear-gradient(135deg, #ff6b9d 0%, #ffa8c5 100%);
    color: #fff;
    font-size: 32rpx;
    padding: 30rpx;
    border-radius: 48rpx;
    border: none;
}

.error-text {
    font-size: 26rpx;
    color: #ff6b6b;
    margin-top: 20rpx;
    display: block;
}

/* 错误页面 */
.error-section .title {
    color: #ff6b6b;
}

.loading-text {
    font-size: 32rpx;
    color: #999;
}
</style>
