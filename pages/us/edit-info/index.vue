<template>
    <view class="edit-info-page">
        <view class="section">
            <text class="section-title">在一起的时间</text>
            <view class="form-item">
                <text class="label">起始日期</text>
                <picker mode="date" :value="togetherDate" @change="onDateChange">
                    <view class="picker">{{ togetherDate || '选择日期' }}</view>
                </picker>
            </view>
            <view class="info-item">
                <text class="info-label">已在一起</text>
                <text class="info-value">{{ togetherDays }} 天</text>
            </view>
        </view>

        <view class="section">
            <text class="section-title">我的信息</text>
            <view class="form-item">
                <text class="label">头像</text>
                <view class="avatar-wrapper" @click="chooseAvatar">
                    <image class="avatar-img" :src="userInfo.avatarUrl || '/static/tabbar/user.png'" mode="aspectFill" />
                    <text class="avatar-tip">点击修改头像</text>
                </view>
            </view>
            <view class="form-item">
                <text class="label">昵称</text>
                <input class="input" v-model="userInfo.nickName" placeholder="输入昵称" />
            </view>
        </view>

        <button class="save-btn" @click="save">保存</button>
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'
import UploadUtil from '@/utils/upload.js'

export default {
    data() {
        return {
            togetherDate: '2023-03-22',
            userInfo: {}
        }
    },
    computed: {
        togetherDays() {
            if (!this.togetherDate) return 0
            const start = new Date(this.togetherDate)
            const now = new Date()
            return Math.floor((now - start) / (1000 * 60 * 60 * 24))
        }
    },
    onLoad() {
        this.loadData()
    },
    methods: {
        async loadData() {
            this.userInfo = UserManager.getUserInfo() || {}
            
            // 从云端加载在一起日期
            try {
                const res = await uniCloud.callFunction({
                    name: 'dataService',
                    data: {
                        action: 'get',
                        collection: 'users',
                        where: {
                            openid: this.userInfo.openid
                        }
                    }
                })
                
                if (res.result && res.result.code === 0 && res.result.data.length > 0) {
                    const userData = res.result.data[0]
                    if (userData.togetherDate) {
                        this.togetherDate = userData.togetherDate
                    }
                }
            } catch (e) {
                console.error('加载云端数据失败', e)
            }
        },
        onDateChange(e) {
            this.togetherDate = e.detail.value
        },
        async chooseAvatar() {
            uni.chooseImage({
                count: 1,
                sizeType: ['compressed'],
                sourceType: ['album', 'camera'],
                success: async (res) => {
                    uni.showLoading({ title: '上传中...' })
                    
                    // 上传头像到云存储
                    const cloudUrl = await UploadUtil.uploadImage(res.tempFilePaths[0], 'avatars')
                    
                    if (cloudUrl) {
                        this.userInfo.avatarUrl = cloudUrl
                        uni.showToast({ title: '头像上传成功', icon: 'success' })
                    }
                    
                    uni.hideLoading()
                }
            })
        },
        async save() {
            uni.showLoading({ title: '保存中...' })

            // 更新用户信息
            const currentUser = UserManager.getUserInfo() || {}
            const updatedUser = {
                ...currentUser,
                nickName: this.userInfo.nickName || currentUser.nickName,
                avatarUrl: this.userInfo.avatarUrl || currentUser.avatarUrl
            }
            UserManager.setUserInfo(updatedUser)

            // 同步到云端 users 表
            try {
                const res = await uniCloud.callFunction({
                    name: 'dataService',
                    data: {
                        action: 'update',
                        collection: 'users',
                        where: {
                            openid: currentUser.openid
                        },
                        data: {
                            togetherDate: this.togetherDate,
                            nickName: updatedUser.nickName,
                            avatarUrl: updatedUser.avatarUrl,
                            updateTime: Date.now()
                        }
                    }
                })
                console.log('云端同步成功:', res)
            } catch (e) {
                console.error('云端同步失败', e)
            }

            uni.hideLoading()
            uni.showToast({ title: '保存成功！', icon: 'success' })
            setTimeout(() => {
                uni.navigateBack()
            }, 1000)
        }
    }
}
</script>

<style scoped>
.edit-info-page {
    background: #f7f8fa;
    min-height: 100vh;
    padding: 32rpx;
}

.section {
    background: #fff;
    border-radius: 24rpx;
    padding: 32rpx;
    margin-bottom: 24rpx;
}

.section-title {
    display: block;
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 24rpx;
}

.form-item {
    margin-bottom: 24rpx;
}

.form-item:last-child {
    margin-bottom: 0;
}

.label {
    display: block;
    font-size: 26rpx;
    color: #666;
    margin-bottom: 12rpx;
}

.input {
    width: 100%;
    font-size: 30rpx;
    color: #333;
    padding: 20rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
}

.picker {
    padding: 20rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
    font-size: 30rpx;
    color: #333;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 0;
    border-top: 1rpx solid #f0f0f0;
    margin-top: 24rpx;
}

.info-label {
    font-size: 26rpx;
    color: #666;
}

.info-value {
    font-size: 30rpx;
    color: #ff6b9d;
    font-weight: bold;
}

.avatar-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20rpx 0;
}

.avatar-img {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    border: 4rpx solid #ff6b9d;
    margin-bottom: 16rpx;
}

.avatar-tip {
    font-size: 26rpx;
    color: #999;
}

.save-btn {
    width: 100%;
    margin-top: 40rpx;
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    font-size: 32rpx;
    font-weight: bold;
    padding: 32rpx;
    border-radius: 48rpx;
    border: none;
}
</style>
