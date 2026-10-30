<template>
    <uni-app>
        <slot />
    </uni-app>
</template>

<script>
import cloud from '@/utils/cloud.js'

export default {
    name: 'App',
    onLaunch() {
        // 使用自建后端，无需初始化云开发环境
        cloud.init()
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
