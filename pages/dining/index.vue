<template>
    <view class="dining-page">
        <view class="shop-header">
            <text class="shop-title">🥰 情侣点餐</text>
            <text class="shop-desc">今天想吃点什么呀～</text>
        </view>

        <view class="tab-bar">
            <view :class="['tab', activeTab === 0 ? 'active' : '']" @click="switchTab(0)">我来点</view>
            <view :class="['tab', activeTab === 1 ? 'active' : '']" @click="switchTab(1)">我的订单</view>
        </view>

        <view v-if="activeTab === 0" class="search-bar">
            <view class="search-input-wrapper">
                <text class="search-icon">🔍</text>
                <input 
                    class="search-input" 
                    v-model="searchKeyword" 
                    placeholder="搜索菜品名称..." 
                    placeholder-class="search-placeholder"
                />
                <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">×</text>
            </view>
        </view>

        <view class="content-area" v-if="activeTab === 0">
            <!-- 自定义下拉刷新容器 -->
            <view class="goods-refresh-wrapper" 
                @touchstart="onGoodsTouchStart" 
                @touchmove="onGoodsTouchMove" 
                @touchend="onGoodsTouchEnd"
            >
                <!-- 下拉刷新指示器 -->
                <view class="custom-refresher" :style="{ height: goodsPullDownHeight + 'rpx' }">
                    <view v-if="goodsPullDownHeight > 0" class="refresher-content">
                        <text v-if="refreshing" class="refresher-loading">⟳</text>
                        <text v-else-if="goodsPullDownHeight >= 80" class="refresher-text">松开刷新</text>
                        <text v-else class="refresher-text">下拉刷新</text>
                    </view>
                </view>
                <!-- 商品列表 -->
                <scroll-view 
                    class="goods-list" 
                    scroll-y 
                    @click="closeAllSlides"
                    @scroll="onGoodsScroll"
                >
                    <view class="add-dish-btn" @click.stop="addDish">
                        <text class="add-icon">+</text>
                        <text class="add-text">上传新菜谱</text>
                    </view>

                    <view class="empty-search" v-if="searchKeyword && filteredGoodsList.length === 0">
                        <text class="empty-search-icon">🔍</text>
                        <text class="empty-search-text">未找到"{{ searchKeyword }}"相关菜品</text>
                    </view>
                    <view class="goods-item-wrapper" v-for="(item, index) in filteredGoodsList" :key="item.id" :class="{ 'is-open': item.isOpen }" @click.stop>
                        <view 
                            class="goods-content"
                            @touchstart="touchStart($event, item)"
                            @touchmove="touchMove($event, item)"
                            @touchend="touchEnd(item)"
                            :style="{ transform: 'translateX(' + (item.translateX || 0) + 'rpx)' }"
                        >
                            <view class="goods-left">
                                <image class="goods-img" :src="item.img || '/static/tabbar/home.png'" mode="aspectFill" />
                                <view class="goods-info">
                                    <text class="goods-name">{{ item.name }}</text>
                                    <text class="goods-price">{{ item.price }} 熊熊币</text>
                                </view>
                            </view>
                            <view class="cart-ctrl">
                                <button v-if="cart[item.id] && cart[item.id] > 0" class="sub-btn" :data-id="item.id" @click.stop="subCart">-</button>
                                <text v-if="cart[item.id] && cart[item.id] > 0" class="cart-count">{{ cart[item.id] }}</text>
                                <button class="add-btn" :data-id="item.id" @click.stop="addCart">+</button>
                            </view>
                        </view>
                        <view class="slide-actions">
                            <view class="slide-btn edit" @click="editDish(item)">
                                <text class="btn-text">修改</text>
                            </view>
                            <view class="slide-btn delete" @click="deleteDish(item)">
                                <text class="btn-text">删除</text>
                            </view>
                        </view>
                    </view>
                </scroll-view>
            </view>
        </view>

        <view class="order-area" v-else>
            <!-- 自定义下拉刷新容器 -->
            <view class="order-refresh-wrapper" 
                @touchstart="onOrderTouchStart" 
                @touchmove="onOrderTouchMove" 
                @touchend="onOrderTouchEnd"
            >
                <!-- 下拉刷新指示器 -->
                <view class="custom-refresher" :style="{ height: pullDownHeight + 'rpx' }">
                    <view v-if="pullDownHeight > 0" class="refresher-content">
                        <text v-if="refreshing" class="refresher-loading">⟳</text>
                        <text v-else-if="pullDownHeight >= 80" class="refresher-text">松开刷新</text>
                        <text v-else class="refresher-text">下拉刷新</text>
                    </view>
                </view>
                <!-- 订单列表 -->
                <scroll-view 
                    class="order-list" 
                    scroll-y 
                    @scroll="onOrderScroll"
                    :scroll-y="true"
                >
                    <view v-if="orderList.length === 0" class="empty-order">
                        <text class="empty-icon">🍜</text>
                        <text class="empty-text">还没有订单呢</text>
                    </view>
                    <view v-else class="order-item" v-for="item in orderList" :key="item.id">
                        <view class="order-header">
                            <view class="order-creator">
                                <image class="creator-avatar" :src="getDisplayName(item.creatorOpenid) === userInfo.nickName ? userInfo.avatarUrl : (partnerInfo ? partnerInfo.avatarUrl : '/static/tabbar/user.png')" mode="aspectFill" />
                                <text class="creator-name">{{ item.creatorName || getDisplayName(item.creatorOpenid) }}</text>
                            </view>
                            <text class="order-status">{{ item.status }}</text>
                        </view>
                        <view class="order-goods">
                            <view class="order-goods-item" v-for="(g, idx) in item.goods" :key="idx">
                                <text class="goods-name">{{ g.name || '未知菜品' }} x{{ g.count || 1 }}</text>
                            </view>
                        </view>
                        <view v-if="item.remark" class="order-remark">
                            <text class="remark-label">备注：</text>
                            <text class="remark-text">{{ item.remark }}</text>
                        </view>
                        <view class="order-footer">
                            <text class="order-time">{{ formatTime(item.createTime) }}</text>
                            <text class="order-total">合计：{{ item.total }} 熊熊币</text>
                        </view>
                    </view>
                </scroll-view>
            </view>
        </view>

        <view class="bottom-bar" v-if="activeTab === 0">
            <view class="bottom-content">
                <view class="remark-box" @click="showRemarkInput">
                    <text class="remark-label">备注：</text>
                    <text class="remark-text">{{ orderRemark || '点击添加' }}</text>
                </view>
                <view class="total-box">
                    <text :class="['total-price', cartCount === 0 ? 'disabled' : '']">{{ totalPrice }} 熊熊币</text>
                </view>
                <button :class="['submit-btn', cartCount === 0 ? 'disabled' : '']" @click="submitOrder" :disabled="cartCount === 0">
                    {{ cartCount > 0 ? `提交(${cartCount})` : '提交' }}
                </button>
            </view>
        </view>
    </view>
</template>

<script>
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'
import TimeFormat from '@/utils/timeFormat.js'

const defaultDishes = []

export default {
    data() {
        return {
            activeTab: 0,
            goodsList: [],
            cart: {},
            orderList: [],
            slideWidth: 240,
            startX: 0,
            startY: 0,
            userInfo: {},
            partnerInfo: null,
            isBind: false,
            refreshing: false,
            orderRemark: '',
            showRemarkModal: false,
            searchKeyword: '',
            orderScrollTop: 0,
            goodsScrollTop: 0,
            pullDownHeight: 0,
            goodsPullDownHeight: 0,
            touchStartY: 0,
            goodsTouchStartY: 0,
            isPullingDown: false,
            isGoodsPullingDown: false
        }
    },
    computed: {
        totalPrice() {
            return Object.keys(this.cart).reduce((sum, id) => {
                const item = this.goodsList.find(g => g.id == id)
                return sum + (item ? item.price * this.cart[id] : 0)
            }, 0)
        },
        cartCount() {
            return Object.values(this.cart).reduce((sum, count) => sum + count, 0)
        },
        filteredGoodsList() {
            if (!this.searchKeyword) {
                return this.goodsList
            }
            const keyword = this.searchKeyword.toLowerCase()
            return this.goodsList.filter(item => 
                item.name && item.name.toLowerCase().includes(keyword)
            )
        },
        isOrderAtTop() {
            return this.orderScrollTop <= 5
        }
    },
    onLoad() {
        this.loadUserInfo()
        this.loadGoods()
    },
    async onShow() {
        this.loadUserInfo()
        // 检查反向绑定
        if (!this.isBind && this.userInfo.openid) {
            await this.checkReverseBind()
            // 重新加载用户信息（可能已更新绑定状态）
            this.loadUserInfo()
        }
        await this.loadGoods()
        await this.loadOrders()
    },
    methods: {
        loadUserInfo() {
            this.userInfo = UserManager.getUserInfo()
            this.partnerInfo = UserManager.getPartnerInfo()
            this.isBind = UserManager.isBind()
        },
        
        // 格式化时间
        formatTime(time) {
            return TimeFormat.formatTime(time)
        },
        
        // 切换标签
        async switchTab(index) {
            this.activeTab = index
            if (index === 1) {
                // 切换到订单标签时加载订单
                await this.loadOrders()
            }
        },
        
        // 下拉刷新
        async onRefresh() {
            this.refreshing = true
            await this.loadUserInfo()
            if (!this.isBind && this.userInfo.openid) {
                await this.checkReverseBind()
            }
            await this.loadGoods()
            await this.loadOrders()
            this.refreshing = false
            uni.showToast({ title: '刷新成功', icon: 'success' })
        },

        // 订单列表滚动监听
        onOrderScroll(e) {
            this.orderScrollTop = e.detail.scrollTop
        },

        // 商品列表滚动监听
        onGoodsScroll(e) {
            this.goodsScrollTop = e.detail.scrollTop
        },

        // 商品区域触摸开始
        onGoodsTouchStart(e) {
            // 只有在点餐标签且不在刷新状态时才处理
            if (this.activeTab !== 0 || this.refreshing) return
            // 只有在顶部时才允许下拉
            if (this.goodsScrollTop > 5) return
            
            this.goodsTouchStartY = e.touches[0].clientY
            this.isGoodsPullingDown = true
        },

        // 商品区域触摸移动
        onGoodsTouchMove(e) {
            if (!this.isGoodsPullingDown || this.refreshing) return
            
            const moveY = e.touches[0].clientY
            const diff = moveY - this.goodsTouchStartY
            
            // 只有向下拉才处理
            if (diff > 0 && diff < 150) {
                // 阻尼效果
                this.goodsPullDownHeight = diff * 0.6
                // 阻止默认滚动行为
                e.preventDefault()
            }
        },

        // 商品区域触摸结束
        async onGoodsTouchEnd() {
            if (!this.isGoodsPullingDown) return
            this.isGoodsPullingDown = false
            
            // 如果下拉超过阈值，触发刷新
            if (this.goodsPullDownHeight >= 48) { // 80 * 0.6 = 48
                this.goodsPullDownHeight = 80
                await this.onRefresh()
            }
            
            // 重置下拉高度
            this.goodsPullDownHeight = 0
        },

        // 订单区域触摸开始
        onOrderTouchStart(e) {
            // 只有在订单标签且不在刷新状态时才处理
            if (this.activeTab !== 1 || this.refreshing) return
            // 只有在顶部时才允许下拉
            if (this.orderScrollTop > 5) return
            
            this.touchStartY = e.touches[0].clientY
            this.isPullingDown = true
        },

        // 订单区域触摸移动
        onOrderTouchMove(e) {
            if (!this.isPullingDown || this.refreshing) return
            
            const moveY = e.touches[0].clientY
            const diff = moveY - this.touchStartY
            
            // 只有向下拉才处理
            if (diff > 0 && diff < 150) {
                // 阻尼效果
                this.pullDownHeight = diff * 0.6
                // 阻止默认滚动行为
                e.preventDefault()
            }
        },

        // 订单区域触摸结束
        async onOrderTouchEnd() {
            if (!this.isPullingDown) return
            this.isPullingDown = false
            
            // 如果下拉超过阈值，触发刷新
            if (this.pullDownHeight >= 48) { // 80 * 0.6 = 48
                this.pullDownHeight = 80
                await this.onRefresh()
            }
            
            // 重置下拉高度
            this.pullDownHeight = 0
        },

        // 检查是否有反向绑定记录
        async checkReverseBind() {
            try {
                const res = await uniCloud.callFunction({
                    name: 'inviteCode',
                    data: {
                        action: 'checkReverse',
                        userInfo: this.userInfo
                    }
                })
                
                if (res.result && res.result.code === 0 && res.result.data.hasBind) {
                    UserManager.setPartnerInfo(res.result.data.partnerInfo)
                    this.partnerInfo = res.result.data.partnerInfo
                    this.isBind = true
                    console.log('点餐页自动绑定伴侣:', res.result.data.partnerInfo)
                }
            } catch (err) {
                console.error('点餐页检查反向绑定失败:', err)
            }
        },
        // 获取显示名称
        getDisplayName(openid) {
            return UserManager.getDisplayName(openid)
        },
        // 加载菜品（从云端）
        async loadGoods() {
            const coupleOpenids = UserManager.getCoupleOpenids()
            const list = await CloudData.getDishes(coupleOpenids)
            if (list && list.length > 0) {
                // 将 _id 映射为 id
                this.goodsList = list.map(item => ({
                    ...item,
                    id: item._id || item.id
                }))
            } else {
                this.goodsList = defaultDishes
            }
        },
        // 加载订单（从云端）
        async loadOrders() {
            const coupleOpenids = UserManager.getCoupleOpenids()
            console.log('加载订单，coupleOpenids:', coupleOpenids)
            this.orderList = await CloudData.getOrders(coupleOpenids)
            console.log('订单加载完成:', this.orderList)
            
            // 检查是否有新订单
            this.checkNewOrder()
        },
        
        // 检查新订单
        async checkNewOrder() {
            const userInfo = UserManager.getUserInfo()
            // 找到不是自己创建的、且标记为新的订单
            const newOrder = this.orderList.find(item => 
                item.isNew && item.creatorOpenid !== userInfo.openid
            )
            
            if (newOrder) {
                this.showNewOrderTip = true
                this.newOrderData = newOrder
            }
        },

        // 请求订阅消息权限
        async requestSubscribeMessage() {
            try {
                const res = await uni.requestSubscribeMessage({
                    tmplIds: ['0IKc45bcYw7j_ASZPc8ajIZ7pJ05ruH0c3zbGFbqEzE']
                })
                console.log('订阅消息结果:', res)
                
                // 检查用户是否同意订阅
                if (res['0IKc45bcYw7j_ASZPc8ajIZ7pJ05ruH0c3zbGFbqEzE'] === 'accept') {
                    console.log('用户同意订阅消息')
                    return true
                } else {
                    console.log('用户拒绝订阅消息')
                    return false
                }
            } catch (err) {
                console.error('订阅消息失败:', err)
                return false
            }
        },
        
        // 显示备注输入框
        showRemarkInput() {
            uni.showModal({
                title: '添加备注',
                editable: true,
                placeholderText: '请输入备注信息...',
                content: this.orderRemark,
                success: (res) => {
                    if (res.confirm) {
                        this.orderRemark = res.content
                    }
                }
            })
        },
        
        // 清除搜索
        clearSearch() {
            this.searchKeyword = ''
        },
        
        // 发送订阅消息通知对方
        async sendOrderNotification(order) {
            try {
                const partnerInfo = UserManager.getPartnerInfo()
                if (!partnerInfo || !partnerInfo.openid) {
                    console.log('没有绑定的伴侣，不发送消息')
                    return
                }
                
                const goodsList = order.goods.map(g => `${g.name}x${g.count}`).join('、')
                
                console.log('准备发送订阅消息:', {
                    orderId: order._id,
                    receiverOpenid: partnerInfo.openid,
                    creatorName: order.creatorName,
                    goodsList: goodsList,
                    total: order.total
                })
                
                const res = await uniCloud.callFunction({
                    name: 'sendMessage',
                    data: {
                        action: 'sendOrderNotification',
                        data: {
                            orderId: order._id,
                            receiverOpenid: partnerInfo.openid,
                            creatorName: order.creatorName,
                            goodsList: goodsList.substring(0, 20) + (goodsList.length > 20 ? '...' : ''),
                            total: order.total,
                            remark: order.remark || '',
                            createTime: order.createTime
                        }
                    }
                })
                
                console.log('发送消息结果:', res)
                
                if (res.result && res.result.code === 0) {
                    console.log('订阅消息发送成功')
                } else {
                    console.error('订阅消息发送失败:', res.result)
                }
            } catch (err) {
                console.error('发送消息失败:', err)
            }
        },
        addDish() {
            uni.navigateTo({ url: '/pages/dining/add-dish' })
        },
        addCart(e) {
            const id = e.currentTarget.dataset.id
            this.$set(this.cart, id, (this.cart[id] || 0) + 1)
        },
        subCart(e) {
            const id = e.currentTarget.dataset.id
            if (this.cart[id] > 0) {
                this.$set(this.cart, id, this.cart[id] - 1)
                if (this.cart[id] === 0) {
                    this.$delete(this.cart, id)
                }
            }
        },
        async submitOrder() {
            // 检查是否登录
            if (!UserManager.getOpenid()) {
                uni.showModal({
                    title: '提示',
                    content: '请先登录后再提交订单',
                    confirmText: '去登录',
                    cancelText: '再看看',
                    success: (res) => {
                        if (res.confirm) {
                            uni.navigateTo({ url: '/pages/login' })
                        }
                    }
                })
                return
            }
            
            if (Object.keys(this.cart).length === 0) {
                uni.showToast({ title: '还没选菜呢～', icon: 'none' })
                return
            }

            // 请求订阅消息权限（用于后续通知）
            await this.requestSubscribeMessage()

            const orderGoods = Object.keys(this.cart).map(id => {
                const goods = this.goodsList.find(g => g.id == id)
                return {
                    id: goods.id,
                    name: goods.name,
                    price: goods.price,
                    count: this.cart[id]
                }
            })

            // 获取当前用户信息
            const userInfo = UserManager.getUserInfo()

            const newOrder = {
                time: '刚刚',
                status: '待确认',
                goods: orderGoods,
                total: this.totalPrice,
                creatorOpenid: userInfo.openid || '',
                creatorName: userInfo.nickName || '我',
                createTime: new Date().toISOString(),
                remark: this.orderRemark || '',
                isNew: true
            }

            uni.showLoading({ title: '提交中...' })
            const result = await CloudData.addOrder(newOrder)
            uni.hideLoading()

            if (result.success) {
                this.cart = {}
                this.orderRemark = ''
                await this.loadOrders()
                uni.showToast({ title: '订单已提交！', icon: 'success' })
                this.activeTab = 1
                
                // 发送通知给对方
                if (result.data) {
                    await this.sendOrderNotification(result.data)
                }
            } else {
                uni.showToast({ title: result.message, icon: 'none' })
            }
        },
        touchStart(e, item) {
            this.startX = e.touches[0].clientX
            this.startY = e.touches[0].clientY
            this.currentItem = item
            this.goodsList.forEach(i => {
                if (i !== item) {
                    this.$set(i, 'translateX', 0)
                    this.$set(i, 'isOpen', false)
                }
            })
        },
        touchMove(e, item) {
            if (!this.startX || !item) return
            const moveX = e.touches[0].clientX
            const moveY = e.touches[0].clientY
            const diffX = moveX - this.startX
            const diffY = moveY - this.startY
            if (Math.abs(diffY) > Math.abs(diffX)) return
            e.preventDefault()
            let translateX = diffX
            if (translateX > 0) translateX = 0
            if (translateX < -this.slideWidth) translateX = -this.slideWidth
            this.$set(item, 'translateX', translateX)
        },
        touchEnd(item) {
            if (!this.startX || !item) return
            const currentX = item.translateX || 0
            const threshold = -this.slideWidth / 2
            if (currentX < threshold) {
                this.$set(item, 'translateX', -this.slideWidth)
                this.$set(item, 'isOpen', true)
            } else {
                this.$set(item, 'translateX', 0)
                this.$set(item, 'isOpen', false)
            }
            this.startX = null
            this.startY = null
        },
        closeAllSlides() {
            this.goodsList.forEach(item => {
                this.$set(item, 'translateX', 0)
                this.$set(item, 'isOpen', false)
            })
        },
        editDish(item) {
            this.closeAllSlides()
            uni.navigateTo({
                url: `/pages/dining/edit-dish?id=${item.id}&name=${encodeURIComponent(item.name)}&price=${item.price}`
            })
        },
        async deleteDish(item) {
            this.closeAllSlides()
            uni.showModal({
                title: '提示',
                content: `确定删除"${item.name}"吗？`,
                success: async (res) => {
                    if (res.confirm) {
                        uni.showLoading({ title: '删除中...' })
                        
                        // 从云端删除
                        const deleteRes = await CloudData.deleteDish(item.id)
                        
                        if (deleteRes.success) {
                            // 从本地列表删除
                            const index = this.goodsList.findIndex(g => g.id === item.id)
                            if (index !== -1) {
                                this.goodsList.splice(index, 1)
                            }
                            // 从购物车中移除
                            if (this.cart[item.id]) {
                                this.$delete(this.cart, item.id)
                            }
                            uni.hideLoading()
                            uni.showToast({ title: '删除成功', icon: 'success' })
                        } else {
                            uni.hideLoading()
                            uni.showToast({ title: '删除失败', icon: 'none' })
                        }
                    }
                }
            })
        }
    }
}
</script>

<style scoped>
.dining-page {
    background: #f7f8fa;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* 商品列表自定义下拉刷新容器 */
.goods-refresh-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}

.shop-header {
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    padding: 16rpx 32rpx;
    text-align: center;
}

.shop-title {
    display: block;
    font-size: 44rpx;
    font-weight: bold;
    color: #fff;
    margin-bottom: 16rpx;
}

.shop-desc {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.95);
}

.tab-bar {
    display: flex;
    background: #fff;
    padding: 8rpx 0;
}

.tab {
    flex: 1;
    text-align: center;
    padding: 28rpx 0;
    font-size: 30rpx;
    color: #666;
    position: relative;
}

.tab.active {
    color: #ff6b9d;
    font-weight: bold;
}

.tab.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 48rpx;
    height: 6rpx;
    background: #ff6b9d;
    border-radius: 3rpx;
}

.search-bar {
    padding: 20rpx 40rpx;
    background: #fff;
}

.search-input-wrapper {
    display: flex;
    align-items: center;
    background: #f7f8fa;
    border-radius: 48rpx;
    padding: 16rpx 24rpx;
}

.search-icon {
    font-size: 32rpx;
    margin-right: 16rpx;
}

.search-input {
    flex: 1;
    font-size: 28rpx;
    color: #333;
}

.search-placeholder {
    color: #999;
}

.clear-icon {
    font-size: 40rpx;
    color: #999;
    padding: 8rpx;
    line-height: 1;
}

.empty-search {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 160rpx 0;
}

.empty-search-icon {
    font-size: 80rpx;
    margin-bottom: 32rpx;
}

.empty-search-text {
    font-size: 28rpx;
    color: #999;
}

.goods-list {
    padding: 28rpx 40rpx;
    padding-bottom: 140rpx;
    flex: 1;
    box-sizing: border-box;
}

.add-dish-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #fff5f8, #fffaf5);
    border: 4rpx dashed #ff6b9d;
    border-radius: 28rpx;
    padding: 44rpx;
    margin-bottom: 32rpx;
    box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.1);
}

.add-icon {
    font-size: 48rpx;
    color: #ff6b9d;
    margin-right: 16rpx;
}

.add-text {
    font-size: 30rpx;
    color: #ff6b9d;
    font-weight: 500;
}

.goods-item-wrapper {
    position: relative;
    margin-bottom: 32rpx;
    border-radius: 28rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.goods-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fff;
    border-radius: 28rpx;
    padding: 32rpx;
    padding-right: 28rpx;
    box-sizing: border-box;
    position: relative;
    z-index: 2;
    transition: transform 0.3s ease;
}

.goods-img {
    width: 140rpx;
    height: 140rpx;
    border-radius: 20rpx;
    background: #f7f8fa;
    margin-right: 28rpx;
}

.goods-left {
    flex: 1;
    display: flex;
    align-items: center;
}

.goods-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 8rpx 0;
}

.goods-name {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 16rpx;
}

.goods-price {
    font-size: 30rpx;
    color: #ff6b9d;
    font-weight: bold;
}

.slide-actions {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    z-index: 1;
}

.slide-btn {
    width: 120rpx;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.slide-btn.edit {
    background: #1976d2;
    border-radius: 0;
}

.slide-btn.delete {
    background: #e53935;
    border-radius: 0 24rpx 24rpx 0;
}

.btn-icon {
    font-size: 36rpx;
    margin-bottom: 8rpx;
}

.btn-text {
    font-size: 24rpx;
    color: #fff;
}

.cart-ctrl {
    display: flex;
    align-items: center;
}

.sub-btn, .add-btn {
    width: 64rpx;
    height: 64rpx;
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    border-radius: 50%;
    border: none;
    font-size: 36rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 12rpx rgba(255, 107, 157, 0.3);
}

.cart-count {
    min-width: 56rpx;
    text-align: center;
    font-size: 32rpx;
    color: #333;
    margin: 0 20rpx;
    font-weight: 500;
}

.order-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* 自定义下拉刷新容器 */
.order-refresh-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}

/* 自定义刷新指示器 */
.custom-refresher {
    overflow: hidden;
    transition: height 0.2s ease;
    background: #f7f8fa;
}

.refresher-content {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.refresher-text {
    font-size: 24rpx;
    color: #999;
}

.refresher-loading {
    font-size: 32rpx;
    color: #ff6b9d;
    animation: rotate 1s linear infinite;
}

@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.order-list {
    padding: 0 32rpx 24rpx;
    flex: 1;
    box-sizing: border-box;
    height: 100%;
}



.empty-order {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 200rpx;
}

.empty-icon {
    font-size: 100rpx;
    margin-bottom: 24rpx;
}

.empty-text {
    font-size: 28rpx;
    color: #999;
}

.order-item {
    background: #fff;
    border-radius: 24rpx;
    padding: 28rpx;
    margin-bottom: 24rpx;
}

.order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    padding-bottom: 16rpx;
    border-bottom: 1rpx solid #f0f0f0;
}

.order-creator {
    display: flex;
    align-items: center;
}

.creator-avatar {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    margin-right: 12rpx;
    background: #f7f8fa;
}

.creator-name {
    font-size: 26rpx;
    color: #333;
}

.order-time {
    font-size: 24rpx;
    color: #999;
}

.order-status {
    font-size: 24rpx;
    color: #ff6b9d;
    background: #fff7f2;
    padding: 8rpx 16rpx;
    border-radius: 16rpx;
}

.order-goods {
    margin-bottom: 20rpx;
}

.order-goods-item {
    font-size: 28rpx;
    color: #333;
    margin-bottom: 12rpx;
}

.order-footer {
    padding-top: 16rpx;
    border-top: 1rpx solid #f0f0f0;
    text-align: right;
}

.order-total {
    font-size: 28rpx;
    color: #333;
    font-weight: bold;
}

.bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    padding: 12rpx 32rpx;
    padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
    display: flex;
    box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
    border-radius: 24rpx 24rpx 0 0;
    z-index: 100;
}

.bottom-content {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 20rpx;
}

.remark-box {
    display: flex;
    align-items: center;
    background: #f7f8fa;
    border-radius: 40rpx;
    padding: 16rpx 20rpx;
    flex: 1.2;
}

.remark-label {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
}

.remark-text {
    font-size: 28rpx;
    color: #999;
    margin-left: 8rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.total-box {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: center;
}

.total-price {
    font-size: 34rpx;
    font-weight: bold;
    color: #ff6b9d;
    transition: color 0.3s ease;
}

.total-price.disabled {
    color: #999;
}

.order-remark {
    display: flex;
    align-items: center;
    background: #fff7f2;
    border-radius: 16rpx;
    padding: 20rpx 24rpx;
    margin-bottom: 20rpx;
}

.order-remark .remark-label {
    font-size: 26rpx;
    color: #ff6b9d;
    font-weight: 500;
}

.order-remark .remark-text {
    font-size: 26rpx;
    color: #666;
    margin-left: 12rpx;
}

.submit-btn {
    background: linear-gradient(135deg, #ff6b9d, #ffa8c5);
    color: #fff;
    border-radius: 40rpx;
    padding: 16rpx 32rpx;
    font-size: 30rpx;
    font-weight: bold;
    border: none;
    box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.3);
    flex-shrink: 0;
    transition: all 0.3s ease;
}

.submit-btn.disabled {
    background: #e0e0e0;
    color: #999;
    box-shadow: none;
}
</style>