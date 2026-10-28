export function checkLogin(redirect = true) {
  const token = uni.getStorageSync('token')
  if (!token) {
    if (redirect) {
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/login' })
      }, 1000)
    }
    return false
  }
  return true
}
