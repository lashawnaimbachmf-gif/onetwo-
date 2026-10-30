/**
 * 云存储上传工具
 *
 * 使用 wx.cloud.uploadFile 直接上传到腾讯云 CloudBase。
 *
 * 如果遇到 "uploadFile:fail url not in domain list"：
 * - 开发阶段：微信开发者工具 → 设置 → 代理 → 勾选"不校验合法域名"
 * - 生产环境：在微信公众平台 mp.weixin.qq.com → 开发管理 → 开发设置 →
 *   uploadFile合法域名，添加 CloudBase 域名
 *   （域名可在 CloudBase 控制台 → 云存储 查看）
 */

export default {
    /**
     * 上传图片到云存储
     * @param {string} filePath - 本地图片路径
     * @param {string} dir - 存储目录（可选）
     * @returns {Promise<string>} 云存储可访问 URL
     */
    async uploadImage(filePath, dir = 'images') {
        if (!filePath) return ''

        // 已经是网络 URL 直接返回
        if (filePath.startsWith('http')) {
            return filePath
        }

        try {
            // 生成云存储路径
            const ext = filePath.split('.').pop() || 'jpg'
            const cloudPath = `${dir}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`

            // 直接上传到云存储
            const result = await wx.cloud.uploadFile({
                filePath,
                cloudPath
            })

            if (!result || !result.fileID) {
                console.error('上传失败：未获取到 fileID')
                return ''
            }

            // 获取可访问的临时 URL
            try {
                const urlResult = await wx.cloud.getTempFileURL({
                    fileList: [result.fileID]
                })
                if (urlResult.fileList && urlResult.fileList[0] && urlResult.fileList[0].tempFileURL) {
                    return urlResult.fileList[0].tempFileURL
                }
            } catch (e) {
                console.error('getTempFileURL 失败:', e)
            }

            // 兜底：CloudBase fileID 通常以 cloud:// 开头
            if (result.fileID.startsWith('cloud://')) {
                return result.fileID
            }

            return result.fileID || ''
        } catch (err) {
            console.error('上传图片失败:', err.message || err)
            return ''
        }
    },

    /**
     * 批量上传图片
     * @param {Array<string>} filePaths - 本地图片路径数组
     * @param {string} dir - 存储目录
     * @returns {Promise<Array<string>>} 云存储 URL 数组
     */
    async uploadImages(filePaths, dir = 'images') {
        if (!filePaths || filePaths.length === 0) return []

        const urls = []
        for (const path of filePaths) {
            const url = await this.uploadImage(path, dir)
            if (url) urls.push(url)
        }
        return urls
    }
}
