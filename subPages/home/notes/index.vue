<template>
    <view class="notes-page">
        <nav-back />

        <view class="header">
            <text class="title">便利贴</text>
            <text v-if="noteList.length > 0" class="note-count">{{ noteList.length }}条</text>
        </view>

        <view class="notes-tabs">
            <view :class="['tab', activeTab === 0 ? 'active' : '']" @click="switchTab(0)">
                <text class="tab-text">未完成</text>
            </view>
            <view :class="['tab', activeTab === 1 ? 'active' : '']" @click="switchTab(1)">
                <text class="tab-text">已完成</text>
            </view>
        </view>

        <view v-if="displayList.length === 0" class="empty-tip">
            <image class="empty-icon" src="/static/icons/icon-edit.png" mode="aspectFit" />
            <text class="empty-text">{{ activeTab === 0 ? '还没有便利贴' : '还没有已完成的便利贴' }}</text>
            <text class="empty-sub" v-if="activeTab === 0">点击右下角 + 开始记录吧</text>
        </view>

        <view v-else class="notes-list-wrap">
            <view v-for="(group, monthKey) in groupedNotes" :key="monthKey" class="note-group">
                <!-- 分组标题栏 -->
                <view class="group-header" @click="toggleGroup(monthKey)" hover-class="group-header-hover" :hover-start-time="0">
                    <view class="group-bar"></view>
                    <text class="group-name">{{ monthKey }}</text>
                    <text class="group-count">{{ group.length }}条</text>
                    <view class="group-arrow-wrap" :class="{ 'collapsed': collapsedGroups[monthKey] }">
                        <text class="group-arrow">▼</text>
                    </view>
                </view>

                <!-- 展开：便利贴网格 -->
                <view v-if="!collapsedGroups[monthKey]" class="group-body">
                    <view class="notes-list notes-list--grouped">
                        <view
                            :class="['note-item', item.isPinned ? 'pinned' : '']"
                            v-for="(item, index) in group"
                            :key="item._id || index"
                            :style="{ '--paper': item.paperColor || '#FFF9E6', 'animation-delay': (index * 0.04) + 's' }"
                            hover-class="note-item-hover"
                            :hover-start-time="0"
                        >
                            <view class="note-adhesive"></view>
                            <view
                                class="pin-area"
                                @tap="togglePin"
                                :data-nid="item._id || item.id"
                                hover-class="pin-area-hover"
                                hover-stop-propagation="true"
                                :hover-start-time="0"
                            >
                                <view class="note-pin" :class="{ 'pushed': item.isPinned }"></view>
                            </view>
                            <view class="note-curl"></view>
                            <view
                                class="note-body"
                                hover-class="note-body-hover"
                                :hover-stop-propagation="true"
                                :hover-start-time="0"
                                @tap="editNote"
                                :data-nid="item._id || item.id"
                            >
                                <text :class="['note-title', isItemDone(item) ? 'done' : '']">{{ item.title }}</text>
                                <text class="note-content" v-if="item.content">{{ item.content }}</text>
                            </view>
                            <view class="note-footer">
                                <view class="note-meta" v-if="item.remindTime">
                                    <image class="meta-icon" src="/static/icons/icon-calendar.png" mode="aspectFit" />
                                    <text v-if="item.repeatType === 'daily'" class="repeat-badge">每天 · {{ item.remindTime }}</text>
                                    <text v-else class="meta-text">{{ item.remindTime }}</text>
                                    <text v-if="item.isRemindEnabled" class="remind-on">铃</text>
                                </view>
                                <view class="note-actions">
                                    <view
                                        class="note-left"
                                        hover-class="note-left-hover"
                                        hover-stop-propagation="true"
                                        :hover-start-time="0"
                                        @tap="toggleComplete"
                                        :data-nid="item._id || item.id"
                                    >
                                        <view :class="['check-circle', isItemDone(item) ? 'checked' : '']">
                                            <text v-if="isItemDone(item)" class="check-mark">✓</text>
                                        </view>
                                    </view>
                                    <view
                                        class="note-right"
                                        hover-class="note-right-hover"
                                        hover-stop-propagation="true"
                                        :hover-start-time="0"
                                        @tap="deleteNote"
                                        :data-nid="item._id || item.id"
                                    >
                                        <text class="delete-icon">×</text>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>

                <!-- 收起：迷你纸堆 -->
                <view v-else class="group-stack" @click="toggleGroup(monthKey)" hover-class="group-stack-hover" :hover-start-time="0">
                    <view class="stack-card stack-card--back"></view>
                    <view class="stack-card stack-card--mid"></view>
                    <view class="stack-card stack-card--front">
                        <text class="stack-emoji">📋</text>
                        <text class="stack-count">{{ group.length }}条</text>
                    </view>
                </view>
            </view>
        </view>

        <view class="fab" v-if="!popupOpen" @click="openAdd">
            <text class="fab-text">+</text>
        </view>

        <!-- 新建/编辑弹窗 -->
        <uni-popup ref="editPopup" type="bottom" @change="onPopupChange">
            <view class="popup-card">
                <view class="popup-header">
                    <text class="popup-title">{{ editingId ? '编辑便利贴' : '新建便利贴' }}</text>
                    <text class="popup-close" @click="closeEdit">×</text>
                </view>
                <view class="popup-body">
                    <input class="form-input" v-model="form.title" placeholder="标题" placeholder-class="input-placeholder" />
                    <textarea class="form-textarea" v-model="form.content" placeholder="内容（选填）" placeholder-class="input-placeholder" />

                    <view class="form-row color-row">
                        <text class="form-label">颜色</text>
                        <view class="color-swatches">
                            <view
                                v-for="c in colorOptions"
                                :key="c"
                                :class="['color-swatch', form.paperColor === c ? 'active' : '']"
                                :style="{ background: c }"
                                @click="form.paperColor = c"
                            >
                                <text v-if="form.paperColor === c" class="color-check">✓</text>
                            </view>
                        </view>
                    </view>

                    <view class="form-row">
                        <text class="form-label">提醒时间</text>
                        <picker v-if="form.repeatType !== 'daily'" mode="date" :value="form.remindDate" @change="onDateChange">
                            <text class="picker-text">{{ form.remindDate || '选择日期' }}</text>
                        </picker>
                        <picker mode="time" :value="form.remindTime_only" @change="onTimeChange">
                            <text class="picker-text">{{ form.remindTime_only || '选择时间' }}</text>
                        </picker>
                    </view>

                    <view class="form-row repeat-row">
                        <text class="form-label">重复</text>
                        <view class="repeat-chips">
                            <view :class="['repeat-chip', form.repeatType === 'none' ? 'active' : '']" @click="form.repeatType = 'none'">
                                <text>不重复</text>
                            </view>
                            <view :class="['repeat-chip', form.repeatType === 'daily' ? 'active' : '']" @click="form.repeatType = 'daily'">
                                <text>每天</text>
                            </view>
                        </view>
                    </view>

                    <view class="form-row switch-row">
                        <text class="form-label">开启提醒</text>
                        <switch :checked="form.isRemindEnabled" @change="onRemindSwitch" color="#FF6B9D" />
                    </view>
                </view>
                <button class="save-btn" @click="saveNote">保存</button>
            </view>
        </uni-popup>
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import { requireLogin } from '@/utils/auth.js'
import CloudData from '@/utils/cloudData.js'
import NavBack from '@/components/NavBack.vue'

export default {
    components: { NavBack },
    data() {
        return {
            activeTab: 0,
            noteList: [],
            refreshing: false,
            editingId: '',
            popupOpen: false,
            collapsedGroups: {},
            colorOptions: ['#FFF9E6', '#FFF0F3', '#EEF4FF', '#EEF8F0', '#F5F0F8', '#FFFFFF'],
            form: {
                title: '',
                content: '',
                remindDate: '',
                remindTime_only: '',
                remindTime: '',
                isRemindEnabled: false,
                repeatType: 'none',
                paperColor: '#FFF9E6'
            }
        }
    },
    computed: {
        displayList() {
            const today = this.getTodayStr()
            const active = []
            const completed = []

            for (const n of this.noteList) {
                if (n.repeatType === 'daily') {
                    if (n.lastCompletedDate === today) {
                        completed.push(n)
                    } else {
                        active.push(n)
                    }
                } else {
                    if (n.isCompleted) {
                        completed.push(n)
                    } else {
                        active.push(n)
                    }
                }
            }

            const list = this.activeTab === 0 ? active : completed
            if (this.activeTab === 0) {
                list.sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1
                    if (!a.isPinned && b.isPinned) return 1
                    return b.createTime - a.createTime
                })
            } else {
                list.sort((a, b) => b.createTime - a.createTime)
            }
            return list
        },
        groupedNotes() {
            const groups = {}
            const order = []
            for (const note of this.displayList) {
                const key = this.getMonthKey(note.createTime)
                if (!groups[key]) {
                    groups[key] = []
                    order.push(key)
                }
                groups[key].push(note)
            }
            // 组间按月份倒序（最新月份在上）
            const sorted = {}
            const sortedKeys = Object.keys(groups).sort((a, b) => {
                // 解析 "2024年6月" → { year: 2024, month: 6 }
                const pa = this.parseMonthKey(a)
                const pb = this.parseMonthKey(b)
                if (pb.year !== pa.year) return pb.year - pa.year
                return pb.month - pa.month
            })
            for (const k of sortedKeys) {
                sorted[k] = groups[k]
            }
            return sorted
        }
    },
    onLoad() {
        this.loadNotes()
    },
    methods: {
        toggleGroup(key) {
            const next = { ...this.collapsedGroups }
            if (next[key]) {
                delete next[key]
            } else {
                next[key] = true
            }
            this.collapsedGroups = next
        },
        switchTab(tab) {
            this.activeTab = tab
            this.collapsedGroups = {}
        },
        getMonthKey(ts) {
            if (!ts) return '未知时间'
            const d = new Date(ts)
            return `${d.getFullYear()}年${d.getMonth() + 1}月`
        },
        parseMonthKey(key) {
            const m = key.match(/^(\d{4})年(\d{1,2})月$/)
            if (!m) return { year: 0, month: 0 }
            return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) }
        },
        async loadNotes() {
            try {
                const openids = UserManager.getCoupleOpenids()
                // 过滤掉空字符串 openid（未登录时 getOpenid 返回 ''），避免缓存键碰撞
                const validIds = openids.filter(Boolean)
                let list
                if (validIds.length > 0) {
                    list = await CloudData.getStickyNotes(validIds)
                } else {
                    list = await CloudData.getStickyNotes()
                }
                // 如果 openids 过滤无结果（mock 模式 openid 可能不匹配），回退到不加过滤
                if (!list || list.length === 0) {
                    list = await CloudData.getStickyNotes()
                }
                this.noteList = list.map(item => ({
                    ...item,
                    id: item._id || item.id
                }))
            } catch (e) {
                console.error('加载便利贴失败:', e)
                this.noteList = []
            }
        },
        async onRefresh() {
            this.refreshing = true
            await this.loadNotes()
            this.refreshing = false
            uni.showToast({ title: '刷新成功', icon: 'success' })
        },
        findNoteById(nid) {
            return this.noteList.find(n => (n._id || n.id) === nid)
        },
        async toggleComplete(e) {
            const nid = e.currentTarget.dataset.nid
            const item = this.findNoteById(nid)
            if (!item) return
            const id = item._id || item.id
            const isDone = this.isItemDone(item)
            if (item.repeatType === 'daily') {
                const today = this.getTodayStr()
                await CloudData.updateStickyNote(id, {
                    lastCompletedDate: isDone ? '' : today
                })
            } else {
                await CloudData.updateStickyNote(id, {
                    isCompleted: !item.isCompleted
                })
            }
            await this.loadNotes()
            if (!isDone) {
                uni.showToast({ title: '已完成', icon: 'success', duration: 1200 })
                this.activeTab = 1
            } else {
                uni.showToast({ title: '已恢复', icon: 'none', duration: 1000 })
            }
        },
        async togglePin(e) {
            const nid = e.currentTarget.dataset.nid
            const item = this.findNoteById(nid)
            if (!item) return
            const id = item._id || item.id
            const newPinned = !item.isPinned
            await CloudData.updateStickyNote(id, { isPinned: newPinned })
            item.isPinned = newPinned
            uni.showToast({ title: newPinned ? '已置顶' : '已取消置顶', icon: 'none', duration: 1000 })
        },
        openAdd() {
            if (!requireLogin()) return
            this.editingId = ''
            this.form = {
                title: '',
                content: '',
                remindDate: '',
                remindTime_only: '',
                remindTime: '',
                isRemindEnabled: false,
                repeatType: 'none',
                paperColor: '#FFF9E6'
            }
            this.$refs.editPopup.open()
        },
        editNote(e) {
            const nid = e.currentTarget.dataset.nid
            const item = this.findNoteById(nid)
            if (!item) return
            this.editingId = item._id || item.id
            const remindTime = item.remindTime || ''
            const repeatType = item.repeatType || 'none'
            // daily 模式 remindTime 只有时间，无日期部分
            const parts = remindTime.split(' ')
            // 取已有时间戳，防止编辑后因未重新计算而丢失
            const existingRemindTimestamp = item.remindTimestamp || null
            this.form = {
                title: item.title || '',
                content: item.content || '',
                remindDate: repeatType === 'daily' ? '' : (parts[0] || ''),
                remindTime_only: repeatType === 'daily' ? remindTime : (parts[1] || ''),
                remindTime: remindTime,
                remindTimestamp: existingRemindTimestamp,
                isRemindEnabled: !!item.isRemindEnabled,
                repeatType: repeatType,
                paperColor: item.paperColor || '#FFF9E6'
            }
            this.$refs.editPopup.open()
        },
        closeEdit() {
            this.$refs.editPopup.close()
        },
        onPopupChange(e) {
            this.popupOpen = e.show
        },
        onDateChange(e) {
            this.form.remindDate = e.detail.value
            this.form.remindTime = this.form.remindDate + (this.form.remindTime_only ? ' ' + this.form.remindTime_only : '')
        },
        onTimeChange(e) {
            this.form.remindTime_only = e.detail.value
            if (this.form.repeatType === 'daily') {
                this.form.remindTime = e.detail.value
            } else {
                this.form.remindTime = this.form.remindDate ? this.form.remindDate + ' ' + e.detail.value : e.detail.value
            }
        },
        onRemindSwitch(e) {
            this.form.isRemindEnabled = e.detail.value
        },
        async saveNote() {
            if (!requireLogin()) return
            if (!this.form.title.trim()) {
                uni.showToast({ title: '请输入标题', icon: 'none' })
                return
            }

            // 开启提醒时，请求微信订阅消息授权（必须由用户点击触发）
            if (this.form.isRemindEnabled) {
                await this.requestSubscribeMessage()
            }

            uni.showLoading({ title: '保存中...' })

            const userInfo = UserManager.getUserInfo()

            // 计算提醒时间戳（毫秒），方便定时触发器做数值比较
            let remindTimestamp = null
            if (this.form.isRemindEnabled && this.form.remindTime) {
                if (this.form.repeatType === 'daily') {
                    // 每天重复：用当天日期 + 选择的时间
                    const today = this.getTodayStr()
                    const dt = new Date(today + 'T' + this.form.remindTime)
                    remindTimestamp = dt.getTime()
                } else {
                    const dt = new Date(this.form.remindTime.replace(' ', 'T'))
                    remindTimestamp = dt.getTime()
                }
            }

            const data = {
                title: this.form.title.trim(),
                content: this.form.content.trim(),
                remindTime: this.form.remindTime,
                remindTimestamp: remindTimestamp,
                isRemindEnabled: this.form.isRemindEnabled,
                repeatType: this.form.repeatType,
                paperColor: this.form.paperColor,
                creatorOpenid: userInfo.openid || '',
                creatorName: userInfo.nickName || '我'
            }

            if (this.editingId) {
                // 仅当提醒设置变动时才重置发送标记
                const existingItem = this.findNoteById(this.editingId)
                const reminderChanged = existingItem && (
                    existingItem.remindTime !== data.remindTime ||
                    existingItem.isRemindEnabled !== data.isRemindEnabled ||
                    existingItem.repeatType !== data.repeatType
                )
                if (reminderChanged && data.isRemindEnabled) {
                    data.reminderSent = false
                }
                await CloudData.updateStickyNote(this.editingId, data)
            } else {
                data.isCompleted = false
                data.lastCompletedDate = ''
                data.isPinned = false
                data.reminderSent = false
                await CloudData.addStickyNote(data)
            }

            uni.hideLoading()
            uni.showToast({ title: '保存成功', icon: 'success' })
            this.closeEdit()
            await this.loadNotes()
        },

        async requestSubscribeMessage() {
            // 一次性提醒 + 每天重复提醒两个模板
            const TEMPLATE_NOTE_ONCE = 'yRQxcy32JTUx1RntbCt0zqX8zK9o3xQn6dB_4PHxdRo'
            const TEMPLATE_NOTE_DAILY = 'yRQxcy32JTUx1RntbCt0zn48yYVnjMMoM7M9z0q7CVU'
            try {
                const res = await uni.requestSubscribeMessage({
                    tmplIds: [TEMPLATE_NOTE_ONCE, TEMPLATE_NOTE_DAILY]
                })
                // 两个模板任一接受就算授权成功
                const anyAccepted = res[TEMPLATE_NOTE_ONCE] === 'accept' || res[TEMPLATE_NOTE_DAILY] === 'accept'
                if (!anyAccepted) {
                    uni.showToast({ title: '未授权提醒，仍会保存便签', icon: 'none', duration: 2000 })
                }
                return anyAccepted
            } catch (err) {
                console.error('订阅消息失败:', err)
                return false
            }
        },
        getTodayStr() {
            const d = new Date()
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        },
        isItemDone(item) {
            if (!item) return false
            if (item.repeatType === 'daily') {
                return item.lastCompletedDate === this.getTodayStr()
            }
            return item.isCompleted
        },
        async deleteNote(e) {
            const nid = e.currentTarget.dataset.nid
            const item = this.findNoteById(nid)
            if (!item) return
            uni.showModal({
                title: '提示',
                content: '确定删除这条便利贴吗？',
                success: async (res) => {
                    if (res.confirm) {
                        await CloudData.deleteStickyNote(item._id || item.id)
                        uni.showToast({ title: '已删除', icon: 'success' })
                        await this.loadNotes()
                    }
                }
            })
        }
    }
}
</script>

<style scoped>
.notes-page {
    background: linear-gradient(180deg, #F7F4EF 0%, #F0EDE8 100%);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
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
}

.note-count {
    display: block;
    font-size: 22rpx;
    color: #B0B0B0;
    margin-top: 6rpx;
}

/* ── Tabs — Floating Pill ──────────────────────── */
.notes-tabs {
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
}

.tab.active {
    background: #FF6B9D;
    box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.25);
}

.tab.active .tab-text {
    color: #FFFFFF;
    font-weight: 600;
}

/* ── Empty ─────────────────────────────────────── */
.empty-tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 120rpx 32rpx;
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


/* ── Notes Grid ────────────────────────────────── */
.notes-list-wrap {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 140rpx;
}

.notes-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    padding: 0 24rpx;
}

.notes-list--grouped {
    padding: 12rpx 24rpx 8rpx;
}

/* ── Note Group (Collapsible) ──────────────────── */
.note-group {
    margin: 0 0 4rpx;
}

.note-group:last-child {
    margin-bottom: 24rpx;
}

/* Group Header */
.group-header {
    display: flex;
    align-items: center;
    padding: 16rpx 32rpx;
    gap: 12rpx;
    transition: background 0.2s ease;
}

.group-header-hover {
    background: rgba(0, 0, 0, 0.02);
}

.group-bar {
    width: 6rpx;
    height: 28rpx;
    border-radius: 3rpx;
    flex-shrink: 0;
    background: linear-gradient(180deg, #FF6B9D, #FF8DB5);
}

.group-name {
    font-size: 24rpx;
    font-weight: 600;
    color: #444444;
    flex: 1;
}

.group-count {
    font-size: 20rpx;
    color: #B0B0B0;
}

.group-arrow-wrap {
    width: 36rpx;
    height: 36rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: transform 0.30s cubic-bezier(0.32, 0.72, 0, 1), background 0.15s ease;
}

.group-arrow-wrap.collapsed {
    transform: rotate(-90deg);
}

.group-arrow {
    font-size: 18rpx;
    color: #B0B0B0;
}

/* Group Body */
.group-body {
    overflow: hidden;
    animation: groupExpand 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes groupExpand {
    from {
        opacity: 0;
        max-height: 0;
    }
    to {
        opacity: 1;
        max-height: 2000rpx;
    }
}

/* ── Collapsed Stack (Mini Paper Pile) ─────────── */
.group-stack {
    position: relative;
    height: 100rpx;
    margin: 8rpx 48rpx 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.group-stack-hover {
    transform: scale(0.97);
}

.group-stack-hover .stack-card--back {
    transform: rotate(-4deg) translateY(1rpx);
}

.group-stack-hover .stack-card--mid {
    transform: rotate(2deg) translateY(2rpx);
}

.group-stack-hover .stack-card--front {
    transform: rotate(0deg) translateY(3rpx);
}

.stack-card {
    position: absolute;
    width: 200rpx;
    height: 72rpx;
    border-radius: 4rpx;
    background: #FFF9E6;
    box-shadow:
        0 1rpx 3rpx rgba(0,0,0,0.10),
        0 3rpx 10rpx rgba(0,0,0,0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6rpx;
    transition: transform 0.30s cubic-bezier(0.32, 0.72, 0, 1);
}

.stack-card--back {
    background: #F5EDD6;
    transform: rotate(-3deg);
    z-index: 1;
    opacity: 0.5;
}

.stack-card--mid {
    background: #FBF3E0;
    transform: rotate(1.5deg);
    z-index: 2;
    opacity: 0.7;
}

.stack-card--front {
    background: #FFF9E6;
    transform: rotate(0deg);
    z-index: 3;
    opacity: 0.9;
}

.stack-emoji {
    font-size: 22rpx;
}

.stack-count {
    font-size: 20rpx;
    color: #666666;
    font-weight: 500;
}

/* ── Card: Square Sticky Note ────────────────────── */

/* rotation + color palette via nth-child */
.note-item { --r: 0deg; --paper: #FFF9E6; --paper-dark: #F5EDD6; }
.note-item:nth-child(5n+1) { --r: -2.2deg; --paper: #FFF9E6; --paper-dark: #F5EDD6; }
.note-item:nth-child(5n+2) { --r: 1.8deg;  --paper: #FFF0F3; --paper-dark: #F0DBE0; }
.note-item:nth-child(5n+3) { --r: -1.0deg; --paper: #EEF4FF; --paper-dark: #DCE3F0; }
.note-item:nth-child(5n+4) { --r: 2.5deg;  --paper: #EEF8F0; --paper-dark: #D8E8DC; }
.note-item:nth-child(5n+5) { --r: -3.0deg; --paper: #F5F0F8; --paper-dark: #E5DCE8; }

.note-item {
    position: relative;
    width: calc(50% - 12rpx);
    display: flex;
    flex-direction: column;
    padding: 28rpx 20rpx 16rpx;
    margin-bottom: 24rpx;
    box-sizing: border-box;
    min-height: 240rpx;
    /* 方形圆角 — 真实便利贴仅有极微小圆角 */
    border-radius: 4rpx;
    /* 纸张纹理：两层 radial-gradient 叠加模拟纤维 + 色差 */
    background:
        radial-gradient(ellipse at 25% 30%, rgba(255,255,255,0.7) 0%, transparent 55%),
        radial-gradient(ellipse at 75% 70%, rgba(0,0,0,0.04) 0%, transparent 50%),
        var(--paper);
    /* 三层阴影：纸边 → 抬升 → 环境漫反射 */
    box-shadow:
        0 1rpx 3rpx rgba(0,0,0,0.12),
        0 6rpx 18rpx rgba(0,0,0,0.06),
        0 12rpx 44rpx rgba(0,0,0,0.03);
    transform: rotate(var(--r)) translateY(0);
    transition: transform 0.30s cubic-bezier(0.32, 0.72, 0, 1),
                box-shadow 0.30s cubic-bezier(0.32, 0.72, 0, 1);
    /* 入场动画 */
    animation: noteIn 0.45s cubic-bezier(0.32, 0.72, 0, 1) both;
    z-index: 1;
}

/* 置顶卡片 — 微妙的暖色内发光 */
.note-item.pinned::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    border-radius: 4rpx;
    box-shadow: inset 0 0 0 2rpx rgba(255, 107, 157, 0.12);
    pointer-events: none;
    z-index: 3;
}

/* 悬停/触摸：上浮 + 阴影加深 */
.note-item-hover {
    transform: rotate(var(--r)) translateY(-6rpx);
    box-shadow:
        0 2rpx 6rpx rgba(0,0,0,0.16),
        0 10rpx 28rpx rgba(0,0,0,0.08),
        0 20rpx 60rpx rgba(0,0,0,0.04);
    z-index: 10;
}

/* 按压：阴影收拢 */
.note-item:active {
    transform: rotate(var(--r)) translateY(-2rpx) scale(0.985);
    box-shadow:
        0 1rpx 2rpx rgba(0,0,0,0.12),
        0 2rpx 8rpx rgba(0,0,0,0.05);
    transition: transform 0.10s ease, box-shadow 0.10s ease;
}

/* ── Adhesive Strip (顶部胶条) ──────────────────── */
.note-adhesive {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 12rpx;
    background: linear-gradient(180deg,
        rgba(255,255,255,0.30) 0%,
        rgba(0,0,0,0.04) 45%,
        transparent 100%);
    border-radius: 4rpx 4rpx 0 0;
    z-index: 2;
    pointer-events: none;
}

/* ── Pin Area (置顶按钮触摸区) ──────────────────── */
.pin-area {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 4;
    border-radius: 50%;
    transition: background 0.15s ease;
}

.pin-area-hover {
    background: rgba(0, 0, 0, 0.06);
}

/* ── Metal Pushpin ──────────────────────────────── */
.note-pin {
    position: relative;
    width: 24rpx;
    height: 24rpx;
    border-radius: 50%;
    /* 金属径向渐变：高光 → 中间调 → 暗部 */
    background: radial-gradient(circle at 38% 32%,
        #FEFEFE 0%,
        #E8E8E8 15%,
        #C8C8C8 45%,
        #A0A0A0 75%,
        #888888 100%
    );
    box-shadow:
        0 1rpx 3rpx rgba(0,0,0,0.30),
        inset 0 1rpx 1rpx rgba(255,255,255,0.5);
    transition: transform 0.20s ease,
                box-shadow 0.20s ease,
                background 0.20s ease;
}
/* 镜面高光白点 */
.note-pin::after {
    content: '';
    position: absolute;
    top: 4rpx;
    left: 6rpx;
    width: 5rpx;
    height: 5rpx;
    background: rgba(255,255,255,0.85);
    border-radius: 50%;
    box-shadow: 0 0 2rpx rgba(255,255,255,0.6);
}

/* 置顶状态：按钉"按入"效果 */
.note-pin.pushed {
    background: radial-gradient(circle at 38% 32%,
        #D8D8D8 0%,
        #B8B8B8 15%,
        #989898 45%,
        #787878 75%,
        #686868 100%
    );
    box-shadow:
        0 0rpx 1rpx rgba(0,0,0,0.40),
        inset 0 1rpx 0 rgba(0,0,0,0.15);
    transform: translateY(2rpx);
}

/* ── Paper Curl (右下卷角) ──────────────────────── */
.note-curl {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 48rpx;
    height: 48rpx;
    overflow: hidden;
    border-radius: 0 0 4rpx 0;
    z-index: 5;
    pointer-events: none;
}
/* 卷曲阴影面 — 模拟纸角掀起后露出的暗面 */
.note-curl::before {
    content: '';
    position: absolute;
    bottom: -18rpx;
    right: -18rpx;
    width: 52rpx;
    height: 52rpx;
    border-radius: 18rpx;
    background: rgba(0,0,0,0.05);
    box-shadow:
        -2rpx -2rpx 6rpx rgba(0,0,0,0.06),
        inset 0 0 6rpx rgba(0,0,0,0.02);
    transform: rotate(-6deg);
}
/* 卷曲弧线 — 卷起边缘的高光线 */
.note-curl::after {
    content: '';
    position: absolute;
    bottom: 4rpx;
    right: 4rpx;
    width: 30rpx;
    height: 30rpx;
    border-radius: 50%;
    border-right: 1rpx solid rgba(0,0,0,0.08);
    border-bottom: 1rpx solid rgba(0,0,0,0.06);
    transform: rotate(2deg);
}

/* ── Note Body (标题+内容区) ───────────────────── */
.note-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 12rpx 4rpx 8rpx;
    border-radius: 8rpx;
    transition: background 0.15s ease;
    position: relative;
    z-index: 3;
    min-height: 100rpx;
}

.note-body-hover {
    background: rgba(0, 0, 0, 0.03);
}

.note-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #2A2A2A;
    display: block;
    margin-bottom: 8rpx;
    letter-spacing: 0.5rpx;
    line-height: 1.35;
    /* 最多两行 */
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.note-title.done {
    color: #B0B0B0;
    text-decoration: line-through;
}

.note-content {
    font-size: 24rpx;
    color: #8A8A8A;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    margin-bottom: 4rpx;
    line-height: 1.4;
}

/* ── Footer ─────────────────────────────────────── */
.note-footer {
    margin-top: auto;
    z-index: 3;
}

/* Meta: 虚线撕线分隔 */
.note-meta {
    display: flex;
    align-items: center;
    border-top: 1rpx dashed rgba(0,0,0,0.10);
    padding-top: 10rpx;
    margin-bottom: 6rpx;
}

.meta-icon {
    width: 22rpx;
    height: 22rpx;
    margin-right: 6rpx;
    opacity: 0.45;
}

.meta-text {
    font-size: 20rpx;
    color: #A0A0A0;
    font-style: italic;
    font-family: 'Georgia', 'Times New Roman', serif;
    flex: 1;
}

.remind-on {
    margin-left: 8rpx;
    font-size: 18rpx;
    color: #FF6B9D;
    font-weight: 600;
}

/* ── Actions Row (完成 + 删除) ──────────────────── */
.note-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* Check Circle */
.note-left {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 50%;
    transition: background 0.15s ease, transform 0.15s ease;
}

.note-left-hover {
    background: rgba(255, 107, 157, 0.08);
    transform: scale(0.9);
}

.check-circle {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    border: 2rpx solid #D0D0D0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
    background: rgba(255,255,255,0.6);
}

.check-circle.checked {
    background: #FF6B9D;
    border-color: #FF6B9D;
    box-shadow: 0 2rpx 10rpx rgba(255, 107, 157, 0.3);
}

.check-mark {
    color: #FFFFFF;
    font-size: 22rpx;
    font-weight: 700;
}

/* Delete Button */
.note-right {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 50%;
    transition: background 0.15s ease, transform 0.15s ease;
}

.note-right-hover {
    background: rgba(229, 57, 53, 0.08);
    transform: scale(0.9);
}

.delete-icon {
    font-size: 28rpx;
    color: #C0C0C0;
    width: 40rpx;
    height: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: color 0.15s ease, background 0.15s ease;
}

.note-right-hover .delete-icon {
    color: #E53935;
    background: rgba(229, 57, 53, 0.06);
}

/* ── Entry Animation ────────────────────────────── */
@keyframes noteIn {
    from {
        opacity: 0;
        transform: rotate(var(--r)) translateY(36rpx) scale(0.90);
    }
    to {
        opacity: 1;
        transform: rotate(var(--r)) translateY(0) scale(1);
    }
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

/* ── Popup ─────────────────────────────────────── */
.popup-card {
    background: #FFFFFF;
    border-radius: 36rpx 36rpx 0 0;
    padding-bottom: calc(48rpx + env(safe-area-inset-bottom, 0));
    box-shadow: 0 -12rpx 48rpx rgba(0, 0, 0, 0.06);
}

.popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 36rpx 36rpx 32rpx;
    border-bottom: 1rpx solid rgba(247, 248, 250, 0.8);
}

.popup-title {
    font-size: 34rpx;
    font-weight: 700;
    color: #1A1A1A;
}

.popup-close {
    font-size: 40rpx;
    color: #B0B0B0;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.25s ease;
}

.popup-body {
    padding: 36rpx;
}

.form-input {
    width: 100%;
    font-size: 32rpx;
    color: #1A1A1A;
    padding: 24rpx 0;
    border-bottom: 1rpx solid rgba(247, 248, 250, 0.8);
    margin-bottom: 16rpx;
}

.form-textarea {
    width: 100%;
    height: 140rpx;
    font-size: 28rpx;
    color: #1A1A1A;
    padding: 20rpx 0;
    border-bottom: 1rpx solid rgba(247, 248, 250, 0.8);
    margin-bottom: 24rpx;
}

.input-placeholder {
    color: #B0B0B0;
}

.form-row {
    display: flex;
    align-items: center;
    padding: 20rpx 0;
    border-bottom: 1rpx solid rgba(247, 248, 250, 0.8);
}

.form-label {
    font-size: 28rpx;
    color: #1A1A1A;
    font-weight: 500;
    margin-right: 24rpx;
    min-width: 120rpx;
}

.picker-text {
    font-size: 28rpx;
    color: #FF6B9D;
    margin-right: 20rpx;
}

.switch-row {
    border-bottom: none;
}

/* ── Color Swatches ───────────────────────────── */
.color-row {
    border-bottom: none;
}

.color-swatches {
    display: flex;
    gap: 16rpx;
    flex-wrap: wrap;
}

.color-swatch {
    width: 52rpx;
    height: 52rpx;
    border-radius: 50%;
    border: 4rpx solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
    transition: transform 0.2s ease, border-color 0.2s ease;
}

.color-swatch.active {
    border-color: #FF6B9D;
    transform: scale(1.12);
}

.color-swatch:active {
    transform: scale(0.92);
}

.color-check {
    font-size: 24rpx;
    color: #666;
    font-weight: 700;
}

/* ── Repeat Selector Chips ─────────────────────── */
.repeat-row {
    border-bottom: none;
}

.repeat-chips {
    display: flex;
    gap: 16rpx;
}

.repeat-chip {
    padding: 12rpx 28rpx;
    background: #F7F8FA;
    border-radius: 20rpx;
    border: 2rpx solid transparent;
    font-size: 26rpx;
    color: #999999;
    transition: all 0.25s ease;
}

.repeat-chip.active {
    border-color: #FF6B9D;
    background: #FFF5F8;
    color: #FF6B9D;
    font-weight: 500;
}

/* ── Daily Repeat Badge ────────────────────────── */
.repeat-badge {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    font-size: 20rpx;
    color: #FF6B9D;
    background: #FFF5F8;
    padding: 2rpx 10rpx;
    border-radius: 8rpx;
    font-weight: 500;
}

.save-btn {
    width: 360rpx;
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    color: #FFFFFF;
    font-size: 28rpx;
    font-weight: 600;
    padding: 20rpx 0;
    border-radius: 48rpx;
    border: none;
    margin: 48rpx auto 0;
    display: block;
    box-shadow: 0 8rpx 28rpx rgba(255, 107, 157, 0.16);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.save-btn:active {
    transform: scale(0.97);
    opacity: 0.92;
    box-shadow: 0 4rpx 14rpx rgba(255, 107, 157, 0.12);
}
</style>
