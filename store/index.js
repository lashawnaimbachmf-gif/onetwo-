import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    user: uni.getStorageSync('user') || null,
    cart: uni.getStorageSync('cart') || []
  },
  mutations: {
    setUser(state, user) {
      state.user = user
      uni.setStorageSync('user', user)
    },
    setCart(state, cart) {
      state.cart = cart
      uni.setStorageSync('cart', cart)
    },
    clearUser(state) {
      state.user = null
      uni.removeStorageSync('user')
    },
    clearCart(state) {
      state.cart = []
      uni.removeStorageSync('cart')
    }
  }
})

export default store
