// 天气数据直接返回硬编码常量，不连接数据库，不加载任何模块
exports.main = async (event, context) => {
    return {
        code: 0,
        data: {
            temp: '26',
            text: '晴转多云',
            humidity: '45%',
            wind: '东南风 2级'
        }
    }
}
