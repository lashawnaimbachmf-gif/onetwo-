<template>
    <view class="capsule-page">
        <view class="header">
            <text class="title">情书胶囊博物馆</text>
            <button class="create-btn" @click="goCreate">+ 写情书</button>
        </view>

        <view class="capsule-tabs">
            <view :class="['tab', activeTab === 0 ? 'active' : '']" @click="activeTab = 0">未开启</view>
            <view :class="['tab', activeTab === 1 ? 'active' : '']" @click="activeTab = 1">已开启</view>
        </view>

        <view v-if="displayList.length === 0" class="empty-tip">
            <image class="empty-icon-img" src="/static/icons/icon-capsule.png" mode="aspectFit" />
            <text class="empty-text">{{ activeTab === 0 ? '暂无情书胶囊' : '还没有已开启的胶囊' }}</text>
        </view>

        <scroll-view class="capsule-list" v-else scroll-y refresher-enabled @refresherrefresh="onRefresh" :refresher-triggered="refreshing">
            <view 
                class="capsule-card" 
                v-for="(item, index) in displayList" 
                :key="item.id" 
                :data-id="item.id"
                @click="goDetail"
            >
                <view class="capsule-icon" :style="{ background: item.color }">
                    <image class="type-icon-img" :src="getTypeIcon(item.type)" mode="aspectFit" />
                </view>
                <view class="capsule-info">
                    <text class="capsule-title">{{ item.title }}</text>
                    <text class="capsule-time">
                        {{ item.is_opened ? '已开启 · ' : '开启时间 · ' }}{{ item.open_time || '未设置' }}
                    </text>
                </view>
                <view :class="['capsule-status', item.is_opened ? 'opened' : (canOpen(item) ? 'can-open' : 'pending')]">
                    {{ item.is_opened ? '已开启' : (canOpen(item) ? '可开启' : '等待中') }}
                </view>
            </view>
        </scroll-view>
    </view>
</template>

<script>
import uniCloud from '@/utils/cloud.js'
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'

export default {
    data() {
        return {
            activeTab: 0,
            capsuleList: [],
            userInfo: {},
            partnerInfo: null,
            isBind: false,
            refreshing: false
        }
    },
    computed: {
        displayList() {
            const list = this.activeTab === 0 
                ? this.capsuleList.filter(c => !c.is_opened) 
                : this.capsuleList.filter(c => c.is_opened)
            return list
        }
    },
    async onShow() {
        this.loadUserInfo()
        // 检查反向绑定
        if (!this.isBind && this.userInfo.openid) {
            await this.checkReverseBind()
        }
        this.loadCapsules()
    },
    methods: {
        loadUserInfo() {
            this.userInfo = UserManager.getUserInfo()
            this.partnerInfo = UserManager.getPartnerInfo()
            this.isBind = UserManager.isBind()
        },
        
        // 下拉刷新
        async onRefresh() {
            this.refreshing = true
            await this.loadUserInfo()
            if (!this.isBind && this.userInfo.openid) {
                await this.checkReverseBind()
            }
            await this.loadCapsules()
            this.refreshing = false
            uni.showToast({ title: '刷新成功', icon: 'success' })
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
                    console.log('胶囊页自动绑定伴侣:', res.result.data.partnerInfo)
                }
            } catch (err) {
                console.error('胶囊页检查反向绑定失败:', err)
            }
        },
        
        async loadCapsules() {
            // 从云端加载胶囊数据
            const coupleOpenids = UserManager.getCoupleOpenids()
            const list = await CloudData.getCapsules(coupleOpenids)
            // 将 _id 映射为 id
            this.capsuleList = list.map(item => ({
                ...item,
                id: item._id || item.id
            }))
        },
        getTypeIcon(type) {
            const iconMap = {
                'text': '/static/icons/icon-text.png',
                'voice': '/static/icons/icon-voice.png',
                'image': '/static/icons/icon-image.png'
            }
            return iconMap[type] || '/static/icons/icon-text.png'
        },
        canOpen(item) {
            if (item.is_opened) return false
            const today = new Date()
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
            return todayStr >= item.open_time
        },
        goCreate() {
            uni.navigateTo({ url: '/pages/capsule/create' })
        },
        async goDetail(e) {
            const id = e.currentTarget.dataset.id
            console.log('点击胶囊ID:', id)
            
            const item = this.displayList.find(c => c.id == id)
            if (!item) {
                console.log('未找到胶囊')
                return
            }
            
            if (!item.is_opened && !this.canOpen(item)) {
                uni.showToast({ title: '还没到开启时间呢～', icon: 'none' })
                return
            }
            
            if (!item.is_opened) {
                // 更新云端胶囊状态
                await CloudData.updateCapsule(id, { is_opened: true })
                // 刷新列表
                await this.loadCapsules()
            }
            
            uni.navigateTo({ 
                url: '/pages/capsule/detail?id=' + id,
                success: () => {
                    console.log('跳转成功')
                },
                fail: (err) => {
                    console.log('跳转失败:', err)
                }
            })
        }
    }
}
</script>

<style scoped>
.capsule-page {
    background: #f7f8fa;
    min-height: 100vh;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 32rpx;
    background: #fff;
}

.title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
}

.create-btn {
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    border-radius: 40rpx;
    padding: 16rpx 32rpx;
    font-size: 28rpx;
    border: none;
}

.capsule-tabs {
    display: flex;
    background: #fff;
    padding: 0 32rpx;
    border-bottom: 2rpx solid #f0f0f0;
}

.tab {
    flex: 1;
    text-align: center;
    padding: 32rpx 0;
    font-size: 30rpx;
    color: #666;
    position: relative;
}

.tab.active {
    color: #ff6b9d;
    font-weight: bold;
}

.tab.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 48rpx;
    height: 6rpx;
    background: #ff6b9d;
    border-radius: 3rpx;
}

.empty-tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 200rpx;
}

.empty-icon-img {
    width: 160rpx;
    height: 160rpx;
    margin-bottom: 24rpx;
}

.empty-text {
    font-size: 28rpx;
    color: #999;
}

.capsule-list {
    padding: 24rpx 32rpx;
    padding-right: calc(32rpx + constant(safe-area-inset-right));
    padding-right: calc(32rpx + env(safe-area-inset-right));
    height: calc(100vh - 300rpx);
    box-sizing: border-box;
}

.capsule-list ::v-deep .uni-scroll-view-content {
    min-height: 100%;
}

.capsule-card {
    display: flex;
    align-items: center;
    background: #fff;
    border-radius: 24rpx;
    padding: 28rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
    position: relative;
}

.capsule-icon {
    width: 100rpx;
    height: 100rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
}

.type-icon-img {
    width: 48rpx;
    height: 48rpx;
}

.capsule-info {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.capsule-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 8rpx;
}

.capsule-time {
    font-size: 24rpx;
    color: #888;
}

.capsule-status {
    font-size: 24rpx;
    padding: 8rpx 20rpx;
    border-radius: 20rpx;
}

.capsule-status.pending {
    background: #fff7f2;
    color: #ff6b9d;
}

.capsule-status.can-open {
    background: #f2fff7;
    color: #07c160;
}

.capsule-status.opened {
    background: #f2f7ff;
    color: #6b9dff;
}
</style>