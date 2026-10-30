<template>
    <view class="home-page">
        <view class="hero-area">
            <image class="hero-bg" :src="couplePhoto" mode="aspectFill" />
            <view class="hero-overlay"></view>
            <view class="hero-content">
                <text class="hero-eyebrow">我们在一起</text>
                <view class="hero-days-row">
                    <text class="hero-days-num">{{ togetherDays }}</text>
                    <text class="hero-days-unit">天</text>
                </view>
                <text class="hero-date">{{ togetherDateStr }}</text>
            </view>
            <view class="hero-upload-btn" @click="uploadPhoto">
                <image class="upload-icon" src="/static/icons/icon-camera.png" mode="aspectFit" />
            </view>
        </view>

        <view class="weather-card">
            <view class="weather-top">
                <text class="greeting">{{ greeting }}</text>
                <view class="location-row">
                    <image class="loc-icon" src="/static/icons/icon-location.png" mode="aspectFit" />
                    <text class="loc-text">{{ weather.city || '定位中...' }}</text>
                </view>
            </view>
            <view class="weather-main">
                <image class="weather-icon" :src="weatherIcon" mode="aspectFit" />
                <view class="weather-core">
                    <text class="temp">{{ weather.temp || '--' }}°</text>
                    <text class="weather-desc">{{ weather.text || '加载中...' }}</text>
                </view>
            </view>
            <view class="weather-meta">
                <view class="meta-item">
                    <text class="meta-label">湿度</text>
                    <text class="meta-value">{{ weather.humidity || '--' }}</text>
                </view>
                <view class="meta-divider"></view>
                <view class="meta-item">
                    <text class="meta-label">风向</text>
                    <text class="meta-value">{{ weather.wind || '--' }}</text>
                </view>
            </view>
            <view class="suggestion-bar">
                <text class="suggestion-text">{{ dateSuggestion }}</text>
            </view>
        </view>

        <!-- 情侣状态 & 心情墙 -->
        <view class="status-card" v-if="coupleStatus">
            <view class="status-header">
                <text class="status-header-title">我们的状态</text>
            </view>

            <!-- 左右两列：我 | 对方 -->
            <view class="status-columns">
                <!-- 左列：我 -->
                <view class="status-col">
                    <view class="status-person" @click="changeMyStatus">
                        <image class="status-avatar" :src="userInfo.avatarUrl || '/static/tabbar/user.png'" mode="aspectFill" />
                        <text class="status-name">我</text>
                        <view class="status-dot" :style="{ background: myDotColor }"></view>
                        <text class="status-text" :style="{ color: myDotColor }">{{ myStatusLabel }}</text>
                        <text class="status-switch-hint">▼</text>
                    </view>
                    <!-- 我的心情 -->
                    <view class="col-mood-section">
                        <view class="mood-grid">
                            <view
                                v-for="m in MOODS"
                                :key="m.key"
                                :class="['mood-item', myMood.type === m.key ? 'mood-active' : '']"
                                @click="selectMood(m.key)"
                            >
                                <text class="mood-emoji">{{ m.emoji }}</text>
                            </view>
                        </view>
                        <view class="mood-signature" @click="editSignature">
                            <text class="sig-text">{{ myMood.signature || '点击添加心情签名...' }}</text>
                            <text class="sig-edit">✎</text>
                        </view>
                    </view>
                </view>

                <!-- 中间分隔 -->
                <view class="col-divider"></view>

                <!-- 右列：对方 -->
                <view class="status-col">
                    <view v-if="isBind" class="status-person">
                        <image class="status-avatar" :src="partnerAvatar" mode="aspectFill" />
                        <text class="status-name">{{ partnerInfo.nickName || 'TA' }}</text>
                        <view class="status-dot" :style="{ background: partnerDotColor }"></view>
                        <text class="status-text" :style="{ color: partnerDotColor }">{{ partnerStatusLabel }}</text>
                    </view>
                    <view v-else class="status-person status-person--alone">
                        <text class="status-alone-tip">绑定另一半后查看TA的状态</text>
                    </view>
                    <!-- 对方心情 -->
                    <view v-if="isBind" class="col-mood-section col-mood-section--partner">
                        <view v-if="partnerMood.type" class="partner-mood-display">
                            <text class="partner-mood-emoji">{{ partnerMoodEmoji }}</text>
                            <text class="partner-mood-text">{{ partnerMood.signature || partnerMoodLabel }}</text>
                        </view>
                        <view v-else class="partner-mood-empty">
                            <text>TA今天还没设置心情</text>
                        </view>
                    </view>
                    <view v-else class="col-mood-section col-mood-section--partner">
                        <view class="partner-mood-empty">
                            <text>绑定后查看TA的心情</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>

        <view class="feature-row">
            <view class="feature-item" @click="goAnniversary">
                <image class="feature-icon" src="/static/icons/icon-calendar.png" mode="aspectFit" />
                <text class="feature-label">纪念日</text>
            </view>
            <view class="feature-item" @click="goNotes">
                <image class="feature-icon" src="/static/icons/icon-note.png" mode="aspectFit" />
                <text class="feature-label">便利贴</text>
            </view>
            <view class="feature-item" @click="goPeriod">
                <image class="feature-icon" src="/static/icons/icon-calendar-setting.png" mode="aspectFit" />
                <text class="feature-label">姨妈助手</text>
            </view>
            <view class="feature-item" @click="goAlbum">
                <image class="feature-icon" src="/static/icons/icon-image.png" mode="aspectFit" />
                <text class="feature-label">云相册</text>
            </view>
            <view class="feature-item" @click="goAddDish">
                <image class="feature-icon" src="/static/icons/icon-upload.png" mode="aspectFit" />
                <text class="feature-label">上传菜谱</text>
            </view>
        </view>


        <CustomTabBar :activeIndex="0" />
    </view>
</template>

<script>
import cloud from '@/utils/cloud.js'
import { getWeather } from '@/api/weather.js'
import UserManager from '@/utils/user.js'
import { requireLogin } from '@/utils/auth.js'
import CloudData from '@/utils/cloudData.js'
import UploadUtil from '@/utils/upload.js'
import CustomTabBar from '@/components/CustomTabBar.vue'

export default {
    components: { CustomTabBar },
    data() {
        return {
            togetherDays: 365,
            togetherDateStr: '2023.03.22',
            couplePhoto: '/static/couple-hero.png',
            weather: {},
            dateSuggestion: '',
            weatherIcon: '/static/icons/icon-weather-sun.png',
            userInfo: {},
            partnerInfo: null,
            isBind: false,

            // 情侣状态 & 心情墙
            coupleStatus: null,
            _isPartnerInDoc: false,
            _lastStatusLoadTime: 0,
            _lastDataLoadTime: 0,
            STATUS_MAP: { online: '在线', idle: '空闲', busy: '忙碌', offline: '离线' },
            STATUS_COLORS: { online: '#07C160', idle: '#4ECDC4', busy: '#FFA500', offline: '#CCCCCC' },
            MOODS: [
                { key: 'happy', emoji: '😊', label: '开心' },
                { key: 'sad', emoji: '😢', label: '难过' },
                { key: 'angry', emoji: '😡', label: '生气' },
                { key: 'tired', emoji: '😴', label: '疲惫' },
                { key: 'love', emoji: '🥰', label: '幸福' },
                { key: 'thinking', emoji: '🤔', label: '思考' }
            ],
        }
    },
    computed: {
        greeting() {
            const hour = new Date().getHours()
            if (hour >= 5 && hour < 12) return '早上好，亲爱的'
            if (hour >= 12 && hour < 18) return '下午好，亲爱的'
            return '晚上好，亲爱的'
        },
        // 状态 & 心情墙 computed
        myStatusLabel() {
            if (!this.coupleStatus) return '在线'
            return this.STATUS_MAP[this.coupleStatus.myStatus] || '在线'
        },
        myDotColor() {
            if (!this.coupleStatus) return '#07C160'
            return this.STATUS_COLORS[this.coupleStatus.myStatus] || '#07C160'
        },
        partnerStatusLabel() {
            if (!this.coupleStatus) return '离线'
            return this.STATUS_MAP[this.coupleStatus.partnerStatus] || '离线'
        },
        partnerDotColor() {
            if (!this.coupleStatus) return '#CCCCCC'
            return this.STATUS_COLORS[this.coupleStatus.partnerStatus] || '#CCCCCC'
        },
        partnerAvatar() {
            if (this.partnerInfo && this.partnerInfo.avatarUrl) return this.partnerInfo.avatarUrl
            return '/static/tabbar/user.png'
        },
        myMood() {
            if (!this.coupleStatus || !this.coupleStatus.myMood) return { type: '', signature: '', date: '' }
            const mood = this.coupleStatus.myMood
            const today = this.getTodayStr()
            if (mood.date !== today) return { type: '', signature: '', date: today }
            return mood
        },
        partnerMood() {
            if (!this.coupleStatus || !this.coupleStatus.partnerMood) return { type: '', signature: '', date: '' }
            const mood = this.coupleStatus.partnerMood
            const today = this.getTodayStr()
            if (mood.date !== today) return { type: '', signature: '', date: today }
            return mood
        },
        partnerMoodEmoji() {
            const m = this.MOODS.find(x => x.key === this.partnerMood.type)
            return m ? m.emoji : ''
        },
        partnerMoodLabel() {
            const m = this.MOODS.find(x => x.key === this.partnerMood.type)
            return m ? m.label : ''
        },
    },
    onLoad() {
        this.loadUserInfo()
        this.loadData()
        this.loadWeather()
        this.loadCoupleStatus()
    },
    onShow() {
        this.loadUserInfo()
        // 60 秒冷却：避免快速切 tab 导致同一小时内重复调用云函数，节省 GBs
        if (Date.now() - this._lastDataLoadTime > 60000) {
            this.loadData()
        }
        if (Date.now() - this._lastStatusLoadTime > 60000) {
            this.loadCoupleStatus()
        }
    },
    onHide() {
    },
    methods: {
        // 加载用户信息
        loadUserInfo() {
            this.userInfo = UserManager.getUserInfo()
            this.partnerInfo = UserManager.getPartnerInfo()
            this.isBind = UserManager.isBind()
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
                const res = await cloud.callFunction({
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
                this.dateSuggestion = this.getDateSuggestion(parseInt(weatherData.temp), weatherData.text)
                this.weatherIcon = this.getWeatherIcon(weatherData.text)
            } catch (e) {
                console.error('天气加载失败', e)
                this.weather = { temp: '26', text: '晴转多云', humidity: '45%', wind: '东南风 2级', city: '北京' }
                this.dateSuggestion = '无论什么天气，和你在一起就是好天气'
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
        getDateSuggestion(temp, text) {
            const t = parseInt(temp)
            if (text.includes('雨')) return '今天有雨，适合在家一起看电影'
            if (text.includes('雪')) return '下雪天，适合一起窝在家喝热巧克力'
            if (t >= 35) return '外面很热，适合一起去吃冰淇淋消暑'
            if (t < 10) return '天冷但心暖，适合一起窝在沙发里'
            if (t >= 20 && t <= 30 && (text.includes('晴') || text.includes('多云'))) return '天气不错，适合一起出门散步约会'
            if (text.includes('阴')) return '阴天也浪漫，适合一起去咖啡馆坐坐'
            return '无论什么天气，和你在一起就是好天气'
        },
        async loadData() {
            // 从云端加载在一起日期（同时检查自己和伴侣的记录）
            let togetherDate = '2023-03-22'
            const userInfo = UserManager.getUserInfo()
            const partnerInfo = UserManager.getPartnerInfo()

            // 批量查询双方记录，一次云函数调用替代两次串行查询
            // 云函数会自动将数组值转为 db.command.in()
            const queryOpenids = [userInfo.openid]
            if (partnerInfo && partnerInfo.openid && partnerInfo.openid !== userInfo.openid) {
                queryOpenids.push(partnerInfo.openid)
            }

            const res = await cloud.callFunction({
                name: 'dataService',
                data: {
                    action: 'get',
                    collection: 'users',
                    openid: userInfo.openid,
                    where: { openid: queryOpenids }
                }
            })

            if (res.result && res.result.code === 0 && res.result.data.length > 0) {
                // 优先使用自己的记录
                const userData = res.result.data.find(d => d.openid === userInfo.openid)
                const partnerData = res.result.data.find(d => d.openid === (partnerInfo || {}).openid)
                const best = userData || partnerData
                if (best && best.togetherDate) {
                    togetherDate = best.togetherDate
                }
                if (userData && userData.couplePhoto) {
                    this.couplePhoto = userData.couplePhoto
                } else if (partnerData && partnerData.couplePhoto) {
                    this.couplePhoto = partnerData.couplePhoto
                }
            }

            const start = new Date(togetherDate)
            const now = new Date()
            this.togetherDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
            this.togetherDateStr = `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, '0')}.${String(start.getDate()).padStart(2, '0')}`
            this._lastDataLoadTime = Date.now()
        },
        // ── 情侣状态 & 心情墙 ──────────────────────────
        getTodayStr() {
            const d = new Date()
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        },

        // 将云端文档标准化为「我=当前用户」视角
        _normalizeStatus(status) {
            const myOpenid = UserManager.getOpenid()
            if (!myOpenid || !status.partnerOpenid) {
                this._isPartnerInDoc = false
                return status
            }
            if (status.partnerOpenid === myOpenid) {
                this._isPartnerInDoc = true
                const today = this.getTodayStr()
                return {
                    ...status,
                    myOpenid: status.partnerOpenid,
                    partnerOpenid: status.myOpenid,
                    myStatus: status.partnerStatus || 'offline',
                    partnerStatus: status.myStatus || 'online',
                    myMood: (status.partnerMood && status.partnerMood.date === today) ? status.partnerMood : { type: '', signature: '', date: today },
                    partnerMood: (status.myMood && status.myMood.date === today) ? status.myMood : { type: '', signature: '', date: today }
                }
            }
            this._isPartnerInDoc = false
            return status
        },
        // 本地字段名 → 云端文档中实际字段名
        _myFieldInCloud(localField) {
            if (this._isPartnerInDoc) {
                const map = { myStatus: 'partnerStatus', myMood: 'partnerMood' }
                return map[localField] || localField
            }
            return localField
        },

        async loadCoupleStatus() {
            const openids = UserManager.getCoupleOpenids()
            const coupleId = openids.sort().join(',')
            let status = await CloudData.getCoupleStatus(coupleId)

            // 不存在则创建默认
            if (!status) {
                const defaultStatus = {
                    coupleId,
                    myOpenid: openids[0] || '',
                    partnerOpenid: openids[1] || '',
                    myStatus: 'online',
                    partnerStatus: 'offline',
                    myMood: { type: '', signature: '', date: this.getTodayStr() },
                    partnerMood: { type: '', signature: '', date: '' }
                }
                await CloudData.updateCoupleStatus(coupleId, defaultStatus)
                status = defaultStatus
            }

            // 每日重置：检查日期
            const today = this.getTodayStr()
            let needUpdate = false
            if (!status.myMood || status.myMood.date !== today) {
                status.myMood = { type: '', signature: '', date: today }
                needUpdate = true
            }
            if (!status.partnerMood || status.partnerMood.date !== today) {
                status.partnerMood = { type: '', signature: '', date: today }
                needUpdate = true
            }
            if (needUpdate) {
                await CloudData.updateCoupleStatus(coupleId, {
                    myMood: status.myMood,
                    partnerMood: status.partnerMood
                })
            }

            // 标准化为当前用户视角后再赋值
            this.coupleStatus = this._normalizeStatus(status)
            this._lastStatusLoadTime = Date.now()
        },

        async changeMyStatus() {
            if (!requireLogin()) return
            const keys = ['online', 'idle', 'busy', 'offline']
            const itemList = keys.map(k => this.STATUS_MAP[k])
            uni.showActionSheet({
                itemList,
                success: async (res) => {
                    const newStatus = keys[res.tapIndex]
                    this.coupleStatus.myStatus = newStatus
                    const openids = UserManager.getCoupleOpenids()
                    const coupleId = openids.sort().join(',')
                    const cloudField = this._myFieldInCloud('myStatus')
                    await CloudData.updateCoupleStatus(coupleId, { [cloudField]: newStatus })
                }
            })
        },

        async selectMood(key) {
            const openids = UserManager.getCoupleOpenids()
            const coupleId = openids.sort().join(',')
            const today = this.getTodayStr()
            const myMood = { type: key, signature: this.coupleStatus.myMood.signature || '', date: today }
            this.coupleStatus.myMood = myMood
            const cloudField = this._myFieldInCloud('myMood')
            await CloudData.updateCoupleStatus(coupleId, { [cloudField]: myMood })
        },

        editSignature() {
            const current = this.coupleStatus.myMood.signature || ''
            uni.showModal({
                title: '心情签名',
                editable: true,
                placeholderText: '输入心情签名（最多15字）',
                content: current,
                success: async (res) => {
                    if (res.confirm) {
                        const sig = (res.content || '').trim().substring(0, 15)
                        const openids = UserManager.getCoupleOpenids()
                        const coupleId = openids.sort().join(',')
                        const today = this.getTodayStr()
                        const myMood = {
                            type: this.coupleStatus.myMood.type,
                            signature: sig,
                            date: today
                        }
                        this.coupleStatus.myMood = myMood
                        const cloudField = this._myFieldInCloud('myMood')
                        await CloudData.updateCoupleStatus(coupleId, { [cloudField]: myMood })
                    }
                }
            })
        },



        goSettings() {
            uni.navigateTo({ url: '/subPages/home/settings' })
        },
        goAnniversary() {
            uni.navigateTo({ url: '/subPages/home/settings' })
        },
        goNotes() {
            uni.navigateTo({ url: '/subPages/home/notes/index' })
        },
        goPeriod() {
            uni.navigateTo({ url: '/subPages/home/period/index' })
        },
        goAlbum() {
            uni.navigateTo({ url: '/subPages/home/album/index' })
        },
        goAddDish() {
            uni.navigateTo({ url: '/subPages/dining/add-dish' })
        },
        uploadPhoto() {
            if (!requireLogin()) return
            uni.chooseImage({
                count: 1,
                sizeType: ['compressed'],
                sourceType: ['album', 'camera'],
                success: async (chooseRes) => {
                    const tempPath = chooseRes.tempFilePaths[0]
                    uni.showLoading({ title: '上传中...', mask: true })
                    try {
                        const url = await UploadUtil.uploadImage(tempPath, 'couple-photo')
                        if (!url) {
                            uni.hideLoading()
                            uni.showToast({ title: '照片上传失败，请重试', icon: 'none' })
                            return
                        }
                        this.couplePhoto = url
                        // 存到云端
                        await this.saveCouplePhoto(url)
                        uni.hideLoading()
                        uni.showToast({ title: '照片已更新', icon: 'success', duration: 1500 })
                    } catch (e) {
                        uni.hideLoading()
                        console.error('上传照片失败:', e)
                        uni.showToast({ title: '上传失败，请重试', icon: 'none' })
                    }
                }
            })
        },
        async saveCouplePhoto(url) {
            const userInfo = UserManager.getUserInfo()
            try {
                await cloud.callFunction({
                    name: 'dataService',
                    data: {
                        action: 'update',
                        collection: 'users',
                        openid: userInfo.openid,
                        where: { openid: userInfo.openid },
                        data: { couplePhoto: url }
                    }
                })
            } catch (e) {
                console.error('保存照片URL失败:', e)
            }
        }
    }
}
</script>

<style scoped>
.home-page {
    background: linear-gradient(180deg, #FFF0F5 0%, #FFFFFF 100%);
    min-height: 100vh;
    padding-bottom: calc(100rpx + env(safe-area-inset-bottom) + 20rpx);
}

/* ── Hero: Fullscreen Couple Illustration ────────── */
.hero-area {
    position: relative;
    width: 100%;
    height: 720rpx;
    overflow: hidden;
}

.hero-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
}

.hero-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.28) 0%,
        rgba(0, 0, 0, 0.05) 40%,
        rgba(0, 0, 0, 0.25) 100%
    );
    z-index: 1;
}

.hero-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
}

/* 底部渐变淡出 → 无缝衔接到下方卡片 */
.hero-area::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 120rpx;
    background: linear-gradient(180deg, transparent 0%, rgba(255, 240, 245, 0.6) 60%, #FFF0F5 100%);
    pointer-events: none;
    z-index: 3;
}

.hero-eyebrow {
    font-size: 24rpx;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.85);
    letter-spacing: 12rpx;
    margin-bottom: 12rpx;
}

.hero-days-row {
    display: flex;
    align-items: baseline;
    justify-content: center;
}

.hero-days-num {
    font-size: 96rpx;
    font-weight: 800;
    color: #FFFFFF;
    line-height: 1;
    letter-spacing: -2rpx;
    text-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.25);
}

.hero-days-unit {
    font-size: 36rpx;
    color: rgba(255, 255, 255, 0.9);
    margin-left: 8rpx;
    font-weight: 500;
    text-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.2);
}

.hero-date {
    margin-top: 20rpx;
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.75);
    letter-spacing: 4rpx;
}

/* 右下角更换照片按钮 */
.hero-upload-btn {
    position: absolute;
    bottom: 24rpx;
    right: 24rpx;
    z-index: 4;
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.22);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.18s ease, background 0.18s ease;
}

.hero-upload-btn:active {
    transform: scale(0.9);
    background: rgba(0, 0, 0, 0.38);
}

.upload-icon {
    width: 32rpx;
    height: 32rpx;
}

/* ── Weather Card ───────────────────────────────── */
.weather-card {
    position: relative;
    z-index: 5;
    background: #FFFFFF;
    border-radius: 32rpx;
    padding: 24rpx;
    margin: -28rpx 24rpx 14rpx;
    box-shadow: 0 12rpx 48rpx rgba(255, 107, 157, 0.07), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
    transition: box-shadow 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.weather-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14rpx;
}

.greeting {
    font-size: 26rpx;
    font-weight: 700;
    color: #1A1A1A;
}

.location-row {
    display: flex;
    align-items: center;
}

.loc-icon {
    width: 20rpx;
    height: 20rpx;
    margin-right: 4rpx;
    opacity: 0.5;
}

.loc-text {
    font-size: 22rpx;
    color: #999999;
}

.weather-main {
    display: flex;
    align-items: center;
    margin-bottom: 14rpx;
}

.weather-icon {
    width: 56rpx;
    height: 56rpx;
    margin-right: 12rpx;
}

.weather-core {
    display: flex;
    flex-direction: column;
}

.temp {
    font-size: 40rpx;
    font-weight: 700;
    color: #1A1A1A;
    line-height: 1;
}

.weather-desc {
    font-size: 24rpx;
    color: #666666;
    margin-top: 6rpx;
}

.weather-meta {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14rpx;
}

.meta-item {
    display: flex;
    align-items: center;
}

.meta-item .meta-label {
    margin-right: 6rpx;
}

.meta-label {
    font-size: 22rpx;
    color: #999999;
}

.meta-value {
    font-size: 22rpx;
    color: #666666;
}

.meta-divider {
    width: 2rpx;
    height: 16rpx;
    background: #F0F0F0;
    margin: 0 24rpx;
}

.suggestion-bar {
    background: #FFF5F8;
    border-radius: 14rpx;
    padding: 12rpx 20rpx;
}

.suggestion-text {
    font-size: 22rpx;
    color: #FF6B9D;
    line-height: 1.5;
}

/* ── Couple Status & Mood Wall Card ────────────── */
.status-card {
    background: #FFFFFF;
    border-radius: 32rpx;
    margin: 0 24rpx 14rpx;
    padding: 20rpx;
    box-shadow: 0 12rpx 48rpx rgba(255, 107, 157, 0.07), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

/* Header */
.status-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12rpx;
}

.status-header-title {
    font-size: 26rpx;
    font-weight: 700;
    color: #1A1A1A;
}

/* Two-column layout: Me | Partner */
.status-columns {
    display: flex;
    gap: 0;
    padding: 2rpx 0 6rpx;
}

.status-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10rpx;
}

.col-divider {
    width: 1rpx;
    background: #F0F0F0;
    flex-shrink: 0;
    margin: 0 12rpx;
}

/* Status Person Row */
.status-person {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 6rpx 12rpx;
    border-radius: 14rpx;
    background: #F7F8FA;
    transition: opacity 0.25s ease;
}

.status-person:active {
    opacity: 0.7;
}

.status-person--alone {
    background: transparent;
    padding: 8rpx 0;
}

.status-avatar {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    border: 2rpx solid rgba(255, 107, 157, 0.15);
}

.status-name {
    font-size: 24rpx;
    font-weight: 600;
    color: #1A1A1A;
}

.status-dot {
    width: 14rpx;
    height: 14rpx;
    border-radius: 50%;
    flex-shrink: 0;
}

.status-text {
    font-size: 24rpx;
    font-weight: 500;
}

.status-switch-hint {
    font-size: 18rpx;
    color: #CCCCCC;
    margin-left: 2rpx;
}

.status-alone-tip {
    font-size: 22rpx;
    color: #999999;
    text-align: center;
}

/* Mood inside each column */
.col-mood-section {
    width: 100%;
}

.col-mood-section--partner {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60rpx;
}

.partner-mood-display {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 6rpx 10rpx;
    background: #FFF5F8;
    border-radius: 10rpx;
}

.partner-mood-emoji {
    font-size: 26rpx;
}

.partner-mood-text {
    font-size: 20rpx;
    color: #FF6B9D;
    font-weight: 500;
}

.partner-mood-empty {
    padding: 8rpx 0;
}

.partner-mood-empty text {
    font-size: 20rpx;
    color: #CCCCCC;
}

.mood-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8rpx;
    margin-bottom: 10rpx;
}

.mood-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6rpx 0;
    border-radius: 12rpx;
    background: #F7F8FA;
    border: 2rpx solid transparent;
    transition: all 0.25s ease;
}

.mood-item:active {
    transform: scale(0.95);
}

.mood-active {
    background: #FFF5F8;
    border-color: #FF6B9D;
    box-shadow: 0 2rpx 12rpx rgba(255, 107, 157, 0.12);
}

.mood-emoji {
    font-size: 30rpx;
    line-height: 1;
}

/* Signature */
.mood-signature {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 8rpx 12rpx;
    background: #F7F8FA;
    border-radius: 12rpx;
    margin-bottom: 8rpx;
}

.mood-signature:active {
    background: #F0F0F0;
}

.sig-text {
    flex: 1;
    font-size: 20rpx;
    color: #666666;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sig-edit {
    font-size: 20rpx;
    color: #FF6B9D;
    flex-shrink: 0;
}

/* ── 功能入口 ─────────────────────────────────── */
.feature-row {
    display: flex;
    justify-content: space-between;
    margin: 20rpx 24rpx 0;
}

.feature-item {
    width: 126rpx;
    background: #FFFFFF;
    border-radius: 24rpx;
    padding: 20rpx 8rpx 16rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow:
        0 2rpx 8rpx rgba(255, 182, 193, 0.12),
        0 6rpx 20rpx rgba(255, 182, 193, 0.08),
        inset 0 1rpx 0 rgba(255, 255, 255, 0.9),
        inset 0 -1rpx 0 rgba(255, 200, 210, 0.1);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.feature-item:active {
    transform: scale(0.94);
    box-shadow:
        0 1rpx 4rpx rgba(255, 182, 193, 0.08),
        0 2rpx 8rpx rgba(255, 182, 193, 0.05),
        inset 0 1rpx 0 rgba(255, 255, 255, 0.9),
        inset 0 -1rpx 0 rgba(255, 200, 210, 0.08);
}

.feature-icon {
    width: 112rpx;
    height: 112rpx;
    margin-bottom: 4rpx;
}

.feature-label {
    font-size: 24rpx;
    font-weight: 400;
    color: #999999;
    text-align: center;
    letter-spacing: 0;
}
</style>