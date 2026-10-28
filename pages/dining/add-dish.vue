<template>
    <view class="add-page">
        <view class="form-item">
            <text class="label">菜品图片</text>
            <view class="img-upload" @click="chooseImage">
                <image v-if="imgUrl" class="preview-img" :src="imgUrl" />
                <view v-else class="upload-placeholder">
                    <image class="upload-icon-img" src="/static/icons/icon-camera.png" mode="aspectFit" />
                    <text class="upload-text">点击上传图片</text>
                </view>
            </view>
        </view>

        <view class="form-item">
            <text class="label">菜品名称</text>
            <input class="input" v-model="name" placeholder="例如：爱心便当" />
        </view>

        <view class="form-item">
            <text class="label">价格（熊熊币）</text>
            <input class="input" v-model="price" type="number" placeholder="输入价格" />
        </view>

        <button class="save-btn" @click="save">保存菜谱</button>
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'
import UploadUtil from '@/utils/upload.js'

export default {
    data() {
        return {
            imgUrl: '',
            name: '',
            price: ''
        }
    },
    methods: {
        chooseImage() {
            uni.chooseImage({
                count: 1,
                sizeType: ['compressed'],
                sourceType: ['album', 'camera'],
                success: (res) => {
                    this.imgUrl = res.tempFilePaths[0]
                }
            })
        },
        async save() {
            if (!this.name) {
                uni.showToast({ title: '请输入菜品名称', icon: 'none' })
                return
            }
            if (!this.price) {
                uni.showToast({ title: '请输入价格', icon: 'none' })
                return
            }

            uni.showLoading({ title: '保存中...' })

            // 上传图片到云存储
            let cloudImgUrl = this.imgUrl
            if (this.imgUrl && !this.imgUrl.startsWith('http')) {
                cloudImgUrl = await UploadUtil.uploadImage(this.imgUrl, 'dishes')
            }

            // 获取当前用户信息
            const userInfo = UserManager.getUserInfo()

            const newDish = {
                name: this.name,
                price: parseInt(this.price),
                img: cloudImgUrl || '/static/tabbar/home.png',
                creatorOpenid: userInfo.openid || '',
                creatorName: userInfo.nickName || '我'
            }

            const result = await CloudData.addDish(newDish)
            uni.hideLoading()

            if (result.success) {
                uni.showToast({ title: '保存成功！', icon: 'success' })
                setTimeout(() => {
                    uni.navigateBack()
                }, 1000)
            } else {
                uni.showToast({ title: result.message, icon: 'none' })
            }
        }
    }
}
</script>

<style scoped>
.add-page {
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

.img-upload {
    width: 200rpx;
    height: 200rpx;
    border-radius: 20rpx;
    overflow: hidden;
}

.preview-img {
    width: 100%;
    height: 100%;
}

.upload-placeholder {
    width: 100%;
    height: 100%;
    background: #f7f8fa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 3rpx dashed #ddd;
    border-radius: 20rpx;
}

.upload-icon-img {
    width: 64rpx;
    height: 64rpx;
    margin-bottom: 12rpx;
}

.upload-text {
    font-size: 24rpx;
    color: #999;
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