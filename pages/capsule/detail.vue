<template>
    <view class="detail-page">
        <view class="capsule-detail-card" v-if="capsule">
            <view class="capsule-header">
                <text class="capsule-title">{{ capsule.title }}</text>
            </view>
            
            <view class="capsule-content" v-if="capsule.type === 'text'">
                <text class="content-text">{{ capsule.content }}</text>
            </view>
            
            <view class="capsule-content" v-else-if="capsule.type === 'voice'">
                <view class="voice-card" @click="playVoice">
                    <image class="voice-icon-img" :class="{ playing: isPlaying }" src="/static/icons/icon-voice.png" mode="aspectFit" />
                    <text class="voice-text">{{ isPlaying ? '播放中...' : '点击播放语音' }}</text>
                </view>
                <view v-if="isPlaying" class="voice-progress">
                    <view class="progress-bar">
                        <view class="progress-fill" :style="{ width: playProgress + '%' }"></view>
                    </view>
                    <text class="progress-text">{{ currentTime }}s / {{ duration }}s</text>
                </view>
            </view>
            
            <view class="capsule-content" v-else-if="capsule.type === 'image'">
                <image class="detail-image" :src="capsule.image_url" mode="aspectFit" @click="previewImage" />
            </view>
            
            <view class="capsule-footer">
                <view class="footer-box">
                    <image class="footer-icon" src="/static/icons/icon-envelope.png" mode="aspectFit" />
                    <text class="footer-text">开启于 {{ capsule.open_time }}</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import CloudData from '@/utils/cloudData.js'

export default {
    data() {
        return {
            capsule: null,
            isPlaying: false,
            audioContext: null,
            playProgress: 0,
            currentTime: 0,
            duration: 0,
            progressTimer: null,
            capsuleId: null
        }
    },
    onLoad(options) {
        this.capsuleId = options.id
        this.loadCapsuleDetail()
    },
    onUnload() {
        this.stopVoice()
    },
    methods: {
        async loadCapsuleDetail() {
            const list = await CloudData.getCapsules([])
            this.capsule = list.find(c => (c._id || c.id) == this.capsuleId)
            
            if (this.capsule) {
                uni.setNavigationBarTitle({ title: this.capsule.title })
            }
        },
        playVoice() {
            if (this.isPlaying) {
                this.stopVoice()
                return
            }
            
            if (!this.capsule.voice_url) {
                uni.showToast({ title: '语音文件不存在', icon: 'none' })
                return
            }
            
            this.isPlaying = true
            this.audioContext = uni.createInnerAudioContext()
            this.audioContext.src = this.capsule.voice_url
            
            this.audioContext.onPlay(() => {
                console.log('开始播放')
                this.duration = Math.ceil(this.audioContext.duration) || 0
                this.startProgressTimer()
            })
            
            this.audioContext.onTimeUpdate(() => {
                this.currentTime = Math.ceil(this.audioContext.currentTime)
                this.duration = Math.ceil(this.audioContext.duration) || this.duration
                if (this.duration > 0) {
                    this.playProgress = (this.currentTime / this.duration) * 100
                }
            })
            
            this.audioContext.onEnded(() => {
                this.stopVoice()
                console.log('播放结束')
            })
            
            this.audioContext.onError((err) => {
                console.log('播放错误', err)
                this.stopVoice()
                uni.showToast({ title: '播放失败', icon: 'none' })
            })
            
            this.audioContext.play()
        },
        stopVoice() {
            if (this.audioContext) {
                this.audioContext.stop()
                this.audioContext.destroy()
                this.audioContext = null
            }
            this.isPlaying = false
            this.playProgress = 0
            this.currentTime = 0
            this.stopProgressTimer()
        },
        startProgressTimer() {
            this.stopProgressTimer()
            this.progressTimer = setInterval(() => {
                if (!this.isPlaying) {
                    this.stopProgressTimer()
                }
            }, 1000)
        },
        stopProgressTimer() {
            if (this.progressTimer) {
                clearInterval(this.progressTimer)
                this.progressTimer = null
            }
        },
        previewImage() {
            uni.previewImage({
                urls: [this.capsule.image_url]
            })
        }
    }
}
</script>

<style scoped>
.detail-page {
    background: linear-gradient(180deg, #ffeef8 0%, #fff 100%);
    min-height: 100vh;
    padding: 32rpx;
}

.capsule-detail-card {
    background: #fff;
    border-radius: 32rpx;
    padding: 48rpx 32rpx;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.capsule-header {
    margin-bottom: 32rpx;
    padding-bottom: 24rpx;
    border-bottom: 2rpx solid #f0f0f0;
}

.capsule-title {
    display: block;
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
}

.capsule-content {
    line-height: 2;
    margin-bottom: 32rpx;
}

.content-text {
    font-size: 30rpx;
    color: #333;
}

.voice-card {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60rpx;
    background: #fff7f2;
    border-radius: 24rpx;
}

.voice-icon-img {
    width: 64rpx;
    height: 64rpx;
    margin-right: 24rpx;
}

.voice-icon-img.playing {
    animation: voiceWave 1s infinite;
}

@keyframes voiceWave {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.voice-text {
    font-size: 28rpx;
    color: #ff6b9d;
}

.voice-progress {
    margin-top: 24rpx;
    padding: 0 20rpx;
}

.progress-bar {
    width: 100%;
    height: 8rpx;
    background: #f0f0f0;
    border-radius: 4rpx;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff6b9d, #ffa8c5);
    border-radius: 4rpx;
    transition: width 0.3s;
}

.progress-text {
    display: block;
    text-align: center;
    font-size: 24rpx;
    color: #999;
    margin-top: 16rpx;
}

.detail-image {
    width: 100%;
    border-radius: 24rpx;
}

.capsule-footer {
    padding-top: 24rpx;
    border-top: 2rpx solid #f0f0f0;
    text-align: center;
}

.footer-box {
    display: flex;
    align-items: center;
    justify-content: center;
}

.footer-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 12rpx;
}

.footer-text {
    font-size: 24rpx;
    color: #999;
}
</style>