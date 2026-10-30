<template>
    <view class="edit-page">
        <view class="page-header">
            <text class="page-title">修改菜品</text>
        </view>
        <view class="form-item">
            <text class="label">菜品名称</text>
            <input class="input" v-model="name" placeholder="例如：番茄炒蛋" placeholder-class="input-placeholder" />
        </view>

        <view class="form-item">
            <text class="label">分类</text>
            <view class="category-options">
                <view
                    v-for="cat in categories"
                    :key="cat.key"
                    :class="['category-tag', selectedCategory === cat.key ? 'active' : '']"
                    @click="selectedCategory = cat.key"
                >
                    <text class="tag-text">{{ cat.name }}</text>
                </view>
            </view>
        </view>

        <view class="form-item">
            <text class="label">价格（熊熊币）</text>
            <input class="input" v-model="price" type="number" placeholder="输入价格（熊熊币）" placeholder-class="input-placeholder" />
        </view>

        <button class="save-btn" @click="save">保存修改</button>
    </view>
</template>

<script>
import { requireLogin } from '@/utils/auth.js'
import CloudData from '@/utils/cloudData.js'

const CATEGORIES = [
    { key: '主食', name: '主食' },
    { key: '饮品', name: '饮品' },
    { key: '甜品', name: '甜品' },
    { key: '其他', name: '其他' }
]

export default {
    data() {
        return {
            id: '',
            name: '',
            price: '',
            selectedCategory: '其他',
            categories: CATEGORIES
        }
    },
    onLoad(options) {
        this.id = options.id
        this.name = decodeURIComponent(options.name || '')
        this.price = options.price || ''
        this.selectedCategory = decodeURIComponent(options.category || '其他')
    },
    methods: {
        async save() {
            if (!requireLogin()) return
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
                price: parseInt(this.price),
                category: this.selectedCategory
            })

            uni.hideLoading()
            uni.showToast({ title: '修改成功', icon: 'success' })
            setTimeout(() => { uni.navigateBack() }, 1000)
        }
    }
}
</script>

<style scoped>
.edit-page {
    background: linear-gradient(180deg, #FFF0F5 0%, #FFFFFF 100%);
    min-height: 100vh;
    padding: 0 28rpx 32rpx;
}

.page-header {
    padding: calc(var(--status-bar-height) + 28rpx) 0 24rpx;
    text-align: center;
}

.page-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1A1A1A;
}

.form-item {
    background: #FFFFFF;
    border-radius: 32rpx;
    padding: 36rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 10rpx 48rpx rgba(255, 107, 157, 0.05), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.label {
    display: block;
    font-size: 26rpx;
    font-weight: 600;
    color: #999999;
    margin-bottom: 20rpx;
    letter-spacing: 0.5rpx;
}

.input {
    width: 100%;
    height: 88rpx;
    font-size: 30rpx;
    color: #1A1A1A;
    padding: 0 24rpx;
    background: #F7F8FA;
    border-radius: 20rpx;
    box-sizing: border-box;
    line-height: 88rpx;
}

.input-placeholder {
    color: #B0B0B0;
    font-size: 28rpx;
}

.category-options {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
}

.category-tag {
    padding: 14rpx 28rpx;
    border-radius: 48rpx;
    background: #F7F8FA;
    border: 2rpx solid transparent;
    transition: all 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.category-tag .tag-text {
    font-size: 26rpx;
    color: #666666;
}

.category-tag.active {
    background: #FFF5F8;
    border-color: #FF6B9D;
}

.category-tag.active .tag-text {
    color: #FF6B9D;
    font-weight: 600;
}

.save-btn {
    width: 360rpx;
    margin: 48rpx auto 0;
    display: block;
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    color: #FFFFFF;
    font-size: 28rpx;
    font-weight: 600;
    padding: 20rpx 0;
    border-radius: 48rpx;
    border: none;
    box-shadow: 0 8rpx 28rpx rgba(255, 107, 157, 0.16);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.save-btn:active {
    transform: scale(0.97);
    opacity: 0.92;
    box-shadow: 0 4rpx 14rpx rgba(255, 107, 157, 0.12);
}
</style>
