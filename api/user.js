import { request } from './request.js'
import { BASE_URL } from './baseUrl.js'

export function login(data) {
    return request({
        url: '/api/auth/login',
        method: 'POST',
        data
    })
}

export function getUserInfo() {
    return request({
        url: '/api/user/me',
        method: 'GET'
    })
}

export function logout() {
    return request({
        url: '/api/auth/logout',
        method: 'POST'
    })
}
