<template>
    <view class="complete-page">
        <view class="complete-header">
            <text class="header-title">完善资料</text>
            <text class="header-desc">设置你的专属头像和昵称</text>
        </view>

        <view class="form-container">
            <!-- 头像选择 -->
            <view class="form-item">
                <text class="label">头像</text>
                <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
                    <image class="avatar-img" :src="avatarUrl || '/static/tabbar/user.png'" mode="aspectFit" />
                    <text class="avatar-tip">点击选择头像</text>
                </button>
            </view>

            <!-- 昵称输入 -->
            <view class="form-item">
                <text class="label">昵称</text>
                <input 
                    class="nickname-input" 
                    type="nickname" 
                    v-model="nickName" 
                    placeholder="请输入昵称"
                    @blur="onNickNameBlur"
                />
            </view>

            <!-- 保存按钮 -->
            <button class="save-btn" @click="saveUserInfo">保存并进入</button>
        </view>
    </view>
</template>

<script>
import uniCloud from '@/utils/cloud.js'
import UserManager from '@/utils/user.js'
import UploadUtil from '@/utils/upload.js'

export default {
    data() {
        return {
            avatarUrl: '',
            nickName: ''
        }
    },
    onLoad() {
        // 检查是否已登录
        const token = UserManager.getToken()
        if (!token) {
            uni.redirectTo({ url: '/pages/login' })
            return
        }
        
        // 加载已有的用户信息
        const userInfo = UserManager.getUserInfo()
        if (userInfo) {
            this.avatarUrl = userInfo.avatarUrl || ''
            this.nickName = userInfo.nickName || ''
        }
    },
    methods: {
        onChooseAvatar(e) {
            console.log('选择头像:', e)
            this.avatarUrl = e.detail.avatarUrl
        },
        onNickNameBlur(e) {
            console.log('昵称输入:', e)
            this.nickName = e.detail.value
        },
        async saveUserInfo() {
            if (!this.nickName.trim()) {
                uni.showToast({ title: '请输入昵称', icon: 'none' })
                return
            }

            uni.showLoading({ title: '保存中...' })

            // 上传头像到云存储
            let cloudAvatarUrl = this.avatarUrl
            if (this.avatarUrl && !this.avatarUrl.startsWith('http')) {
                cloudAvatarUrl = await UploadUtil.uploadImage(this.avatarUrl, 'avatars')
            }

            // 获取当前用户信息（保留openid）
            const currentInfo = UserManager.getUserInfo()
            
            // 更新用户信息
            const userInfo = {
                nickName: this.nickName.trim(),
                avatarUrl: cloudAvatarUrl || '/static/tabbar/user.png',
                gender: 0,
                openid: currentInfo.openid || ''
            }

            // 使用 UserManager 保存到本地
            UserManager.setUserInfo(userInfo)
            
            // 同时更新云端 users 表
            try {
                await uniCloud.callFunction({
                    name: 'dataService',
                    data: {
                        action: 'update',
                        collection: 'users',
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
                console.log('云端用户信息更新成功')
            } catch (err) {
                console.error('云端用户信息更新失败:', err)
            }
            
            uni.hideLoading()
            uni.showToast({ title: '保存成功', icon: 'success' })

            // 延迟跳转到配对页面（检查配对状态）
            setTimeout(() => {
                uni.redirectTo({ url: '/pages/invite/index' })
            }, 1000)
        }
    }
}
</script>

<style scoped>
.complete-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #ff6b9d 0%, #ffa8c5 100%);
    padding: 60rpx 40rpx;
}

.complete-header {
    text-align: center;
    margin-bottom: 60rpx;
}

.header-title {
    display: block;
    font-size: 48rpx;
    font-weight: bold;
    color: #fff;
    margin-bottom: 16rpx;
}

.header-desc {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.9);
}

.form-container {
    background: #fff;
    border-radius: 40rpx;
    padding: 48rpx;
}

.form-item {
    margin-bottom: 40rpx;
}

.label {
    display: block;
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
}

.avatar-btn {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    padding: 0;
    margin: 0 auto;
    background: #f7f8fa;
    border: 4rpx dashed #ff6b9d;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
}

.avatar-btn::after {
    border: none;
}

.avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #f7f8fa;
}

.avatar-tip {
    font-size: 24rpx;
    color: #999;
}

.nickname-input {
    width: 100%;
    height: 88rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
    padding: 0 24rpx;
    font-size: 30rpx;
    color: #333;
}

.save-btn {
    width: 100%;
    height: 96rpx;
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    font-size: 32rpx;
    font-weight: bold;
    border-radius: 48rpx;
    border: none;
    margin-top: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.save-btn::after {
    border: none;
}
</style>
