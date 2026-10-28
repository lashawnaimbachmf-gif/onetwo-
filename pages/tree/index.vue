<template>
    <view class="tree-page">
        <view class="tree-header">
            <view class="tree-title-box">
                <image class="tree-icon" src="/static/icons/icon-tree.png" mode="aspectFit" />
                <text class="tree-title">吐槽大树</text>
            </view>
            <text class="tree-desc">把不开心都说出来吧</text>
        </view>

        <scroll-view class="tree-list" scroll-y>
            <view class="leaf-card" v-for="(item, index) in leafList" :key="item.id" :data-id="item.id" @click="goDetail">
                <view class="leaf-header">
                    <view class="leaf-user">
                        <image class="user-avatar-img" :src="item.anonymous ? '/static/icons/icon-cat.png' : (item.userAvatar || '/static/tabbar/user.png')" mode="aspectFit" />
                        <text class="user-name">{{ item.anonymous ? '匿名用户' : item.userName }}</text>
                    </view>
                    <view class="leaf-tag" :style="{ background: item.tagColor }">
                        {{ item.tag }}
                    </view>
                </view>
                <text class="leaf-content">{{ item.content }}</text>
                <view class="leaf-footer">
                    <view class="footer-left">
                        <text class="footer-time">{{ formatTime(item.createTime) }}</text>
                    </view>
                    <view class="footer-right">
                        <view class="action-btn" :data-id="item.id" @click.stop="hugItem">
                            <image class="action-icon" src="/static/icons/icon-hug.png" mode="aspectFit" />
                            <text class="action-text">{{ item.hugCount }}</text>
                        </view>
                        <view class="action-btn">
                            <image class="action-icon" src="/static/icons/icon-reply.png" mode="aspectFit" />
                            <text class="action-text">{{ item.replyCount }}</text>
                        </view>
                    </view>
                </view>
            </view>
        </scroll-view>

        <button class="add-leaf-btn" @click="addLeaf">
            <image class="btn-icon" src="/static/icons/icon-edit.png" mode="aspectFit" />
            <text class="btn-text">写吐槽</text>
        </button>
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'
import TimeFormat from '@/utils/timeFormat.js'

export default {
    data() {
        return {
            leafList: [],
            userInfo: {},
            partnerInfo: null,
            isBind: false
        }
    },
    async onShow() {
        this.loadUserInfo()
        // 检查反向绑定
        if (!this.isBind && this.userInfo.openid) {
            await this.checkReverseBind()
        }
        this.loadLeaves()
    },
    methods: {
        loadUserInfo() {
            this.userInfo = UserManager.getUserInfo()
            this.partnerInfo = UserManager.getPartnerInfo()
            this.isBind = UserManager.isBind()
        },
        
        // 格式化时间
        formatTime(time) {
            return TimeFormat.formatTime(time)
        },
        
        // 检查是否有反向绑定记录
        async checkReverseBind() {
            try {
                const res = await uniCloud.callFunction({
                    name: 'inviteCode',
                    data: {
                        action: 'checkReverse',
                        userInfo: this.userInfo
                    }
                })
                
                if (res.result && res.result.code === 0 && res.result.data.hasBind) {
                    UserManager.setPartnerInfo(res.result.data.partnerInfo)
                    this.partnerInfo = res.result.data.partnerInfo
                    this.isBind = true
                    console.log('树洞页自动绑定伴侣:', res.result.data.partnerInfo)
                }
            } catch (err) {
                console.error('树洞页检查反向绑定失败:', err)
            }
        },
        
        async loadLeaves() {
            // 从云端加载树洞数据
            const coupleOpenids = UserManager.getCoupleOpenids()
            const list = await CloudData.getTrees(coupleOpenids)

            if (list && list.length > 0) {
                this.leafList = list.map(item => {
                    return {
                        ...item,
                        id: item._id || item.id,
                        userName: item.anonymous ? '匿名用户' : UserManager.getDisplayName(item.creatorOpenid),
                        userAvatar: item.anonymous ? '/static/icons/icon-cat.png' : UserManager.getDisplayAvatar(item.creatorOpenid)
                    }
                })
            } else {
                this.leafList = []
            }
        },
        goDetail(e) {
            const id = e.currentTarget.dataset.id
            uni.navigateTo({ url: '/pages/tree/detail?id=' + id })
        },
        addLeaf() {
            uni.navigateTo({ url: '/pages/tree/create' })
        },
        async hugItem(e) {
            const id = e.currentTarget.dataset.id
            const item = this.leafList.find(l => l.id == id)
            if (item) {
                const newHugCount = (item.hugCount || 0) + 1
                await CloudData.updateTree(id, { hugCount: newHugCount })
                item.hugCount = newHugCount
                uni.showToast({ title: '抱抱～', icon: 'none' })
            }
        }
    }
}
</script>

<style scoped>
.tree-page {
    background: linear-gradient(180deg, #e8f5e9 0%, #fff 100%);
    min-height: 100vh;
    padding-bottom: 140rpx;
}

.tree-header {
    padding: 16rpx 32rpx 24rpx;
    text-align: center;
}

.tree-title-box {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12rpx;
}

.tree-icon {
    width: 48rpx;
    height: 48rpx;
    margin-right: 12rpx;
}

.tree-title {
    font-size: 40rpx;
    font-weight: bold;
    color: #2e7d32;
}

.tree-desc {
    font-size: 26rpx;
    color: #666;
}

.tree-list {
    padding: 0 32rpx;
    padding-right: calc(32rpx + constant(safe-area-inset-right));
    padding-right: calc(32rpx + env(safe-area-inset-right));
    height: calc(100vh - 300rpx);
    box-sizing: border-box;
}

.leaf-card {
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
    font-size: 28rpx;
    color: #333;
    line-height: 1.8;
    margin-bottom: 20rpx;
}

.leaf-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.footer-time {
    font-size: 24rpx;
    color: #999;
}

.footer-right {
    display: flex;
    align-items: center;
}

.action-btn {
    display: flex;
    align-items: center;
    margin-left: 32rpx;
}

.action-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 8rpx;
}

.action-text {
    font-size: 24rpx;
    color: #666;
}

.add-leaf-btn {
    position: fixed;
    bottom: 40rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 300rpx;
    background: linear-gradient(135deg, #4caf50, #81c784);
    color: #fff;
    font-size: 28rpx;
    font-weight: bold;
    padding: 24rpx 48rpx;
    border-radius: 48rpx;
    border: none;
    box-shadow: 0 4rpx 16rpx rgba(76, 175, 80, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 12rpx;
}

.btn-text {
    color: #fff;
}
</style>