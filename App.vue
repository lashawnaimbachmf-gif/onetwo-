<template>
    <uni-app>
        <slot />
    </uni-app>
</template>

<script>
export default {
    name: 'App',
    onLaunch() {
        // 允许游客模式浏览，不再强制跳转登录页
        // 用户可以在需要互动功能时自行选择登录
    },
    methods: {
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
    color: #222;
}
</style>
