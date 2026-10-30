<template>
    <view class="settings-page">
        <nav-back />

        <!-- Header -->
        <view class="header">
            <text class="title">纪念日</text>
            <text class="subtitle">记录属于我们的每一个重要日子</text>
        </view>

        <!-- Together Date Card -->
        <!-- 在一起的日子：绑定后才能设置 -->
        <view class="together-card">
            <view class="together-left">
                <text class="together-label">在一起的日子</text>
                <text class="together-days" v-if="isBind && togetherDays > 0">{{ togetherDays }} 天</text>
                <text class="together-days together-days--muted" v-else-if="isBind">待设置</text>
                <text class="together-days together-days--muted" v-else>--</text>
            </view>
            <template v-if="isBind">
                <picker mode="date" :value="togetherDate" @change="onTogetherDateChange">
                    <view class="together-right">
                        <text class="together-date">{{ togetherDate || '选择日期' }}</text>
                        <text class="together-arrow">›</text>
                    </view>
                </picker>
            </template>
            <view v-else class="together-right together-right--locked">
                <text class="together-date together-date--locked">绑定后设置</text>
            </view>
        </view>

        <!-- Anniversary List -->
        <view class="list-section">
            <view v-if="anniversaryList.length === 0" class="empty-state">
                <image class="empty-icon" src="/static/icons/icon-calendar.png" mode="aspectFit" />
                <text class="empty-text">还没有纪念日</text>
                <text class="empty-sub">点击右下角 + 添加第一个纪念日吧</text>
            </view>

            <view class="anniversary-list" v-else>
                <view
                    class="anniversary-item"
                    v-for="(item, index) in anniversaryList"
                    :key="item.id"
                    :data-id="item.id"
                    @click="editAnniversary"
                >
                    <view class="item-icon-wrap" :style="{ background: getIconBg(index) }">
                        <image class="item-icon-img" :src="getIcon(item.icon)" mode="aspectFit" />
                    </view>
                    <view class="item-info">
                        <text class="item-name">{{ item.name }}</text>
                        <text class="item-date">{{ item.date }}</text>
                    </view>
                    <view class="item-countdown" v-if="getCountdown(item.date)">
                        <text class="countdown-num">{{ getCountdown(item.date) }}</text>
                        <text class="countdown-unit">天</text>
                    </view>
                    <text class="item-arrow">›</text>
                </view>
            </view>
        </view>

        <!-- FAB -->
        <view class="fab" @click="showAddModal">
            <text class="fab-text">+</text>
        </view>

        <!-- Add/Edit Modal -->
        <view class="modal" v-if="showModal">
            <view class="modal-mask" @click="closeModal"></view>
            <view class="modal-content">
                <view class="modal-title">{{ isEditing ? '编辑纪念日' : '添加纪念日' }}</view>
                <view class="modal-form">
                    <view class="form-item">
                        <text class="form-label">名称</text>
                        <input class="form-input" v-model="formData.name" placeholder="例如：宝宝生日" />
                    </view>
                    <view class="form-item">
                        <text class="form-label">图标</text>
                        <view class="icon-selector">
                            <view :class="['icon-option', formData.icon === 'birthday' ? 'active' : '']" @click="formData.icon = 'birthday'">
                                <image class="selector-icon-img" src="/static/icons/icon-birthday.png" mode="aspectFit" />
                            </view>
                            <view :class="['icon-option', formData.icon === 'couple' ? 'active' : '']" @click="formData.icon = 'couple'">
                                <image class="selector-icon-img" src="/static/icons/icon-couple.png" mode="aspectFit" />
                            </view>
                            <view :class="['icon-option', formData.icon === 'love' ? 'active' : '']" @click="formData.icon = 'love'">
                                <image class="selector-icon-img" src="/static/icons/icon-love.png" mode="aspectFit" />
                            </view>
                            <view :class="['icon-option', formData.icon === 'gift' ? 'active' : '']" @click="formData.icon = 'gift'">
                                <image class="selector-icon-img" src="/static/icons/icon-gift.png" mode="aspectFit" />
                            </view>
                            <view :class="['icon-option', formData.icon === 'rose' ? 'active' : '']" @click="formData.icon = 'rose'">
                                <image class="selector-icon-img" src="/static/icons/icon-rose.png" mode="aspectFit" />
                            </view>
                            <view :class="['icon-option', formData.icon === 'celebrate' ? 'active' : '']" @click="formData.icon = 'celebrate'">
                                <image class="selector-icon-img" src="/static/icons/icon-celebrate.png" mode="aspectFit" />
                            </view>
                        </view>
                    </view>
                    <view class="form-item">
                        <text class="form-label">日期</text>
                        <picker mode="date" :value="formData.date" @change="onFormDateChange">
                            <view class="form-picker">{{ formData.date || '选择日期' }}</view>
                        </picker>
                    </view>
                </view>
                <view class="modal-btns">
                    <button class="modal-btn delete" v-if="isEditing" @click="deleteAnniversary">删除</button>
                    <button class="modal-btn cancel" @click="closeModal">取消</button>
                    <button class="modal-btn confirm" @click="confirmSave">确定</button>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import cloud from '@/utils/cloud.js'
import UserManager from '@/utils/user.js'
import { requireLogin } from '@/utils/auth.js'
import CloudData from '@/utils/cloudData.js'
import NavBack from '@/components/NavBack.vue'

export default {
    components: { NavBack },
    data() {
        return {
            togetherDate: '',
            togetherDays: 0,
            isBind: false,
            anniversaryList: [],
            showModal: false,
            isEditing: false,
            editingId: null,
            formData: {
                name: '',
                icon: 'birthday',
                date: ''
            },
            userInfo: {},
            iconBgColors: ['#FFF0F5', '#FFF9E6', '#F3E8FF', '#E8F4FD', '#E6F9F0', '#FFF5F0']
        }
    },
    onLoad() {
        this.loadUserInfo()
        this.loadData()
    },
    methods: {
        loadUserInfo() {
            this.userInfo = UserManager.getUserInfo()
        },
        getIconBg(index) {
            return this.iconBgColors[index % this.iconBgColors.length]
        },
        getCountdown(dateStr) {
            if (!dateStr) return ''
            const now = new Date()
            const target = new Date(dateStr)
            // Set target to current year
            target.setFullYear(now.getFullYear())
            // If already passed this year, use next year
            if (target < now) {
                target.setFullYear(now.getFullYear() + 1)
            }
            const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
            return diff >= 0 ? diff : ''
        },
        getIcon(iconName) {
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
            const userInfo = UserManager.getUserInfo()
            const partnerInfo = UserManager.getPartnerInfo()
            this.isBind = UserManager.isBind()

            // 绑定后才从云端加载在一起日期
            if (this.isBind) {
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
                    // 优先用自己的记录，其次是伴侣的（谁先设置以谁为准）
                    const userData = res.result.data.find(d => d.openid === userInfo.openid)
                    const partnerData = res.result.data.find(d => d.openid === (partnerInfo || {}).openid)
                    const best = userData || partnerData
                    if (best && best.togetherDate) {
                        this.togetherDate = best.togetherDate
                    }
                }

                // Calculate together days
                if (this.togetherDate) {
                    const start = new Date(this.togetherDate)
                    const now = new Date()
                    this.togetherDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
                }
            }

            // Load anniversaries
            const coupleOpenids = UserManager.getCoupleOpenids()
            const list = await CloudData.getAnniversaries(coupleOpenids)

            if (list && list.length > 0) {
                this.anniversaryList = list.map(item => ({
                    ...item,
                    id: item._id || item.id
                }))
            } else {
                this.anniversaryList = []
            }
        },
        onTogetherDateChange(e) {
            this.togetherDate = e.detail.value
            this.saveTogetherDate()
        },
        async saveTogetherDate() {
            if (!requireLogin()) return
            if (!this.isBind) {
                uni.showToast({ title: '请先绑定伴侣', icon: 'none' })
                return
            }
            const userInfo = UserManager.getUserInfo()
            if (!userInfo.openid) {
                uni.showToast({ title: '请先登录', icon: 'none' })
                return
            }
            uni.showLoading({ title: '保存中...' })

            // 构建需要更新的 openid 列表（自己 + 伴侣）
            const openids = [userInfo.openid]
            const partnerInfo = UserManager.getPartnerInfo()
            if (partnerInfo && partnerInfo.openid && partnerInfo.openid !== userInfo.openid) {
                openids.push(partnerInfo.openid)
            }

            // 并行更新双方记录
            const results = await Promise.all(
                openids.map(openid =>
                    cloud.callFunction({
                        name: 'dataService',
                        data: {
                            action: 'update',
                            collection: 'users',
                            openid: userInfo.openid,
                            where: { openid },
                            data: {
                                togetherDate: this.togetherDate,
                                updateTime: Date.now()
                            }
                        }
                    })
                )
            )

            uni.hideLoading()
            const allOk = results.every(r => r.result && r.result.code === 0)
            if (allOk) {
                const start = new Date(this.togetherDate)
                const now = new Date()
                this.togetherDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
                uni.showToast({ title: '日期已更新', icon: 'success' })
            } else {
                const failed = results.find(r => !r.result || r.result.code !== 0)
                const msg = (failed && failed.result) ? failed.result.message : '保存失败'
                uni.showToast({ title: msg, icon: 'none' })
            }
        },
        showAddModal() {
            if (!UserManager.getToken() || !UserManager.getOpenid()) {
                uni.showModal({
                    title: '提示',
                    content: '请先登录后再添加纪念日～',
                    confirmText: '去登录',
                    success: (res) => {
                        if (res.confirm) {
                            uni.navigateTo({ url: '/subPages/login/login' })
                        }
                    }
                })
                return
            }

            this.isEditing = false
            this.editingId = null
            this.formData = { name: '', icon: 'birthday', date: '' }
            this.showModal = true
        },
        editAnniversary(e) {
            if (!requireLogin()) return
            const id = e.currentTarget.dataset.id
            const item = this.anniversaryList.find(a => a.id == id)
            if (item) {
                this.isEditing = true
                this.editingId = item.id
                this.formData = { ...item }
                this.showModal = true
            }
        },
        closeModal() {
            this.showModal = false
        },
        onFormDateChange(e) {
            this.formData.date = e.detail.value
        },
        async confirmSave() {
            if (!this.formData.name) {
                uni.showToast({ title: '请输入纪念日名称', icon: 'none' })
                return
            }
            if (!this.formData.date) {
                uni.showToast({ title: '请选择日期', icon: 'none' })
                return
            }

            uni.showLoading({ title: '保存中...' })

            if (this.isEditing) {
                await CloudData.updateAnniversary(this.editingId, {
                    ...this.formData,
                    updateTime: Date.now()
                })
            } else {
                await CloudData.addAnniversary({
                    ...this.formData,
                    creatorOpenid: this.userInfo.openid || '',
                    creatorName: this.userInfo.nickName || '我'
                })
            }

            await this.loadData()
            uni.hideLoading()
            this.closeModal()
            uni.showToast({ title: this.isEditing ? '修改成功' : '添加成功', icon: 'success' })
        },
        async deleteAnniversary() {
            uni.showModal({
                title: '提示',
                content: '确定删除这个纪念日吗？',
                success: async (res) => {
                    if (res.confirm) {
                        uni.showLoading({ title: '删除中...' })
                        await CloudData.deleteAnniversary(this.editingId)
                        await this.loadData()
                        uni.hideLoading()
                        this.closeModal()
                        uni.showToast({ title: '已删除', icon: 'success' })
                    }
                }
            })
        }
    }
}
</script>

<style scoped>
.settings-page {
    background: linear-gradient(180deg, #FFF0F5 0%, #FFFFFF 100%);
    min-height: 100vh;
    padding-bottom: 120rpx;
}

/* ── Header ────────────────────────────────────── */
.header {
    padding: calc(var(--status-bar-height) + 28rpx) 32rpx 20rpx;
    text-align: center;
}

.title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1A1A1A;
    display: block;
}

.subtitle {
    font-size: 24rpx;
    color: #999999;
    margin-top: 6rpx;
    display: block;
}

/* ── Together Date Card ─────────────────────────── */
.together-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #FFFFFF;
    border-radius: 32rpx;
    padding: 28rpx 32rpx;
    margin: 20rpx 28rpx 24rpx;
    box-shadow: 0 10rpx 40rpx rgba(255, 107, 157, 0.06), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.together-left {
    display: flex;
    flex-direction: column;
}

.together-label {
    font-size: 24rpx;
    color: #999999;
    margin-bottom: 4rpx;
}

.together-days {
    font-size: 40rpx;
    font-weight: 800;
    color: #FF6B9D;
    line-height: 1;
}

.together-days--muted {
    color: #CCCCCC;
    font-weight: 500;
}

.together-right {
    display: flex;
    align-items: center;
    background: #FFF5F8;
    border-radius: 16rpx;
    padding: 16rpx 20rpx;
}

.together-date {
    font-size: 26rpx;
    color: #FF6B9D;
    font-weight: 500;
}

.together-arrow {
    font-size: 28rpx;
    color: #FF6B9D;
    margin-left: 8rpx;
}

.together-right--locked {
    background: #F7F8FA;
}

.together-date--locked {
    color: #BBBBBB;
    font-weight: 400;
}

/* ── Empty State ────────────────────────────────── */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 100rpx 32rpx;
}

.empty-icon {
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

/* ── Anniversary List ───────────────────────────── */
.anniversary-list {
    padding: 0 28rpx;
}

.anniversary-item {
    display: flex;
    align-items: center;
    background: #FFFFFF;
    border-radius: 28rpx;
    padding: 24rpx;
    margin-bottom: 12rpx;
    box-shadow: 0 8rpx 40rpx rgba(255, 107, 157, 0.05), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.anniversary-item:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 20rpx rgba(255, 107, 157, 0.04);
}

.item-icon-wrap {
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
    flex-shrink: 0;
}

.item-icon-img {
    width: 40rpx;
    height: 40rpx;
}

.item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.item-name {
    font-size: 28rpx;
    font-weight: 600;
    color: #1A1A1A;
    margin-bottom: 4rpx;
}

.item-date {
    font-size: 24rpx;
    color: #999999;
}

.item-countdown {
    display: flex;
    align-items: baseline;
    margin-right: 12rpx;
    flex-shrink: 0;
}

.countdown-num {
    font-size: 36rpx;
    font-weight: 700;
    color: #FF6B9D;
    line-height: 1;
}

.countdown-unit {
    font-size: 22rpx;
    color: #FF6B9D;
    margin-left: 2rpx;
}

.item-arrow {
    font-size: 32rpx;
    color: #D0D0D0;
}

/* ── FAB — Premium Soft Glow ──────────────────────── */
.fab {
    position: fixed;
    bottom: 56rpx;
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

/* ── Modal ──────────────────────────────────────── */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(26, 26, 26, 0.4);
    backdrop-filter: blur(8rpx);
    -webkit-backdrop-filter: blur(8rpx);
}

.modal-content {
    position: relative;
    background: #FFFFFF;
    border-radius: 36rpx;
    padding: 48rpx;
    width: 80%;
    max-width: 600rpx;
    box-shadow: 0 24rpx 80rpx rgba(0, 0, 0, 0.12), 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.modal-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #1A1A1A;
    text-align: center;
    margin-bottom: 32rpx;
}

.modal-form {
    margin-bottom: 32rpx;
}

.form-item {
    margin-bottom: 24rpx;
}

.form-label {
    display: block;
    font-size: 26rpx;
    color: #666666;
    margin-bottom: 12rpx;
}

.form-input {
    width: 100%;
    padding: 20rpx;
    background: #F7F8FA;
    border-radius: 16rpx;
    font-size: 28rpx;
}

.icon-selector {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16rpx;
}

.icon-option {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16rpx;
    background: #F7F8FA;
    border-radius: 12rpx;
    border: 3rpx solid transparent;
}

.icon-option.active {
    border-color: #FF6B9D;
    background: #FFF5F8;
}

.selector-icon-img {
    width: 40rpx;
    height: 40rpx;
}

.form-picker {
    padding: 20rpx;
    background: #F7F8FA;
    border-radius: 16rpx;
    font-size: 28rpx;
    color: #1A1A1A;
}

.modal-btns {
    display: flex;
    gap: 16rpx;
}

.modal-btn {
    flex: 1;
    padding: 24rpx;
    border-radius: 56rpx;
    font-size: 28rpx;
    border: none;
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.modal-btn:active {
    transform: scale(0.97);
    opacity: 0.85;
}

.modal-btn.delete {
    background: #FFF5F8;
    color: #E53935;
    box-shadow: 0 4rpx 16rpx rgba(229, 57, 53, 0.06);
}

.modal-btn.cancel {
    background: #F7F8FA;
    color: #666666;
}

.modal-btn.confirm {
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    color: #FFFFFF;
    box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.22);
}
</style>
