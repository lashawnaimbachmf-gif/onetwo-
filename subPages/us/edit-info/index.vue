<template>
    <view class="edit-info-page">
        <nav-back />

        <view class="page-header">
            <text class="page-title">编辑信息</text>
        </view>
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

        <view class="logout-section">
            <view class="logout-btn" @click="logout">
                <text>退出登录</text>
            </view>
        </view>
    </view>
</template>

<script>
import cloud from '@/utils/cloud.js'
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'
import UploadUtil from '@/utils/upload.js'
import NavBack from '@/components/NavBack.vue'

export default {
    components: { NavBack },
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
            const partnerInfo = UserManager.getPartnerInfo()

            // 批量查询双方记录
            const queryOpenids = [this.userInfo.openid]
            if (partnerInfo && partnerInfo.openid && partnerInfo.openid !== this.userInfo.openid) {
                queryOpenids.push(partnerInfo.openid)
            }

            const res = await cloud.callFunction({
                name: 'dataService',
                data: {
                    action: 'get',
                    collection: 'users',
                    openid: this.userInfo.openid,
                    where: { openid: queryOpenids }
                }
            })

            if (res.result && res.result.code === 0 && res.result.data.length > 0) {
                // 优先用自己的记录，其次是伴侣的
                const userData = res.result.data.find(d => d.openid === this.userInfo.openid)
                const partnerData = res.result.data.find(d => d.openid === (partnerInfo || {}).openid)
                const best = userData || partnerData
                if (best && best.togetherDate) {
                    this.togetherDate = best.togetherDate
                }
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
            // 检查登录状态
            if (!UserManager.getToken() || !UserManager.getOpenid()) {
                uni.showModal({
                    title: '提示',
                    content: '请先登录后再编辑信息～',
                    confirmText: '去登录',
                    success: (res) => {
                        if (res.confirm) {
                            uni.navigateTo({ url: '/subPages/login/login' })
                        }
                    }
                })
                return
            }

            uni.showLoading({ title: '保存中...' })

            // 更新本地用户信息（仅自己的头像/昵称）
            const currentUser = UserManager.getUserInfo() || {}
            const updatedUser = {
                ...currentUser,
                nickName: this.userInfo.nickName || currentUser.nickName,
                avatarUrl: this.userInfo.avatarUrl || currentUser.avatarUrl
            }
            UserManager.setUserInfo(updatedUser)

            // 更新自己：头像 + 昵称 + 在一起日期
            const myUpdate = cloud.callFunction({
                name: 'dataService',
                data: {
                    action: 'update',
                    collection: 'users',
                    openid: currentUser.openid,
                    where: { openid: currentUser.openid },
                    data: {
                        togetherDate: this.togetherDate,
                        nickName: updatedUser.nickName,
                        avatarUrl: updatedUser.avatarUrl,
                        updateTime: Date.now()
                    }
                }
            })

            // 如果已配对，同步在一起日期到伴侣记录
            const partnerInfo = UserManager.getPartnerInfo()
            const tasks = [myUpdate]
            if (partnerInfo && partnerInfo.openid && partnerInfo.openid !== currentUser.openid) {
                tasks.push(
                    cloud.callFunction({
                        name: 'dataService',
                        data: {
                            action: 'update',
                            collection: 'users',
                            openid: currentUser.openid,
                            where: { openid: partnerInfo.openid },
                            data: {
                                togetherDate: this.togetherDate,
                                updateTime: Date.now()
                            }
                        }
                    })
                )
            }

            const results = await Promise.all(tasks)
            const allOk = results.every(r => r.result && r.result.code === 0)

            uni.hideLoading()
            if (allOk) {
                uni.showToast({ title: '保存成功！', icon: 'success' })
                setTimeout(() => {
                    uni.navigateBack()
                }, 1000)
            } else {
                const failed = results.find(r => !r.result || r.result.code !== 0)
                const msg = (failed && failed.result) ? failed.result.message : '保存失败'
                uni.showToast({ title: msg, icon: 'none' })
            }
        },
        logout() {
            uni.showModal({
                title: '退出登录',
                content: '确定要退出登录吗？',
                confirmText: '退出',
                confirmColor: '#FF3B30',
                success: (res) => {
                    if (res.confirm) {
                        UserManager.clearAll()
                        uni.showToast({ title: '已退出', icon: 'success' })
                        setTimeout(() => {
                            uni.reLaunch({ url: '/pages/home/index' })
                        }, 800)
                    }
                }
            })
        }
    }
}
</script>

<style scoped>
.edit-info-page {
    background: #FFF0F5;
    min-height: 100vh;
    padding: 0 32rpx 32rpx;
}

.page-header {
    padding: calc(var(--status-bar-height) + 28rpx) 0 24rpx;
    text-align: center;
}

.page-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1A1A1A;
}

.section {
    background: #FFFFFF;
    border-radius: 32rpx;
    padding: 36rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 10rpx 48rpx rgba(255, 107, 157, 0.05), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.section-title {
    display: block;
    font-size: 30rpx;
    font-weight: 700;
    color: #1A1A1A;
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
    font-weight: 600;
    color: #999999;
    margin-bottom: 12rpx;
    letter-spacing: 0.5rpx;
}

.input {
    width: 100%;
    font-size: 30rpx;
    color: #1A1A1A;
    padding: 24rpx 20rpx;
    background: #F7F8FA;
    border-radius: 20rpx;
}

.picker {
    padding: 24rpx 20rpx;
    background: #F7F8FA;
    border-radius: 20rpx;
    font-size: 30rpx;
    color: #1A1A1A;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 0;
    border-top: 1rpx solid rgba(240, 240, 240, 0.6);
    margin-top: 24rpx;
}

.info-label {
    font-size: 26rpx;
    color: #999999;
}

.info-value {
    font-size: 30rpx;
    color: #FF6B9D;
    font-weight: 700;
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
    border: 4rpx solid rgba(255, 107, 157, 0.25);
    margin-bottom: 16rpx;
    box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.15);
}

.avatar-tip {
    font-size: 26rpx;
    color: #999999;
}

.save-btn {
    width: 360rpx;
    margin: 48rpx auto 0;
    display: block;
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    color: #FFFFFF;
    font-size: 28rpx;
    font-weight: 600;
    padding: 20rpx 0;
    border-radius: 48rpx;
    border: none;
    box-shadow: 0 8rpx 28rpx rgba(255, 107, 157, 0.16);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.save-btn:active {
    transform: scale(0.97);
    opacity: 0.92;
    box-shadow: 0 4rpx 14rpx rgba(255, 107, 157, 0.12);
}

.logout-section {
    margin-top: 60rpx;
    padding: 32rpx 0;
    text-align: center;
}

.logout-btn {
    display: inline-block;
    padding: 16rpx 48rpx;
    border-radius: 48rpx;
    border: 2rpx solid rgba(255, 59, 48, 0.3);
    color: #FF3B30;
    font-size: 26rpx;
    font-weight: 500;
    transition: all 0.25s ease;
}

.logout-btn:active {
    background: rgba(255, 59, 48, 0.06);
    border-color: #FF3B30;
}
</style>
