const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 云函数上传文件
 *
 * 客户端将文件转为 base64 后通过 callFunction 传递，
 * 云函数在服务端完成云存储上传，避免客户端的 uploadFile 域名白名单问题。
 *
 * @param {string} base64 - 文件 base64 编码内容
 * @param {string} cloudPath - 云存储目标路径（如 images/xxx.jpg）
 * @returns {{ code: number, fileID?: string, url?: string, message?: string }}
 */
exports.main = async (event, context) => {
    const { base64, cloudPath } = event

    if (!base64 || !cloudPath) {
        return { code: -1, message: '缺少参数 base64 或 cloudPath' }
    }

    // base64 大小安全阀：超过 8MB 拒绝（编码前约 6MB 图片）
    if (base64.length > 8 * 1024 * 1024) {
        return { code: -1, message: '图片过大，请选择更小的图片' }
    }

    try {
        // 解码 base64 → Buffer，直接作为 fileContent 上传
        const buffer = Buffer.from(base64, 'base64')

        const result = await cloud.uploadFile({
            cloudPath,
            fileContent: buffer
        })

        if (!result || !result.fileID) {
            return { code: -1, message: '上传失败：未获取到 fileID' }
        }

        // 获取可访问的临时 URL
        let url = ''
        try {
            const urlResult = await cloud.getTempFileURL({
                fileList: [result.fileID]
            })
            if (urlResult.fileList && urlResult.fileList[0] && urlResult.fileList[0].tempFileURL) {
                url = urlResult.fileList[0].tempFileURL
            }
        } catch (e) {
            console.error('getTempFileURL 失败:', e)
        }

        // 兜底：CloudBase fileID 通常是 cloud:// 格式
        if (!url && result.fileID.startsWith('cloud://')) {
            url = result.fileID
        }

        return { code: 0, fileID: result.fileID, url }
    } catch (err) {
        console.error('云函数上传文件失败:', err)
        return { code: -1, message: err.message || '上传失败' }
    }
}
