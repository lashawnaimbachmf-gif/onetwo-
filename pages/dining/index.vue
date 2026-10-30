<template>
    <view class="dining-page">
        <!-- Header — clean white, no gradient -->
        <view class="shop-header">
            <text class="shop-title">情侣点餐</text>
        </view>

        <!-- Tab Bar -->
        <view class="tab-bar">
            <view :class="['tab', activeTab === 0 ? 'active' : '']" @click="switchTab(0)">
                <text class="tab-text">我来点</text>
            </view>
            <view :class="['tab', activeTab === 1 ? 'active' : '']" @click="switchTab(1)">
                <text class="tab-text">我的订单</text>
            </view>
        </view>

        <!-- ========== 我来点 Tab ========== -->
        <view class="menu-area" v-if="activeTab === 0">
            <!-- Search Bar -->
            <view class="search-bar">
                <view class="search-input-wrapper">
                    <image class="search-icon-img" src="/static/icons/icon-search.png" mode="aspectFit" />
                    <input
                        class="search-input"
                        v-model="searchKeyword"
                        placeholder="搜索菜品名称..."
                        placeholder-class="search-placeholder"
                        @confirm="onSearchConfirm"
                    />
                    <view v-if="searchKeyword" class="clear-btn" @click="clearSearch">
                        <text class="clear-btn-text">×</text>
                    </view>
                </view>
            </view>

            <!-- Category Sidebar + Product Grid -->
            <view class="menu-body">
                <!-- Left: Category Sidebar -->
                <scroll-view class="category-sidebar" scroll-y :show-scrollbar="false">
                    <view
                        v-for="cat in categories"
                        :key="cat.key"
                        :class="['category-item', activeCategory === cat.key ? 'active' : '']"
                        @click="switchCategory(cat.key)"
                    >
                        <text class="category-name">{{ cat.name }}</text>
                    </view>
                </scroll-view>

                <!-- Right: Product Grid -->
                <scroll-view
                    class="product-scroll"
                    scroll-y
                    @scroll="onGoodsScroll"
                    :refresher-enabled="true"
                    :refresher-triggered="goodsRefreshing"
                    :refresher-threshold="60"
                    @refresherrefresh="onGoodsRefresh"
                    @scrolltolower="onScrollToLower"
                >
                    <view class="product-grid">
                        <!-- Product list — Luckin Coffee style (horizontal cards) -->
                        <view
                            v-for="item in filteredGoodsList"
                            :key="item.id"
                            class="product-item"
                            @longpress="onLongPress(item)"
                        >
                            <view class="item-img-wrapper">
                                <image
                                    class="item-img"
                                    :src="item.img || '/static/tabbar/home.png'"
                                    mode="aspectFill"
                                    lazy-load
                                />
                                <view v-if="!item.img || item.img === '/static/tabbar/home.png'" class="item-img-placeholder">
                                    <image class="item-img-placeholder-icon" src="/static/tabbar/dining.png" mode="aspectFit" />
                                </view>
                            </view>
                            <view class="item-content">
                                <text class="item-name">{{ item.name }}</text>
                                <view class="item-bottom">
                                    <view class="item-price-row">
                                        <text class="item-price-symbol">¥</text>
                                        <text class="item-price">{{ item.price }}</text>
                                        <text class="item-price-unit">币</text>
                                    </view>
                                </view>
                            </view>
                            <view class="item-action">
                                <view
                                    v-if="cart[item.id] && cart[item.id] > 0"
                                    class="ctrl-btn sub"
                                    @click.stop="subCart(item.id)"
                                >
                                    <text class="ctrl-icon">−</text>
                                </view>
                                <text
                                    v-if="cart[item.id] && cart[item.id] > 0"
                                    class="cart-count"
                                >{{ cart[item.id] }}</text>
                                <view :class="['ctrl-btn', 'add', cartAnimating[item.id] ? 'pop' : '']" @click.stop="addCart(item.id)">
                                    <text class="ctrl-icon">+</text>
                                </view>
                            </view>
                            <view class="item-menu-btn" @click.stop="onCardMenu(item)">
                                <text class="item-menu-dots">…</text>
                            </view>
                        </view>

                        <!-- Empty states -->
                        <view v-if="filteredGoodsList.length === 0 && !searchKeyword && activeCategory === 'all' && !goodsRefreshing" class="empty-state full-width">
                            <image class="empty-icon-img" src="/static/icons/icon-dining-empty.png" mode="aspectFit" />
                            <text class="empty-text">还没有菜品</text>
                            <text class="empty-sub">去上传新菜谱吧</text>
                        </view>
                        <view v-else-if="filteredGoodsList.length === 0 && !searchKeyword && !goodsRefreshing" class="empty-state full-width">
                            <text class="empty-text">这个分类还没有菜品</text>
                        </view>
                        <view v-else-if="filteredGoodsList.length === 0 && searchKeyword && !goodsRefreshing" class="empty-state full-width">
                            <text class="empty-text">没有找到包含"{{ searchKeyword }}"的菜品</text>
                            <text class="empty-sub" @click="clearSearch">清除搜索</text>
                        </view>
                    </view>

                    <!-- Bottom spacer for scroll -->
                    <view class="grid-bottom-spacer" />
                </scroll-view>
            </view>
        </view>

        <!-- ========== 我的订单 Tab ========== -->
        <view class="order-area" v-else>
            <scroll-view
                class="order-scroll"
                scroll-y
                @scroll="onOrderScroll"
                :scroll-top="orderScrollTop"
                :refresher-enabled="true"
                :refresher-threshold="80"
                :refresher-triggered="orderRefreshing"
                @refresherrefresh="onOrderRefresh"
            >
                <view v-if="orderList.length === 0 && !orderRefreshing" class="empty-state">
                    <image class="empty-icon-img" src="/static/icons/icon-dining-empty.png" mode="aspectFit" />
                    <text class="empty-text">还没有订单呢</text>
                    <text class="empty-sub">去「我来点」发起一个订单吧</text>
                </view>
                <view v-else class="order-list">
                    <view class="order-item" v-for="item in orderList" :key="item.id" @click="goOrderDetail(item)">
                        <view class="order-header">
                            <view class="order-creator">
                                <image
                                    class="creator-avatar"
                                    :src="getDisplayName(item.creatorOpenid) === userInfo.nickName ? userInfo.avatarUrl : (partnerInfo ? partnerInfo.avatarUrl : '/static/tabbar/user.png')"
                                    mode="aspectFill"
                                />
                                <text class="creator-name">{{ item.creatorName || getDisplayName(item.creatorOpenid) }}</text>
                            </view>
                            <view :class="['order-status-badge', statusClass(item.status)]">
                                <text class="status-text">{{ item.status }}</text>
                            </view>
                        </view>
                        <view class="order-goods">
                            <view class="order-goods-item" v-for="(g, idx) in item.goods" :key="idx">
                                <text class="goods-bullet">·</text>
                                <text class="goods-name">{{ g.name || '未知菜品' }}</text>
                                <text class="goods-count">x{{ g.count || 1 }}</text>
                            </view>
                        </view>
                        <view v-if="item.remark" class="order-remark">
                            <text class="remark-label">备注</text>
                            <text class="remark-text">{{ item.remark }}</text>
                        </view>
                        <view class="order-footer">
                            <text class="order-time">{{ formatTime(item.createTime) }}</text>
                            <view class="order-total-row">
                                <text class="order-total-label">合计</text>
                                <text class="order-total">{{ item.total }} 币</text>
                            </view>
                        </view>
                        <view
                            v-if="item.status === '待确认' && item.creatorOpenid !== userInfo.openid"
                            class="order-confirm-bar"
                            @click.stop="confirmOrder(item)"
                        >
                            <text class="confirm-btn-text">确认订单</text>
                        </view>
                    </view>
                </view>
            </scroll-view>
        </view>

        <!-- ========== Bottom Bar (only on order tab) ========== -->
        <view class="bottom-bar" v-if="activeTab === 0">
            <view class="bottom-content">
                <view class="remark-box" @click="showRemarkInput">
                    <image class="remark-icon" src="/static/icons/icon-reply.png" mode="aspectFit" />
                    <text class="remark-text">{{ orderRemark || '点击添加备注' }}</text>
                </view>
                <view class="total-box">
                    <text class="total-label">合计</text>
                    <text :class="['total-price', cartCount === 0 ? 'disabled' : '']">{{ totalPrice }}</text>
                    <text class="total-unit">币</text>
                </view>
                <view
                    :class="['submit-btn', cartCount === 0 ? 'disabled' : '']"
                    @click="submitOrder"
                >
                    <text class="submit-text">{{ cartCount > 0 ? `提交(${cartCount})` : '提交' }}</text>
                </view>
            </view>
        </view>
        <CustomTabBar :activeIndex="2" />
    </view>
</template>

<script>
import cloud from '@/utils/cloud.js'
import UserManager from '@/utils/user.js'
import CloudData from '@/utils/cloudData.js'
import TimeFormat from '@/utils/timeFormat.js'
import CustomTabBar from '@/components/CustomTabBar.vue'

const CATEGORIES = [
    { key: 'all', name: '全部' },
    { key: '主食', name: '主食' },
    { key: '饮品', name: '饮品' },
    { key: '甜品', name: '甜品' },
    { key: '其他', name: '其他' }
]

export default {
    components: { CustomTabBar },
    data() {
        return {
            activeTab: 0,
            goodsList: [],
            cart: {},
            orderList: [],
            userInfo: {},
            partnerInfo: null,
            isBind: false,
            goodsRefreshing: false,
            orderRefreshing: false,
            orderRemark: '',
            searchKeyword: '',
            activeCategory: 'all',
            categories: CATEGORIES,
            orderScrollTop: 0,
            goodsScrollTop: 0,
            cartAnimating: {}
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
            let list = this.goodsList
            if (this.searchKeyword) {
                const kw = this.searchKeyword.toLowerCase()
                list = list.filter(item =>
                    item.name && item.name.toLowerCase().includes(kw)
                )
            } else if (this.activeCategory !== 'all') {
                list = list.filter(item =>
                    (item.category || '其他') === this.activeCategory
                )
            }
            return list
        }
    },
    onLoad() {
        this.loadUserInfo()
        this.loadGoods()
        this.loadOrders()
    },
    onShow() {
        this.loadUserInfo()
        this.loadGoods()
    },
    methods: {
        // ── User ────────────────────────────────────
        loadUserInfo() {
            this.userInfo = UserManager.getUserInfo()
            this.partnerInfo = UserManager.getPartnerInfo()
            this.isBind = UserManager.isBind()
        },
        getDisplayName(openid) {
            return UserManager.getDisplayName(openid)
        },
        async checkReverseBind() {
            try {
                const res = await cloud.callFunction({
                    name: 'inviteCode',
                    data: { action: 'checkReverse', userInfo: this.userInfo }
                })
                if (res.result && res.result.code === 0 && res.result.data.hasBind) {
                    UserManager.setPartnerInfo(res.result.data.partnerInfo)
                    this.partnerInfo = res.result.data.partnerInfo
                    this.isBind = true
                }
            } catch (err) {
                console.error('检查反向绑定失败:', err)
            }
        },

        // ── Format ──────────────────────────────────
        formatTime(time) {
            return TimeFormat.formatTime(time)
        },

        // ── Tab ─────────────────────────────────────
        async switchTab(index) {
            this.activeTab = index
            if (index === 1) {
                this.orderScrollTop = 0
                await this.loadOrders()
            }
        },

        // ── Category ────────────────────────────────
        switchCategory(key) {
            this.activeCategory = key
        },

        // ── Data Loading ────────────────────────────
        async loadGoods() {
            const coupleOpenids = UserManager.getCoupleOpenids()
            const list = await CloudData.getDishes(coupleOpenids)
            if (list && list.length > 0) {
                this.goodsList = list.map(item => ({
                    ...item,
                    id: item._id || item.id,
                    category: item.category || '其他'
                }))
            } else {
                this.goodsList = []
            }
        },
        async loadOrders() {
            const coupleOpenids = UserManager.getCoupleOpenids()
            const list = await CloudData.getOrders(coupleOpenids)
            this.orderList = (list || []).map(item => ({
                ...item,
                id: item._id || item.id
            }))
            this.checkNewOrder()
        },
        checkNewOrder() {
            const userInfo = UserManager.getUserInfo()
            const newOrder = this.orderList.find(item =>
                item.isNew && item.creatorOpenid !== userInfo.openid
            )
            if (newOrder) {
                this.showNewOrderTip = true
                this.newOrderData = newOrder
            }
        },

        // ── Pull-down Refresh ───────────────────────
        async onGoodsRefresh() {
            if (this.goodsScrollTop > 60) {
                this.goodsRefreshing = true
                this.$nextTick(() => { this.goodsRefreshing = false })
                return
            }
            this.goodsRefreshing = true
            await this.loadUserInfo()
            if (!this.isBind && this.userInfo.openid) {
                await this.checkReverseBind()
            }
            await this.loadGoods()
            await this.loadOrders()
            this.goodsRefreshing = false
            uni.showToast({ title: '刷新成功', icon: 'success', duration: 1500 })
        },

        // ── Order Scroll ────────────────────────────
        onOrderScroll(e) {
            this.orderScrollTop = e.detail.scrollTop
        },
        onGoodsScroll(e) {
            this.goodsScrollTop = e.detail.scrollTop
        },
        async onOrderRefresh() {
            if (this.orderScrollTop > 60) {
                this.orderRefreshing = true
                this.$nextTick(() => { this.orderRefreshing = false })
                return
            }
            this.orderRefreshing = true
            await this.loadOrders()
            this.orderRefreshing = false
        },
        onScrollToLower() {
            // no-op for now: pagination placeholder
        },

        // ── Search ──────────────────────────────────
        clearSearch() {
            this.searchKeyword = ''
        },
        onSearchConfirm() {
            // search triggers reactively via computed
        },

        // ── Cart ────────────────────────────────────
        addCart(id) {
            this.$set(this.cart, id, (this.cart[id] || 0) + 1)
            // animation + light haptic feedback
            this.$set(this.cartAnimating, id, true)
            setTimeout(() => { this.$set(this.cartAnimating, id, false) }, 180)
            try { uni.vibrateShort({ type: 'light' }) } catch (e) { /* noop */ }
        },
        subCart(id) {
            if (this.cart[id] > 0) {
                this.$set(this.cart, id, this.cart[id] - 1)
                if (this.cart[id] === 0) {
                    this.$delete(this.cart, id)
                }
            }
        },

        // ── Order Submission ────────────────────────
        async submitOrder() {
            if (!UserManager.getToken() || !UserManager.getOpenid()) {
                uni.showModal({
                    title: '提示',
                    content: '请先登录后再点餐哦～',
                    confirmText: '去登录',
                    success: (res) => {
                        if (res.confirm) uni.navigateTo({ url: '/subPages/login/login' })
                    }
                })
                return
            }
            if (Object.keys(this.cart).length === 0) {
                uni.showToast({ title: '还没选菜呢～', icon: 'none' })
                return
            }

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
                if (result.data) await this.sendOrderNotification(result.data)
            } else {
                uni.showToast({ title: result.message, icon: 'none' })
            }
        },
        async requestSubscribeMessage() {
            try {
                const res = await uni.requestSubscribeMessage({
                    tmplIds: ['0IKc45bcYw7j_ASZPc8ajIZ7pJ05ruH0c3zbGFbqEzE']
                })
                return res['0IKc45bcYw7j_ASZPc8ajIZ7pJ05ruH0c3zbGFbqEzE'] === 'accept'
            } catch (err) {
                console.error('订阅消息失败:', err)
                return false
            }
        },
        async sendOrderNotification(order) {
            try {
                const partnerInfo = UserManager.getPartnerInfo()
                if (!partnerInfo || !partnerInfo.openid) return

                const goodsList = order.goods.map(g => `${g.name}x${g.count}`).join('、')
                await cloud.callFunction({
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
            } catch (err) {
                console.error('发送消息失败:', err)
            }
        },
        showRemarkInput() {
            uni.showModal({
                title: '添加备注',
                editable: true,
                placeholderText: '请输入备注信息...',
                content: this.orderRemark,
                success: (res) => {
                    if (res.confirm) this.orderRemark = res.content
                }
            })
        },

        // ── Card Menu (visible affordance) ─────────
        onCardMenu(item) {
            this.onLongPress(item)
        },

        // ── Long Press → Edit / Delete ──────────────
        onLongPress(item) {
            uni.showActionSheet({
                itemList: ['修改菜品', '删除菜品'],
                itemColor: '#1A1A1A',
                success: (res) => {
                    if (res.tapIndex === 0) this.editDish(item)
                    if (res.tapIndex === 1) this.deleteDish(item)
                }
            })
        },

        // ── Dish CRUD ───────────────────────────────
        addDish() {
            uni.navigateTo({ url: '/subPages/dining/add-dish' })
        },
        editDish(item) {
            uni.navigateTo({
                url: `/subPages/dining/edit-dish?id=${item.id}&name=${encodeURIComponent(item.name)}&price=${item.price}&category=${encodeURIComponent(item.category || '其他')}`
            })
        },
        async deleteDish(item) {
            uni.showModal({
                title: '确认删除',
                content: `确定要删除「${item.name}」吗？删除后不可恢复。`,
                confirmColor: '#e53935',
                success: async (res) => {
                    if (!res.confirm) return
                    uni.showLoading({ title: '删除中...' })
                    const deleteRes = await CloudData.deleteDish(item.id)
                    if (deleteRes.success) {
                        const index = this.goodsList.findIndex(g => g.id === item.id)
                        if (index !== -1) this.goodsList.splice(index, 1)
                        if (this.cart[item.id]) this.$delete(this.cart, item.id)
                        uni.hideLoading()
                        uni.showToast({ title: '已删除', icon: 'success' })
                    } else {
                        uni.hideLoading()
                        uni.showToast({ title: '删除失败，网络不稳定，请下拉刷新后重试', icon: 'none' })
                    }
                }
            })
        },

        // ── Order Detail ────────────────────────────
        goOrderDetail(item) {
            getApp().globalData.orderDetailData = item
            uni.navigateTo({ url: '/subPages/dining/order-detail' })
        },

        // ── Confirm Order ───────────────────────────
        async confirmOrder(item) {
            uni.showModal({
                title: '确认订单',
                content: '确认这份订单吗？确认后对方将看到订单已确认。',
                confirmText: '确认',
                confirmColor: '#FF6B9D',
                success: async (res) => {
                    if (!res.confirm) return
                    uni.showLoading({ title: '确认中...' })
                    const result = await CloudData.updateOrder(item.id, { status: '已确认' })
                    uni.hideLoading()
                    if (result.success) {
                        await this.loadOrders()
                        uni.showToast({ title: '已确认', icon: 'success' })
                    } else {
                        uni.showToast({ title: result.message || '操作失败', icon: 'none' })
                    }
                }
            })
        },

        // ── Status Helper ───────────────────────────
        statusClass(status) {
            if (status === '待确认') return 'status-pending'
            if (status === '已确认') return 'status-confirmed'
            return ''
        }
    }
}
</script>

<style scoped>
/* ================================================================
   DINING PAGE — Luckin Coffee-inspired category + grid layout
   ================================================================ */

.dining-page {
    background: #F7F8FA;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding-bottom: calc(100rpx + env(safe-area-inset-bottom) + 20rpx);
}

/* ── Header ───────────────────────────────────── */
.shop-header {
    background: transparent;
    padding: calc(var(--status-bar-height) + 28rpx) 32rpx 20rpx;
    text-align: center;
}

.shop-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1A1A1A;
}

/* ── Tab Bar — Floating Pill ─────────────────────── */
.tab-bar {
    display: flex;
    margin: 0 32rpx;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(16rpx);
    -webkit-backdrop-filter: blur(16rpx);
    border-radius: 24rpx;
    padding: 4rpx;
    box-shadow: 0 4rpx 24rpx rgba(255, 107, 157, 0.06), 0 1rpx 6rpx rgba(0, 0, 0, 0.03);
}

.tab {
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 18rpx 0;
    border-radius: 20rpx;
    transition: background 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.tab.active {
    background: #FF6B9D;
    box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.25);
}

.tab-text {
    font-size: 28rpx;
    color: #999999;
    font-weight: 500;
    transition: color 0.25s ease;
}

.tab.active .tab-text {
    color: #FFFFFF;
    font-weight: 600;
}

/* ── Search Bar ───────────────────────────────── */
.search-bar {
    padding: 16rpx 24rpx;
    background: transparent;
}

.search-input-wrapper {
    display: flex;
    align-items: center;
    background: #F7F8FA;
    border-radius: 48rpx;
    padding: 14rpx 24rpx;
}

.search-icon-img {
    width: 32rpx;
    height: 32rpx;
    margin-right: 12rpx;
    flex-shrink: 0;
    opacity: 0.5;
}

.search-input {
    flex: 1;
    font-size: 28rpx;
    color: #1A1A1A;
}

.search-placeholder {
    color: #999999;
}

.clear-btn {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: #E8E8E8;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s ease;
}

.clear-btn:active {
    background: #D0D0D0;
}

.clear-btn-text {
    font-size: 28rpx;
    color: #999999;
    font-weight: 600;
    line-height: 1;
}

/* ── Menu Body (category sidebar + product grid) ─────────────── */
.menu-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.menu-body {
    flex: 1;
    display: flex;
    overflow: hidden;
}

/* ── Category Sidebar ────────────────────────────────────────── */
.category-sidebar {
    width: 160rpx;
    background: transparent;
    flex-shrink: 0;
    padding: 8rpx 0;
}

.category-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 26rpx 16rpx;
    margin: 4rpx 12rpx;
    border-radius: 16rpx;
    transition: all 0.2s ease;
}

.category-name {
    font-size: 26rpx;
    color: #999999;
    transition: all 0.2s ease;
}

.category-item.active {
    background: #FFFFFF;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.category-item.active .category-name {
    color: #FF6B9D;
    font-weight: 700;
}

/* ── Product Scroll Area ──────────────────────── */
.product-scroll {
    flex: 1;
    background: transparent;
}

/* ── Product List — Luckin Coffee Style ──────────────────────── */
.product-grid {
    padding: 16rpx 0;
}

.grid-bottom-spacer {
    height: 160rpx;
    width: 100%;
}

/* ── Product Item — Luckin Style Horizontal Card ─────────────── */
.product-item {
    display: flex;
    align-items: center;
    margin: 0 24rpx 16rpx;
    padding: 20rpx;
    background: #FFFFFF;
    border-radius: 20rpx;
    box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
    position: relative;
    transition: box-shadow 0.3s ease;
}

.product-item:active {
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
}

.item-img-wrapper {
    width: 140rpx;
    height: 140rpx;
    border-radius: 16rpx;
    background: #F7F8FA;
    overflow: hidden;
    flex-shrink: 0;
    margin-right: 20rpx;
}

.item-img {
    width: 100%;
    height: 100%;
}

.item-img-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.item-img-placeholder-icon {
    width: 60rpx;
    height: 60rpx;
    opacity: 0.3;
}

.item-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12rpx;
}

.item-name {
    font-size: 30rpx;
    font-weight: 600;
    color: #1A1A1A;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.item-bottom {
    display: flex;
    align-items: center;
}

.item-price-row {
    display: flex;
    align-items: baseline;
    gap: 2rpx;
}

.item-price-symbol {
    font-size: 24rpx;
    color: #FF6B9D;
    font-weight: 600;
}

.item-price {
    font-size: 34rpx;
    color: #FF6B9D;
    font-weight: 700;
    line-height: 1;
}

.item-price-unit {
    font-size: 22rpx;
    color: #FF6B9D;
    margin-left: 4rpx;
}

/* ── Item Action (Add to Cart) ─────────────────── */
.item-action {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-left: 16rpx;
    flex-shrink: 0;
}

.item-menu-btn {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    width: 44rpx;
    height: 44rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.item-menu-dots {
    font-size: 28rpx;
    color: #CCCCCC;
    font-weight: 700;
    line-height: 1;
}

/* ── Cart +/- Controls ──────────────────────────────────────── */
.ctrl-btn {
    width: 52rpx;
    height: 52rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease;
}

.ctrl-btn:active {
    transform: scale(0.88);
}

.ctrl-btn.add.pop {
    animation: cart-pop 0.18s ease-out;
}

@keyframes cart-pop {
    0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 157, 0.5); }
    50%  { transform: scale(1.2); box-shadow: 0 0 16rpx 6rpx rgba(255, 107, 157, 0.3); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 157, 0); }
}

@media (prefers-reduced-motion: reduce) {
    .ctrl-btn.add.pop {
        animation: none;
    }
}

.ctrl-btn.add {
    background: #FF6B9D;
}

.ctrl-btn.sub {
    background: #FFFFFF;
    border: 2rpx solid #E8E8E8;
}

.ctrl-btn.add .ctrl-icon {
    color: #FFFFFF;
    font-size: 34rpx;
    line-height: 1;
}

.ctrl-btn.sub .ctrl-icon {
    color: #666666;
    font-size: 34rpx;
    line-height: 1;
}

.cart-count {
    font-size: 28rpx;
    color: #1A1A1A;
    font-weight: 600;
    min-width: 36rpx;
    text-align: center;
}

/* ── Empty States ────────────────────────────────────────────── */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80rpx 32rpx;
}

.empty-state.full-width {
    width: 100%;
}

.empty-icon-img {
    width: 120rpx;
    height: 120rpx;
    margin-bottom: 24rpx;
    opacity: 0.6;
}

.empty-text {
    font-size: 28rpx;
    color: #999999;
    margin-bottom: 12rpx;
}

.empty-sub {
    font-size: 24rpx;
    color: #FF6B9D;
}

/* ================================================================
   ORDER TAB
   ================================================================ */

.order-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.order-scroll {
    flex: 1;
    background: #F7F8FA;
}

.order-list {
    padding: 24rpx;
}

.order-item {
    background: #FFFFFF;
    border-radius: 20rpx;
    padding: 28rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 4rpx 24rpx rgba(255, 107, 157, 0.06);
}

.order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    padding-bottom: 16rpx;
    border-bottom: 1rpx solid #F0F0F0;
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
    background: #F7F8FA;
}

.creator-name {
    font-size: 26rpx;
    color: #1A1A1A;
    font-weight: 500;
}

.order-status-badge {
    padding: 6rpx 16rpx;
    border-radius: 48rpx;
}

.status-pending {
    background: #FFF5F8;
}

.status-pending .status-text {
    color: #FF6B9D;
}

.status-confirmed {
    background: #F0FAF4;
}

.status-confirmed .status-text {
    color: #07C160;
}

.status-text {
    font-size: 22rpx;
    font-weight: 500;
}

.order-goods {
    margin-bottom: 16rpx;
}

.order-goods-item {
    display: flex;
    align-items: center;
    padding: 6rpx 0;
    gap: 8rpx;
}

.goods-bullet {
    color: #E0E0E0;
    font-size: 24rpx;
}

.goods-name {
    font-size: 28rpx;
    color: #1A1A1A;
    flex: 1;
}

.goods-count {
    font-size: 24rpx;
    color: #999999;
}

.order-remark {
    display: flex;
    align-items: flex-start;
    background: #F7F8FA;
    border-radius: 12rpx;
    padding: 16rpx 20rpx;
    margin-bottom: 16rpx;
    gap: 8rpx;
}

.remark-label {
    font-size: 24rpx;
    color: #999999;
    flex-shrink: 0;
}

.remark-text {
    font-size: 24rpx;
    color: #666666;
    line-height: 1.5;
}

.order-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16rpx;
    border-top: 1rpx solid #F0F0F0;
}

.order-time {
    font-size: 22rpx;
    color: #999999;
}

.order-total-row {
    display: flex;
    align-items: baseline;
    gap: 6rpx;
}

.order-total-label {
    font-size: 22rpx;
    color: #999999;
}

.order-total {
    font-size: 28rpx;
    color: #FF6B9D;
    font-weight: 700;
}

/* ── Confirm Bar ──────────────────────────────── */
.order-confirm-bar {
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1rpx solid #F0F0F0;
    display: flex;
    justify-content: center;
}

.confirm-btn-text {
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    color: #FFFFFF;
    font-size: 26rpx;
    font-weight: 600;
    padding: 14rpx 48rpx;
    border-radius: 48rpx;
    box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.18);
}

/* ================================================================
   BOTTOM BAR — Frosted Glass
   ================================================================ */

.bottom-bar {
    position: fixed;
    bottom: calc(100rpx + env(safe-area-inset-bottom));
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(24rpx);
    -webkit-backdrop-filter: blur(24rpx);
    padding: 12rpx 24rpx 12rpx 24rpx;
    box-shadow: 0 -4rpx 32rpx rgba(255, 107, 157, 0.06), 0 -1rpx 0 rgba(255, 107, 157, 0.08);
    z-index: 999;
}

.bottom-content {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 16rpx;
}

.remark-box {
    display: flex;
    align-items: center;
    background: #F7F8FA;
    border-radius: 48rpx;
    padding: 14rpx 20rpx;
    flex: 1;
    min-width: 0;
    transition: background 0.25s ease;
}

.remark-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 8rpx;
    flex-shrink: 0;
    opacity: 0.5;
}

.remark-box .remark-text {
    font-size: 26rpx;
    color: #999999;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.total-box {
    display: flex;
    align-items: baseline;
    gap: 2rpx;
    flex-shrink: 0;
}

.total-label {
    font-size: 22rpx;
    color: #999999;
    margin-right: 4rpx;
}

.total-price {
    font-size: 36rpx;
    font-weight: 700;
    color: #FF6B9D;
    transition: color 0.25s ease;
}

.total-price.disabled {
    color: #D0D0D0;
}

.total-unit {
    font-size: 22rpx;
    color: #999999;
    margin-left: 2rpx;
}

.submit-btn {
    background: linear-gradient(135deg, #FF6B9D, #FF8DB5);
    border-radius: 48rpx;
    padding: 16rpx 32rpx;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 140rpx;
    box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.22);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease, box-shadow 0.35s ease;
}

.submit-btn:active {
    transform: scale(0.96);
    opacity: 0.9;
    box-shadow: 0 3rpx 12rpx rgba(255, 107, 157, 0.18);
}

.submit-btn.disabled {
    background: #E8E8E8;
    box-shadow: none;
}

.submit-text {
    font-size: 28rpx;
    color: #FFFFFF;
    font-weight: 600;
}

.submit-btn.disabled .submit-text {
    color: #AAAAAA;
}
</style>
