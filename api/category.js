import { request } from './request.js'
import { BASE_URL } from './baseUrl.js'

export function getCategoryList() {
    return request({
        url: '/api/category',
        method: 'GET'
    })
}

export function getProductListByCategory() {
    return new Promise((resolve) => {
        resolve({
            list: [
                { id: 1, name: '热销套餐' },
                { id: 2, name: '主食' },
                { id: 3, name: '小菜' },
                { id: 4, name: '饮料' }
            ]
        })
    })
}
