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
                        <view class="progress-fill" :style="{ transform: 'scaleX(' + (playProgress / 100) + ')' }"></view>
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
            })

            this.audioContext.onError((err) => {
                console.error('播放错误:', err)
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
    background: linear-gradient(180deg, #FFF0F5 0%, #FFFFFF 100%);
    min-height: 100vh;
    padding: calc(var(--status-bar-height) + 32rpx) 32rpx 32rpx;
}

.capsule-detail-card {
    background: #FFFFFF;
    border-radius: 36rpx;
    padding: 48rpx 36rpx;
    box-shadow: 0 12rpx 56rpx rgba(255, 107, 157, 0.07), 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.capsule-header {
    margin-bottom: 32rpx;
    padding-bottom: 24rpx;
    border-bottom: 2rpx solid #F0F0F0;
}

.capsule-title {
    display: block;
    font-size: 36rpx;
    font-weight: 700;
    color: #1A1A1A;
}

.capsule-content {
    line-height: 2;
    margin-bottom: 32rpx;
}

.content-text {
    font-size: 30rpx;
    color: #1A1A1A;
}

.voice-card {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 64rpx;
    background: linear-gradient(135deg, rgba(255, 107, 157, 0.05), rgba(255, 168, 197, 0.08));
    border-radius: 28rpx;
    border: 1.5rpx solid rgba(255, 107, 157, 0.08);
}

.voice-icon-img {
    width: 64rpx;
    height: 64rpx;
    margin-right: 24rpx;
    transition: filter 0.25s ease;
}

.voice-icon-img.playing {
    animation: voiceWave 1.4s cubic-bezier(0.32, 0.72, 0, 1) infinite;
}

@keyframes voiceWave {
    0%, 100% { transform: scale(1); opacity: 0.7; }
    50% { transform: scale(1.12); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
    .voice-icon-img.playing {
        animation: none;
        opacity: 1;
    }
}

.voice-text {
    font-size: 28rpx;
    color: #FF6B9D;
}

.voice-progress {
    margin-top: 24rpx;
    padding: 0 20rpx;
}

.progress-bar {
    width: 100%;
    height: 8rpx;
    background: rgba(255, 107, 157, 0.12);
    border-radius: 4rpx;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, #FF6B9D, #FF8DB5);
    border-radius: 4rpx;
    transform-origin: left center;
    transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.progress-text {
    display: block;
    text-align: center;
    font-size: 24rpx;
    color: #999999;
    margin-top: 16rpx;
}

.detail-image {
    width: 100%;
    border-radius: 24rpx;
}

.capsule-footer {
    padding-top: 24rpx;
    border-top: 2rpx solid #F0F0F0;
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
    color: #999999;
}
</style>