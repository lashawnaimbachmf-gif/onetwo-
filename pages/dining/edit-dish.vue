<template>
    <view class="edit-page">
        <view class="form-item">
            <text class="label">菜品名称</text>
            <input class="input" v-model="name" placeholder="例如：爱心便当" />
        </view>

        <view class="form-item">
            <text class="label">价格（熊熊币）</text>
            <input class="input" v-model="price" type="number" placeholder="输入价格" />
        </view>

        <button class="save-btn" @click="save">保存修改</button>
    </view>
</template>

<script>
import CloudData from '@/utils/cloudData.js'

export default {
    data() {
        return {
            id: '',
            name: '',
            price: ''
        }
    },
    onLoad(options) {
        this.id = options.id
        this.name = decodeURIComponent(options.name || '')
        this.price = options.price || ''
    },
    methods: {
        async save() {
            if (!this.name.trim()) {
                uni.showToast({ title: '请输入菜品名称', icon: 'none' })
                return
            }
            if (!this.price) {
                uni.showToast({ title: '请输入价格', icon: 'none' })
                return
            }

            uni.showLoading({ title: '保存中...' })

            await CloudData.updateDish(this.id, {
                name: this.name.trim(),
                price: parseInt(this.price)
            })

            uni.hideLoading()
            uni.showToast({ title: '修改成功', icon: 'success' })
            setTimeout(() => {
                uni.navigateBack()
            }, 1000)
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
</style>
