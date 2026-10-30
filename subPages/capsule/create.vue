<template>
    <view class="create-page">
        <nav-back />

        <!-- Header -->
        <view class="header">
            <text class="page-title">写情书</text>
            <text class="page-sub">把想说的话，封印进时光胶囊</text>
        </view>

        <!-- 类型选择 -->
        <view class="form-card">
            <text class="form-label">选择类型</text>
            <view class="type-row">
                <view :class="['type-item', type === 'text' ? 'active' : '']" @click="selectType('text')">
                    <view class="type-icon-circle">
                        <image class="type-icon-img" src="/static/icons/icon-text.png" mode="aspectFit" />
                    </view>
                    <text class="type-text">文字</text>
                </view>
                <view :class="['type-item', type === 'voice' ? 'active' : '']" @click="selectType('voice')">
                    <view class="type-icon-circle">
                        <image class="type-icon-img" src="/static/icons/icon-voice.png" mode="aspectFit" />
                    </view>
                    <text class="type-text">语音</text>
                </view>
                <view :class="['type-item', type === 'image' ? 'active' : '']" @click="selectType('image')">
                    <view class="type-icon-circle">
                        <image class="type-icon-img" src="/static/icons/icon-image.png" mode="aspectFit" />
                    </view>
                    <text class="type-text">图片</text>
                </view>
            </view>
        </view>

        <!-- 标题 -->
        <view class="form-card">
            <text class="form-label">胶囊标题</text>
            <input class="input" v-model="title" placeholder="给这封情书起个名字…" placeholder-class="input-ph" />
        </view>

        <!-- 文字内容 -->
        <view class="form-card" v-if="type === 'text'">
            <text class="form-label">情书内容</text>
            <textarea class="textarea" v-model="content" placeholder="写下你想对TA说的话…" placeholder-class="input-ph" />
        </view>

        <!-- 语音录制 -->
        <view class="form-card" v-if="type === 'voice'">
            <text class="form-label">录制语音</text>
            <!-- 未录制状态 -->
            <view v-if="!voice_url" class="voice-recorder" @touchstart="startRecord" @touchend="stopRecord" @touchcancel="stopRecord">
                <view :class="['record-ring', recording ? 'pulsing' : '']">
                    <view class="record-inner">
                        <image class="mic-icon" src="/static/icons/icon-voice.png" mode="aspectFit" />
                    </view>
                </view>
                <text class="record-hint">{{ recording ? '松开结束录制' : '按住录制语音' }}</text>
                <text class="record-time" v-if="recordTime > 0">{{ recordTime }}s / 最长60秒</text>
            </view>
            <!-- 已录制状态 -->
            <view v-if="voice_url" :class="['voice-preview', isPlaying ? 'playing' : '']">
                <view class="voice-preview-left">
                    <view class="voice-dot"></view>
                    <view class="voice-info">
                        <text class="voice-tag">已录制 {{ recordTime }}秒</text>
                        <view class="voice-wave">
                            <view v-for="i in 7" :key="i" class="wave-bar" :style="{ animationDelay: (i * 0.12) + 's' }"></view>
                        </view>
                    </view>
                </view>
                <view class="voice-actions">
                    <view class="voice-play" @click="playPreviewVoice">
                        <image class="play-icon" :src="isPlaying ? '/static/icons/icon-pause.png' : '/static/icons/icon-play.png'" mode="aspectFit" />
                    </view>
                    <view class="voice-delete" @click="deleteVoice">
                        <text>删除</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 图片选择 -->
        <view class="form-card" v-if="type === 'image'">
            <text class="form-label">选择图片</text>
            <view v-if="!image_url" class="image-uploader" @click="chooseImage">
                <view class="upload-zone">
                    <image class="upload-icon-img" src="/static/icons/icon-upload.png" mode="aspectFit" />
                    <text class="upload-text">点击选择图片</text>
                    <text class="upload-hint">支持 JPG、PNG 格式</text>
                </view>
            </view>
            <view v-else class="image-preview-area">
                <image class="preview-image" :src="image_url" mode="aspectFill" />
                <view class="image-overlay">
                    <view class="overlay-btn" @click="chooseImage">
                        <text>重新选择</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 开启时间 -->
        <view class="form-card">
            <text class="form-label">开启时间</text>
            <picker mode="date" :value="open_time" @change="onDateChange">
                <view class="date-picker">
                    <image class="date-icon" src="/static/icons/icon-calendar.png" mode="aspectFit" />
                    <text :class="['date-text', open_time ? '' : 'placeholder']">{{ open_time || '选择开启日期' }}</text>
                    <text class="date-arrow">›</text>
                </view>
            </picker>
        </view>

        <!-- 提交按钮 -->
        <view class="submit-area">
            <button class="submit-btn" @click="submit">
                <image class="submit-icon" src="/static/icons/icon-envelope.png" mode="aspectFit" />
                <text>封印胶囊</text>
            </button>
            <text class="submit-hint">胶囊将在指定日期自动开启</text>
        </view>
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'
import UploadUtil from '@/utils/upload.js'
import NavBack from '@/components/NavBack.vue'

export default {
    components: { NavBack },
    data() {
        return {
            title: '',
            type: 'text',
            content: '',
            open_time: '',
            recording: false,
            recordTime: 0,
            voice_url: '',
            image_url: '',
            color: '',
            isPlaying: false,
            recorderManager: null,
            audioContext: null,
            userInfo: {}
        }
    },
    onLoad() {
        this.userInfo = UserManager.getUserInfo()
    },
    created() {
        this.color = this.getRandomColor()
        this.initRecorder()
    },
    onUnload() {
        if (this.recorderManager) {
            this.recorderManager.stop()
        }
        if (this.audioContext) {
            this.audioContext.stop()
        }
    },
    methods: {
        initRecorder() {
            this.recorderManager = uni.getRecorderManager()

            this.recorderManager.onStart(() => {
                // recording started
            })

            this.recorderManager.onStop((res) => {
                if (res.duration > 0) {
                    this.voice_url = res.tempFilePath
                    this.recordTime = Math.ceil(res.duration / 1000)
                    uni.showToast({ title: '录音完成！', icon: 'success' })
                }
                this.recording = false
            })

            this.recorderManager.onError((err) => {
                console.error('录音错误:', err)
                this.recording = false
                uni.showToast({ title: '录音失败，请重试', icon: 'none' })
            })
        },
        selectType(type) {
            this.type = type
        },
        onDateChange(e) {
            this.open_time = e.detail.value
        },
        startRecord() {
            if (this.recording) return

            this.recording = true
            this.recordTime = 0

            this.recorderManager.start({
                format: 'mp3',
                duration: 60000,
                sampleRate: 44100,
                numberOfChannels: 1,
                encodeBitRate: 128000
            })
        },
        stopRecord() {
            if (!this.recording) return
            this.recorderManager.stop()
        },
        playPreviewVoice() {
            if (this.isPlaying) {
                this.audioContext.stop()
                this.isPlaying = false
                return
            }

            if (!this.voice_url) {
                uni.showToast({ title: '请先录制语音', icon: 'none' })
                return
            }

            this.isPlaying = true

            this.audioContext = uni.createInnerAudioContext()
            this.audioContext.src = this.voice_url

            this.audioContext.onPlay(() => {
                // playing
            })

            this.audioContext.onEnded(() => {
                this.isPlaying = false
            })

            this.audioContext.onError((err) => {
                this.isPlaying = false
                console.error('播放错误:', err)
                uni.showToast({ title: '播放失败', icon: 'none' })
            })

            this.audioContext.play()
        },
        deleteVoice() {
            uni.showModal({
                title: '提示',
                content: '确定删除这段录音吗？',
                success: (res) => {
                    if (res.confirm) {
                        this.voice_url = ''
                        this.recordTime = 0
                        if (this.audioContext) {
                            this.audioContext.stop()
                            this.isPlaying = false
                        }
                    }
                }
            })
        },
        chooseImage() {
            uni.chooseImage({
                count: 1,
                sizeType: ['compressed'],
                sourceType: ['album', 'camera'],
                success: (res) => {
                    this.image_url = res.tempFilePaths[0]
                }
            })
        },
        async submit() {
            // 检查登录状态
            if (!UserManager.getToken() || !UserManager.getOpenid()) {
                uni.showModal({
                    title: '提示',
                    content: '请先登录后再封印胶囊～',
                    confirmText: '去登录',
                    success: (res) => {
                        if (res.confirm) {
                            uni.navigateTo({ url: '/subPages/login/login' })
                        }
                    }
                })
                return
            }

            if (!this.title) {
                uni.showToast({ title: '请填写胶囊标题', icon: 'none' })
                return
            }
            if (!this.open_time) {
                uni.showToast({ title: '请选择开启时间', icon: 'none' })
                return
            }

            if (this.type === 'text' && !this.content) {
                uni.showToast({ title: '请填写情书内容', icon: 'none' })
                return
            }
            if (this.type === 'voice' && !this.voice_url) {
                uni.showToast({ title: '请先录制语音', icon: 'none' })
                return
            }
            if (this.type === 'image' && !this.image_url) {
                uni.showToast({ title: '请先选择图片', icon: 'none' })
                return
            }

            uni.showLoading({ title: '上传中...' })

            // 上传图片到云存储
            let cloudImageUrl = this.image_url
            if (this.type === 'image' && this.image_url && !UploadUtil.isRemoteUrl(this.image_url)) {
                cloudImageUrl = await UploadUtil.uploadImage(this.image_url, 'capsules')
                if (!cloudImageUrl) {
                    uni.hideLoading()
                    uni.showToast({ title: '图片上传失败，请重试', icon: 'none' })
                    return
                }
            }

            // 上传语音到云存储
            let cloudVoiceUrl = this.voice_url
            if (this.type === 'voice' && this.voice_url && !UploadUtil.isRemoteUrl(this.voice_url)) {
                cloudVoiceUrl = await UploadUtil.uploadImage(this.voice_url, 'voices')
                if (!cloudVoiceUrl) {
                    uni.hideLoading()
                    uni.showToast({ title: '语音上传失败，请重试', icon: 'none' })
                    return
                }
            }

            const newCapsule = {
                title: this.title,
                type: this.type,
                content: this.content,
                voice_url: cloudVoiceUrl,
                image_url: cloudImageUrl,
                open_time: this.open_time,
                is_opened: false,
                color: this.color,
                creatorOpenid: this.userInfo.openid || '',
                creatorName: this.userInfo.nickName || '我'
            }

            const result = await CloudData.addCapsule(newCapsule)
            uni.hideLoading()

            if (result.success) {
                uni.showToast({ title: '胶囊封印成功！', icon: 'success' })
                setTimeout(() => {
                    uni.navigateBack()
                }, 1000)
            } else {
                uni.showToast({ title: result.message, icon: 'none' })
            }
        },
        getRandomColor() {
            const colors = [
                '#FF6B9D',
                'linear-gradient(135deg, #6b9dff, #a8c5ff)',
                'linear-gradient(135deg, #9dff6b, #c5ffa8)',
                'linear-gradient(135deg, #ffd96b, #ffeaa8)',
                'linear-gradient(135deg, #ff6b6b, #ff9da8)'
            ]
            return colors[Math.floor(Math.random() * colors.length)]
        }
    }
}
</script>

<style scoped>
/* ================================================================
   CAPSULE CREATE — Love Letter Form
   ================================================================ */

.create-page {
    background: linear-gradient(180deg, #FFF0F5 0%, #FFFFFF 100%);
    min-height: 100vh;
    padding-bottom: 64rpx;
}

/* ── Header ────────────────────────────────────── */
.header {
    padding: calc(var(--status-bar-height) + 28rpx) 32rpx 8rpx;
    text-align: center;
}

.page-title {
    display: block;
    font-size: 36rpx;
    font-weight: 700;
    color: #1A1A1A;
    margin-bottom: 10rpx;
}

.page-sub {
    font-size: 24rpx;
    color: #999999;
}

/* ── Form Cards ────────────────────────────────── */
.form-card {
    background: #FFFFFF;
    border-radius: 32rpx;
    padding: 32rpx;
    margin: 24rpx 28rpx 0;
    box-shadow: 0 10rpx 48rpx rgba(255, 107, 157, 0.05), 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.form-label {
    display: block;
    font-size: 26rpx;
    font-weight: 600;
    color: #666666;
    margin-bottom: 20rpx;
    letter-spacing: 1rpx;
}

/* ── Input ─────────────────────────────────────── */
.input {
    width: calc(100% - 32rpx);
    height: 88rpx;
    margin: 0 16rpx;
    font-size: 30rpx;
    color: #1A1A1A;
    padding: 0 24rpx;
    background: #F7F8FA;
    border-radius: 16rpx;
    line-height: 88rpx;
    box-sizing: border-box;
}

.input-ph {
    color: #B0B0B0;
}

/* ── Type Selector ─────────────────────────────── */
.type-row {
    display: flex;
    gap: 16rpx;
}

.type-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32rpx 12rpx 24rpx;
    background: #F7F8FA;
    border-radius: 24rpx;
    transition: background 0.35s ease, transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.type-item:active {
    transform: scale(0.96);
}

.type-item.active {
    background: #FFF5F8;
    box-shadow: 0 4rpx 20rpx rgba(255, 107, 157, 0.08);
}

.type-icon-circle {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14rpx;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
    transition: background 0.35s ease, box-shadow 0.35s ease;
}

.type-item.active .type-icon-circle {
    background: #FF6B9D;
    box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.2);
}

.type-icon-img {
    width: 36rpx;
    height: 36rpx;
    transition: filter 0.2s ease;
}

.type-item.active .type-icon-img {
    /* Invert for white-on-pink — handled by uniapp natively */
}

.type-text {
    font-size: 26rpx;
    color: #999999;
    font-weight: 500;
    transition: color 0.2s ease;
}

.type-item.active .type-text {
    color: #FF6B9D;
    font-weight: 700;
}

/* ── Textarea ──────────────────────────────────── */
.textarea {
    width: 100%;
    min-height: 320rpx;
    font-size: 28rpx;
    color: #1A1A1A;
    padding: 24rpx 20rpx;
    background: #F7F8FA;
    border-radius: 16rpx;
    line-height: 1.8;
    box-sizing: border-box;
}

/* ── Voice Recorder ────────────────────────────── */
.voice-recorder {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40rpx 0 24rpx;
}

.record-ring {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    background: #F7F8FA;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24rpx;
    position: relative;
    transition: transform 0.15s ease;
}

.record-ring:active {
    transform: scale(0.96);
}

.record-ring::before {
    content: '';
    position: absolute;
    inset: -6rpx;
    border-radius: 50%;
    border: 3rpx dashed #E0E0E0;
    pointer-events: none;
    transition: border-color 0.3s ease;
}

.record-ring.pulsing::before {
    border-color: #FF6B9D;
    border-style: solid;
    animation: ring-expand 1.2s ease-out infinite;
}

@keyframes ring-expand {
    0%   { inset: -6rpx; opacity: 1; }
    100% { inset: -36rpx; opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
    .record-ring.pulsing::before {
        animation: none;
    }
}

.record-inner {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
    z-index: 1;
    transition: background 0.2s ease;
}

.record-ring.pulsing .record-inner {
    background: #FF6B9D;
}

.mic-icon {
    width: 56rpx;
    height: 56rpx;
    transition: filter 0.2s ease;
}

.record-hint {
    font-size: 26rpx;
    color: #999999;
    margin-bottom: 8rpx;
}

.record-time {
    font-size: 32rpx;
    color: #FF6B9D;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

/* ── Voice Preview ─────────────────────────────── */
.voice-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 20rpx;
    background: #F7F8FA;
    border-radius: 16rpx;
}

.voice-preview-left {
    display: flex;
    align-items: center;
    gap: 16rpx;
}

.voice-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: #07C160;
    flex-shrink: 0;
}

.voice-info {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.voice-tag {
    font-size: 24rpx;
    color: #07C160;
    font-weight: 600;
}

.voice-wave {
    display: flex;
    align-items: flex-end;
    gap: 4rpx;
    height: 24rpx;
}

.wave-bar {
    width: 4rpx;
    background: #D0D0D0;
    border-radius: 2rpx;
    animation: wave-pulse 0.8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
    animation-play-state: paused;
}

.voice-preview.playing .wave-bar,
.voice-preview:active .wave-bar {
    animation-play-state: running;
}

.wave-bar:nth-child(1) { height: 10rpx; animation-delay: 0s; }
.wave-bar:nth-child(2) { height: 18rpx; animation-delay: 0.06s; }
.wave-bar:nth-child(3) { height: 10rpx; animation-delay: 0.12s; }
.wave-bar:nth-child(4) { height: 24rpx; animation-delay: 0.18s; }
.wave-bar:nth-child(5) { height: 12rpx; animation-delay: 0.24s; }
.wave-bar:nth-child(6) { height: 18rpx; animation-delay: 0.3s; }
.wave-bar:nth-child(7) { height: 8rpx; animation-delay: 0.36s; }

@keyframes wave-pulse {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.3); }
}

@media (prefers-reduced-motion: reduce) {
    .wave-bar {
        animation: none;
    }
}

.voice-actions {
    display: flex;
    align-items: center;
    gap: 12rpx;
    flex-shrink: 0;
}

.voice-play {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: #FF6B9D;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease;
}

.voice-play:active {
    transform: scale(0.9);
}

.play-icon {
    width: 28rpx;
    height: 28rpx;
}

.voice-delete {
    font-size: 24rpx;
    color: #999999;
    padding: 8rpx 12rpx;
}

/* ── Image Uploader ────────────────────────────── */
.image-uploader {
    width: 100%;
}

.upload-zone {
    width: 100%;
    height: 320rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #F7F8FA;
    border-radius: 20rpx;
    border: 3rpx dashed #E0E0E0;
    transition: border-color 0.2s ease, transform 0.15s ease;
}

.upload-zone:active {
    border-color: #FF6B9D;
    transform: scale(0.98);
}

.upload-icon-img {
    width: 72rpx;
    height: 72rpx;
    margin-bottom: 16rpx;
    opacity: 0.4;
}

.upload-text {
    font-size: 28rpx;
    color: #666666;
    margin-bottom: 8rpx;
    font-weight: 500;
}

.upload-hint {
    font-size: 22rpx;
    color: #B0B0B0;
}

/* ── Image Preview ─────────────────────────────── */
.image-preview-area {
    position: relative;
    border-radius: 20rpx;
    overflow: hidden;
}

.preview-image {
    width: 100%;
    height: 360rpx;
    display: block;
}

.image-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20rpx;
    background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.45) 100%);
    display: flex;
    justify-content: center;
}

.overlay-btn {
    background: rgba(255, 255, 255, 0.9);
    border-radius: 48rpx;
    padding: 14rpx 36rpx;
    transition: transform 0.15s ease;
}

.overlay-btn:active {
    transform: scale(0.96);
}

.overlay-btn text {
    font-size: 26rpx;
    color: #1A1A1A;
    font-weight: 500;
}

/* ── Date Picker ────────────────────────────────── */
.date-picker {
    display: flex;
    align-items: center;
    padding: 24rpx 20rpx;
    background: #F7F8FA;
    border-radius: 16rpx;
    transition: transform 0.15s ease;
}

.date-picker:active {
    transform: scale(0.99);
}

.date-icon {
    width: 36rpx;
    height: 36rpx;
    margin-right: 14rpx;
    opacity: 0.4;
}

.date-text {
    flex: 1;
    font-size: 28rpx;
    color: #1A1A1A;
}

.date-text.placeholder {
    color: #B0B0B0;
}

.date-arrow {
    font-size: 32rpx;
    color: #D0D0D0;
    font-weight: 300;
}

/* ── Submit Area ────────────────────────────────── */
.submit-area {
    padding: 48rpx 28rpx 0;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.submit-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    font-size: 34rpx;
    font-weight: 600;
    padding: 32rpx 32rpx;
    border-radius: 56rpx;
    border: none;
    background: linear-gradient(135deg, #FF6B9D 0%, #FF8DB5 100%);
    color: #FFFFFF;
    box-shadow: 0 12rpx 40rpx rgba(255, 107, 157, 0.24), 0 4rpx 16rpx rgba(255, 107, 157, 0.12);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.submit-btn:active {
    transform: scale(0.97);
    opacity: 0.92;
    box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.2);
}

.submit-icon {
    width: 40rpx;
    height: 40rpx;
}

.submit-hint {
    margin-top: 18rpx;
    font-size: 22rpx;
    color: #B0B0B0;
}
</style>
