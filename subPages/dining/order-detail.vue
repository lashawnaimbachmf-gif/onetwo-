<template>
    <view class="order-detail-page">
        <!-- Header -->
        <view class="detail-header">
            <view class="header-back" @click="goBack">
                <view class="back-icon"></view>
            </view>
            <text class="header-title">订单详情</text>
            <view class="header-spacer" />
        </view>

        <scroll-view class="detail-scroll" scroll-y v-if="order">
            <!-- ========== 小票卡片 ========== -->
            <view class="receipt-card">
                <!-- 小票头部 -->
                <view class="receipt-header">
                    <text class="receipt-shop">情侣点餐</text>
                    <view class="receipt-title-row">
                        <text class="receipt-dot">·</text>
                        <text class="receipt-label">小票</text>
                        <text class="receipt-dot">·</text>
                    </view>
                    <text class="receipt-no">No. {{ orderNo }}</text>
                </view>

                <!-- 虚线 -->
                <view class="receipt-divider" />

                <!-- 印章状态 -->
                <view class="stamp-area">
                    <view :class="['stamp', stampClass]">
                        <text class="stamp-text">{{ order.status }}</text>
                    </view>
                    <text class="stamp-hint" v-if="order.status === '待确认' && isMine">等待对方确认中…</text>
                    <text class="stamp-hint" v-else-if="order.status === '待确认' && !isMine">对方下单了，请确认</text>
                    <text class="stamp-hint" v-else>订单已确认 ✓</text>
                </view>

                <!-- 虚线 -->
                <view class="receipt-divider" />

                <!-- 下单信息 -->
                <view class="receipt-info">
                    <view class="info-row">
                        <text class="info-label">下单人</text>
                        <view class="info-value-row">
                            <image
                                class="info-avatar"
                                :src="isMine ? userInfo.avatarUrl : (partnerInfo ? partnerInfo.avatarUrl : '/static/tabbar/user.png')"
                                mode="aspectFill"
                            />
                            <text class="info-value">{{ order.creatorName || (isMine ? userInfo.nickName : (partnerInfo ? partnerInfo.nickName : '对方')) }}</text>
                        </view>
                    </view>
                    <view class="info-row">
                        <text class="info-label">时间</text>
                        <text class="info-value">{{ formatTime(order.createTime) }}</text>
                    </view>
                </view>

                <!-- 虚线 -->
                <view class="receipt-divider" />

                <!-- 菜品明细 -->
                <view class="receipt-goods">
                    <view class="goods-item" v-for="(g, idx) in order.goods" :key="idx">
                        <view class="goods-main-row">
                            <text class="goods-name">{{ g.name || '未知菜品' }}</text>
                            <text class="goods-unit-price">¥{{ g.price || 0 }}</text>
                        </view>
                        <view class="goods-sub-row">
                            <text class="goods-qty">×{{ g.count || 1 }}</text>
                            <text class="goods-subtotal">¥{{ (g.price || 0) * (g.count || 1) }}</text>
                        </view>
                        <view v-if="idx < order.goods.length - 1" class="goods-sep" />
                    </view>
                </view>

                <!-- 虚线 + 备注 -->
                <template v-if="order.remark">
                    <view class="receipt-divider" />
                    <view class="receipt-remark">
                        <text class="remark-label">备注</text>
                        <text class="remark-text">{{ order.remark }}</text>
                    </view>
                </template>

                <!-- 虚线 -->
                <view class="receipt-divider" />

                <!-- 合计 -->
                <view class="receipt-total">
                    <text class="total-label-text">合 计</text>
                    <view class="total-price-row">
                        <text class="total-symbol">¥</text>
                        <text class="total-number">{{ order.total }}</text>
                        <text class="total-unit">币</text>
                    </view>
                </view>

                <!-- 虚线 -->
                <view class="receipt-divider" />

                <!-- 结尾 -->
                <view class="receipt-footer">
                    <text class="footer-text">谢谢惠顾</text>
                    <text class="footer-heart">♡</text>
                </view>
            </view>

            <!-- 底部间距 -->
            <view class="detail-bottom-spacer" />
        </scroll-view>

        <!-- Empty State -->
        <view class="empty-state" v-else>
            <text class="empty-text">订单数据加载失败</text>
            <text class="empty-sub" @click="goBack">返回</text>
        </view>

        <!-- 底部确认按钮 -->
        <view class="bottom-confirm-bar" v-if="order && order.status === '待确认' && !isMine">
            <view class="confirm-btn" @click="confirmOrder">
                <text class="confirm-btn-text">确认订单</text>
            </view>
        </view>
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'
import TimeFormat from '@/utils/timeFormat.js'

export default {
    data() {
        return {
            order: null,
            userInfo: {},
            partnerInfo: null
        }
    },
    computed: {
        isMine() {
            if (!this.order || !this.userInfo.openid) return false
            return this.order.creatorOpenid === this.userInfo.openid
        },
        orderNo() {
            if (!this.order || !this.order.createTime) return '------'
            const d = new Date(this.order.createTime)
            const Y = d.getFullYear()
            const M = String(d.getMonth() + 1).padStart(2, '0')
            const D = String(d.getDate()).padStart(2, '0')
            const h = String(d.getHours()).padStart(2, '0')
            const m = String(d.getMinutes()).padStart(2, '0')
            return `${Y}${M}${D}-${h}${m}`
        },
        stampClass() {
            if (this.order && this.order.status === '待确认') return 'stamp-pending'
            if (this.order && this.order.status === '已确认') return 'stamp-confirmed'
            return ''
        }
    },
    onLoad() {
        this.order = getApp().globalData.orderDetailData || null
        this.userInfo = UserManager.getUserInfo()
        this.partnerInfo = UserManager.getPartnerInfo()
    },
    onUnload() {
        getApp().globalData.orderDetailData = null
    },
    methods: {
        goBack() {
            uni.navigateBack()
        },
        formatTime(time) {
            return TimeFormat.formatTime(time)
        },
        async confirmOrder() {
            uni.showModal({
                title: '确认订单',
                content: '确认这份订单吗？',
                confirmText: '确认',
                confirmColor: '#FF6B9D',
                success: async (res) => {
                    if (!res.confirm) return
                    uni.showLoading({ title: '确认中...' })
                    const result = await CloudData.updateOrder(this.order.id, { status: '已确认' })
                    uni.hideLoading()
                    if (result.success) {
                        this.order.status = '已确认'
                        uni.showToast({ title: '已确认', icon: 'success' })
                    } else {
                        uni.showToast({ title: result.message || '操作失败', icon: 'none' })
                    }
                }
            })
        }
    }
}
</script>

<style scoped>
.order-detail-page {
    background: #F7F8FA;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* ── Header ───────────────────────────────────── */
.detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(var(--status-bar-height) + 20rpx) 24rpx 20rpx;
    background: #FFFFFF;
}

.header-back {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #F7F8FA;
    transition: background 0.15s ease;
}

.header-back:active {
    background: #E8E8E8;
}

.back-icon {
    box-sizing: border-box;
    position: relative;
    /* 旋转后箭头视觉重心偏左，右移补正，使其在圆形按钮内居中 */
    left: 5rpx;
    width: 18rpx;
    height: 18rpx;
    border-left: 4rpx solid #1A1A1A;
    border-bottom: 4rpx solid #1A1A1A;
    transform: rotate(45deg);
}

.header-title {
    font-size: 34rpx;
    font-weight: 700;
    color: #1A1A1A;
}

.header-spacer {
    width: 64rpx;
}

/* ── Scroll ───────────────────────────────────── */
.detail-scroll {
    flex: 1;
    padding: 24rpx 0;
}

.detail-bottom-spacer {
    height: 160rpx;
}

/* ================================================================
   小票卡片 — Receipt Style
   ================================================================ */

.receipt-card {
    background: #FFFCFA;
    border-radius: 16rpx;
    margin: 0 24rpx;
    padding: 44rpx 36rpx 36rpx;
    box-shadow: 0 4rpx 32rpx rgba(0, 0, 0, 0.06), 0 1rpx 8rpx rgba(0, 0, 0, 0.04);
    animation: receipt-in 0.45s cubic-bezier(0.32, 0.72, 0, 1) both;
}

@keyframes receipt-in {
    0%   { transform: translateY(40rpx); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
    .receipt-card {
        animation: none;
    }
}

/* ── 小票头部 ─────────────────────────────────── */
.receipt-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 8rpx;
}

.receipt-shop {
    font-size: 36rpx;
    font-weight: 700;
    color: #1A1A1A;
    letter-spacing: 8rpx;
}

.receipt-title-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-top: 8rpx;
}

.receipt-dot {
    font-size: 20rpx;
    color: #CCCCCC;
}

.receipt-label {
    font-size: 22rpx;
    color: #999999;
    letter-spacing: 12rpx;
}

.receipt-no {
    font-size: 20rpx;
    color: #BBBBBB;
    margin-top: 12rpx;
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
}

/* ── 虚线分割 ─────────────────────────────────── */
.receipt-divider {
    height: 0;
    border-top: 2rpx dashed #E8E8E8;
    margin: 28rpx 0;
}

/* ── 印章状态 ─────────────────────────────────── */
.stamp-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8rpx 0;
}

.stamp {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 16rpx 40rpx;
    border-width: 4rpx;
    border-style: solid;
    border-radius: 12rpx;
    transform: rotate(-6deg);
    animation: stamp-in 0.5s cubic-bezier(0.32, 0.72, 0, 1) 0.2s both;
}

@keyframes stamp-in {
    0%   { transform: rotate(-6deg) scale(0); opacity: 0; }
    70%  { transform: rotate(-6deg) scale(1.15); opacity: 1; }
    100% { transform: rotate(-6deg) scale(1); opacity: 0.88; }
}

@media (prefers-reduced-motion: reduce) {
    .stamp {
        animation: none;
        opacity: 0.88;
    }
}

.stamp-pending {
    border-color: #FF6B9D;
    color: #FF6B9D;
}

.stamp-confirmed {
    border-color: #07C160;
    color: #07C160;
}

.stamp-text {
    font-size: 36rpx;
    font-weight: 700;
    letter-spacing: 12rpx;
    margin-right: -12rpx; /* 抵消最后字符的多余间距 */
}

.stamp-hint {
    font-size: 24rpx;
    color: #999999;
    margin-top: 20rpx;
}

/* ── 下单信息 ─────────────────────────────────── */
.receipt-info {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.info-row {
    display: flex;
    align-items: center;
}

.info-label {
    font-size: 26rpx;
    color: #999999;
    width: 120rpx;
    flex-shrink: 0;
}

.info-value-row {
    display: flex;
    align-items: center;
    flex: 1;
}

.info-value {
    font-size: 26rpx;
    color: #1A1A1A;
}

.info-avatar {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    margin-right: 10rpx;
    background: #F7F8FA;
}

/* ── 菜品明细 ─────────────────────────────────── */
.receipt-goods {
    display: flex;
    flex-direction: column;
}

.goods-item {
    padding: 8rpx 0;
}

.goods-main-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 8rpx 0;
}

.goods-name {
    font-size: 28rpx;
    color: #1A1A1A;
    font-weight: 500;
}

.goods-unit-price {
    font-size: 26rpx;
    color: #666666;
    flex-shrink: 0;
    margin-left: 24rpx;
}

.goods-sub-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 2rpx 0 8rpx 28rpx;
}

.goods-qty {
    font-size: 24rpx;
    color: #999999;
}

.goods-subtotal {
    font-size: 26rpx;
    color: #1A1A1A;
    font-weight: 500;
}

.goods-sep {
    height: 0;
    border-top: 1rpx dotted #EEEEEE;
    margin: 6rpx 0;
}

/* ── 备注 ─────────────────────────────────────── */
.receipt-remark {
    display: flex;
    align-items: flex-start;
    gap: 12rpx;
}

.remark-label {
    font-size: 26rpx;
    color: #999999;
    flex-shrink: 0;
}

.remark-text {
    font-size: 26rpx;
    color: #666666;
    line-height: 1.5;
}

/* ── 合计 ─────────────────────────────────────── */
.receipt-total {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.total-label-text {
    font-size: 28rpx;
    color: #1A1A1A;
    font-weight: 600;
    letter-spacing: 8rpx;
}

.total-price-row {
    display: flex;
    align-items: baseline;
    gap: 2rpx;
}

.total-symbol {
    font-size: 28rpx;
    color: #FF6B9D;
    font-weight: 600;
}

.total-number {
    font-size: 48rpx;
    color: #FF6B9D;
    font-weight: 700;
    line-height: 1;
}

.total-unit {
    font-size: 24rpx;
    color: #FF6B9D;
    margin-left: 4rpx;
}

/* ── 结尾 ─────────────────────────────────────── */
.receipt-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    padding-top: 8rpx;
}

.footer-text {
    font-size: 24rpx;
    color: #BBBBBB;
    letter-spacing: 4rpx;
}

.footer-heart {
    font-size: 24rpx;
    color: #FF6B9D;
}

/* ── Empty State ──────────────────────────────── */
.empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80rpx 32rpx;
}

.empty-text {
    font-size: 28rpx;
    color: #999999;
    margin-bottom: 12rpx;
}

.empty-sub {
    font-size: 24rpx;
    color: #FF6B9D;
}

/* ── Bottom Confirm Bar ────────────────────────── */
.bottom-confirm-bar {
    padding: 20rpx 32rpx;
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
    background: #FFFFFF;
    box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.confirm-btn {
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    border-radius: 48rpx;
    padding: 20rpx 0;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.22);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.confirm-btn:active {
    transform: scale(0.97);
}

.confirm-btn-text {
    font-size: 32rpx;
    color: #FFFFFF;
    font-weight: 600;
}
</style>
