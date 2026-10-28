export async function request(options = {}) {
    const { url, method, data } = options
    
    try {
        const res = await uniCloud.callFunction({
            name: url,
            data: data || {}
        })
        
        if (res.result.code === 0) {
            return res.result.data
        } else {
            uni.showToast({ title: res.result.message || '请求失败', icon: 'none' })
            throw new Error(res.result.message)
        }
    } catch (e) {
        uni.showToast({ title: '网络请求失败', icon: 'none' })
        throw e
    }
}

export async function getList(collection, where = {}) {
    try {
        const res = await uniCloud.callFunction({
            name: 'getList',
            data: { collection, where }
        })
        if (res.result.code === 0) {
            return res.result.data
        }
        return []
    } catch (e) {
        console.error('getList error', e)
        return []
    }
}

export async function addData(collection, data) {
    try {
        const res = await uniCloud.callFunction({
            name: 'addData',
            data: { collection, data }
        })
        if (res.result.code === 0) {
            return res.result.data
        }
        return null
    } catch (e) {
        console.error('addData error', e)
        return null
    }
}

export async function updateData(collection, id, data) {
    try {
        const res = await uniCloud.callFunction({
            name: 'updateData',
            data: { collection, id, data }
        })
        return res.result.code === 0
    } catch (e) {
        console.error('updateData error', e)
        return false
    }
}

export async function deleteData(collection, id) {
    try {
        const res = await uniCloud.callFunction({
            name: 'deleteData',
            data: { collection, id }
        })
        return res.result.code === 0
    } catch (e) {
        console.error('deleteData error', e)
        return false
    }
}
