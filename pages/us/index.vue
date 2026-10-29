<template>
    <view class="us-page">
        <view class="header">
            <view class="couple-card">
                <view class="avatars">
                    <image class="avatar" :src="userInfo.avatarUrl || '/static/tabbar/user.png'" mode="aspectFill" />
                    <image class="heart-img" src="/static/icons/icon-heart.png" mode="aspectFit" />
                    <image class="avatar" :src="partnerInfo ? partnerInfo.avatarUrl : '/static/tabbar/user.png'" mode="aspectFill" />
                </view>
                <text class="couple-name">{{ userInfo.nickName || '我' }} {{ isBind ? '&' : '' }} {{ partnerInfo ? partnerInfo.nickName : (isBind ? 'TA' : '未绑定') }}</text>
                <text class="together-days">在一起 {{ togetherDays }} 天</text>
            </view>
        </view>

        <view class="stats-section">
            <view class="stat-item">
                <text class="stat-num">{{ togetherDays }}</text>
                <text class="stat-label">天</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-item">
                <text class="stat-num">{{ capsuleCount }}</text>
                <text class="stat-label">封情书</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-item">
                <text class="stat-num">{{ treeCount }}</text>
                <text class="stat-label">次吐槽</text>
            </view>
        </view>

        <view class="menu-section">
            <view class="menu-item" @click="editInfo">
                <image class="menu-icon-img" src="/static/icons/icon-edit.png" mode="aspectFit" />
                <text class="menu-text">编辑信息</text>
                <text class="menu-arrow">›</text>
            </view>
            <view class="menu-item" @click="setAnniversary">
                <image class="menu-icon-img" src="/static/icons/icon-calendar.png" mode="aspectFit" />
                <text class="menu-text">纪念日设置</text>
                <text class="menu-arrow">›</text>
            </view>
            <view class="menu-item" @click="invitePartner">
                <image class="menu-icon-img" src="/static/icons/icon-link.png" mode="aspectFit" />
                <text class="menu-text">邀请另一半</text>
                <text class="menu-arrow">›</text>
            </view>
        </view>

        <view class="love-wall">
            <view class="wall-header">
                <view class="wall-title-wrap">
                    <image class="wall-title-img" src="/static/icons/icon-love.png" mode="aspectFit" />
                    <text class="wall-title">爱情墙</text>
                </view>
                <text class="upload-btn" @click="uploadPhoto">+ 上传照片</text>
            </view>
            <view class="wall-photos">
                <view class="photo-item" v-for="(photo, index) in photos" :key="index" @click="previewPhoto(index)">
                    <image class="photo" :src="photo" mode="aspectFill" />
                    <view class="delete-btn" @click.stop="deletePhoto(index)">×</view>
                </view>
                <view class="photo-item add-item" @click="uploadPhoto" v-if="photos.length < 9">
                    <text class="add-icon">+</text>
                    <text class="add-text">添加照片</text>
                </view>
            </view>
            <view v-if="photos.length === 0" class="empty-tip">
                <image class="empty-icon-img" src="/static/icons/icon-camera.png" mode="aspectFit" />
                <text class="empty-text">还没有照片，点击上传吧～</text>
            </view>
        </view>

        <!-- 邀请另一半弹窗 -->
        <uni-popup ref="invitePopup" type="center">
            <view class="invite-popup">
                <view class="popup-header">
                    <text class="popup-title">{{ isBind ? '已绑定' : '邀请另一半' }}</text>
                    <text class="popup-close" @click="closeInvitePopup">×</text>
                </view>
                <view class="popup-content">
                    <view v-if="isBind" class="bind-success">
                        <image class="success-icon" src="/static/icons/icon-love.png" mode="aspectFit" />
                        <text class="success-text">已成功绑定</text>
                        <text class="partner-name">{{ partnerName }}</text>
                    </view>
                    <view v-else class="invite-box">
                        <view v-if="inviteCode" class="code-section">
                            <text class="code-label">你的邀请码</text>
                            <view class="code-display">
                                <text class="code-text">{{ inviteCode }}</text>
                                <button class="copy-btn" @click="copyInviteCode">复制</button>
                            </view>
                            <text class="code-tip">让另一半输入此邀请码即可绑定</text>
                        </view>
                        <view v-else class="generate-section">
                            <image class="invite-icon" src="/static/icons/icon-link.png" mode="aspectFit" />
                            <text class="invite-text">生成专属邀请码</text>
                            <text class="invite-desc">绑定后可以一起记录美好时光</text>
                            <button class="generate-btn" @click="generateInviteCode">生成邀请码</button>
                        </view>
                        <view class="divider">
                            <view class="divider-line"></view>
                            <text class="divider-text">或</text>
                            <view class="divider-line"></view>
                        </view>
                        <view class="input-section">
                            <text class="input-label">输入对方的邀请码</text>
                            <view class="input-box">
                                <input class="partner-code-input" v-model="partnerCode" placeholder="请输入6位邀请码" maxlength="6" />
                                <button class="bind-btn" @click="bindPartner">绑定</button>
                            </view>
                        </view>
                    </view>
                </view>
            </view>
        </uni-popup>
    </view>
</template>

<script>
import uniCloud from '@/utils/cloud.js'
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'
import UploadUtil from '@/utils/upload.js'

export default {
    data() {
        return {
            togetherDays: 365,
            capsuleCount: 0,
            treeCount: 0,
            photos: [], // 显示用：包含自己和伴侣的照片
            myPhotos: [], // 自己的照片（用于上传/删除）
            inviteCode: '',
            isBind: false,
            partnerName: '',
            partnerCode: '',
            userInfo: {},
            partnerInfo: null
        }
    },
    onLoad() {
        this.loadData()
    },
    onShow() {
        this.loadData()
    },
    methods: {
        async loadData() {
            // 加载用户信息
            this.userInfo = UserManager.getUserInfo()
            this.partnerInfo = UserManager.getPartnerInfo()
            this.isBind = UserManager.isBind()

            // 如果本地未绑定，检查云端是否有反向绑定记录（别人绑定了自己）
            if (!this.isBind && this.userInfo.openid) {
                await this.checkReverseBind()
            }

            // 从云端加载在一起日期并计算天数（同时检查自己和伴侣的记录）
            let togetherDate = '2023-03-22'
            const userRes = await uniCloud.callFunction({
                name: 'dataService',
                data: {
                    action: 'get',
                    collection: 'users',
                    where: {
                        openid: this.userInfo.openid
                    }
                }
            })
            
            if (userRes.result && userRes.result.code === 0 && userRes.result.data.length > 0) {
                const userData = userRes.result.data[0]
                if (userData.togetherDate) {
                    togetherDate = userData.togetherDate
                }
            }
            
            // 如果自己的记录没有，检查伴侣的记录
            if (togetherDate === '2023-03-22' && this.partnerInfo && this.partnerInfo.openid) {
                const partnerRes = await uniCloud.callFunction({
                    name: 'dataService',
                    data: {
                        action: 'get',
                        collection: 'users',
                        where: {
                            openid: this.partnerInfo.openid
                        }
                    }
                })
                
                if (partnerRes.result && partnerRes.result.code === 0 && partnerRes.result.data.length > 0) {
                    const partnerData = partnerRes.result.data[0]
                    if (partnerData.togetherDate) {
                        togetherDate = partnerData.togetherDate
                    }
                }
            }
            
            const start = new Date(togetherDate)
            const now = new Date()
            this.togetherDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))

            // 从云端统计当前用户和伴侣的数据
            const coupleOpenids = UserManager.getCoupleOpenids()

            const capsules = await CloudData.getCapsules(coupleOpenids)
            this.capsuleCount = capsules.length

            const trees = await CloudData.getTrees(coupleOpenids)
            this.treeCount = trees.length

            // 从云端加载爱情墙照片
            await this.loadPhotosFromCloud()

            // 检查邀请状态
            this.inviteCode = uni.getStorageSync('my_invite_code') || ''
            this.partnerName = this.partnerInfo ? this.partnerInfo.nickName : ''
        },
        
        // 检查是否有反向绑定记录（别人绑定了自己）
        async checkReverseBind() {
            try {
                console.log('检查反向绑定，当前用户信息:', this.userInfo)
                
                if (!this.userInfo.openid) {
                    console.warn('用户没有 openid，无法检查反向绑定')
                    return
                }
                
                const res = await uniCloud.callFunction({
                    name: 'inviteCode',
                    data: {
                        action: 'checkReverse',
                        userInfo: this.userInfo
                    }
                })
                
                console.log('checkReverse 返回结果:', res)
                
                if (res.result && res.result.code === 0 && res.result.data.hasBind) {
                    // 有反向绑定记录，自动设置伴侣信息
                    UserManager.setPartnerInfo(res.result.data.partnerInfo)
                    this.partnerInfo = res.result.data.partnerInfo
                    this.isBind = true
                    uni.showToast({ title: '已自动绑定伴侣', icon: 'success' })
                } else {
                    console.log('没有反向绑定记录或查询失败:', res.result)
                }
            } catch (err) {
                console.error('检查反向绑定失败:', err)
            }
        },
        async uploadPhoto() {
            // 检查自己的照片数量（不包括伴侣的）
            if (this.myPhotos.length >= 9) {
                uni.showToast({ title: '最多上传9张照片', icon: 'none' })
                return
            }
            
            uni.chooseImage({
                count: 9 - this.myPhotos.length,
                sizeType: ['compressed'],
                sourceType: ['album', 'camera'],
                success: async (res) => {
                    uni.showLoading({ title: '上传中...' })
                    
                    // 上传所有选择的图片到云存储
                    const uploadedUrls = []
                    for (const tempPath of res.tempFilePaths) {
                        const cloudUrl = await UploadUtil.uploadImage(tempPath, 'lovewall')
                        if (cloudUrl) {
                            uploadedUrls.push(cloudUrl)
                        }
                    }
                    
                    // 只添加到自己的照片列表
                    this.myPhotos = [...this.myPhotos, ...uploadedUrls]
                    
                    // 更新显示列表（合并自己和伴侣的）
                    this.photos = [...this.myPhotos, ...(this.partnerInfo ? this.partnerPhotos : [])]
                    
                    // 保存到云端数据库（只保存自己的）
                    await this.savePhotosToCloud()
                    
                    uni.hideLoading()
                    uni.showToast({ title: '上传成功！', icon: 'success' })
                }
            })
        },
        
        // 保存照片到云端（只保存自己的）
        async savePhotosToCloud() {
            try {
                const userInfo = UserManager.getUserInfo()
                await uniCloud.callFunction({
                    name: 'dataService',
                    data: {
                        action: 'update',
                        collection: 'users',
                        where: {
                            openid: userInfo.openid
                        },
                        data: {
                            loveWallPhotos: this.myPhotos, // 只保存自己的
                            updateTime: Date.now()
                        }
                    }
                })
            } catch (err) {
                console.error('保存照片到云端失败:', err)
            }
        },
        
        // 从云端加载照片（包括自己和伴侣的）
        async loadPhotosFromCloud() {
            try {
                const userInfo = UserManager.getUserInfo()
                const partnerInfo = UserManager.getPartnerInfo()
                
                // 先清空
                this.myPhotos = []
                this.partnerPhotos = []
                
                // 加载自己的照片
                const res = await uniCloud.callFunction({
                    name: 'dataService',
                    data: {
                        action: 'get',
                        collection: 'users',
                        where: {
                            openid: userInfo.openid
                        }
                    }
                })
                
                if (res.result && res.result.code === 0 && res.result.data.length > 0) {
                    const userData = res.result.data[0]
                    if (userData.loveWallPhotos) {
                        this.myPhotos = [...userData.loveWallPhotos]
                    }
                }
                
                // 如果已绑定，加载伴侣的照片
                if (partnerInfo && partnerInfo.openid) {
                    const partnerRes = await uniCloud.callFunction({
                        name: 'dataService',
                        data: {
                            action: 'get',
                            collection: 'users',
                            where: {
                                openid: partnerInfo.openid
                            }
                        }
                    })
                    
                    if (partnerRes.result && partnerRes.result.code === 0 && partnerRes.result.data.length > 0) {
                        const partnerData = partnerRes.result.data[0]
                        if (partnerData.loveWallPhotos) {
                            this.partnerPhotos = [...partnerData.loveWallPhotos]
                        }
                    }
                }
                
                // 合并显示
                this.photos = [...this.myPhotos, ...this.partnerPhotos]
            } catch (err) {
                console.error('从云端加载照片失败:', err)
            }
        },
        previewPhoto(index) {
            uni.previewImage({
                current: index,
                urls: this.photos
            })
        },
        async deletePhoto(index) {
            uni.showModal({
                title: '提示',
                content: '确定删除这张照片吗？',
                success: async (res) => {
                    if (res.confirm) {
                        // 获取要删除的照片URL
                        const photoToDelete = this.photos[index]
                        
                        // 检查是否是自己的照片（只能删除自己的）
                        if (!this.myPhotos.includes(photoToDelete)) {
                            uni.showToast({ title: '只能删除自己上传的照片', icon: 'none' })
                            return
                        }
                        
                        // 从自己的列表中删除
                        this.myPhotos = this.myPhotos.filter(url => url !== photoToDelete)
                        
                        // 更新显示列表
                        this.photos = [...this.myPhotos, ...this.partnerPhotos]
                        
                        // 保存到云端（只保存自己的）
                        await this.savePhotosToCloud()
                        
                        uni.showToast({ title: '已删除', icon: 'success' })
                    }
                }
            })
        },
        editInfo() {
            uni.navigateTo({ url: '/pages/us/edit-info/index' })
        },
        setAnniversary() {
            uni.navigateTo({ url: '/pages/home/settings' })
        },
        invitePartner() {
            this.$refs.invitePopup.open()
        },
        async generateInviteCode() {
            try {
                const code = await UserManager.generateInviteCode()
                this.inviteCode = code
                uni.showToast({ title: '邀请码已生成', icon: 'success' })
            } catch (err) {
                uni.showToast({ title: '生成失败，请重试', icon: 'none' })
            }
        },
        copyInviteCode() {
            uni.setClipboardData({
                data: this.inviteCode,
                success: () => {
                    uni.showToast({ title: '邀请码已复制', icon: 'success' })
                }
            })
        },
        closeInvitePopup() {
            this.$refs.invitePopup.close()
        },
        async bindPartner() {
            if (!this.partnerCode || this.partnerCode.length !== 6) {
                uni.showToast({ title: '请输入6位邀请码', icon: 'none' })
                return
            }
            uni.showLoading({ title: '绑定中...' })
            // 使用 UserManager 绑定
            const result = await UserManager.bindByInviteCode(this.partnerCode.toUpperCase())
            uni.hideLoading()
            if (result.success) {
                this.isBind = true
                this.partnerInfo = UserManager.getPartnerInfo()
                this.partnerName = this.partnerInfo ? this.partnerInfo.nickName : ''
                uni.showToast({ title: '绑定成功！', icon: 'success' })
                this.closeInvitePopup()
            } else {
                uni.showToast({ title: result.message, icon: 'none' })
            }
        }
    }
}
</script>

<style scoped>
.us-page {
    background: linear-gradient(180deg, #ffeef8 0%, #fff 100%);
    min-height: 100vh;
}

.header {
    padding: 40rpx 32rpx;
}

.couple-card {
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    border-radius: 40rpx;
    padding: 48rpx 32rpx;
    text-align: center;
    box-shadow: 0 8rpx 32rpx rgba(255, 107, 157, 0.2);
}

.avatars {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 24rpx;
}

.avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    background: #fff;
    border: 4rpx solid #fff;
}

.heart-img {
    width: 48rpx;
    height: 48rpx;
    margin: 0 16rpx;
    animation: beat 1s infinite;
}

@keyframes beat {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
}

.couple-name {
    display: block;
    font-size: 36rpx;
    font-weight: bold;
    color: #fff;
    margin-bottom: 12rpx;
}

.together-days {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.95);
}

.stats-section {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    margin: 0 32rpx 32rpx 32rpx;
    border-radius: 32rpx;
    padding: 40rpx 32rpx;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.stat-item {
    flex: 1;
    text-align: center;
}

.stat-num {
    display: block;
    font-size: 48rpx;
    font-weight: bold;
    color: #ff6b9d;
    margin-bottom: 8rpx;
}

.stat-label {
    font-size: 24rpx;
    color: #666;
}

.stat-divider {
    width: 2rpx;
    height: 60rpx;
    background: #f0f0f0;
}

.menu-section {
    background: #fff;
    margin: 0 32rpx 32rpx 32rpx;
    border-radius: 32rpx;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.menu-item {
    display: flex;
    align-items: center;
    padding: 32rpx;
    border-bottom: 1rpx solid #f0f0f0;
}

.menu-item:last-child {
    border-bottom: none;
}

.menu-icon-img {
    width: 40rpx;
    height: 40rpx;
    margin-right: 20rpx;
}

.menu-text {
    flex: 1;
    font-size: 30rpx;
    color: #333;
}

.menu-arrow {
    font-size: 36rpx;
    color: #ccc;
}

.love-wall {
    margin: 0 32rpx 32rpx 32rpx;
    background: #fff;
    border-radius: 32rpx;
    padding: 32rpx;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.wall-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
}

.wall-title-wrap {
    display: flex;
    align-items: center;
}

.wall-title-img {
    width: 40rpx;
    height: 40rpx;
    margin-right: 12rpx;
}

.wall-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
}

.upload-btn {
    font-size: 26rpx;
    color: #ff6b9d;
    background: #fff7f2;
    padding: 12rpx 24rpx;
    border-radius: 24rpx;
}

.wall-photos {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16rpx;
}

.photo-item {
    position: relative;
    border-radius: 20rpx;
    overflow: hidden;
    aspect-ratio: 1;
}

.photo {
    width: 100%;
    height: 100%;
    background: #f7f8fa;
}

.delete-btn {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    width: 40rpx;
    height: 40rpx;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    border-radius: 50%;
    font-size: 28rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.add-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f7f8fa;
    border: 3rpx dashed #ddd;
}

.add-icon {
    font-size: 48rpx;
    color: #999;
    margin-bottom: 8rpx;
}

.add-text {
    font-size: 22rpx;
    color: #999;
}

.empty-tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60rpx 0;
}

.empty-icon-img {
    width: 80rpx;
    height: 80rpx;
    margin-bottom: 16rpx;
}

.empty-text {
    font-size: 26rpx;
    color: #999;
}

/* 邀请弹窗样式 */
.invite-popup {
    width: 600rpx;
    background: #fff;
    border-radius: 32rpx;
    overflow: hidden;
}

.popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx;
    background: linear-gradient(135deg, #ff6b9d 0%, #ffa8c5 100%);
}

.popup-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
}

.popup-close {
    font-size: 40rpx;
    color: #fff;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.popup-content {
    padding: 48rpx 32rpx;
}

.bind-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32rpx 0;
}

.success-icon {
    width: 120rpx;
    height: 120rpx;
    margin-bottom: 24rpx;
}

.success-text {
    font-size: 32rpx;
    color: #ff6b9d;
    margin-bottom: 16rpx;
}

.partner-name {
    font-size: 28rpx;
    color: #666;
}

.code-section {
    text-align: center;
    margin-bottom: 32rpx;
}

.code-label {
    font-size: 28rpx;
    color: #666;
    display: block;
    margin-bottom: 16rpx;
}

.code-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16rpx;
    margin-bottom: 16rpx;
}

.code-text {
    font-size: 48rpx;
    font-weight: bold;
    color: #ff6b9d;
    letter-spacing: 8rpx;
    background: #fff7f2;
    padding: 16rpx 32rpx;
    border-radius: 16rpx;
}

.copy-btn {
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    font-size: 26rpx;
    padding: 16rpx 32rpx;
    border-radius: 32rpx;
    border: none;
}

.code-tip {
    font-size: 24rpx;
    color: #999;
}

.generate-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32rpx 0;
}

.invite-icon {
    width: 100rpx;
    height: 100rpx;
    margin-bottom: 24rpx;
}

.invite-text {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 12rpx;
}

.invite-desc {
    font-size: 26rpx;
    color: #999;
    margin-bottom: 32rpx;
}

.generate-btn {
    width: 80%;
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    font-size: 30rpx;
    padding: 28rpx;
    border-radius: 48rpx;
    border: none;
}

.divider {
    display: flex;
    align-items: center;
    margin: 32rpx 0;
}

.divider-line {
    flex: 1;
    height: 2rpx;
    background: #f0f0f0;
}

.divider-text {
    font-size: 24rpx;
    color: #999;
    padding: 0 24rpx;
}

.input-section {
    margin-top: 16rpx;
}

.input-label {
    font-size: 28rpx;
    color: #666;
    display: block;
    margin-bottom: 16rpx;
    text-align: center;
}

.input-box {
    display: flex;
    gap: 16rpx;
}

.partner-code-input {
    flex: 1;
    padding: 24rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
    font-size: 30rpx;
    text-align: center;
    letter-spacing: 8rpx;
}

.bind-btn {
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    font-size: 28rpx;
    padding: 24rpx 40rpx;
    border-radius: 16rpx;
    border: none;
}
</style>