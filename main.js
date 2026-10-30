import App from './App.vue'
import Vue from 'vue'
import store from './store'
import cloud from '@/utils/cloud.js'

Vue.config.productionTip = false

// 使用自建后端（原微信云开发已替换为 HTTP 适配层）
cloud.init()

App.mpType = 'app'

const app = new Vue({
  ...App,
  store
})
app.$mount()
