/**
 * 云存储上传工具
 * 用于上传图片到uniCloud云存储
 */

import uniCloud from '@/utils/cloud.js'

export default {
    /**
     * 上传图片到云存储
     * @param {string} filePath - 本地图片路径
     * @param {string} dir - 存储目录（可选）
     * @returns {Promise<string>} 云存储URL
     */
    async uploadImage(filePath, dir = 'images') {
        if (!filePath) return ''
        
        // 如果是网络图片，直接返回
        if (filePath.startsWith('http')) {
            return filePath
        }
        
        try {
            uni.showLoading({ title: '上传中...' })
            
            // 生成文件名
            const ext = filePath.split('.').pop() || 'jpg'
            const fileName = `${dir}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`
            
            // 上传到云存储
            const result = await uniCloud.uploadFile({
                filePath: filePath,
                cloudPath: fileName
            })
            
            uni.hideLoading()
            
            if (result.fileID) {
                // 获取临时URL
                const urlResult = await uniCloud.getTempFileURL({
                    fileList: [result.fileID]
                })
                
                if (urlResult.fileList && urlResult.fileList[0] && urlResult.fileList[0].tempFileURL) {
                    return urlResult.fileList[0].tempFileURL
                }
                return result.fileID
            }
            
            throw new Error('上传失败')
        } catch (err) {
            uni.hideLoading()
            console.error('上传图片失败:', err)
            uni.showToast({ title: '图片上传失败', icon: 'none' })
            return ''
        }
    },

    /**
     * 批量上传图片
     * @param {Array<string>} filePaths - 本地图片路径数组
     * @param {string} dir - 存储目录
     * @returns {Promise<Array<string>>} 云存储URL数组
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
