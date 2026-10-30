<template>
    <view class="period-page">
        <view class="header">
            <text class="title">姨妈助手</text>
        </view>

        <!-- 月历 -->
        <view class="calendar-card">
            <view class="cal-header">
                <view class="cal-nav" @click="prevMonth"><text class="nav-arrow">‹</text></view>
                <text class="cal-month">{{ calYear }}年 {{ calMonth }}月</text>
                <view class="cal-nav" @click="nextMonth"><text class="nav-arrow">›</text></view>
            </view>
            <view class="cal-weekdays">
                <text v-for="d in weekDays" :key="d" class="weekday">{{ d }}</text>
            </view>
            <view class="cal-grid">
                <view
                    v-for="(day, idx) in calDays"
                    :key="idx"
                    :class="['cal-day', day ? getDayClass(day) : '', day && isToday(day) ? 'today' : '']"
                >
                    <text v-if="day" class="day-num">{{ day }}</text>
                </view>
            </view>
            <view class="cal-legend">
                <view class="legend-item"><view class="dot period-dot"></view><text>经期</text></view>
                <view class="legend-item"><view class="dot predict-dot"></view><text>预测经期</text></view>
                <view class="legend-item"><view class="dot ovu-dot"></view><text>排卵期</text></view>
                <view class="legend-item"><view class="dot safe-dot"></view><text>安全期</text></view>
            </view>
        </view>

        <!-- 快捷操作 -->
        <view class="quick-actions">
            <view class="quick-btn start-btn" @click="periodStartToday">
                <view class="quick-dot start-dot"></view>
                <text class="quick-text">经期开始</text>
            </view>
            <view class="quick-btn end-btn" @click="periodEndToday">
                <view class="quick-dot end-dot"></view>
                <text class="quick-text">经期结束</text>
            </view>
        </view>

        <!-- 预测卡片 -->
        <view class="predict-card" v-if="prediction.avgCycle">
            <view class="predict-row">
                <view class="predict-item">
                    <text class="predict-num">{{ prediction.avgCycle }}</text>
                    <text class="predict-label">平均周期(天)</text>
                </view>
                <view class="predict-divider"></view>
                <view class="predict-item">
                    <text class="predict-num">{{ prediction.avgPeriod }}</text>
                    <text class="predict-label">平均经期(天)</text>
                </view>
                <view class="predict-divider"></view>
                <view class="predict-item">
                    <text class="predict-num">{{ prediction.countdown }}</text>
                    <text class="predict-label">下次预测倒计时</text>
                </view>
            </view>
            <view class="predict-next" v-if="prediction.nextDate">
                <text class="next-label">下次经期预测</text>
                <text class="next-date">{{ prediction.nextDate }}</text>
            </view>
        </view>

        <view class="predict-card" v-else>
            <text class="no-data-tip">记录至少2次完整经期后，将显示周期预测数据</text>
        </view>

        <!-- 提醒设置 -->
        <view class="section-head">
            <text class="section-title">提醒设置</text>
            <text class="section-action" @click="saveReminders">保存</text>
        </view>
        <view class="reminder-card">
            <view class="remind-row">
                <text class="remind-label">经期前一天提醒</text>
                <switch :checked="reminders.dayBefore" @change="reminders.dayBefore = $event.detail.value" color="#FF6B9D" />
            </view>
            <view class="remind-row">
                <text class="remind-label">经期当天提醒</text>
                <switch :checked="reminders.dayOf" @change="reminders.dayOf = $event.detail.value" color="#FF6B9D" />
            </view>
            <view class="remind-row" style="border-bottom: none;">
                <text class="remind-label">排卵期提醒</text>
                <switch :checked="reminders.ovulation" @change="reminders.ovulation = $event.detail.value" color="#FF6B9D" />
            </view>
        </view>

        <!-- 历史记录 -->
        <view class="section-head">
            <text class="section-title">历史记录</text>
        </view>
        <view v-if="records.length === 0" class="empty-tip">
            <text class="empty-text">还没有经期记录</text>
        </view>
        <view class="history-list" v-else>
            <view class="history-item" v-for="(item, index) in records.slice(0, 10)" :key="item._id || index">
                <view class="history-dot"></view>
                <view class="history-info">
                    <text class="history-date">{{ item.startDate }} ~ {{ item.endDate || '进行中' }}</text>
                    <view class="history-tags">
                        <text class="history-tag flow-tag">{{ item.flow || '中' }}</text>
                        <text v-if="item.symptoms && item.symptoms.length > 0" class="history-tag symptom-tag">{{ item.symptoms.join('、') }}</text>
                    </view>
                </view>
                <text class="history-delete" @click="deleteRecord(item)">×</text>
            </view>
        </view>

        <!-- 底部留白 -->
        <view style="height: 60rpx;"></view>
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import { requireLogin } from '@/utils/auth.js'
import CloudData from '@/utils/cloudData.js'

export default {
    data() {
        return {
            calYear: 2026,
            calMonth: 6,
            weekDays: ['日', '一', '二', '三', '四', '五', '六'],
            records: [],
            reminders: {
                dayBefore: false,
                dayOf: false,
                ovulation: false
            }
        }
    },
    computed: {
        // 日历天数网格（含前后月填充空位）
        calDays() {
            const firstDay = new Date(this.calYear, this.calMonth - 1, 1)
            const lastDay = new Date(this.calYear, this.calMonth, 0)
            const daysInMonth = lastDay.getDate()
            const startWeekDay = firstDay.getDay()

            const days = []
            for (let i = 0; i < startWeekDay; i++) days.push(null)
            for (let d = 1; d <= daysInMonth; d++) days.push(d)
            return days
        },
        // 周期预测
        prediction() {
            const completed = this.records.filter(r => r.startDate && r.endDate)
            if (completed.length < 2) return {}

            // 按开始日期排序
            const sorted = [...completed].sort((a, b) => a.startDate.localeCompare(b.startDate))
            const lastN = sorted.slice(-6) // 最近6次

            // 计算周期长度 (endDate of this cycle to startDate of next)
            const cycles = []
            for (let i = 1; i < lastN.length; i++) {
                const prevEnd = new Date(lastN[i - 1].endDate)
                const currStart = new Date(lastN[i].startDate)
                const cycleLen = Math.round((currStart - prevEnd) / (1000 * 60 * 60 * 24))
                if (cycleLen > 0 && cycleLen < 60) cycles.push(cycleLen)
            }

            // 计算经期天数
            const periods = lastN.map(r => {
                const s = new Date(r.startDate)
                const e = new Date(r.endDate)
                return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1
            }).filter(d => d > 0 && d < 15)

            const avgCycle = cycles.length > 0 ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0
            const avgPeriod = periods.length > 0 ? Math.round(periods.reduce((a, b) => a + b, 0) / periods.length) : 0

            // 下次预测: 取最近一次记录
            const lastRecord = sorted[sorted.length - 1]
            const lastEndDate = new Date(lastRecord.endDate)
            const nextDate = new Date(lastEndDate)
            nextDate.setDate(nextDate.getDate() + avgCycle)
            const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`

            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const countdown = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24))

            return {
                avgCycle,
                avgPeriod,
                nextDate: nextStr,
                countdown: countdown > 0 ? countdown : 0
            }
        }
    },
    onLoad() {
        const today = new Date()
        this.calYear = today.getFullYear()
        this.calMonth = today.getMonth() + 1
        this.loadRecords()
        this.loadReminders()
    },
    methods: {
        async loadRecords() {
            const openids = UserManager.getCoupleOpenids()
            const list = await CloudData.getPeriodRecords(openids)
            this.records = list.map(item => ({
                ...item,
                id: item._id || item.id
            }))
        },
        loadReminders() {
            const saved = uni.getStorageSync('period_reminders')
            if (saved) {
                this.reminders = saved
            }
        },
        saveReminders() {
            uni.setStorageSync('period_reminders', this.reminders)
            uni.showToast({ title: '提醒设置已保存', icon: 'success' })
        },
        prevMonth() {
            if (this.calMonth === 1) {
                this.calMonth = 12
                this.calYear--
            } else {
                this.calMonth--
            }
        },
        nextMonth() {
            if (this.calMonth === 12) {
                this.calMonth = 1
                this.calYear++
            } else {
                this.calMonth++
            }
        },
        isToday(day) {
            const today = new Date()
            return this.calYear === today.getFullYear() &&
                   this.calMonth === today.getMonth() + 1 &&
                   day === today.getDate()
        },
        dateStr(day) {
            return `${this.calYear}-${String(this.calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        },
        getDayClass(day) {
            const date = this.dateStr(day)
            const classes = []

            // 实际经期
            for (const r of this.records) {
                if (r.endDate && date >= r.startDate && date <= r.endDate) {
                    classes.push('period-day')
                    return classes
                }
                if (!r.endDate && date === r.startDate) {
                    classes.push('period-day')
                    return classes
                }
            }

            // 预测相关
            if (this.prediction.nextDate && this.prediction.avgCycle) {
                const nextStart = new Date(this.prediction.nextDate)
                const nextEnd = new Date(nextStart)
                nextEnd.setDate(nextEnd.getDate() + this.prediction.avgPeriod - 1)

                const nextStartStr = this.prediction.nextDate
                const nextEndStr = `${nextEnd.getFullYear()}-${String(nextEnd.getMonth() + 1).padStart(2, '0')}-${String(nextEnd.getDate()).padStart(2, '0')}`

                if (date >= nextStartStr && date <= nextEndStr) {
                    classes.push('predict-day')
                    return classes
                }

                // 排卵期: 下次经期前14天 ±2天
                const ovuDate = new Date(nextStart)
                ovuDate.setDate(ovuDate.getDate() - 14)
                const ovuStart = new Date(ovuDate)
                ovuStart.setDate(ovuStart.getDate() - 2)
                const ovuEnd = new Date(ovuDate)
                ovuEnd.setDate(ovuEnd.getDate() + 2)

                const ovuStartStr = `${ovuStart.getFullYear()}-${String(ovuStart.getMonth() + 1).padStart(2, '0')}-${String(ovuStart.getDate()).padStart(2, '0')}`
                const ovuEndStr = `${ovuEnd.getFullYear()}-${String(ovuEnd.getMonth() + 1).padStart(2, '0')}-${String(ovuEnd.getDate()).padStart(2, '0')}`

                if (date >= ovuStartStr && date <= ovuEndStr) {
                    classes.push('ovu-day')
                    return classes
                }

                // 安全期简化: 经期后到排卵前
                const lastRecord = [...this.records].sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
                if (lastRecord && lastRecord.endDate && date > lastRecord.endDate && date < ovuStartStr) {
                    classes.push('safe-day')
                    return classes
                }
            }

            return classes
        },
        async periodStartToday() {
            if (!requireLogin()) return
            const today = new Date()
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

            // 检查是否已有进行中的记录
            const ongoing = this.records.find(r => !r.endDate)
            if (ongoing) {
                uni.showToast({ title: '已有进行中的经期记录', icon: 'none' })
                return
            }

            const userInfo = UserManager.getUserInfo()
            uni.showLoading({ title: '记录中...' })
            await CloudData.addPeriodRecord({
                startDate: dateStr,
                endDate: '',
                flow: '中',
                symptoms: [],
                notes: '',
                creatorOpenid: userInfo.openid || ''
            })
            uni.hideLoading()
            uni.showToast({ title: '已记录经期开始', icon: 'success' })
            await this.loadRecords()
        },
        async periodEndToday() {
            if (!requireLogin()) return
            const ongoing = this.records.find(r => !r.endDate)
            if (!ongoing) {
                uni.showToast({ title: '没有进行中的经期记录', icon: 'none' })
                return
            }

            const today = new Date()
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

            // 弹出经量和症状选择
            uni.showActionSheet({
                itemList: ['经量: 多', '经量: 中', '经量: 少'],
                success: async (res) => {
                    const flowMap = { 0: '多', 1: '中', 2: '少' }
                    uni.showLoading({ title: '保存中...' })
                    await CloudData.updatePeriodRecord(ongoing._id || ongoing.id, {
                        endDate: dateStr,
                        flow: flowMap[res.tapIndex]
                    })
                    uni.hideLoading()
                    uni.showToast({ title: '已记录经期结束', icon: 'success' })
                    await this.loadRecords()
                }
            })
        },
        async deleteRecord(item) {
            if (!requireLogin()) return
            uni.showModal({
                title: '提示',
                content: '确定删除这条记录吗？',
                success: async (res) => {
                    if (res.confirm) {
                        await CloudData.deletePeriodRecord(item._id || item.id)
                        uni.showToast({ title: '已删除', icon: 'success' })
                        await this.loadRecords()
                    }
                }
            })
        }
    }
}
</script>

<style scoped>
.period-page {
    background: linear-gradient(180deg, #FFF0F5 0%, #FFFFFF 100%);
    min-height: 100vh;
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

/* ── Calendar ──────────────────────────────────── */
.calendar-card {
    background: #FFFFFF;
    margin: 0 28rpx 24rpx;
    border-radius: 32rpx;
    padding: 32rpx;
    box-shadow: 0 10rpx 48rpx rgba(255, 107, 157, 0.05), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
}

.cal-nav {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.nav-arrow {
    font-size: 44rpx;
    color: #FF6B9D;
    font-weight: 300;
}

.cal-month {
    font-size: 32rpx;
    font-weight: 700;
    color: #1A1A1A;
}

.cal-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 12rpx;
}

.weekday {
    text-align: center;
    font-size: 24rpx;
    color: #B0B0B0;
    padding: 8rpx 0;
}

.cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4rpx;
}

.cal-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    position: relative;
}

.day-num {
    font-size: 26rpx;
    color: #1A1A1A;
    position: relative;
    z-index: 1;
}

.cal-day.today .day-num {
    color: #FF6B9D;
    font-weight: 700;
}

.cal-day.period-day {
    background: #FFE0EB;
}

.cal-day.period-day .day-num {
    color: #FF6B9D;
    font-weight: 600;
}

.cal-day.predict-day {
    background: #FFF0F5;
    border: 2rpx dashed #FFB0C8;
}

.cal-day.ovu-day {
    background: #F3E8FF;
}

.cal-day.ovu-day .day-num {
    color: #A855F7;
    font-weight: 600;
}

.cal-day.safe-day {
    background: #F0FAF4;
}

.cal-day.safe-day .day-num {
    color: #34C759;
}

/* Legend */
.cal-legend {
    display: flex;
    justify-content: center;
    gap: 28rpx;
    margin-top: 20rpx;
    flex-wrap: wrap;
}

.legend-item {
    display: flex;
    align-items: center;
    font-size: 20rpx;
    color: #999999;
}

.dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    margin-right: 6rpx;
}

.period-dot { background: #FFE0EB; border: 1rpx solid #FF6B9D; }
.predict-dot { background: #FFF0F5; border: 2rpx dashed #FFB0C8; }
.ovu-dot { background: #F3E8FF; border: 1rpx solid #A855F7; }
.safe-dot { background: #F0FAF4; border: 1rpx solid #34C759; }

/* ── Quick Actions ─────────────────────────────── */
.quick-actions {
    display: flex;
    gap: 16rpx;
    padding: 0 28rpx 24rpx;
}

.quick-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10rpx;
    padding: 28rpx;
    border-radius: 24rpx;
    font-weight: 600;
    font-size: 28rpx;
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.quick-btn:active {
    transform: scale(0.97);
}

.start-btn {
    background: #FFF0F5;
    color: #FF6B9D;
    border: 2rpx solid rgba(255, 176, 200, 0.4);
    box-shadow: 0 4rpx 20rpx rgba(255, 107, 157, 0.06);
}

.end-btn {
    background: #F0FAF4;
    color: #34C759;
    border: 2rpx solid rgba(160, 224, 184, 0.4);
    box-shadow: 0 4rpx 20rpx rgba(52, 199, 89, 0.06);
}

.quick-icon {
    font-size: 28rpx;
}

.quick-dot {
    width: 20rpx;
    height: 20rpx;
    border-radius: 50%;
    flex-shrink: 0;
}

.start-dot {
    background: #FF6B9D;
}

.end-dot {
    background: #34C759;
}

.quick-text {
    font-weight: 600;
}

/* ── Predict Card ───────────────────────────── */
.predict-card {
    background: #FFFFFF;
    margin: 0 28rpx 24rpx;
    border-radius: 32rpx;
    padding: 32rpx;
    box-shadow: 0 10rpx 48rpx rgba(255, 107, 157, 0.05), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.predict-row {
    display: flex;
    align-items: center;
}

.predict-item {
    flex: 1;
    text-align: center;
}

.predict-num {
    display: block;
    font-size: 48rpx;
    font-weight: 800;
    color: #FF6B9D;
    line-height: 1;
    margin-bottom: 8rpx;
    font-variant-numeric: tabular-nums;
}

.predict-label {
    font-size: 22rpx;
    color: #999999;
    font-weight: 500;
}

.predict-divider {
    width: 2rpx;
    height: 56rpx;
    background: linear-gradient(180deg, transparent, rgba(247, 248, 250, 0.8), transparent);
}

.predict-next {
    margin-top: 24rpx;
    padding-top: 20rpx;
    border-top: 1rpx solid rgba(247, 248, 250, 0.8);
    text-align: center;
}

.next-label {
    font-size: 24rpx;
    color: #999999;
    display: block;
    margin-bottom: 6rpx;
}

.next-date {
    font-size: 32rpx;
    font-weight: 700;
    color: #FF6B9D;
}

.no-data-tip {
    font-size: 26rpx;
    color: #999999;
    text-align: center;
    display: block;
}

/* ── Section Head ──────────────────────────── */
.section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 28rpx 20rpx;
}

.section-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #1A1A1A;
    line-height: 1.3;
}

.section-action {
    font-size: 26rpx;
    color: #FF6B9D;
    transition: opacity 0.25s ease;
}

.section-action:active {
    opacity: 0.65;
}

/* ── Reminder ───────────────────────────────── */
.reminder-card {
    background: #FFFFFF;
    margin: 0 28rpx 24rpx;
    border-radius: 32rpx;
    padding: 4rpx 28rpx;
    box-shadow: 0 10rpx 48rpx rgba(255, 107, 157, 0.05), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.remind-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1rpx solid rgba(247, 248, 250, 0.8);
}

.remind-row:last-child {
    border-bottom: none;
}

.remind-label {
    font-size: 28rpx;
    color: #1A1A1A;
    font-weight: 500;
}

/* ── History ────────────────────────────────── */
.empty-tip {
    text-align: center;
    padding: 40rpx 28rpx;
}

.empty-text {
    font-size: 26rpx;
    color: #999999;
}

.history-list {
    padding: 0 28rpx;
}

.history-item {
    display: flex;
    align-items: flex-start;
    padding: 24rpx 0;
    border-bottom: 1rpx solid rgba(247, 248, 250, 0.8);
}

.history-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    margin-top: 8rpx;
    margin-right: 16rpx;
    flex-shrink: 0;
    box-shadow: 0 2rpx 8rpx rgba(255, 107, 157, 0.3);
}

.history-info {
    flex: 1;
    min-width: 0;
}

.history-date {
    font-size: 26rpx;
    color: #1A1A1A;
    font-weight: 500;
    display: block;
    margin-bottom: 6rpx;
}

.history-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
}

.history-tag {
    font-size: 22rpx;
    padding: 4rpx 14rpx;
    border-radius: 24rpx;
}

.flow-tag {
    background: #FFF0F5;
    color: #FF6B9D;
}

.symptom-tag {
    background: #F7F8FA;
    color: #999999;
}

.history-delete {
    font-size: 32rpx;
    color: #D0D0D0;
    padding: 4rpx 8rpx;
    flex-shrink: 0;
}
</style>
