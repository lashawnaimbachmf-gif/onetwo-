<template>
    <view class="home-page">
        <view class="header">
            <image class="bear-img" src="/static/images/bear.png" mode="aspectFit" />
            <view class="header-bg">
                <view class="days-together">
                    <text class="days-label">在一起的第</text>
                    <text class="days-num">{{ togetherDays }}</text>
                    <text class="days-unit">天</text>
                </view>
            </view>
        </view>

        <view class="weather-card" @click="showWeatherDetail">
            <view class="weather-location">
                <image class="location-icon-img" src="/static/icons/icon-location.png" mode="aspectFit" />
                <text class="location-text">{{ weather.city || '定位中...' }}</text>
            </view>
            <view class="weather-main">
                <image class="weather-icon-img" :src="weatherIcon" mode="aspectFit" />
                <view class="weather-info">
                    <text class="temp">{{ weather.temp || '--' }}°</text>
                    <text class="weather-desc">{{ weather.text || '加载中...' }}</text>
                </view>
            </view>
            <view class="weather-tip">
                <image class="tip-icon-img" src="/static/icons/icon-tip.png" mode="aspectFit" />
                <text class="tip-text">{{ weatherTip }}</text>
            </view>
        </view>

        <view class="section-title">
            <image class="title-icon-img" src="/static/icons/icon-calendar.png" mode="aspectFit" />
            <text class="title-text">重要纪念日</text>
            <view class="settings-link" @click="goSettings">
                <text class="settings-text">设置</text>
                <image class="settings-icon-img" src="/static/icons/icon-settings.png" mode="aspectFit" />
            </view>
        </view>

        <scroll-view class="anniversary-list" scroll-x>
            <view class="anniversary-card" v-for="(item, index) in anniversaries" :key="item._id || item.id || index" :data-id="item.id" :data-index="index" @click="viewAnniversary">
                <image class="anniversary-icon-img" :src="getAnniversaryIcon(item.icon)" mode="aspectFit" />
                <view class="anniversary-content">
                    <text class="anniversary-name">{{ item.name }}</text>
                    <text class="anniversary-date">{{ item.date }}</text>
                </view>
                <view class="anniversary-countdown" v-if="item.countdown > 0">
                    <text class="countdown-num">{{ item.countdown }}</text>
                    <text class="countdown-text">天后</text>
                </view>
                <view class="anniversary-countdown today" v-else>
                    <text class="countdown-num">今天</text>
                    <image class="countdown-icon-img" src="/static/icons/icon-birthday.png" mode="aspectFit" />
                </view>
            </view>
        </scroll-view>

        <!-- 天气详情弹窗 -->
        <uni-popup ref="weatherPopup" type="center">
            <view class="weather-popup">
                <view class="popup-header">
                    <text class="popup-title">天气详情</text>
                    <text class="popup-close" @click="$refs.weatherPopup.close()">×</text>
                </view>
                <view class="popup-content">
                    <image class="popup-weather-icon" :src="weatherIcon" mode="aspectFit" />
                    <text class="popup-temp">{{ weather.temp || '--' }}°</text>
                    <text class="popup-desc">{{ weather.text || '未知' }}</text>
                    <view class="popup-divider"></view>
                    <view class="popup-tips">
                        <image class="popup-tip-icon" src="/static/icons/icon-tip.png" mode="aspectFit" />
                        <text class="popup-tip-text">{{ weatherTip }}</text>
                    </view>
                </view>
            </view>
        </uni-popup>

        <!-- 未登录提示 -->
        <view v-if="!isLogin" class="guest-login-tip">
            <text class="guest-tip-text">登录解锁完整功能</text>
            <button class="guest-login-btn" @click="goLogin">立即登录</button>
        </view>
    </view>
</template>

<script>
import { getWeather, getWeatherTips } from '@/api/weather.js'
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'

export default {
    data() {
        return {
            togetherDays: 365,
            anniversaries: [],
            weather: {},
            weatherTip: '加载中...',
            weatherIcon: '/static/icons/icon-weather-sun.png',
            userInfo: {},
            partnerInfo: null,
            isBind: false,
            isLogin: false
        }
    },
    async onLoad() {
        // 先检查配对状态
        await this.checkPairStatus()
        this.loadUserInfo()
        this.loadData()
        this.loadWeather()
    },
    onShow() {
        this.loadUserInfo()
        this.checkAndLoadData()
    },
    methods: {
        // 检查配对状态
        async checkPairStatus() {
            const openid = UserManager.getOpenid()
            if (!openid) {
                // 未登录时不跳转，允许游客浏览
                return
            }
            
            try {
                const res = await uniCloud.callFunction({
                    name: 'checkPairStatus',
                    data: { openid }
                })
                
                const result = res.result
                
                if (result.code === 0) {
                    if (result.status === 'creator' || result.status === 'needInvite') {
                        // 需要配对，跳转到邀请页面
                        uni.redirectTo({ url: '/pages/invite/index' })
                    } else if (result.status === 'full') {
                        // 名额已满
                        uni.showModal({
                            title: '提示',
                            content: '此小程序仅限特定用户使用',
                            showCancel: false,
                            success: () => {
                                uni.exitMiniProgram()
                            }
                        })
                    }
                    // status === 'allowed' 表示已通过，继续加载页面
                }
            } catch (err) {
                console.error('检查配对状态失败:', err)
            }
        },
        
        // 加载用户信息
        loadUserInfo() {
            this.userInfo = UserManager.getUserInfo()
            this.partnerInfo = UserManager.getPartnerInfo()
            this.isBind = UserManager.isBind()
            this.isLogin = !!UserManager.getOpenid()
        },
        
        // 检查反向绑定并加载数据
        async checkAndLoadData() {
            // 如果本地未绑定，检查云端是否有反向绑定记录
            if (!this.isBind && this.userInfo.openid) {
                await this.checkReverseBind()
            }
            this.loadData()
        },
        
        // 检查是否有反向绑定记录（别人绑定了自己）
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
                    // 有反向绑定记录，自动设置伴侣信息
                    UserManager.setPartnerInfo(res.result.data.partnerInfo)
                    this.partnerInfo = res.result.data.partnerInfo
                    this.isBind = true
                    // 重新获取coupleOpenids
                    console.log('首页自动绑定伴侣:', res.result.data.partnerInfo)
                }
            } catch (err) {
                console.error('首页检查反向绑定失败:', err)
            }
        },
        async loadWeather() {
            try {
                // 调用天气API（内部会处理开发者工具和真机环境）
                const weatherData = await getWeather()
                this.weather = weatherData
                this.weatherTip = getWeatherTips(parseInt(weatherData.temp), weatherData.text)
                this.weatherIcon = this.getWeatherIcon(weatherData.text)
            } catch (e) {
                console.error('天气加载失败', e)
                this.weather = { temp: '26', text: '晴转多云', city: '北京' }
                this.weatherTip = '今天温度适宜，适合约会哦～'
                this.weatherIcon = '/static/icons/icon-weather-sun.png'
            }
        },
        getWeatherIcon(text) {
            if (text.includes('雨')) return '/static/icons/icon-weather-rain.png'
            if (text.includes('雪')) return '/static/icons/icon-weather-snow.png'
            if (text.includes('阴')) return '/static/icons/icon-weather-cloud.png'
            if (text.includes('云')) return '/static/icons/icon-weather-cloud.png'
            if (text.includes('晴')) return '/static/icons/icon-weather-sun.png'
            return '/static/icons/icon-weather-cloud.png'
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
        },
        async loadData() {
            // 从云端加载在一起日期（同时检查自己和伴侣的记录）
            let togetherDate = '2023-03-22'
            const userInfo = UserManager.getUserInfo()
            const partnerInfo = UserManager.getPartnerInfo()
            const coupleOpenids = UserManager.getCoupleOpenids()
            
            // 查询双方的users记录
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
                if (userData.togetherDate) {
                    togetherDate = userData.togetherDate
                }
            }
            
            // 如果自己的记录没有，检查伴侣的记录
            if (togetherDate === '2023-03-22' && partnerInfo && partnerInfo.openid) {
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
                    if (partnerData.togetherDate) {
                        togetherDate = partnerData.togetherDate
                    }
                }
            }

            const start = new Date(togetherDate)
            const now = new Date()
            this.togetherDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))

            // 从云端加载纪念日数据
            const list = await CloudData.getAnniversaries(coupleOpenids)

            if (list && list.length > 0) {
                // 将 _id 映射为 id，并重新计算倒计时
                this.anniversaries = list.map(item => ({
                    ...item,
                    id: item._id || item.id,
                    countdown: this.getCountdown(item.date)
                }))
            } else {
                this.anniversaries = []
            }
        },
        getCountdown(dateStr) {
            const today = new Date()
            const target = new Date(dateStr)
            target.setFullYear(today.getFullYear())
            if (target < today) {
                target.setFullYear(today.getFullYear() + 1)
            }
            const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
            return diff
        },
        showWeatherDetail() {
            this.$refs.weatherPopup.open()
        },
        goSettings() {
            if (!this.isLogin) {
                this.goLogin()
                return
            }
            uni.navigateTo({ url: '/pages/home/settings' })
        },
        viewAnniversary(e) {
            if (!this.isLogin) {
                this.goLogin()
                return
            }
            const index = parseInt(e.currentTarget.dataset.index)
            const item = this.anniversaries[index]
            if (!item || !item.id) {
                console.log('未找到纪念日数据')
                return
            }
            uni.navigateTo({ url: '/pages/home/anniversary-detail?id=' + item.id })
        },
        goLogin() {
            uni.navigateTo({ url: '/pages/login' })
        }
    }
}
</script>

<style scoped>
.home-page {
    background: linear-gradient(180deg, #ffeef8 0%, #fff 100%);
    min-height: 100vh;
}

.header {
    padding: 0 32rpx 40rpx;
    position: relative;
    padding-top: 133rpx;
}

.bear-img {
    position: absolute;
    top: -50rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 300rpx;
    height: 250rpx;
    z-index: 10;
}

.header-bg {
    background: linear-gradient(135deg, #ff6b9d 0%, #ffa8c5 100%);
    border-radius: 40rpx;
    padding: 48rpx 32rpx;
    box-shadow: 0 8rpx 32rpx rgba(255, 107, 157, 0.2);
    position: relative;
}

.days-together {
    text-align: center;
    color: #fff;
}

.days-label {
    font-size: 28rpx;
    opacity: 0.9;
    display: block;
    margin-bottom: 16rpx;
}

.days-num {
    font-size: 96rpx;
    font-weight: bold;
    display: inline-block;
    line-height: 1;
}

.days-unit {
    font-size: 32rpx;
    margin-left: 8rpx;
}

.weather-card {
    background: linear-gradient(135deg, #ff6b9d 0%, #ffa8c5 100%);
    border-radius: 24rpx;
    padding: 32rpx;
    margin: 0 32rpx 32rpx;
    box-shadow: 0 8rpx 24rpx rgba(255, 107, 157, 0.2);
}

.weather-location {
    margin-bottom: 16rpx;
    display: flex;
    align-items: center;
}

.location-icon-img {
    width: 24rpx;
    height: 24rpx;
    margin-right: 8rpx;
}

.location-text {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.9);
}

.weather-main {
    display: flex;
    align-items: center;
    margin-bottom: 24rpx;
}

.weather-icon-img {
    width: 64rpx;
    height: 64rpx;
    margin-right: 24rpx;
}

.weather-info {
    display: flex;
    flex-direction: column;
}

.temp {
    font-size: 48rpx;
    font-weight: bold;
    color: #333;
}

.weather-desc {
    font-size: 28rpx;
    color: #666;
}

.weather-tip {
    display: flex;
    align-items: center;
    padding: 20rpx;
    background: #fff7f2;
    border-radius: 16rpx;
}

.tip-icon-img {
    width: 28rpx;
    height: 28rpx;
    margin-right: 12rpx;
}

.tip-text {
    font-size: 24rpx;
    color: #ff6b9d;
}

.section-title {
    display: flex;
    align-items: center;
    padding: 0 32rpx 24rpx 32rpx;
}

.title-icon-img {
    width: 36rpx;
    height: 36rpx;
    margin-right: 12rpx;
}

.title-text {
    flex: 1;
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
}

.settings-link {
    display: flex;
    align-items: center;
}

.settings-text {
    font-size: 26rpx;
    color: #ff6b9d;
    margin-right: 8rpx;
}

.settings-icon-img {
    width: 28rpx;
    height: 28rpx;
}

.anniversary-list {
    white-space: nowrap;
    padding: 0 32rpx;
    margin-bottom: 32rpx;
}

.anniversary-card {
    display: inline-block;
    width: 280rpx;
    background: #fff;
    border-radius: 24rpx;
    padding: 28rpx;
    margin-right: 24rpx;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
    vertical-align: top;
    position: relative;
}

.anniversary-icon-img {
    width: 48rpx;
    height: 48rpx;
    margin-bottom: 16rpx;
    display: block;
}

.anniversary-content {
    margin-bottom: 16rpx;
}

.anniversary-name {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    display: block;
    margin-bottom: 8rpx;
}

.anniversary-date {
    font-size: 22rpx;
    color: #999;
}

.anniversary-countdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 16rpx;
    border-top: 2rpx solid #f0f0f0;
}

.anniversary-countdown.today {
    background: linear-gradient(135deg, #ff6b9d 0%, #ffa8c5 100%);
    border-radius: 16rpx;
    margin-top: 16rpx;
    padding: 16rpx;
    border-top: none;
}

.countdown-num {
    font-size: 36rpx;
    font-weight: bold;
    color: #ff6b9d;
}

.anniversary-countdown.today .countdown-num {
    color: #fff;
}

.countdown-text {
    font-size: 22rpx;
    color: #999;
}

.anniversary-countdown.today .countdown-text {
    color: rgba(255, 255, 255, 0.9);
}

.countdown-icon-img {
    width: 32rpx;
    height: 32rpx;
    margin-top: 4rpx;
}

/* 天气详情弹窗 */
.weather-popup {
    width: 560rpx;
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
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48rpx 32rpx;
}

.popup-weather-icon {
    width: 120rpx;
    height: 120rpx;
    margin-bottom: 24rpx;
}

.popup-temp {
    font-size: 72rpx;
    font-weight: bold;
    color: #333;
    line-height: 1;
}

.popup-desc {
    font-size: 32rpx;
    color: #666;
    margin-top: 16rpx;
}

.popup-divider {
    width: 100%;
    height: 2rpx;
    background: #f0f0f0;
    margin: 32rpx 0;
}

.popup-tips {
    display: flex;
    align-items: center;
    background: #fff7f2;
    border-radius: 16rpx;
    padding: 24rpx;
    width: 100%;
}

.popup-tip-icon {
    width: 36rpx;
    height: 36rpx;
    margin-right: 16rpx;
    flex-shrink: 0;
}

.popup-tip-text {
    font-size: 28rpx;
    color: #ff6b9d;
    line-height: 1.5;
}
</style>