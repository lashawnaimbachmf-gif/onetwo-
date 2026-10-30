<template>
    <view class="album-page">
        <nav-back v-if="!currentAlbum" />

        <!-- 相册列表视图 -->
        <view v-if="!currentAlbum">
            <view class="header">
                <text class="title">云相册</text>
            </view>

            <view v-if="albums.length === 0" class="empty-tip">
                <image class="empty-icon" src="/static/icons/icon-image.png" mode="aspectFit" />
                <text class="empty-text">还没有相册</text>
                <text class="empty-sub">点击下方按钮创建第一个相册吧</text>
            </view>

            <view class="album-grid" v-else>
                <view
                    class="album-card"
                    v-for="(album, index) in albums"
                    :key="album._id || index"
                    @click="openAlbum(index)"
                >
                    <view class="album-cover">
                        <image v-if="album.coverUrl" class="cover-img" :src="album.coverUrl" mode="aspectFill" />
                        <image v-else class="cover-placeholder" src="/static/icons/icon-image.png" mode="aspectFit" />
                    </view>
                    <view class="album-info">
                        <text class="album-name">{{ album.name }}</text>
                        <text class="album-count">{{ album.photoCount || 0 }} 张</text>
                    </view>
                </view>
            </view>

            <view class="bottom-bar">
                <button class="create-album-btn" @click="showCreateAlbum">+ 新建相册</button>
            </view>
        </view>

        <!-- 相册详情视图 -->
        <view v-else class="album-detail">
            <view class="detail-header">
                <view class="back-btn" @click="closeAlbum">
                    <view class="back-arrow"></view>
                </view>
                <text class="detail-title">{{ currentAlbum.name }}</text>
                <view class="header-action" @click="manageAlbum(currentAlbum)">
                    <text class="action-dots">•••</text>
                </view>
            </view>

            <view v-if="photos.length === 0 && !selecting" class="empty-tip">
                <image class="empty-icon" src="/static/icons/icon-camera.png" mode="aspectFit" />
                <text class="empty-text">相册还是空的</text>
                <text class="empty-sub">点击下方按钮上传照片吧</text>
            </view>

            <view class="photo-grid" v-else>
                <view
                    class="photo-item"
                    v-for="(photo, index) in photos"
                    :key="photo._id || index"
                    @click="selecting ? toggleSelect(index) : previewPhoto(index)"
                    @longpress="enterSelectMode(index)"
                >
                    <image class="photo-img" :src="photo.url" mode="aspectFill" />
                    <view v-if="selecting" :class="['select-overlay', photo.selected ? 'selected' : '']">
                        <view v-if="photo.selected" class="select-check">✓</view>
                    </view>
                </view>
            </view>

            <view v-if="selecting" class="select-bar">
                <text class="select-count">已选 {{ selectedCount }} 张</text>
                <button class="delete-photos-btn" @click="deleteSelected" :disabled="selectedCount === 0">删除选中</button>
                <button class="cancel-select-btn" @click="selecting = false">取消</button>
            </view>

            <view v-else class="bottom-bar">
                <button class="upload-btn" @click="uploadPhotos">
                    <image class="upload-icon" src="/static/icons/icon-camera.png" mode="aspectFit" />
                    <text>上传照片</text>
                </button>
            </view>
        </view>
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import { requireLogin } from '@/utils/auth.js'
import CloudData from '@/utils/cloudData.js'
import UploadUtil from '@/utils/upload.js'
import NavBack from '@/components/NavBack.vue'

export default {
    components: { NavBack },
    data() {
        return {
            albums: [],
            currentAlbum: null,
            photos: [],
            selecting: false,
            selectedPhotos: {}
        }
    },
    computed: {
        selectedCount() {
            return Object.values(this.selectedPhotos).filter(Boolean).length
        }
    },
    onLoad() {
        this.loadAlbums()
    },
    methods: {
        async loadAlbums() {
            const openids = UserManager.getCoupleOpenids()
            const list = await CloudData.getPhotoAlbums(openids)
            // 为每个相册加载第一张照片作为封面 + 照片计数
            for (const album of list) {
                const photos = await CloudData.getAlbumPhotos(album._id || album.id)
                album.photoCount = photos.length
                album.coverUrl = photos.length > 0 ? photos[0].url : ''
            }
            this.albums = list.map(item => ({
                ...item,
                id: item._id || item.id
            }))
        },
        async loadPhotos() {
            if (!this.currentAlbum) return
            const albumId = this.currentAlbum._id || this.currentAlbum.id
            this.photos = await CloudData.getAlbumPhotos(albumId)
            this.photos.forEach(p => { p.selected = false })
            this.selectedPhotos = {}
        },
        showCreateAlbum() {
            if (!requireLogin()) return
            uni.showModal({
                title: '新建相册',
                editable: true,
                placeholderText: '输入相册名称',
                success: async (res) => {
                    if (res.confirm && res.content.trim()) {
                        uni.showLoading({ title: '创建中...' })
                        const userInfo = UserManager.getUserInfo()
                        await CloudData.addPhotoAlbum({
                            name: res.content.trim(),
                            creatorOpenid: userInfo.openid || ''
                        })
                        uni.hideLoading()
                        uni.showToast({ title: '相册已创建', icon: 'success' })
                        await this.loadAlbums()
                    }
                }
            })
        },
        async openAlbum(index) {
            const album = this.albums[index]
            if (!album) return
            uni.showToast({ title: '打开: ' + album.name, icon: 'none', duration: 1500 })
            this.currentAlbum = album
            this.selecting = false
            this.selectedPhotos = {}
            try {
                await this.loadPhotos()
            } catch (e) {
                console.error('加载照片失败:', e)
            }
        },
        closeAlbum() {
            this.currentAlbum = null
            this.selecting = false
            this.selectedPhotos = {}
            this.loadAlbums()
        },
        manageAlbum(album) {
            if (!requireLogin()) return
            uni.showActionSheet({
                itemList: ['重命名', '删除相册'],
                success: async (res) => {
                    if (res.tapIndex === 0) {
                        // 重命名
                        uni.showModal({
                            title: '重命名',
                            editable: true,
                            placeholderText: '输入新名称',
                            content: album.name,
                            success: async (r) => {
                                if (r.confirm && r.content.trim()) {
                                    await CloudData.updatePhotoAlbum(album._id || album.id, {
                                        name: r.content.trim()
                                    })
                                    uni.showToast({ title: '已重命名', icon: 'success' })
                                    await this.loadAlbums()
                                }
                            }
                        })
                    } else if (res.tapIndex === 1) {
                        // 删除相册
                        uni.showModal({
                            title: '删除相册',
                            content: '确定删除「' + album.name + '」？',
                            confirmText: '删除',
                            confirmColor: '#FF3B30',
                            success: async (r) => {
                                if (r.confirm) {
                                    uni.showLoading({ title: '删除中...' })
                                    // 先删除相册内的照片
                                    const photos = await CloudData.getAlbumPhotos(album._id || album.id)
                                    if (photos.length > 0) {
                                        await CloudData.deleteAlbumPhotos(photos.map(p => p._id || p.id))
                                    }
                                    await CloudData.deletePhotoAlbum(album._id || album.id)
                                    uni.hideLoading()
                                    uni.showToast({ title: '已删除', icon: 'success' })
                                    await this.loadAlbums()
                                }
                            }
                        })
                    }
                }
            })
        },
        uploadPhotos() {
            if (!requireLogin()) return
            uni.chooseImage({
                count: 9,
                sizeType: ['compressed'],
                sourceType: ['album', 'camera'],
                success: async (res) => {
                    uni.showLoading({ title: '上传中...' })
                    const albumId = this.currentAlbum._id || this.currentAlbum.id
                    const userInfo = UserManager.getUserInfo()
                    let successCount = 0
                    for (const tempPath of res.tempFilePaths) {
                        const cloudUrl = await UploadUtil.uploadImage(tempPath, 'album')
                        if (cloudUrl) {
                            const addRes = await CloudData.addAlbumPhoto({
                                url: cloudUrl,
                                albumId: albumId,
                                creatorOpenid: userInfo.openid || ''
                            })
                            if (addRes.success) successCount++
                        }
                    }
                    uni.hideLoading()
                    if (successCount > 0) {
                        uni.showToast({ title: `成功上传 ${successCount} 张`, icon: 'success' })
                    } else {
                        uni.showToast({ title: '上传失败，请重试', icon: 'none' })
                    }
                    await this.loadPhotos()
                }
            })
        },
        previewPhoto(index) {
            uni.previewImage({
                current: index,
                urls: this.photos.map(p => p.url)
            })
        },
        enterSelectMode(index) {
            this.selecting = true
            this.$set(this.selectedPhotos, index, true)
            this.photos[index].selected = true
        },
        toggleSelect(index) {
            this.photos[index].selected = !this.photos[index].selected
            this.$set(this.selectedPhotos, index, this.photos[index].selected)
        },
        async deleteSelected() {
            const toDelete = this.photos
                .map((p, i) => ({ ...p, _index: i }))
                .filter(p => p.selected)
            if (toDelete.length === 0) return

            uni.showModal({
                title: '删除照片',
                content: `确定删除 ${toDelete.length} 张照片？`,
                confirmText: '删除',
                confirmColor: '#FF3B30',
                success: async (res) => {
                    if (res.confirm) {
                        uni.showLoading({ title: '删除中...' })
                        await CloudData.deleteAlbumPhotos(toDelete.map(p => p._id || p.id))
                        uni.hideLoading()
                        uni.showToast({ title: '已删除', icon: 'success' })
                        this.selecting = false
                        this.selectedPhotos = {}
                        await this.loadPhotos()
                    }
                }
            })
        }
    }
}
</script>

<style scoped>
.album-page {
    background: linear-gradient(180deg, #FFF0F5 0%, #FFFFFF 100%);
    min-height: 100vh;
}

/* ── Header ────────────────────────────────────── */
.header {
    padding: calc(var(--status-bar-height) + 28rpx) 32rpx 20rpx;
    text-align: center;
}

.title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1A1A1A;
}

/* ── Empty ─────────────────────────────────────── */
.empty-tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 120rpx 32rpx;
}

.empty-icon {
    width: 100rpx;
    height: 100rpx;
    margin-bottom: 24rpx;
    opacity: 0.4;
}

.empty-text {
    font-size: 28rpx;
    color: #999999;
    margin-bottom: 10rpx;
}

.empty-sub {
    font-size: 24rpx;
    color: #FF6B9D;
}

/* ── Album Grid ────────────────────────────────── */
.album-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16rpx;
    padding: 24rpx 28rpx;
}

.album-card {
    background: #FFFFFF;
    border-radius: 28rpx;
    overflow: hidden;
    box-shadow: 0 8rpx 40rpx rgba(255, 107, 157, 0.05), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
    transition: transform 0.30s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.30s ease;
}

.album-card-hover {
    transform: scale(0.96);
    box-shadow: 0 4rpx 20rpx rgba(255, 107, 157, 0.1), 0 1rpx 6rpx rgba(0, 0, 0, 0.04);
}

.album-cover {
    width: 100%;
    aspect-ratio: 1;
    background: #F7F8FA;
}

.cover-img {
    width: 100%;
    height: 100%;
}

.cover-placeholder {
    width: 60rpx;
    height: 60rpx;
    margin: 50% auto;
    transform: translateY(-50%);
    opacity: 0.3;
}

.album-info {
    padding: 20rpx;
}

.album-name {
    font-size: 28rpx;
    font-weight: 600;
    color: #1A1A1A;
    display: block;
    margin-bottom: 4rpx;
}

.album-count {
    font-size: 22rpx;
    color: #999999;
}

/* ── Album Detail ──────────────────────────────── */
.album-detail {
    min-height: 100vh;
    background: linear-gradient(180deg, #FFF0F5 0%, #FFFFFF 100%);
    display: flex;
    flex-direction: column;
    padding-bottom: calc(env(safe-area-inset-bottom, 0) + 20rpx);
}

/* ── Detail Header ─────────────────────────────── */
.detail-header {
    display: flex;
    align-items: center;
    padding: calc(var(--status-bar-height) + 16rpx) 24rpx 16rpx;
    background: #FFFFFF;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.back-btn {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.25s ease;
}

.back-btn:active {
    background: rgba(255, 107, 157, 0.08);
}

.back-arrow {
    box-sizing: border-box;
    position: relative;
    /* 旋转后箭头视觉重心偏左，右移补正，使其在圆形按钮内居中 */
    left: 5rpx;
    width: 18rpx;
    height: 18rpx;
    border-left: 4rpx solid #FF6B9D;
    border-bottom: 4rpx solid #FF6B9D;
    transform: rotate(45deg);
}

.detail-title {
    flex: 1;
    font-size: 34rpx;
    font-weight: 700;
    color: #1A1A1A;
    text-align: center;
    letter-spacing: 1rpx;
}

.header-action {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-dots {
    font-size: 32rpx;
    color: #666666;
    letter-spacing: 4rpx;
}

/* ── Detail Empty ──────────────────────────────── */
.album-detail .empty-tip {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60rpx 32rpx;
}

/* ── Photo Grid ────────────────────────────────── */
.photo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6rpx;
    padding: 6rpx;
    flex: 1;
}

.photo-item {
    position: relative;
    aspect-ratio: 1;
    border-radius: 12rpx;
    overflow: hidden;
    background: #F7F8FA;
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.photo-item:active {
    transform: scale(0.97);
}

.photo-img {
    width: 100%;
    height: 100%;
}

.select-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.1);
}

.select-overlay.selected {
    background: rgba(255, 107, 157, 0.2);
}

.select-check {
    position: absolute;
    top: 10rpx;
    right: 10rpx;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: #FF6B9D;
    color: #FFFFFF;
    font-size: 22rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    box-shadow: 0 2rpx 8rpx rgba(255, 107, 157, 0.3);
}

/* ── Bottom Bar ────────────────────────────────── */
.bottom-bar {
    padding: 28rpx 32rpx;
    padding-bottom: calc(28rpx + env(safe-area-inset-bottom, 0));
    flex-shrink: 0;
}

.album-detail .bottom-bar {
    margin-top: auto;
}

.create-album-btn,
.upload-btn {
    width: 100%;
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    color: #FFFFFF;
    font-size: 30rpx;
    font-weight: 600;
    padding: 28rpx;
    border-radius: 56rpx;
    border: none;
    box-shadow: 0 12rpx 40rpx rgba(255, 107, 157, 0.24), 0 4rpx 16rpx rgba(255, 107, 157, 0.12);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.create-album-btn:active,
.upload-btn:active {
    opacity: 0.92;
    transform: scale(0.97);
    box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.2);
}

.upload-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
}

.upload-icon {
    width: 36rpx;
    height: 36rpx;
}

/* ── Select Bar ────────────────────────────────── */
.select-bar {
    display: flex;
    align-items: center;
    padding: 20rpx 32rpx;
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom, 0));
    background: #FFFFFF;
    box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.04);
    gap: 16rpx;
    flex-shrink: 0;
}

.select-count {
    flex: 1;
    font-size: 28rpx;
    color: #1A1A1A;
    font-weight: 500;
}

.delete-photos-btn {
    background: #FF3B30;
    color: #FFFFFF;
    font-size: 26rpx;
    padding: 16rpx 32rpx;
    border-radius: 32rpx;
    border: none;
    opacity: 1;
}

.delete-photos-btn[disabled] {
    opacity: 0.4;
}

.cancel-select-btn {
    background: #F7F8FA;
    color: #666666;
    font-size: 26rpx;
    padding: 16rpx 28rpx;
    border-radius: 32rpx;
    border: none;
}
</style>
