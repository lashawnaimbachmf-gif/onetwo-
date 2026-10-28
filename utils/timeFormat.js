/**
 * 时间格式化工具
 */

export default {
    /**
     * 格式化时间显示
     * @param {number|string|Date} time - 时间戳或日期字符串
     * @returns {string} 格式化后的时间字符串
     */
    formatTime(time) {
        if (!time) return ''
        
        const date = new Date(time)
        const now = new Date()
        const diff = now - date
        
        // 2分钟内显示"刚刚"
        if (diff < 2 * 60 * 1000) {
            return '刚刚'
        }
        
        // 1小时内显示"X分钟前"
        if (diff < 60 * 60 * 1000) {
            return Math.floor(diff / (60 * 1000)) + '分钟前'
        }
        
        // 24小时内显示"X小时前"
        if (diff < 24 * 60 * 60 * 1000) {
            return Math.floor(diff / (60 * 60 * 1000)) + '小时前'
        }
        
        // 7天内显示"X天前"
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前'
        }
        
        // 超过7天显示具体日期
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const hour = date.getHours().toString().padStart(2, '0')
        const minute = date.getMinutes().toString().padStart(2, '0')
        
        // 如果是今年，不显示年份
        if (year === now.getFullYear()) {
            return `${month}-${day} ${hour}:${minute}`
        }
        
        return `${year}-${month}-${day} ${hour}:${minute}`
    },
    
    /**
     * 格式化日期（用于显示具体日期）
     * @param {number|string|Date} time - 时间戳或日期字符串
     * @returns {string} 格式化后的日期字符串
     */
    formatDate(time) {
        if (!time) return ''
        
        const date = new Date(time)
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        
        return `${year}-${month}-${day}`
    }
}
