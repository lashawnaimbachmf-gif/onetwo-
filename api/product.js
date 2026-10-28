import { request } from './request.js'
import { BASE_URL } from './baseUrl.js'

export function getProductList(params) {
    return request({
        url: '/api/product',
        method: 'GET',
        data: params
    })
}

export function getProductDetail(id) {
    return request({
        url: `/api/product/${id}`,
        method: 'GET'
    })
}
