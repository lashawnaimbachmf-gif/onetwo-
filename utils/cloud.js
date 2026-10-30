/**
 * wx.cloud 兼容层（自建后端版）
 *
 * 原来的代码调用微信云开发 `wx.cloud.*`，现在全部转到自建服务器：
 *   wx.cloud.callFunction  -> POST /fn/<name>
 *   wx.cloud.uploadFile    -> POST /upload
 *   wx.cloud.getTempFileURL-> 拼出服务器上的直链
 *
 * 保持与 wx.cloud 相同的入参/返回结构，调用方只需要把 wx.cloud 换成 cloud。
 */

import { getApiBase } from '@/config/api.js'

function buildUrl (pathname) {
  return getApiBase() + pathname
}

function postJson (pathname, data) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: buildUrl(pathname),
      method: 'POST',
      data: data || {},
      timeout: 20000,
      header: { 'content-type': 'application/json' },
      success: resolve,
      fail: (err) => reject(new Error((err && err.errMsg) || '网络请求失败'))
    })
  })
}

const cloud = {
  env: '',

  init () {
    // 自建后端不需要初始化，保留空实现
  },

  async callFunction (options = {}) {
    const { name, data } = options
    if (!name) throw new Error('callFunction 缺少 name')

    let res
    try {
      res = await postJson('/fn/' + name, data)
    } catch (e) {
      throw new Error(`无法连接服务器（${getApiBase() || '同域'}）：${e.message}`)
    }

    if (res.statusCode === 404) {
      throw new Error(`云函数 ${name} 不存在，请确认后端已部署`)
    }
    if (res.statusCode >= 500) {
      const message = (res.data && res.data.result && res.data.result.message) || `HTTP ${res.statusCode}`
      throw new Error(`云函数 ${name} 执行失败：${message}`)
    }

    const body = res.data || {}
    return { result: body.result !== undefined ? body.result : body }
  },

  uploadFile (options = {}) {
    const { filePath, cloudPath, name = 'file' } = options
    if (!filePath) return Promise.reject(new Error('uploadFile 缺少 filePath'))

    const url = buildUrl('/upload?cloudPath=' + encodeURIComponent(cloudPath || 'images'))

    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url,
        filePath,
        name,
        success: (res) => {
          let body = res.data
          if (typeof body === 'string') {
            try {
              body = JSON.parse(body)
            } catch (e) {
              body = null
            }
          }
          if (res.statusCode >= 200 && res.statusCode < 300 && body && body.fileID) {
            resolve({ fileID: body.fileID, statusCode: res.statusCode, errMsg: 'uploadFile:ok' })
          } else {
            reject(new Error((body && body.message) || `上传失败（HTTP ${res.statusCode}）`))
          }
        },
        fail: (err) => reject(new Error((err && err.errMsg) || '上传失败'))
      })
    })
  },

  getTempFileURL (options = {}) {
    const list = options.fileList || []
    const base = getApiBase()

    return Promise.resolve({
      fileList: list.map((item) => {
        const fileID = typeof item === 'string' ? item : ((item && item.fileID) || '')
        let tempFileURL = ''
        if (fileID) {
          tempFileURL = /^https?:\/\//i.test(fileID)
            ? fileID
            : base + '/uploads/' + String(fileID).replace(/^\/+/, '')
        }
        return { fileID, tempFileURL, status: tempFileURL ? 0 : -1 }
      })
    })
  }
}

export default cloud
