import UserManager from '@/utils/user.js'

/**
 * 检查登录状态，未登录则跳转
 * @returns {boolean} 是否已登录
 */
export function checkLogin(redirect = true) {
  const token = uni.getStorageSync('token')
  if (!token) {
    if (redirect) {
      setTimeout(() => {
        uni.redirectTo({ url: '/subPages/login/login' })
      }, 1000)
    }
    return false
  }
  return true
}

/**
 * 需要登录才能执行的操作 — 客户端鉴权守卫
 * 在需要登录的写入操作前调用，未登录时弹窗引导登录
 * @returns {boolean} 已登录返回 true，未登录弹窗并返回 false
 */
export function requireLogin() {
  if (UserManager.getToken() && UserManager.getOpenid()) {
    return true
  }
  uni.showModal({
    title: '请先登录',
    content: '登录后才能使用此功能哦～',
    confirmText: '去登录',
    success: (res) => {
      if (res.confirm) {
        uni.navigateTo({ url: '/subPages/login/login' })
      }
    }
  })
  return false
}
