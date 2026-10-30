<template>
    <view class="us-page">
        <view class="couple-card">
            <view class="avatars">
                <image class="avatar" :src="userInfo.avatarUrl || '/static/tabbar/user.png'" mode="aspectFill" />
                <image class="heart-img" src="/static/icons/icon-heart.png" mode="aspectFit" />
                <image v-if="isBind && partnerInfo" class="avatar" :src="partnerInfo.avatarUrl" mode="aspectFill" />
                <view v-else class="avatar avatar-add" @click="invitePartner">
                    <text class="add-icon">+</text>
                </view>
            </view>
            <text class="couple-name">{{ userInfo.nickName || '我' }} {{ isBind ? '&' : '' }} {{ partnerInfo ? partnerInfo.nickName : (isBind ? 'TA' : '未绑定') }}</text>
        </view>

        <view class="stats-section">
            <view class="stat-item">
                <text class="stat-num" v-if="isBind && togetherDays >= 0">{{ togetherDays }}</text>
                <text class="stat-num stat-num--muted" v-else>--</text>
                <text class="stat-label">天</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-item">
                <text class="stat-num">{{ capsuleCount }}</text>
                <text class="stat-label">封情书</text>
            </view>
        </view>

        <view class="menu-section">
            <view class="menu-item" @click="editInfo">
                <image class="menu-icon-img" src="/static/icons/icon-edit.png" mode="aspectFit" />
                <text class="menu-text">编辑信息</text>
                <text class="menu-arrow">›</text>
            </view>
            <view class="menu-item" @click="setAnniversary">
                <image class="menu-icon-img" src="/static/icons/icon-settings.png" mode="aspectFit" />
                <text class="menu-text">纪念日设置</text>
                <text class="menu-arrow">›</text>
            </view>
            <view class="menu-item" @click="invitePartner">
                <image class="menu-icon-img" src="/static/icons/icon-link.png" mode="aspectFit" />
                <text class="menu-text">邀请另一半</text>
                <text class="menu-arrow">›</text>
            </view>
        </view>

        <!-- 敲木鱼卡片 -->
        <view class="muyu-card">
            <view class="muyu-header">
                <image class="muyu-header-icon" src="/static/muyu.png" mode="aspectFit" />
                <text class="muyu-header-title">敲木鱼 | 静心解压</text>
            </view>

            <view class="muyu-body-wrap">
                <view class="muyu-float-area">
                    <text v-if="muyuShowFloat" :key="muyuFloatKey" class="muyu-float-text">功德 +1</text>
                </view>
                <view
                    :class="['muyu-fish-btn', { 'muyu-fish-tap': muyuTapping, 'muyu-fish-cooldown': muyuCooldown }]"
                    @click="tapMuyu"
                >
                    <image class="muyu-fish-img" src="/static/muyu.png" mode="aspectFit" />
                </view>
            </view>

            <view class="muyu-hint">
                <text>轻敲木鱼・岁岁平安</text>
            </view>

            <view class="muyu-stats">
                <text class="muyu-stats-text">今日敲击：{{ muyuTodayTaps }} 次</text>
            </view>
        </view>

        <!-- 邀请另一半弹窗 -->
        <uni-popup ref="invitePopup" type="center">
            <view class="invite-popup">
                <view class="popup-header">
                    <text class="popup-title">{{ isBind ? '已绑定' : '邀请另一半' }}</text>
                    <text class="popup-close" @click="closeInvitePopup">×</text>
                </view>
                <view class="popup-content">
                    <view v-if="isBind" class="bind-success">
                        <image class="success-icon" src="/static/icons/icon-love.png" mode="aspectFit" />
                        <text class="success-text">已成功绑定</text>
                        <text class="partner-name">{{ partnerName }}</text>
                    </view>
                    <view v-else class="invite-box">
                        <view v-if="inviteCode" class="code-section">
                            <text class="code-label">你的邀请码</text>
                            <view class="code-display">
                                <text class="code-text">{{ inviteCode }}</text>
                                <button class="copy-btn" @click="copyInviteCode">复制</button>
                            </view>
                            <text class="code-tip">让另一半输入此邀请码即可绑定</text>
                        </view>
                        <view v-else class="generate-section">
                            <image class="invite-icon" src="/static/icons/icon-link.png" mode="aspectFit" />
                            <text class="invite-text">生成专属邀请码</text>
                            <text class="invite-desc">绑定后可以一起记录美好时光</text>
                            <button class="generate-btn" @click="generateInviteCode">生成邀请码</button>
                        </view>
                        <view class="divider">
                            <view class="divider-line"></view>
                            <text class="divider-text">或</text>
                            <view class="divider-line"></view>
                        </view>
                        <view class="input-section">
                            <text class="input-label">输入对方的邀请码</text>
                            <view class="input-box">
                                <input class="partner-code-input" v-model="partnerCode" placeholder="请输入6位邀请码" maxlength="6" />
                                <button class="bind-btn" @click="bindPartner">绑定</button>
                            </view>
                        </view>
                    </view>
                </view>
            </view>
        </uni-popup>
        <CustomTabBar :activeIndex="3" />
    </view>
</template>

<script>
import cloud from '@/utils/cloud.js'
import UserManager from '@/utils/user.js'
import { requireLogin } from '@/utils/auth.js'
import CloudData from '@/utils/cloudData.js'
import CustomTabBar from '@/components/CustomTabBar.vue'

export default {
    components: { CustomTabBar },
    data() {
        return {
            togetherDays: -1,
            capsuleCount: 0,
            inviteCode: '',
            isBind: false,
            partnerName: '',
            partnerCode: '',
            userInfo: {},
            partnerInfo: null,
            _lastDataLoadTime: 0,
            // 木鱼
            muyuTodayTaps: 0,
            muyuTotalTaps: 0,
            muyuDate: '',
            muyuCooldown: false,
            muyuTapping: false,
            muyuShowFloat: false,
            muyuFloatKey: 0,
            muyuAudio: null
        }
    },
    onLoad() {
        this.loadData()
        this.initMuyu()
    },
    onShow() {
        this.loadUserInfo()
        // 60 秒冷却：避免快速切 tab 导致同一小时内重复调用云函数，节省 GBs
        if (Date.now() - this._lastDataLoadTime > 60000) {
            this.loadData()
        }
    },
    onUnload() {
        if (this.muyuAudio) {
            this.muyuAudio.destroy()
            this.muyuAudio = null
        }
    },
    methods: {
        loadUserInfo() {
            this.userInfo = UserManager.getUserInfo()
            this.partnerInfo = UserManager.getPartnerInfo()
            this.isBind = UserManager.isBind()
        },
        async loadData() {
            // 加载用户信息
            this.loadUserInfo()

            // 如果本地未绑定，检查云端是否有反向绑定记录（别人绑定了自己）
            if (!this.isBind && this.userInfo.openid) {
                await this.checkReverseBind()
            }

            // 修复已有绑定但 partnerInfo 缺少 openid 的情况（历史数据兼容）
            if (this.isBind && this.partnerInfo && !this.partnerInfo.openid && this.userInfo.openid) {
                await this.repairPartnerOpenid()
            }

            // 从云端加载在一起日期并计算天数（绑定后才有效，查双方记录以谁先设置以谁为准）
            if (this.isBind) {
                const queryOpenids = [this.userInfo.openid]
                if (this.partnerInfo && this.partnerInfo.openid && this.partnerInfo.openid !== this.userInfo.openid) {
                    queryOpenids.push(this.partnerInfo.openid)
                }

                const userRes = await cloud.callFunction({
                    name: 'dataService',
                    data: {
                        action: 'get',
                        collection: 'users',
                        openid: this.userInfo.openid,
                        where: { openid: queryOpenids }
                    }
                })

                if (userRes.result && userRes.result.code === 0 && userRes.result.data.length > 0) {
                    const userData = userRes.result.data.find(d => d.openid === this.userInfo.openid)
                    const partnerData = userRes.result.data.find(d => d.openid === (this.partnerInfo || {}).openid)
                    const best = userData || partnerData
                    if (best && best.togetherDate) {
                        const start = new Date(best.togetherDate)
                        const now = new Date()
                        this.togetherDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
                    }
                }
            }

            // 从云端统计当前用户和伴侣的数据
            const coupleOpenids = UserManager.getCoupleOpenids()

            const capsules = await CloudData.getCapsules(coupleOpenids)
            this.capsuleCount = capsules.length

            // 检查邀请状态
            this.inviteCode = uni.getStorageSync('my_invite_code') || ''
            this.partnerName = this.partnerInfo ? this.partnerInfo.nickName : ''
            this._lastDataLoadTime = Date.now()
        },
        
        // 修复旧绑定中 partnerInfo 缺少 openid 的问题
        async repairPartnerOpenid() {
            try {
                const res = await cloud.callFunction({
                    name: 'dataService',
                    data: {
                        action: 'get',
                        collection: 'users',
                        openid: this.userInfo.openid,
                        where: { openid: this.userInfo.openid }
                    }
                })
                if (res && res.result && res.result.code === 0 && res.result.data && res.result.data.length > 0) {
                    const user = res.result.data[0]
                    if (user.partnerOpenid) {
                        const repaired = {
                            nickName: (user.partnerInfo && user.partnerInfo.nickName) || (this.partnerInfo && this.partnerInfo.nickName) || '',
                            avatarUrl: (user.partnerInfo && user.partnerInfo.avatarUrl) || (this.partnerInfo && this.partnerInfo.avatarUrl) || '',
                            openid: user.partnerOpenid
                        }
                        UserManager.setPartnerInfo(repaired)
                        this.partnerInfo = repaired
                    }
                }
            } catch (err) {
                console.error('修复绑定信息失败:', err)
            }
        },
        // 检查是否有反向绑定记录（别人绑定了自己）
        async checkReverseBind() {
            try {
                if (!this.userInfo.openid) {
                    return
                }
                
                const res = await cloud.callFunction({
                    name: 'inviteCode',
                    data: {
                        action: 'checkReverse',
                        userInfo: this.userInfo
                    }
                })
                
                if (res.result && res.result.code === 0 && res.result.data.hasBind) {
                    // 有反向绑定记录，自动设置伴侣信息（含 openid）
                    const partnerInfo = {
                        ...(res.result.data.partnerInfo || {}),
                        openid: res.result.data.partnerOpenid
                    }
                    UserManager.setPartnerInfo(partnerInfo)
                    this.partnerInfo = partnerInfo
                    this.isBind = true
                    uni.showToast({ title: '已自动绑定伴侣', icon: 'success' })
                }
            } catch (err) {
                console.error('检查反向绑定失败:', err)
            }
        },
        editInfo() {
            uni.navigateTo({ url: '/subPages/us/edit-info/index' })
        },
        setAnniversary() {
            uni.navigateTo({ url: '/subPages/home/settings' })
        },
        invitePartner() {
            this.$refs.invitePopup.open()
        },
        async generateInviteCode() {
            if (!requireLogin()) return
            try {
                const code = await UserManager.generateInviteCode()
                this.inviteCode = code
                uni.showToast({ title: '邀请码已生成', icon: 'success' })
            } catch (err) {
                uni.showToast({ title: '生成失败，请重试', icon: 'none' })
            }
        },
        copyInviteCode() {
            uni.setClipboardData({
                data: this.inviteCode,
                success: () => {
                    uni.showToast({ title: '邀请码已复制', icon: 'success' })
                }
            })
        },
        closeInvitePopup() {
            this.$refs.invitePopup.close()
        },
        async bindPartner() {
            if (!requireLogin()) return
            if (!this.partnerCode || this.partnerCode.length !== 6) {
                uni.showToast({ title: '请输入6位邀请码', icon: 'none' })
                return
            }
            uni.showLoading({ title: '绑定中...' })
            // 使用 UserManager 绑定
            const result = await UserManager.bindByInviteCode(this.partnerCode.toUpperCase())
            uni.hideLoading()
            if (result.success) {
                this.isBind = true
                this.partnerInfo = UserManager.getPartnerInfo()
                this.partnerName = this.partnerInfo ? this.partnerInfo.nickName : ''
                uni.showToast({ title: '绑定成功！', icon: 'success' })
                this.closeInvitePopup()
                // 立即刷新数据，加载对方信息
                this.loadData()
            } else {
                uni.showToast({ title: result.message, icon: 'none' })
            }
        },
        // ── 敲木鱼 ────────────────────────────────
        initMuyu() {
            const today = this.getTodayStr()
            const stored = uni.getStorageSync('muyu_data')
            if (stored && stored.date === today) {
                this.muyuTodayTaps = stored.todayTaps || 0
                this.muyuTotalTaps = stored.totalTaps || 0
            } else {
                this.muyuTodayTaps = 0
                this.muyuTotalTaps = stored ? (stored.totalTaps || 0) : 0
            }
            this.muyuDate = today
        },
        getTodayStr() {
            const d = new Date()
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        },
        saveMuyuData() {
            uni.setStorageSync('muyu_data', {
                date: this.muyuDate,
                todayTaps: this.muyuTodayTaps,
                totalTaps: this.muyuTotalTaps
            })
        },
        tapMuyu() {
            if (this.muyuCooldown) return
            const today = this.getTodayStr()
            if (this.muyuDate !== today) {
                this.muyuTodayTaps = 0
                this.muyuDate = today
            }
            this.muyuCooldown = true
            this.muyuTapping = true
            this.muyuTodayTaps++
            this.muyuTotalTaps++
            this.saveMuyuData()
            this.muyuFloatKey++
            this.muyuShowFloat = true
            this.playMuyuSound()
            uni.vibrateShort({ type: 'light' })
            setTimeout(() => { this.muyuTapping = false }, 150)
            setTimeout(() => { this.muyuShowFloat = false }, 1000)
            setTimeout(() => { this.muyuCooldown = false }, 500)
        },
        playMuyuSound() {
            const soundEnabled = uni.getStorageSync('sound_enabled')
            if (soundEnabled === false) return
            try {
                if (!this.muyuAudio) {
                    this.muyuAudio = uni.createInnerAudioContext()
                    this.muyuAudio.src = '/static/sounds/muyu.wav'
                    this.muyuAudio.volume = 0.6
                }
                this.muyuAudio.stop()
                this.muyuAudio.play()
            } catch (e) {
                // 音效文件不存在时静默失败
            }
        }
    }
}
</script>

<style scoped>
.us-page {
    background: linear-gradient(180deg, #FFF0F5 0%, #FFFFFF 100%);
    min-height: 100vh;
    padding-bottom: calc(100rpx + env(safe-area-inset-bottom) + 20rpx);
}

/* ── Couple Header ──────────────────────────────── */
.couple-card {
    background: linear-gradient(160deg, #FF6B9D 0%, #FF8DB5 100%);
    padding: calc(var(--status-bar-height) + 48rpx) 32rpx 88rpx;
    text-align: center;
    position: relative;
}

/* soft fade into page background */
.couple-card::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 120rpx;
    background: linear-gradient(180deg, transparent 0%, rgba(255, 240, 245, 0.7) 50%, #FFF0F5 100%);
    pointer-events: none;
    z-index: 1;
}

.avatars {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 24rpx;
    position: relative;
    z-index: 2;
}

.avatar {
    width: 104rpx;
    height: 104rpx;
    border-radius: 50%;
    border: 3rpx solid rgba(255, 255, 255, 0.65);
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.avatar-add {
    background: rgba(255, 255, 255, 0.2);
    border: 3rpx dashed rgba(255, 255, 255, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: none;
}

.add-icon {
    font-size: 52rpx;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 300;
    line-height: 1;
}

.heart-img {
    width: 40rpx;
    height: 40rpx;
    margin: 0 18rpx;
    animation: beat 1.2s cubic-bezier(0.33, 1, 0.68, 1) infinite;
}

@keyframes beat {
    0%, 100% { transform: scale(1); }
    15% { transform: scale(1.18); }
    30% { transform: scale(1); }
    45% { transform: scale(1.18); }
    60% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
    .heart-img { animation: none; }
}

.couple-name {
    display: block;
    font-size: 26rpx;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.85);
    position: relative;
    z-index: 2;
}

/* ── Stats — Premium Elevated ────────────────────── */
.stats-section {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #FFFFFF;
    margin: -32rpx 28rpx 28rpx;
    border-radius: 32rpx;
    padding: 36rpx 32rpx;
    box-shadow: 0 12rpx 48rpx rgba(255, 107, 157, 0.07), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
    position: relative;
    z-index: 2;
}

.stat-item {
    flex: 1;
    text-align: center;
}

.stat-num {
    display: block;
    font-size: 48rpx;
    font-weight: 800;
    color: #FF6B9D;
    margin-bottom: 6rpx;
    line-height: 1;
    font-variant-numeric: tabular-nums;
}

.stat-num--muted {
    color: #CCCCCC;
    font-weight: 500;
}

.stat-label {
    font-size: 24rpx;
    color: #999999;
    font-weight: 500;
}

.stat-divider {
    width: 2rpx;
    height: 56rpx;
    background: linear-gradient(180deg, transparent, #F0F0F0, transparent);
}

/* ── Menu — Premium List ─────────────────────────── */
.menu-section {
    background: #FFFFFF;
    margin: 0 28rpx 32rpx;
    border-radius: 32rpx;
    box-shadow: 0 12rpx 48rpx rgba(255, 107, 157, 0.06), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
    overflow: hidden;
}

.menu-item {
    display: flex;
    align-items: center;
    padding: 36rpx 32rpx;
    border-bottom: 1rpx solid rgba(247, 248, 250, 0.8);
    transition: background 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.menu-item:active {
    background: #FFF5F8;
}

.menu-item:last-child {
    border-bottom: none;
}

.menu-icon-img {
    width: 40rpx;
    height: 40rpx;
    margin-right: 20rpx;
}

.menu-text {
    flex: 1;
    font-size: 30rpx;
    font-weight: 500;
    color: #1A1A1A;
}

.menu-arrow {
    font-size: 36rpx;
    color: #D0D0D0;
}

/* 邀请弹窗样式 */
.invite-popup {
    width: 600rpx;
    background: #FFFFFF;
    border-radius: 32rpx;
    overflow: hidden;
}

.popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx;
    background: #FF6B9D;
}

.popup-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #FFFFFF;
}

.popup-close {
    font-size: 40rpx;
    color: #FFFFFF;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.popup-content {
    padding: 48rpx 32rpx;
}

.bind-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32rpx 0;
}

.success-icon {
    width: 120rpx;
    height: 120rpx;
    margin-bottom: 24rpx;
}

.success-text {
    font-size: 32rpx;
    color: #FF6B9D;
    margin-bottom: 16rpx;
}

.partner-name {
    font-size: 28rpx;
    color: #666666;
}

.code-section {
    text-align: center;
    margin-bottom: 32rpx;
}

.code-label {
    font-size: 28rpx;
    color: #666666;
    display: block;
    margin-bottom: 16rpx;
}

.code-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16rpx;
    margin-bottom: 16rpx;
}

.code-text {
    font-size: 48rpx;
    font-weight: 700;
    color: #FF6B9D;
    letter-spacing: 8rpx;
    background: #FFF5F8;
    padding: 16rpx 32rpx;
    border-radius: 16rpx;
}

.copy-btn {
    background: #FF6B9D;
    color: #FFFFFF;
    font-size: 26rpx;
    padding: 16rpx 32rpx;
    border-radius: 32rpx;
    border: none;
}

.code-tip {
    font-size: 24rpx;
    color: #999999;
}

.generate-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32rpx 0;
}

.invite-icon {
    width: 100rpx;
    height: 100rpx;
    margin-bottom: 24rpx;
}

.invite-text {
    font-size: 32rpx;
    font-weight: 700;
    color: #1A1A1A;
    margin-bottom: 12rpx;
}

.invite-desc {
    font-size: 26rpx;
    color: #999999;
    margin-bottom: 32rpx;
}

.generate-btn {
    width: 80%;
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    color: #FFFFFF;
    font-size: 30rpx;
    padding: 28rpx;
    border-radius: 56rpx;
    border: none;
    box-shadow: 0 8rpx 28rpx rgba(255, 107, 157, 0.22);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.generate-btn:active {
    transform: scale(0.97);
    opacity: 0.9;
    box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.18);
}

.divider {
    display: flex;
    align-items: center;
    margin: 32rpx 0;
}

.divider-line {
    flex: 1;
    height: 2rpx;
    background: #F0F0F0;
}

.divider-text {
    font-size: 24rpx;
    color: #999999;
    padding: 0 24rpx;
}

.input-section {
    margin-top: 16rpx;
}

.input-label {
    font-size: 28rpx;
    color: #666666;
    display: block;
    margin-bottom: 16rpx;
    text-align: center;
}

.input-box {
    display: flex;
    gap: 16rpx;
}

.partner-code-input {
    flex: 1;
    padding: 24rpx;
    background: #F7F8FA;
    border-radius: 16rpx;
    font-size: 30rpx;
    text-align: center;
    letter-spacing: 8rpx;
}

.bind-btn {
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    color: #FFFFFF;
    font-size: 28rpx;
    padding: 24rpx 40rpx;
    border-radius: 56rpx;
    border: none;
    box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.2);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.bind-btn:active {
    transform: scale(0.96);
    opacity: 0.9;
    box-shadow: 0 3rpx 12rpx rgba(255, 107, 157, 0.16);
}

/* ── 敲木鱼卡片 ────────────────────────────────── */
.muyu-card {
    background: #FFFFFF;
    margin: 0 28rpx 32rpx;
    border-radius: 32rpx;
    padding: 36rpx 32rpx;
    box-shadow: 0 12rpx 48rpx rgba(255, 107, 157, 0.06), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
    text-align: center;
}

.muyu-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 28rpx;
}

.muyu-header-icon {
    width: 36rpx;
    height: 36rpx;
    margin-right: 10rpx;
}

.muyu-header-title {
    font-size: 28rpx;
    font-weight: 600;
    color: #B0A0A0;
}

/* 悬浮文字 */
.muyu-body-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.muyu-float-area {
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8rpx;
}

.muyu-float-text {
    font-size: 28rpx;
    font-weight: 700;
    color: #FF6B9D;
    animation: muyuFloatUp 1s ease-out forwards;
}

@keyframes muyuFloatUp {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-80rpx); }
}

/* 木鱼主体 */
.muyu-fish-btn {
    width: 280rpx;
    height: 280rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.12s cubic-bezier(0.32, 0.72, 0, 1);
}

.muyu-fish-btn:active {
    transform: scale(0.9);
}

.muyu-fish-tap {
    transform: scale(0.85) !important;
}

.muyu-fish-cooldown {
    filter: grayscale(30%);
    opacity: 0.7;
}

.muyu-fish-img {
    width: 280rpx;
    height: 280rpx;
}

/* 提示文字 */
.muyu-hint {
    margin-top: 24rpx;
    font-size: 26rpx;
    color: #C0C0C0;
}

/* 统计 */
.muyu-stats {
    margin-top: 28rpx;
    padding-top: 24rpx;
    border-top: 1rpx solid rgba(247, 248, 250, 0.8);
}

.muyu-stats-text {
    font-size: 24rpx;
    color: #B0B0B0;
}
</style>