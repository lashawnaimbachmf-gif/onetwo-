/**
 * 后端地址配置
 *
 * 三种环境：
 *   1. H5 生产：前端与 /fn 同域部署（Nginx 同时托管静态文件和反代后端），base 留空即可
 *   2. H5 / 小程序开发：指向本机 node 服务（默认 http://127.0.0.1:3000）
 *   3. 小程序上线：必须换成已备案的 HTTPS 域名，且要在微信后台加入 request 合法域名
 *
 * 真机调试临时改地址（不用改代码重新编译）：
 *   uni.setStorageSync('API_BASE', 'https://dev.example.com')
 * 清除覆盖：
 *   uni.removeStorageSync('API_BASE')
 */

const DEV_BASE = 'http://120.27.229.190'
// 拿到备案域名并配好 HTTPS 后，把这里换成 https://你的域名
const PROD_BASE = 'http://120.27.229.190'

function normalize (base) {
  return String(base || '').replace(/\/+$/, '')
}

let cached = null

export function getApiBase () {
  if (cached !== null) return cached

  try {
    const custom = normalize(uni.getStorageSync('API_BASE'))
    if (custom) {
      cached = custom
      return cached
    }
  } catch (e) {
    // 存储不可用时忽略
  }

  let base = ''
  // #ifdef H5
  base = process.env.NODE_ENV === 'development' ? DEV_BASE : ''
  // #endif
  // #ifndef H5
  base = process.env.NODE_ENV === 'development' ? DEV_BASE : PROD_BASE
  // #endif

  cached = normalize(base)
  return cached
}

export function setApiBase (base) {
  cached = normalize(base)
  try {
    if (cached) uni.setStorageSync('API_BASE', cached)
    else uni.removeStorageSync('API_BASE')
  } catch (e) {
    // 忽略
  }
  return cached
}

export default { getApiBase, setApiBase }
