<template>
    <view class="detail-page" v-if="anniversary">
        <view class="header-card">
            <image class="anniversary-icon-img" :src="getAnniversaryIcon(anniversary.icon)" mode="aspectFit" />
            <text class="anniversary-name">{{ anniversary.name }}</text>
            <text class="anniversary-date">{{ anniversary.date }}</text>
        </view>

        <view class="countdown-card">
            <text class="countdown-label">距离这一天还有</text>
            <view class="countdown-display">
                <text class="countdown-num">{{ countdown }}</text>
                <text class="countdown-unit">天</text>
            </view>
            <view class="countdown-desc-wrap" v-if="countdown === 0">
                <image class="countdown-icon" src="/static/icons/icon-celebrate.png" mode="aspectFit" />
                <text class="countdown-desc">就是今天！</text>
            </view>
            <text class="countdown-desc" v-else-if="countdown === 1">明天就到啦！</text>
            <text class="countdown-desc" v-else>一起期待这一天的到来吧～</text>
        </view>

        <view class="info-card">
            <view class="info-item">
                <text class="info-label">纪念日</text>
                <text class="info-value">{{ anniversary.name }}</text>
            </view>
            <view class="info-item">
                <text class="info-label">日期</text>
                <text class="info-value">{{ anniversary.date }}</text>
            </view>
            <view class="info-item">
                <text class="info-label">类型</text>
                <text class="info-value">{{ getTypeText() }}</text>
            </view>
        </view>

        <button class="back-btn" @click="goBack">返回</button>
    </view>
</template>

<script>
import CloudData from '@/utils/cloudData.js'
import UserManager from '@/utils/user.js'

export default {
    data() {
        return {
            anniversary: null,
            countdown: 0,
            anniversaryId: null
        }
    },
    onLoad(options) {
        if (options.id) {
            this.anniversaryId = options.id
            this.loadAnniversary()
        }
    },
    methods: {
        async loadAnniversary() {
            const coupleOpenids = UserManager.getCoupleOpenids()
            const list = await CloudData.getAnniversaries(coupleOpenids)
            const item = list.find(a => (a._id || a.id) == this.anniversaryId)
            if (item) {
                this.anniversary = item
                this.countdown = this.calculateCountdown(item.date)
            }
        },
        calculateCountdown(targetDate) {
            const now = new Date()
            const target = new Date(targetDate)
            target.setFullYear(now.getFullYear())
            if (target < now) {
                target.setFullYear(now.getFullYear() + 1)
            }
            const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
            return diff
        },
        getTypeText() {
            if (!this.anniversary) return ''
            const icons = {
                'birthday': '生日',
                'couple': '纪念日',
                'love': '爱情',
                'gift': '礼物',
                'rose': '浪漫',
                'celebrate': '庆祝',
                '🎂': '生日',
                '💑': '纪念日',
                '❤️': '爱情',
                '🎁': '礼物',
                '🌹': '浪漫',
                '🎉': '庆祝'
            }
            return icons[this.anniversary.icon] || '特别的日子'
        },
        goBack() {
            uni.navigateBack()
        },
        getAnniversaryIcon(iconName) {
            const iconMap = {
                'birthday': '/static/icons/icon-birthday.png',
                'couple': '/static/icons/icon-couple.png',
                'love': '/static/icons/icon-love.png',
                'gift': '/static/icons/icon-gift.png',
                'rose': '/static/icons/icon-rose.png',
                'celebrate': '/static/icons/icon-celebrate.png',
                '🎂': '/static/icons/icon-birthday.png',
                '💑': '/static/icons/icon-couple.png',
                '❤️': '/static/icons/icon-love.png',
                '🎁': '/static/icons/icon-gift.png',
                '🌹': '/static/icons/icon-rose.png',
                '🎉': '/static/icons/icon-celebrate.png'
            }
            return iconMap[iconName] || '/static/icons/icon-love.png'
        }
    }
}
</script>

<style scoped>
.detail-page {
    background: linear-gradient(180deg, #FFF0F5 0%, #FFFFFF 100%);
    min-height: 100vh;
    padding: calc(var(--status-bar-height) + 32rpx) 32rpx 32rpx;
}

.header-card {
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    border-radius: 36rpx;
    padding: 64rpx 40rpx;
    text-align: center;
    margin-bottom: 32rpx;
    box-shadow: 0 12rpx 56rpx rgba(255, 107, 157, 0.22), 0 4rpx 20rpx rgba(255, 107, 157, 0.12);
}

.anniversary-icon-img {
    width: 100rpx;
    height: 100rpx;
    display: block;
    margin: 0 auto 24rpx;
}

.anniversary-name {
    font-size: 40rpx;
    font-weight: 700;
    color: #FFFFFF;
    display: block;
    margin-bottom: 16rpx;
    letter-spacing: 2rpx;
}

.anniversary-date {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.9);
}

.countdown-card {
    background: #FFFFFF;
    border-radius: 36rpx;
    padding: 48rpx;
    text-align: center;
    margin-bottom: 32rpx;
    box-shadow: 0 12rpx 56rpx rgba(255, 107, 157, 0.07), 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.countdown-label {
    font-size: 28rpx;
    color: #666666;
    display: block;
    margin-bottom: 24rpx;
}

.countdown-display {
    display: flex;
    align-items: baseline;
    justify-content: center;
    margin-bottom: 16rpx;
}

.countdown-num {
    font-size: 120rpx;
    font-weight: 700;
    color: #FF6B9D;
    line-height: 1;
}

.countdown-unit {
    font-size: 40rpx;
    color: #FF6B9D;
    margin-left: 12rpx;
}

.countdown-desc-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
}

.countdown-icon {
    width: 36rpx;
    height: 36rpx;
    margin-right: 8rpx;
}

.countdown-desc {
    font-size: 28rpx;
    color: #999999;
}

.info-card {
    background: #FFFFFF;
    border-radius: 36rpx;
    padding: 32rpx;
    margin-bottom: 48rpx;
    box-shadow: 0 12rpx 56rpx rgba(255, 107, 157, 0.06), 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1rpx solid rgba(240, 240, 240, 0.6);
}

.info-item:last-child {
    border-bottom: none;
}

.info-label {
    font-size: 28rpx;
    color: #999999;
}

.info-value {
    font-size: 28rpx;
    color: #1A1A1A;
    font-weight: 600;
}

.back-btn {
    width: 100%;
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    color: #FFFFFF;
    font-size: 32rpx;
    font-weight: 600;
    padding: 32rpx;
    border-radius: 56rpx;
    border: none;
    box-shadow: 0 12rpx 40rpx rgba(255, 107, 157, 0.24), 0 4rpx 16rpx rgba(255, 107, 157, 0.12);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.back-btn:active {
    transform: scale(0.97);
    opacity: 0.92;
    box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.2);
}
</style>