<template>
    <view class="create-page">
        <view class="form-item">
            <text class="label">胶囊标题</text>
            <input class="input" v-model="title" placeholder="给这封情书起个名字" />
        </view>

        <view class="form-item">
            <text class="label">类型</text>
            <view class="type-selector">
                <view :class="['type-item', type === 'text' ? 'active' : '']" @click="selectType('text')">
                    <image class="type-icon-img" src="/static/icons/icon-text.png" mode="aspectFit" />
                    <text class="type-text">文字</text>
                </view>
                <view :class="['type-item', type === 'voice' ? 'active' : '']" @click="selectType('voice')">
                    <image class="type-icon-img" src="/static/icons/icon-voice.png" mode="aspectFit" />
                    <text class="type-text">语音</text>
                </view>
                <view :class="['type-item', type === 'image' ? 'active' : '']" @click="selectType('image')">
                    <image class="type-icon-img" src="/static/icons/icon-image.png" mode="aspectFit" />
                    <text class="type-text">图片</text>
                </view>
            </view>
        </view>

        <view class="form-item" v-if="type === 'text'">
            <text class="label">情书内容</text>
            <textarea class="textarea" v-model="content" placeholder="写下你想对她说的话..." />
        </view>

        <view class="form-item" v-if="type === 'voice'">
            <text class="label">录制语音</text>
            <view class="voice-recorder" @touchstart="startRecord" @touchend="stopRecord" @touchcancel="stopRecord">
                <image class="recorder-icon-img" :class="{ recording: recording }" src="/static/icons/icon-voice.png" mode="aspectFit" />
                <text class="recorder-text">{{ recording ? '松开结束录制' : '按住录制语音' }}</text>
                <text class="recorder-time" v-if="recordTime > 0">{{ recordTime }}s / 最长60秒</text>
            </view>
            <view v-if="voice_url" class="voice-preview">
                <text class="voice-tag">已录制 {{ recordTime }}秒</text>
                <view class="voice-play" @click="playPreviewVoice">
                    <image class="play-icon" src="/static/icons/icon-play.png" mode="aspectFit" />
                    <text class="play-text">{{ isPlaying ? '停止' : '试听' }}</text>
                </view>
                <text class="voice-delete" @click="deleteVoice">删除</text>
            </view>
        </view>

        <view class="form-item" v-if="type === 'image'">
            <text class="label">选择图片</text>
            <view class="image-uploader">
                <view v-if="!image_url" class="upload-btn" @click="chooseImage">
                    <image class="upload-icon-img" src="/static/icons/icon-upload.png" mode="aspectFit" />
                    <text class="upload-text">点击选择图片</text>
                </view>
                <image v-else class="preview-image" :src="image_url" mode="aspectFill" @click="chooseImage" />
            </view>
        </view>

        <view class="form-item">
            <text class="label">开启时间</text>
            <picker mode="date" :value="open_time" @change="onDateChange">
                <view class="picker">{{ open_time || '选择开启日期' }}</view>
            </picker>
        </view>

        <button class="submit-btn" @click="submit">
            封印胶囊
        </button>
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'
import UploadUtil from '@/utils/upload.js'

export default {
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
                console.log('录音开始')
            })
            
            this.recorderManager.onStop((res) => {
                console.log('录音结束', res)
                if (res.duration > 0) {
                    this.voice_url = res.tempFilePath
                    this.recordTime = Math.ceil(res.duration / 1000)
                    uni.showToast({ title: '录音完成！', icon: 'success' })
                }
                this.recording = false
            })
            
            this.recorderManager.onError((err) => {
                console.log('录音错误', err)
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
                console.log('开始播放')
            })
            
            this.audioContext.onEnded(() => {
                this.isPlaying = false
                console.log('播放结束')
            })
            
            this.audioContext.onError((err) => {
                this.isPlaying = false
                console.log('播放错误', err)
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
            if (this.type === 'image' && this.image_url && !this.image_url.startsWith('http')) {
                cloudImageUrl = await UploadUtil.uploadImage(this.image_url, 'capsules')
            }
            
            // 上传语音到云存储
            let cloudVoiceUrl = this.voice_url
            if (this.type === 'voice' && this.voice_url && !this.voice_url.startsWith('http')) {
                cloudVoiceUrl = await UploadUtil.uploadImage(this.voice_url, 'voices')
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
                'linear-gradient(135deg, #ff6b9d, #ffa8c5)',
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
.create-page {
    background: #f7f8fa;
    min-height: 100vh;
    padding: 32rpx;
}

.form-item {
    background: #fff;
    border-radius: 24rpx;
    padding: 32rpx;
    margin-bottom: 24rpx;
}

.label {
    display: block;
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
}

.input {
    width: 100%;
    font-size: 30rpx;
    color: #333;
    padding: 20rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
}

.type-selector {
    display: flex;
    gap: 20rpx;
}

.type-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32rpx 20rpx;
    background: #f7f8fa;
    border-radius: 20rpx;
    border: 3rpx solid transparent;
}

.type-item.active {
    border-color: #ff6b9d;
    background: #fff7f2;
}

.type-icon-img {
    width: 56rpx;
    height: 56rpx;
    margin-bottom: 12rpx;
}

.type-text {
    font-size: 26rpx;
    color: #666;
}

.type-item.active .type-text {
    color: #ff6b9d;
}

.textarea {
    width: 100%;
    min-height: 300rpx;
    font-size: 30rpx;
    color: #333;
    padding: 20rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
}

.voice-recorder {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60rpx;
    background: #f7f8fa;
    border-radius: 20rpx;
    border: 3rpx dashed #ddd;
}

.recorder-icon-img {
    width: 80rpx;
    height: 80rpx;
    margin-bottom: 20rpx;
}

.recorder-icon-img.recording {
    animation: pulse 1s infinite;
}

@keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
}

.recorder-text {
    font-size: 28rpx;
    color: #666;
}

.recorder-time {
    font-size: 32rpx;
    color: #ff6b9d;
    margin-top: 16rpx;
}

.voice-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20rpx;
    padding: 20rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
}

.voice-tag {
    font-size: 26rpx;
    color: #4caf50;
}

.voice-play {
    display: flex;
    align-items: center;
    gap: 8rpx;
}

.play-icon {
    width: 40rpx;
    height: 40rpx;
}

.play-text {
    font-size: 26rpx;
    color: #ff6b9d;
}

.image-uploader {
    width: 100%;
    height: 300rpx;
}

.upload-btn {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f7f8fa;
    border-radius: 20rpx;
    border: 3rpx dashed #ddd;
}

.upload-icon-img {
    width: 80rpx;
    height: 80rpx;
    margin-bottom: 16rpx;
}

.upload-text {
    font-size: 28rpx;
    color: #999;
}

.preview-image {
    width: 100%;
    height: 100%;
    border-radius: 20rpx;
}

.picker {
    padding: 20rpx;
    background: #f7f8fa;
    border-radius: 16rpx;
    font-size: 30rpx;
    color: #333;
}

.submit-btn {
    width: 100%;
    margin-top: 40rpx;
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    font-size: 32rpx;
    font-weight: bold;
    padding: 32rpx;
    border-radius: 48rpx;
    border: none;
}
</style>
