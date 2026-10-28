<template>
    <view class="create-page">
        <view class="form-item">
            <text class="label">想说什么</text>
            <textarea class="textarea" v-model="content" placeholder="把不开心或想说的话写下来..." />
        </view>

        <view class="form-item">
            <text class="label">情绪标签</text>
            <view class="tag-selector">
                <view :class="['tag-item', selectedTag === '疲惫' ? 'active' : '']" @click="selectTag('疲惫', '#ff7e5f')">
                    <view class="tag-color" style="background: #ff7e5f;"></view> 疲惫
                </view>
                <view :class="['tag-item', selectedTag === '想念' ? 'active' : '']" @click="selectTag('想念', '#ff6b9d')">
                    <view class="tag-color" style="background: #ff6b9d;"></view> 想念
                </view>
                <view :class="['tag-item', selectedTag === '开心' ? 'active' : '']" @click="selectTag('开心', '#ffd96b')">
                    <view class="tag-color" style="background: #ffd96b;"></view> 开心
                </view>
                <view :class="['tag-item', selectedTag === '关心' ? 'active' : '']" @click="selectTag('关心', '#6b9dff')">
                    <view class="tag-color" style="background: #6b9dff;"></view> 关心
                </view>
            </view>
        </view>

        <view class="form-item">
            <text class="label">是否匿名</text>
            <view class="anonymous-switch" @click="anonymous = !anonymous">
                <text class="switch-label">匿名发布</text>
                <view :class="['switch-btn', anonymous ? 'active' : '']">
                    <view class="switch-dot"></view>
                </view>
            </view>
        </view>

        <button class="submit-btn" @click="submit">发布</button>
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'

export default {
    data() {
        return {
            content: '',
            selectedTag: '疲惫',
            selectedColor: '#ff7e5f',
            anonymous: true,
            userInfo: {}
        }
    },
    onLoad() {
        this.userInfo = UserManager.getUserInfo()
    },
    methods: {
        selectTag(tag, color) {
            this.selectedTag = tag
            this.selectedColor = color
        },
        async submit() {
            if (!this.content.trim()) {
                uni.showToast({ title: '写点什么吧～', icon: 'none' })
                return
            }

            const newLeaf = {
                content: this.content,
                tag: this.selectedTag,
                tagColor: this.selectedColor,
                anonymous: this.anonymous,
                userName: this.anonymous ? '匿名用户' : this.userInfo.nickName,
                userAvatar: this.anonymous ? '/static/icons/icon-cat.png' : this.userInfo.avatarUrl,
                creatorOpenid: this.userInfo.openid || '',
                hugCount: 0,
                replyCount: 0,
                replies: []
            }

            uni.showLoading({ title: '发布中...' })
            const result = await CloudData.addTree(newLeaf)
            uni.hideLoading()

            if (result.success) {
                uni.showToast({ title: '发布成功！', icon: 'success' })
                setTimeout(() => {
                    uni.navigateBack()
                }, 1000)
            } else {
                uni.showToast({ title: result.message, icon: 'none' })
            }
        }
    }
}
</script>

<style scoped>
.create-page {
    background: linear-gradient(180deg, #e8f5e9 0%, #fff 100%);
    min-height: 100vh;
    padding: 32rpx;
}

.form-item {
    background: #fff;
    border-radius: 24rpx;
    padding: 32rpx;
    margin-bottom: 24rpx;
}

.label {
    display: block;
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
}

.textarea {
    width: 100%;
    min-height: 300rpx;
    font-size: 30rpx;
    color: #333;
    padding: 20rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
}

.tag-selector {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16rpx;
}

.tag-item {
    text-align: center;
    padding: 24rpx 16rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
    font-size: 26rpx;
    color: #666;
    border: 3rpx solid transparent;
}

.tag-item.active {
    border-color: #4caf50;
    background: #f2fff7;
    color: #2e7d32;
}

.tag-color {
    width: 24rpx;
    height: 24rpx;
    border-radius: 50%;
    margin-right: 12rpx;
    display: inline-block;
    vertical-align: middle;
}

.anonymous-switch {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.switch-label {
    font-size: 28rpx;
    color: #333;
}

.switch-btn {
    width: 96rpx;
    height: 52rpx;
    background: #ccc;
    border-radius: 26rpx;
    position: relative;
    transition: all 0.3s;
}

.switch-btn.active {
    background: #4caf50;
}

.switch-dot {
    width: 44rpx;
    height: 44rpx;
    background: #fff;
    border-radius: 50%;
    position: absolute;
    top: 4rpx;
    left: 4rpx;
    transition: all 0.3s;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.switch-btn.active .switch-dot {
    left: 48rpx;
}

.submit-btn {
    width: 100%;
    margin-top: 40rpx;
    background: linear-gradient(135deg, #4caf50, #81c784);
    color: #fff;
    font-size: 32rpx;
    font-weight: bold;
    padding: 32rpx;
    border-radius: 48rpx;
    border: none;
}
</style>