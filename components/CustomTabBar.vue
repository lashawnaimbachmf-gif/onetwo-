<template>
  <view class="ctb-root">
    <view class="ctb-safe" />
    <view class="ctb-body">
      <view
        v-for="(tab, index) in tabs"
        :key="index"
        :class="['ctb-item', { 'ctb-item--active': activeIndex === index }]"
        @click="onTap(tab, index)"
      >
        <view :class="['ctb-icon-wrap', { 'ctb-icon-wrap--active': activeIndex === index }]">
          <image
            :src="activeIndex === index ? tab.activeIcon : tab.icon"
            mode="aspectFit"
            class="ctb-icon"
          />
        </view>
        <text :class="['ctb-text', { 'ctb-text--active': activeIndex === index }]">
          {{ tab.text }}
        </text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CustomTabBar',
  props: {
    activeIndex: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      tabs: [
        {
          pagePath: '/pages/home/index',
          text: '小窝',
          icon: '/static/tabbar/home.png',
          activeIcon: '/static/tabbar/home-active.png'
        },
        {
          pagePath: '/pages/capsule/index',
          text: '胶囊',
          icon: '/static/tabbar/capsule.png',
          activeIcon: '/static/tabbar/capsule-active.png'
        },
        {
          pagePath: '/pages/dining/index',
          text: '点餐',
          icon: '/static/tabbar/dining.png',
          activeIcon: '/static/tabbar/dining-active.png'
        },
        {
          pagePath: '/pages/us/index',
          text: '我们',
          icon: '/static/tabbar/us.png',
          activeIcon: '/static/tabbar/us-active.png'
        }
      ]
    }
  },
  methods: {
    onTap(tab, index) {
      if (this.activeIndex === index) return
      uni.switchTab({ url: tab.pagePath })
    }
  }
}
</script>

<style>
.ctb-root {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

.ctb-safe {
  width: 100%;
  height: env(safe-area-inset-bottom);
  background: #FFFFFF;
  box-sizing: border-box;
}

.ctb-body {
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  box-shadow: 0 -4rpx 32rpx rgba(255, 107, 157, 0.05),
              0 -1rpx 0 rgba(255, 107, 157, 0.04);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 10rpx 16rpx;
  height: 100rpx;
  pointer-events: auto;
  box-sizing: border-box;
}

.ctb-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  position: relative;
  padding: 4rpx 0;
  transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}

.ctb-item:active {
  transform: scale(0.92);
}

.ctb-icon-wrap {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.ctb-icon-wrap--active {
  transform: scale(1.12);
}

.ctb-icon {
  width: 48rpx;
  height: 48rpx;
}

.ctb-text {
  font-size: 22rpx;
  color: #999999;
  font-weight: 400;
  margin-top: 2rpx;
  transition: color 0.25s ease, font-weight 0.25s ease;
}

.ctb-text--active {
  color: #FF6B9D;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .ctb-icon-wrap,
  .ctb-text,
  .ctb-item {
    transition: none;
  }
}
</style>
