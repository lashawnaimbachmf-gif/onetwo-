import App from './App.vue'
import Vue from 'vue'
import store from './store'

Vue.config.productionTip = false

// 初始化微信云开发（必须在最顶层，App.vue 里的 init 会被 uni-app v2 编译剥离）
if (typeof wx !== 'undefined' && wx.cloud) {
    wx.cloud.init({
        env: 'cloud1-d9gkl1jnyfa0d3be5',
        traceUser: true
    })
}

App.mpType = 'app'

const app = new Vue({
  ...App,
  store
})
app.$mount()
