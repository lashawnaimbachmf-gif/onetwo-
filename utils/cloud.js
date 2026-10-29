/**
 * uniCloud 客户端 API 的 HTTP 适配层
 *
 * 项目原先后端是 uniCloud 云函数，迁移到自建服务器后，云函数变成
 * `POST /fn/<name>` 接口。本文件保持 callFunction / uploadFile / getTempFileURL
 * 的入参与返回结构不变，页面代码只需在 <script> 顶部加一行：
 *
 *   import uniCloud from '@/utils/cloud.js'
 *
 * 原有 `uniCloud.callFunction({...})` 调用可原样保留（局部 import 会遮蔽全局 uniCloud）。
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

/**
 * 调用云函数，返回结构与 uniCloud.callFunction 一致：{ result }
 * @param {{name: string, data?: object}} options
 */
async function callFunction (options = {}) {
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
}

/**
 * 上传文件，返回 { fileID, filePath }
 * fileID 是相对路径（如 images/1698_ab.jpg），拼接 base 后即为可访问 URL
 */
function uploadFile (options = {}) {
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
          resolve({ fileID: body.fileID, filePath: body.url || '' })
        } else {
          reject(new Error((body && body.message) || `上传失败（HTTP ${res.statusCode}）`))
        }
      },
      fail: (err) => reject(new Error((err && err.errMsg) || '上传失败'))
    })
  })
}

/**
 * 换临时访问地址。自建存储没有临时签名概念，直接拼绝对 URL。
 */
function getTempFileURL (options = {}) {
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

export default {
  callFunction,
  uploadFile,
  getTempFileURL,
  getApiBase
}
