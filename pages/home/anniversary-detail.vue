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
    onShow() {
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        const id = currentPage.options.id
        if (id) {
            this.anniversaryId = id
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
    background: linear-gradient(180deg, #ffeef8 0%, #fff 100%);
    min-height: 100vh;
    padding: 32rpx;
}

.header-card {
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    border-radius: 40rpx;
    padding: 60rpx 40rpx;
    text-align: center;
    margin-bottom: 32rpx;
    box-shadow: 0 8rpx 32rpx rgba(255, 107, 157, 0.2);
}

.anniversary-icon-img {
    width: 100rpx;
    height: 100rpx;
    display: block;
    margin: 0 auto 24rpx;
}

.anniversary-name {
    font-size: 40rpx;
    font-weight: bold;
    color: #fff;
    display: block;
    margin-bottom: 16rpx;
}

.anniversary-date {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.9);
}

.countdown-card {
    background: #fff;
    border-radius: 32rpx;
    padding: 48rpx;
    text-align: center;
    margin-bottom: 32rpx;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.countdown-label {
    font-size: 28rpx;
    color: #666;
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
    font-weight: bold;
    color: #ff6b9d;
    line-height: 1;
}

.countdown-unit {
    font-size: 40rpx;
    color: #ff6b9d;
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
    color: #999;
}

.info-card {
    background: #fff;
    border-radius: 32rpx;
    padding: 32rpx;
    margin-bottom: 48rpx;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
}

.info-item:last-child {
    border-bottom: none;
}

.info-label {
    font-size: 28rpx;
    color: #666;
}

.info-value {
    font-size: 28rpx;
    color: #333;
    font-weight: bold;
}

.back-btn {
    width: 100%;
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    font-size: 32rpx;
    font-weight: bold;
    padding: 32rpx;
    border-radius: 48rpx;
    border: none;
}
</style>