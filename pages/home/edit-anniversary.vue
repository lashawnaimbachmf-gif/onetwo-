<template>
    <view class="edit-page">
        <view class="form-item">
            <text class="label">纪念日名称</text>
            <input class="input" v-model="name" placeholder="例如：宝宝生日" />
        </view>

        <view class="form-item">
            <text class="label">选择图标</text>
            <view class="icon-selector">
                <view :class="['icon-item', icon === 'birthday' ? 'active' : '']" @click="icon = 'birthday'">
                    <image class="icon-img" src="/static/icons/icon-birthday.png" mode="aspectFit" />
                </view>
                <view :class="['icon-item', icon === 'couple' ? 'active' : '']" @click="icon = 'couple'">
                    <image class="icon-img" src="/static/icons/icon-couple.png" mode="aspectFit" />
                </view>
                <view :class="['icon-item', icon === 'love' ? 'active' : '']" @click="icon = 'love'">
                    <image class="icon-img" src="/static/icons/icon-love.png" mode="aspectFit" />
                </view>
                <view :class="['icon-item', icon === 'gift' ? 'active' : '']" @click="icon = 'gift'">
                    <image class="icon-img" src="/static/icons/icon-gift.png" mode="aspectFit" />
                </view>
                <view :class="['icon-item', icon === 'rose' ? 'active' : '']" @click="icon = 'rose'">
                    <image class="icon-img" src="/static/icons/icon-rose.png" mode="aspectFit" />
                </view>
                <view :class="['icon-item', icon === 'celebrate' ? 'active' : '']" @click="icon = 'celebrate'">
                    <image class="icon-img" src="/static/icons/icon-celebrate.png" mode="aspectFit" />
                </view>
            </view>
        </view>

        <view class="form-item">
            <text class="label">日期</text>
            <picker mode="date" :value="date" @change="onDateChange">
                <view class="picker">{{ date || '选择日期' }}</view>
            </picker>
        </view>

        <view class="btn-group">
            <button v-if="isEdit" class="delete-btn" @click="deleteAnniversary">删除</button>
            <button class="save-btn" @click="save">保存</button>
        </view>
    </view>
</template>

<script>
import CloudData from '@/utils/cloudData.js'
import UserManager from '@/utils/user.js'

export default {
    data() {
        return {
            id: null,
            name: '',
            icon: 'birthday',
            date: '',
            isEdit: false
        }
    },
    onLoad(options) {
        if (options.id) {
            this.id = options.id
            this.isEdit = true
            this.loadAnniversary()
            uni.setNavigationBarTitle({ title: '编辑纪念日' })
        } else {
            uni.setNavigationBarTitle({ title: '添加纪念日' })
        }
    },
    methods: {
        async loadAnniversary() {
            const userInfo = UserManager.getUserInfo()
            const coupleOpenids = UserManager.getCoupleOpenids()
            const list = await CloudData.getAnniversaries(coupleOpenids)
            const item = list.find(a => (a._id || a.id) == this.id)
            if (item) {
                this.name = item.name
                this.icon = item.icon
                this.date = item.date
            }
        },
        onDateChange(e) {
            this.date = e.detail.value
        },
        async save() {
            if (!this.name) {
                uni.showToast({ title: '请填写纪念日名称', icon: 'none' })
                return
            }
            if (!this.date) {
                uni.showToast({ title: '请选择日期', icon: 'none' })
                return
            }

            uni.showLoading({ title: '保存中...' })

            if (this.isEdit) {
                // 确保不传入 _id 字段
                const updateData = {
                    name: this.name,
                    icon: this.icon,
                    date: this.date
                }
                const result = await CloudData.updateAnniversary(this.id, updateData)
                if (!result.success) {
                    uni.hideLoading()
                    uni.showToast({ title: result.message || '更新失败', icon: 'none' })
                    return
                }
            } else {
                const userInfo = UserManager.getUserInfo()
                await CloudData.addAnniversary({
                    name: this.name,
                    icon: this.icon,
                    date: this.date,
                    creatorOpenid: userInfo.openid || '',
                    creatorName: userInfo.nickName || '我'
                })
            }

            uni.hideLoading()
            uni.showToast({ title: '保存成功！', icon: 'success' })
            setTimeout(() => {
                uni.navigateBack()
            }, 1000)
        },
        deleteAnniversary() {
            uni.showModal({
                title: '提示',
                content: '确定删除这个纪念日吗？',
                success: async (res) => {
                    if (res.confirm) {
                        uni.showLoading({ title: '删除中...' })
                        await CloudData.deleteAnniversary(this.id)
                        uni.hideLoading()
                        uni.showToast({ title: '删除成功！', icon: 'success' })
                        setTimeout(() => {
                            uni.navigateBack()
                        }, 1000)
                    }
                }
            })
        }
    }
}
</script>

<style scoped>
.edit-page {
    background: #f7f8fa;
    min-height: 100vh;
    padding: 32rpx;
}

.form-item {
    background: #fff;
    border-radius: 24rpx;
    padding: 32rpx;
    margin-bottom: 24rpx;
}

.label {
    display: block;
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
}

.input {
    width: 100%;
    font-size: 30rpx;
    color: #333;
    padding: 20rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
}

.icon-selector {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16rpx;
}

.icon-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
    border: 3rpx solid transparent;
}

.icon-img {
    width: 48rpx;
    height: 48rpx;
}

.icon-item.active {
    border-color: #ff6b9d;
    background: #fff7f2;
}

.picker {
    padding: 20rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
    font-size: 30rpx;
    color: #333;
}

.btn-group {
    display: flex;
    gap: 24rpx;
    margin-top: 40rpx;
}

.delete-btn {
    flex: 1;
    background: #ffeaea;
    color: #ff4d4f;
    font-size: 30rpx;
    padding: 32rpx;
    border-radius: 48rpx;
    border: none;
}

.save-btn {
    flex: 2;
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    font-size: 30rpx;
    font-weight: bold;
    padding: 32rpx;
    border-radius: 48rpx;
    border: none;
}
</style>
