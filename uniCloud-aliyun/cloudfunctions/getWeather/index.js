'use strict';
const uniID = require('uni-id-common')

exports.main = async (event, context) => {
    const db = uniCloud.database()
    const collection = db.collection('settings')
    
    try {
        return {
            code: 0,
            data: {
                temp: '26',
                text: '晴转多云',
                humidity: '45%',
                wind: '东南风 2级'
            }
        }
    } catch (e) {
        return {
            code: -1,
            message: '获取天气失败'
        }
    }
}
