<template>
    <uni-app>
        <slot />
    </uni-app>
</template>

<script>
export default {
    name: 'App',
    onLaunch() {
        // 初始化微信云开发
        if (typeof wx !== 'undefined' && wx.cloud) {
            wx.cloud.init({
                env: 'cloud1-d9gkl1jnyfa0d3be5',
                traceUser: true
            })
        }
        // 不再强制检查登录状态，允许用户先浏览功能
        // 登录检查在各具体功能页面中进行
    }
}
</script>

<style>
/* 全局样式 */
page {
    background: #f7f8fa;
    min-height: 100vh;
}

.uni-app {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    color: #1a1a1a;
}
</style>
