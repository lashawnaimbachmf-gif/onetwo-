<template>
    <view class="capsule-page">
        <view class="header">
            <text class="title">情书胶囊</text>
        </view>

        <view class="capsule-tabs">
            <view :class="['tab', activeTab === 0 ? 'active' : '']" @click="activeTab = 0">
                <text class="tab-text">未开启</text>
            </view>
            <view :class="['tab', activeTab === 1 ? 'active' : '']" @click="activeTab = 1">
                <text class="tab-text">已开启</text>
            </view>
        </view>

        <view v-if="displayList.length === 0" class="empty-tip">
            <image class="empty-icon-img" src="/static/icons/icon-envelope.png" mode="aspectFit" />
            <text class="empty-text">{{ activeTab === 0 ? '还没有情书胶囊' : '还没有已开启的胶囊' }}</text>
            <text class="empty-sub" v-if="activeTab === 0">点击右下角 + 开始写情书吧</text>
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

        <view class="fab" @click="goCreate">
            <text class="fab-text">+</text>
        </view>
        <CustomTabBar :activeIndex="1" />
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'
import CustomTabBar from '@/components/CustomTabBar.vue'

export default {
    components: { CustomTabBar },
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
    onLoad() {
        this.loadUserInfo()
        if (!this.isBind && this.userInfo.openid) {
            this.checkReverseBind()
        }
        this.loadCapsules()
    },
    onShow() {
        this.loadUserInfo()
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
                const res = await wx.cloud.callFunction({
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
            uni.navigateTo({ url: '/subPages/capsule/create' })
        },
        async goDetail(e) {
            const id = e.currentTarget.dataset.id
            const item = this.displayList.find(c => c.id == id)
            if (!item) return
            
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
                url: '/subPages/capsule/detail?id=' + id
            })
        }
    }
}
</script>

<style scoped>
.capsule-page {
    background: #F7F8FA;
    min-height: 100vh;
    padding-bottom: calc(100rpx + env(safe-area-inset-bottom) + 20rpx);
}

/* ── Header ────────────────────────────────────── */
.header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(var(--status-bar-height) + 28rpx) 32rpx 20rpx;
    background: transparent;
}

.title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1A1A1A;
}

/* ── FAB — Premium Soft Glow ──────────────────────── */
.fab {
    position: fixed;
    bottom: calc(56rpx + 100rpx + env(safe-area-inset-bottom));
    right: 32rpx;
    width: 104rpx;
    height: 104rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    box-shadow: 0 12rpx 40rpx rgba(255, 107, 157, 0.28), 0 4rpx 16rpx rgba(255, 107, 157, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.fab:active {
    transform: scale(0.92);
    box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.2);
}

.fab-text {
    font-size: 48rpx;
    color: #FFFFFF;
    font-weight: 300;
    line-height: 1;
}

/* ── Tab Bar — Floating Pill ───────────────────── */
.capsule-tabs {
    display: flex;
    margin: 0 32rpx;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(16rpx);
    -webkit-backdrop-filter: blur(16rpx);
    border-radius: 24rpx;
    padding: 4rpx;
    box-shadow: 0 4rpx 24rpx rgba(255, 107, 157, 0.06), 0 1rpx 6rpx rgba(0, 0, 0, 0.03);
}

.tab {
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 18rpx 0;
    border-radius: 20rpx;
    transition: background 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.tab-text {
    font-size: 28rpx;
    color: #999999;
    font-weight: 500;
    transition: color 0.25s ease;
}

.tab.active {
    background: #FF6B9D;
    box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.25);
}

.tab.active .tab-text {
    color: #FFFFFF;
    font-weight: 600;
}

/* ── Empty State ───────────────────────────────── */
.empty-tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 120rpx 32rpx;
}

.empty-icon-img {
    width: 100rpx;
    height: 100rpx;
    margin-bottom: 24rpx;
    opacity: 0.4;
}

.empty-text {
    font-size: 28rpx;
    color: #999999;
    margin-bottom: 10rpx;
}

.empty-sub {
    font-size: 24rpx;
    color: #FF6B9D;
}

/* ── Capsule List ──────────────────────────────── */
.capsule-list {
    padding: 24rpx 32rpx;
    height: calc(100vh - 200rpx);
    box-sizing: border-box;
}

/* ── Capsule Card ─────────────────────────────── */
.capsule-card {
    display: flex;
    align-items: center;
    background: #FFFFFF;
    border-radius: 28rpx;
    padding: 28rpx;
    margin-bottom: 16rpx;
    box-shadow: 0 8rpx 40rpx rgba(255, 107, 157, 0.05), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.capsule-card:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 20rpx rgba(255, 107, 157, 0.04);
}

.capsule-icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 22rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    flex-shrink: 0;
}

.type-icon-img {
    width: 44rpx;
    height: 44rpx;
}

.capsule-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.capsule-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1A1A1A;
    margin-bottom: 6rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.capsule-time {
    font-size: 24rpx;
    color: #999999;
}

/* ── Status Badges ─────────────────────────────── */
.capsule-status {
    font-size: 22rpx;
    font-weight: 500;
    padding: 8rpx 20rpx;
    border-radius: 48rpx;
    flex-shrink: 0;
}

.capsule-status.pending {
    background: #FFF5F8;
    color: #FF6B9D;
}

.capsule-status.can-open {
    background: #F0FAF4;
    color: #07C160;
}

.capsule-status.opened {
    background: #F7F8FA;
    color: #999999;
}
</style>