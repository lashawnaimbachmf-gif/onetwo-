<template>
    <view class="detail-page">
        <view class="leaf-detail-card" v-if="leaf">
            <view class="leaf-header">
                <view class="leaf-user">
                    <image class="user-avatar-img" :src="leaf.anonymous ? '/static/icons/icon-cat.png' : (leaf.userAvatar || '/static/tabbar/user.png')" mode="aspectFit" />
                    <text class="user-name">{{ leaf.anonymous ? '匿名用户' : leaf.userName }}</text>
                </view>
                <view class="leaf-tag" :style="{ background: leaf.tagColor }">
                    {{ leaf.tag }}
                </view>
            </view>
            <text class="leaf-content">{{ leaf.content }}</text>
            <view class="leaf-footer">
                <text class="footer-time">{{ leaf.time }}</text>
                <view class="hug-btn" @click="hugLeaf">
                    <image class="hug-icon" src="/static/icons/icon-hug.png" mode="aspectFit" />
                    <text class="hug-text">{{ leaf.hugCount || 0 }}</text>
                </view>
            </view>
        </view>

        <view class="reply-section">
            <view class="reply-title-box">
                <image class="reply-icon" src="/static/icons/icon-reply.png" mode="aspectFit" />
                <text class="reply-title">回应</text>
            </view>
            <view class="reply-list">
                <view class="reply-item" v-for="item in replies" :key="item.id">
                    <view class="reply-user">
                        <image class="user-avatar-img" :src="item.userAvatar || '/static/tabbar/user.png'" mode="aspectFit" />
                        <text class="user-name">{{ item.userName }}</text>
                    </view>
                    <text class="reply-content">{{ item.content }}</text>
                    <text class="reply-time">{{ item.time }}</text>
                </view>
                <view v-if="replies.length === 0" class="empty-reply">
                    还没有回应，来说点什么吧～
                </view>
            </view>
        </view>

        <view class="input-section">
            <input class="reply-input" v-model="replyText" placeholder="说点什么..." />
            <button class="send-btn" @click="sendReply">发送</button>
        </view>
    </view>
</template>

<script>
import CloudData from '@/utils/cloudData.js'
import UserManager from '@/utils/user.js'

export default {
    data() {
        return {
            leafId: null,
            leaf: null,
            replies: [],
            replyText: ''
        }
    },
    onLoad(options) {
        this.leafId = options.id
        this.loadLeaf()
    },
    methods: {
        async loadLeaf() {
            const list = await CloudData.getTrees([])
            this.leaf = list.find(l => (l._id || l.id) == this.leafId)
            if (this.leaf) {
                this.replies = this.leaf.replies || []
                uni.setNavigationBarTitle({ title: this.leaf.tag })
            }
        },
        async hugLeaf() {
            if (!this.leaf) return
            const newHugCount = (this.leaf.hugCount || 0) + 1
            await CloudData.updateTree(this.leafId, { hugCount: newHugCount })
            this.leaf.hugCount = newHugCount
            uni.showToast({ title: '抱抱～', icon: 'none' })
        },
        async sendReply() {
            if (!this.replyText.trim()) {
                uni.showToast({ title: '写点什么吧～', icon: 'none' })
                return
            }
            if (!this.leaf) {
                uni.showToast({ title: '数据加载失败', icon: 'none' })
                return
            }

            const userInfo = UserManager.getUserInfo()
            const newReply = {
                id: Date.now(),
                userName: userInfo.nickName || '我',
                userAvatar: userInfo.avatarUrl || '/static/tabbar/user.png',
                content: this.replyText,
                time: '刚刚'
            }
            this.replies.push(newReply)

            const replyCount = this.replies.length
            await CloudData.updateTree(this.leafId, {
                replies: this.replies,
                replyCount: replyCount
            })

            this.leaf.replyCount = replyCount
            this.replyText = ''
            uni.showToast({ title: '发送成功！', icon: 'success' })
        }
    }
}
</script>

<style scoped>
.detail-page {
    background: linear-gradient(180deg, #e8f5e9 0%, #fff 100%);
    min-height: 100vh;
    padding: 32rpx 32rpx 160rpx 32rpx;
}

.leaf-detail-card {
    background: #fff;
    border-radius: 32rpx;
    padding: 32rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.leaf-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.leaf-user {
    display: flex;
    align-items: center;
}

.user-avatar-img {
    width: 48rpx;
    height: 48rpx;
    margin-right: 12rpx;
    border-radius: 50%;
}

.user-name {
    font-size: 26rpx;
    color: #666;
}

.leaf-tag {
    font-size: 22rpx;
    color: #fff;
    padding: 8rpx 16rpx;
    border-radius: 20rpx;
}

.leaf-content {
    font-size: 30rpx;
    color: #333;
    line-height: 1.8;
    margin-bottom: 20rpx;
}

.leaf-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16rpx;
    border-top: 1rpx solid #f0f0f0;
}

.footer-time {
    font-size: 24rpx;
    color: #999;
}

.hug-btn {
    display: flex;
    align-items: center;
}

.hug-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 8rpx;
}

.hug-text {
    font-size: 24rpx;
    color: #666;
}

.reply-section {
    background: #fff;
    border-radius: 32rpx;
    padding: 32rpx;
}

.reply-title-box {
    display: flex;
    align-items: center;
    margin-bottom: 24rpx;
}

.reply-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 12rpx;
}

.reply-title {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
}

.reply-item {
    margin-bottom: 24rpx;
    padding-bottom: 24rpx;
    border-bottom: 1rpx solid #f0f0f0;
}

.reply-item:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.reply-user {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;
}

.reply-content {
    font-size: 28rpx;
    color: #洞;
    line-height: 1.6;
    margin-bottom: 8rpx;
}

.reply-time {
    font-size: 22rpx;
    color: #999;
}

.empty-reply {
    text-align: center;
    color: #999;
    font-size: 26rpx;
    padding: 40rpx 0;
}

.input-section {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    padding: 24rpx 32rpx;
    display: flex;
    align-items: center;
    box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.reply-input {
    flex: 1;
    padding: 20rpx 24rpx;
    background: #f7f8fa;
    border-radius: 40rpx;
    margin-right: 16rpx;
    font-size: 28rpx;
}

.send-btn {
    background: linear-gradient(135deg, #4caf50, #81c784);
    color: #fff;
    border-radius: 40rpx;
    padding: 20rpx 32rpx;
    font-size: 28rpx;
    border: none;
}
</style>
