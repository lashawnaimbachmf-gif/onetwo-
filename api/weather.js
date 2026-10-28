// 和风天气配置
// 密钥不入库：请参考 config/keys.example.js 创建 config/keys.js 后填入自己的 Key
import { WEATHER_KEY } from '../config/keys.js'

if (!WEATHER_KEY) {
    console.warn('[weather] 未配置 WEATHER_KEY，天气接口将返回默认数据。请参考 config/keys.example.js 创建 config/keys.js')
}

// 默认位置（北京）
const DEFAULT_LOCATION = {
    latitude: 39.9042,
    longitude: 116.4074,
    city: '北京'
}

// 获取用户位置 - 使用GPS定位
export function getLocation() {
    return new Promise((resolve) => {
        uni.getLocation({
            type: 'gcj02',
            isHighAccuracy: true,
            highAccuracyExpireTime: 3000,
            success: (res) => {
                console.log('获取位置成功:', res)
                resolve({
                    latitude: res.latitude,
                    longitude: res.longitude
                })
            },
            fail: (err) => {
                console.log('获取位置失败:', err)
                // 失败时使用默认位置
                resolve({ ...DEFAULT_LOCATION })
            }
        })
    })
}

// 获取城市名称
export function getCityName(latitude, longitude) {
    return new Promise((resolve) => {
        uni.request({
            url: `https://geoapi.qweather.com/v2/city/lookup?location=${longitude},${latitude}&key=${WEATHER_KEY}`,
            success: (res) => {
                console.log('城市查询结果:', res)
                if (res && res.data && res.data.location && res.data.location.length > 0) {
                    resolve(res.data.location[0].name)
                } else {
                    resolve('北京')
                }
            },
            fail: (err) => {
                console.log('获取城市失败:', err)
                resolve('北京')
            }
        })
    })
}

// 获取天气数据
export async function getWeather() {
    try {
        // 获取位置
        const location = await getLocation()
        console.log('使用位置:', location)
        
        // 获取城市名称
        const cityName = await getCityName(location.latitude, location.longitude)
        console.log('城市名称:', cityName)
        
        // 调用和风天气API
        const weatherUrl = `https://devapi.qweather.com/v7/weather/now?location=${location.longitude},${location.latitude}&key=${WEATHER_KEY}`
        console.log('天气API:', weatherUrl)
        
        const [err, res] = await uni.request({ url: weatherUrl })
        console.log('天气结果:', res)
        
        if (res && res.data && res.data.now) {
            const now = res.data.now
            return {
                temp: now.temp,
                text: now.text,
                humidity: now.humidity + '%',
                wind: now.windDir + ' ' + now.windScale + '级',
                city: cityName,
                location: location
            }
        }
        
        throw new Error('天气数据格式错误')
    } catch (err) {
        console.log('获取天气失败:', err)
        return {
            temp: '26',
            text: '晴转多云',
            humidity: '45%',
            wind: '东南风 2级',
            city: '北京',
            location: DEFAULT_LOCATION
        }
    }
}

// 获取天气建议
export function getWeatherTips(temp, weather) {
    if (!temp) return '加载中...'
    const t = parseInt(temp)
    if (t < 10) return '今天有点冷哦，记得多穿衣服！'
    if (t < 20) return '温度适中，舒适的一天～'
    if (weather && weather.includes('雨')) return '今天有雨，记得带伞！'
    if (weather && weather.includes('霾')) return '今天有霾，出门记得戴口罩！'
    return '今天温度适宜，适合约会哦～'
}
