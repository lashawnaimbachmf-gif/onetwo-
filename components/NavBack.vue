<template>
    <view class="nav-back" hover-class="nav-back--hover" :hover-start-time="0" @click="goBack">
        <view class="nav-back-arrow"></view>
    </view>
</template>

<script>
export default {
    name: 'NavBack',
    methods: {
        goBack() {
            uni.navigateBack({
                delta: 1,
                fail: () => {
                    uni.reLaunch({ url: '/pages/home/index' })
                }
            })
        }
    }
}
</script>

<style scoped>
.nav-back {
    position: fixed;
    top: calc(var(--status-bar-height) + 8rpx);
    left: 24rpx;
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.86);
    border: 1rpx solid rgba(255, 107, 157, 0.1);
    box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.1), 0 1rpx 4rpx rgba(0, 0, 0, 0.03);
    backdrop-filter: blur(12rpx);
    -webkit-backdrop-filter: blur(12rpx);
    z-index: 90;
    transition: transform 0.2s ease, background 0.2s ease;
}

.nav-back--hover {
    background: #FFFFFF;
    transform: scale(0.94);
}

.nav-back-arrow {
    box-sizing: border-box;
    position: relative;
    /* 旋转后箭头视觉重心偏左，右移补正，使其在圆形按钮内居中 */
    left: 5rpx;
    width: 18rpx;
    height: 18rpx;
    border-left: 4rpx solid #1A1A1A;
    border-bottom: 4rpx solid #1A1A1A;
    transform: rotate(45deg);
}
</style>
