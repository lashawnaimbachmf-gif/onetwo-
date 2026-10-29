<template>
    <view class="settings-page">
        <view class="section">
            <text class="section-title">在一起的日子</text>
            <picker mode="date" :value="togetherDate" @change="onTogetherDateChange">
                <view class="picker-item">
                    <text class="label">相识日期</text>
                    <text class="value">{{ togetherDate || '选择日期' }}</text>
                </view>
            </picker>
        </view>

        <view class="section">
            <view class="section-header">
                <text class="section-title">重要纪念日</text>
                <button class="add-btn" @click="showAddModal">+ 添加</button>
            </view>
            <view class="anniversary-list">
                <view class="anniversary-item" v-for="(item, index) in anniversaryList" :key="item.id" :data-id="item.id" @click="editAnniversary">
                    <view class="item-left">
                        <image class="item-icon-img" :src="getIcon(item.icon)" mode="aspectFit" />
                        <view class="item-info">
                            <text class="item-name">{{ item.name }}</text>
                            <text class="item-date">{{ item.date }}</text>
                        </view>
                    </view>
                    <text class="edit-hint">编辑 ›</text>
                </view>
            </view>
        </view>

        <button class="save-btn" @click="saveSettings">
            保存设置
        </button>

        <!-- 添加/编辑弹窗 -->
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
import uniCloud from '@/utils/cloud.js'
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'

export default {
    data() {
        return {
            togetherDate: '2023-03-22',
            anniversaryList: [],
            showModal: false,
            isEditing: false,
            editingId: null,
            formData: {
                name: '',
                icon: 'birthday',
                date: ''
            },
            userInfo: {}
        }
    },
    onLoad() {
        this.loadUserInfo()
        this.loadData()
    },
    onShow() {
        this.loadUserInfo()
        this.loadData()
    },
    methods: {
        loadUserInfo() {
            this.userInfo = UserManager.getUserInfo()
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
            // 从云端加载在一起日期
            const userInfo = UserManager.getUserInfo()
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
                    this.togetherDate = userData.togetherDate
                }
            }

            // 从云端加载纪念日数据
            const coupleOpenids = UserManager.getCoupleOpenids()
            const list = await CloudData.getAnniversaries(coupleOpenids)

            if (list && list.length > 0) {
                // 将 _id 映射为 id
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
        },
        showAddModal() {
            this.isEditing = false
            this.editingId = null
            this.formData = { name: '', icon: 'birthday', date: '' }
            this.showModal = true
        },
        editAnniversary(e) {
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
                // 更新云端数据
                await CloudData.updateAnniversary(this.editingId, {
                    ...this.formData,
                    updateTime: Date.now()
                })
            } else {
                // 添加到云端
                await CloudData.addAnniversary({
                    ...this.formData,
                    creatorOpenid: this.userInfo.openid || '',
                    creatorName: this.userInfo.nickName || '我'
                })
            }

            // 重新加载数据
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
        },
        async saveSettings() {
            // 保存到云端
            const userInfo = UserManager.getUserInfo()
            await uniCloud.callFunction({
                name: 'dataService',
                data: {
                    action: 'update',
                    collection: 'users',
                    where: {
                        openid: userInfo.openid
                    },
                    data: {
                        togetherDate: this.togetherDate,
                        updateTime: Date.now()
                    }
                }
            })
            
            uni.showToast({ title: '保存成功！', icon: 'success' })
            setTimeout(() => {
                uni.navigateBack()
            }, 1000)
        }
    }
}
</script>

<style scoped>
.settings-page {
    background: #f7f8fa;
    min-height: 100vh;
    padding: 32rpx;
}

.section {
    background: #fff;
    border-radius: 24rpx;
    padding: 32rpx;
    margin-bottom: 24rpx;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
}

.section-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
}

.add-btn {
    font-size: 24rpx;
    color: #ff6b9d;
    background: #fff7f2;
    padding: 8rpx 20rpx;
    border-radius: 20rpx;
    border: none;
}

.picker-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.label {
    font-size: 28rpx;
    color: #333;
}

.value {
    font-size: 28rpx;
    color: #ff6b9d;
}

.anniversary-list {
    margin-top: 24rpx;
}

.anniversary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
}

.anniversary-item:last-child {
    border-bottom: none;
}

.item-left {
    display: flex;
    align-items: center;
}

.item-icon-img {
    width: 48rpx;
    height: 48rpx;
    margin-right: 16rpx;
}

.item-info {
    display: flex;
    flex-direction: column;
}

.item-name {
    font-size: 28rpx;
    color: #333;
    margin-bottom: 4rpx;
}

.item-date {
    font-size: 24rpx;
    color: #888;
}

.edit-hint {
    font-size: 24rpx;
    color: #ff6b9d;
}

.save-btn {
    width: 100%;
    margin-top: 40rpx;
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    font-size: 32rpx;
    font-weight: bold;
    padding: 32rpx;
    border-radius: 48rpx;
    border: none;
}

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
    background: rgba(0, 0, 0, 0.5);
}

.modal-content {
    position: relative;
    background: #fff;
    border-radius: 32rpx;
    padding: 48rpx;
    width: 80%;
    max-width: 600rpx;
}

.modal-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
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
    color: #666;
    margin-bottom: 12rpx;
}

.form-input {
    width: 100%;
    padding: 20rpx;
    background: #f7f8fa;
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
    background: #f7f8fa;
    border-radius: 12rpx;
    border: 3rpx solid transparent;
}

.icon-option.active {
    border-color: #ff6b9d;
    background: #fff7f2;
}

.selector-icon-img {
    width: 40rpx;
    height: 40rpx;
}

.form-picker {
    padding: 20rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
    font-size: 28rpx;
    color: #333;
}

.modal-btns {
    display: flex;
    gap: 16rpx;
}

.modal-btn {
    flex: 1;
    padding: 24rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    border: none;
}

.modal-btn.delete {
    background: #ffeaea;
    color: #ff4d4f;
}

.modal-btn.cancel {
    background: #f7f8fa;
    color: #666;
}

.modal-btn.confirm {
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
}
</style>