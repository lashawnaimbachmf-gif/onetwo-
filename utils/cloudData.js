import cloud from '@/utils/cloud.js'

/**
 * 云端数据管理模块
 * 基于腾讯云 CloudBase 数据库封装，含本地缓存减少云函数调用
 */

import UserManager from '@/utils/user.js'

// 缓存 TTL 按数据变化频率分级（毫秒）
const CACHE_TTL = {
    default: 60 * 1000,          // 默认 1 分钟
    couple_status: 60 * 1000,    // 状态数据 1 分钟
    order: 60 * 1000,            // 订单数据 1 分钟
    // 以下为变化频率低的数据，延长缓存减少云函数调用
    anniversary:  10 * 60 * 1000,  // 纪念日 10 分钟
    dish:         10 * 60 * 1000,  // 菜品 10 分钟
    capsule:       5 * 60 * 1000,  // 胶囊 5 分钟
    sticky_notes:  5 * 60 * 1000,  // 便利贴 5 分钟
    period_records: 5 * 60 * 1000,  // 姨妈记录 5 分钟
    photo_albums:  5 * 60 * 1000,  // 相册 5 分钟
    album_photos:  5 * 60 * 1000,  // 相册照片 5 分钟
    users:         5 * 60 * 1000   // 用户信息 5 分钟
}

function _getCacheTTL(collection) {
    return CACHE_TTL[collection] || CACHE_TTL.default
}

const CloudData = {
    _cache: {},

    async callDataService(action, collection, params = {}) {
        try {
            console.log('[DEBUG] wx.cloud 存在?', typeof wx.cloud, 'env=', wx.cloud ? cloud.env : 'n/a')
            const res = await cloud.callFunction({
                name: 'dataService',
                data: { action, collection, openid: UserManager.getOpenid(), ...params }
            })
            console.log('[DEBUG] dataService 响应:', JSON.stringify(res))
            if (res.result && res.result.code === 0) {
                return { success: true, data: res.result.data }
            } else {
                const msg = res.result ? res.result.message : '服务异常'
                return { success: false, message: msg }
            }
        } catch (err) {
            console.log('[DEBUG] dataService 异常:', err.errMsg || err.message, JSON.stringify(err))
            let errorMsg = '网络请求失败'
            if (err.message && err.message.includes('not found')) {
                errorMsg = '云函数未部署，请到 CloudBase 控制台上传'
            } else if (err.message) {
                errorMsg = err.message
            }
            return { success: false, message: errorMsg }
        }
    },

    _cacheKey(collection, openids) {
        if (openids === undefined) return `${collection}__all`
        return `${collection}_${(openids || []).sort().join(',')}`
    },

    _getCache(key, collection) {
        const entry = this._cache[key]
        if (!entry) return null
        if (Date.now() - entry.timestamp > _getCacheTTL(collection)) {
            delete this._cache[key]
            return null
        }
        return entry.data
    },

    _setCache(key, data) {
        this._cache[key] = { data, timestamp: Date.now() }
    },

    _invalidateCache(collection) {
        Object.keys(this._cache).forEach(key => {
            if (key.startsWith(collection)) delete this._cache[key]
        })
    },

    getCountdown(dateStr) {
        const target = new Date(dateStr)
        const now = new Date()
        const diff = target - now
        if (diff < 0) return Math.floor(-diff / (1000 * 60 * 60 * 24))
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
    },

    async getAnniversaries(openids) {
        const key = this._cacheKey('anniversary', openids)
        const cached = this._getCache(key, 'anniversary')
        if (cached) return cached
        const result = await this.callDataService('get', 'anniversary', { openids })
        if (result.success) {
            const data = result.data.map(item => ({ ...item, countdown: this.getCountdown(item.date) }))
            this._setCache(key, data)
            return data
        }
        return []
    },

    async addAnniversary(data) {
        this._invalidateCache('anniversary')
        return await this.callDataService('add', 'anniversary', { data })
    },

    async updateAnniversary(id, data) {
        this._invalidateCache('anniversary')
        return await this.callDataService('update', 'anniversary', { id, data })
    },

    async deleteAnniversary(id) {
        this._invalidateCache('anniversary')
        return await this.callDataService('delete', 'anniversary', { id })
    },

    async getCapsules(openids) {
        const key = this._cacheKey('capsule', openids)
        const cached = this._getCache(key, 'capsule')
        if (cached) return cached
        const result = await this.callDataService('get', 'capsule', { openids })
        if (result.success) {
            this._setCache(key, result.data)
            return result.data
        }
        return []
    },

    async addCapsule(data) {
        this._invalidateCache('capsule')
        return await this.callDataService('add', 'capsule', { data })
    },

    async updateCapsule(id, data) {
        this._invalidateCache('capsule')
        return await this.callDataService('update', 'capsule', { id, data })
    },

    async getDishes(openids) {
        const key = this._cacheKey('dish', openids)
        const cached = this._getCache(key, 'dish')
        if (cached) return cached
        const result = await this.callDataService('get', 'dish', { openids })
        if (result.success) {
            this._setCache(key, result.data)
            return result.data
        }
        return []
    },

    async addDish(data) {
        this._invalidateCache('dish')
        return await this.callDataService('add', 'dish', { data })
    },

    async updateDish(id, data) {
        this._invalidateCache('dish')
        return await this.callDataService('update', 'dish', { id, data })
    },

    async deleteDish(id) {
        this._invalidateCache('dish')
        return await this.callDataService('delete', 'dish', { id })
    },

    async getOrders(openids) {
        const key = this._cacheKey('order', openids)
        const cached = this._getCache(key, 'order')
        if (cached) return cached
        const result = await this.callDataService('get', 'order', { openids })
        if (result.success) {
            this._setCache(key, result.data)
            return result.data
        }
        return []
    },

    async addOrder(data) {
        this._invalidateCache('order')
        return await this.callDataService('add', 'order', { data })
    },

    async updateOrder(id, data) {
        this._invalidateCache('order')
        return await this.callDataService('update', 'order', { id, data })
    },

    async getStickyNotes(openids) {
        const key = this._cacheKey('sticky_notes', openids)
        const cached = this._getCache(key, 'sticky_notes')
        if (cached) return cached
        const result = await this.callDataService('get', 'sticky_notes', { openids })
        if (result.success) {
            this._setCache(key, result.data)
            return result.data
        }
        return []
    },

    async addStickyNote(data) {
        this._invalidateCache('sticky_notes')
        return await this.callDataService('add', 'sticky_notes', { data })
    },

    async updateStickyNote(id, data) {
        this._invalidateCache('sticky_notes')
        return await this.callDataService('update', 'sticky_notes', { id, data })
    },

    async deleteStickyNote(id) {
        this._invalidateCache('sticky_notes')
        return await this.callDataService('delete', 'sticky_notes', { id })
    },

    async getPeriodRecords(openids) {
        const key = this._cacheKey('period_records', openids)
        const cached = this._getCache(key, 'period_records')
        if (cached) return cached
        const result = await this.callDataService('get', 'period_records', { openids })
        if (result.success) {
            this._setCache(key, result.data)
            return result.data
        }
        return []
    },

    async addPeriodRecord(data) {
        this._invalidateCache('period_records')
        return await this.callDataService('add', 'period_records', { data })
    },

    async updatePeriodRecord(id, data) {
        this._invalidateCache('period_records')
        return await this.callDataService('update', 'period_records', { id, data })
    },

    async deletePeriodRecord(id) {
        this._invalidateCache('period_records')
        return await this.callDataService('delete', 'period_records', { id })
    },

    async getPhotoAlbums(openids) {
        const key = this._cacheKey('photo_albums', openids)
        const cached = this._getCache(key, 'photo_albums')
        if (cached) return cached
        const result = await this.callDataService('get', 'photo_albums', { openids })
        if (result.success) {
            this._setCache(key, result.data)
            return result.data
        }
        return []
    },

    async addPhotoAlbum(data) {
        this._invalidateCache('photo_albums')
        return await this.callDataService('add', 'photo_albums', { data })
    },

    async updatePhotoAlbum(id, data) {
        this._invalidateCache('photo_albums')
        return await this.callDataService('update', 'photo_albums', { id, data })
    },

    async deletePhotoAlbum(id) {
        this._invalidateCache('photo_albums')
        return await this.callDataService('delete', 'photo_albums', { id })
    },

    async getAlbumPhotos(albumId) {
        const key = this._cacheKey('album_photos', [albumId])
        const cached = this._getCache(key, 'album_photos')
        if (cached) return cached
        const result = await this.callDataService('get', 'album_photos', { where: { albumId } })
        if (result.success) {
            this._setCache(key, result.data)
            return result.data
        }
        return []
    },

    async addAlbumPhoto(data) {
        this._invalidateCache('album_photos')
        return await this.callDataService('add', 'album_photos', { data })
    },

    async deleteAlbumPhotos(ids) {
        this._invalidateCache('album_photos')
        let allOk = true
        for (const id of ids) {
            const result = await this.callDataService('delete', 'album_photos', { id })
            if (!result.success) allOk = false
        }
        return allOk
    },

    // ── Couple Status ────────────────────────────────
    async getCoupleStatus(coupleId) {
        const key = this._cacheKey('couple_status', [coupleId])
        const cached = this._getCache(key, 'couple_status')
        if (cached) return cached
        const result = await this.callDataService('get', 'couple_status', { where: { coupleId } })
        if (result.success && result.data && result.data.length > 0) {
            const data = result.data[0]
            this._setCache(key, data)
            return data
        }
        // 返回默认结构
        return null
    },

    getTodayStr() {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },

    async updateCoupleStatus(coupleId, data) {
        this._invalidateCache('couple_status')
        // 先查是否存在
        const existing = await this.callDataService('get', 'couple_status', { where: { coupleId } })
        if (existing.success && existing.data && existing.data.length > 0) {
            return await this.callDataService('update', 'couple_status', { id: existing.data[0]._id, data })
        } else {
            return await this.callDataService('add', 'couple_status', { data: { coupleId, ...data } })
        }
    }
}

export default CloudData