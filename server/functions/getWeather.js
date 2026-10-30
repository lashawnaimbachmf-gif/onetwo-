'use strict'

// 原云函数为占位实现，前端实际走 api/weather.js 直连和风天气。
// 这里保持同样的返回结构，方便以后改成服务端代理（把 Key 留在服务器上）。
exports.main = async () => {
  return {
    code: 0,
    data: {
      temp: '26',
      text: '晴转多云',
      humidity: '45%',
      wind: '东南风 2级'
    }
  }
}
