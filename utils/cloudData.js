/**
 * �ƶ����ݹ���������
 * ������ش洢��ʹ�� uniCloud ���ݿ�
 */

import uniCloud from '@/utils/cloud.js'

const CloudData = {
    // �����ƺ���
    async callDataService(action, collection, params = {}) {
        try {
            console.log(`�����ƺ���: dataService, action: ${action}, collection: ${collection}`)
            
            const res = await uniCloud.callFunction({
                name: 'dataService',
                data: {
                    action,
                    collection,
                    ...params
                }
            })
            
            console.log('�ƺ�������:', res)
            
            if (res.result && res.result.code === 0) {
                return { success: true, data: res.result.data }
            } else {
                const msg = res.result ? res.result.message : '�ƺ��������쳣'
                console.error('�ƺ������ش���:', msg)
                return { success: false, message: msg }
            }
        } catch (err) {
            console.error('�ƶ˲���ʧ��:', err)
            // ��ϸ������Ϣ
            let errorMsg = '���������������'
            if (err.message && err.message.includes('not found')) {
                errorMsg = '�ƺ���δ��������HBuilderX���ϴ������ƺ���'
            } else if (err.message) {
                errorMsg = err.message
            }
            return { success: false, message: errorMsg }
        }
    },

    // ========== ������ ==========
    // ��ȡ�������б�
    async getAnniversaries(openids) {
        const result = await this.callDataService('get', 'anniversary', { openids })
        if (result.success) {
            // ���ӵ���ʱ
            return result.data.map(item => ({
                ...item,
                countdown: this.getCountdown(item.date)
            }))
        }
        return []
    },

    // ���Ӽ�����
    async addAnniversary(data) {
        return await this.callDataService('add', 'anniversary', { data })
    },

    // ���¼�����
    async updateAnniversary(id, data) {
        return await this.callDataService('update', 'anniversary', { id, data })
    },

    // ɾ��������
    async deleteAnniversary(id) {
        return await this.callDataService('delete', 'anniversary', { id })
    },

    // ========== ���齺�� ==========
    // ��ȡ�����б�
    async getCapsules(openids) {
        const result = await this.callDataService('get', 'capsule', { openids })
        return result.success ? result.data : []
    },

    // ���ӽ���
    async addCapsule(data) {
        return await this.callDataService('add', 'capsule', { data })
    },

    // ���½��ң�����Ϊ�ѿ�����
    async updateCapsule(id, data) {
        return await this.callDataService('update', 'capsule', { id, data })
    },

    // ========== ���� ==========
    // ��ȡ�����б�
    async getTrees(openids) {
        const result = await this.callDataService('get', 'tree', { openids })
        return result.success ? result.data : []
    },

    // ��������
    async addTree(data) {
        return await this.callDataService('add', 'tree', { data })
    },

    // �����������籧�����ظ���
    async updateTree(id, data) {
        return await this.callDataService('update', 'tree', { id, data })
    },

    // ========== ��� ==========
    // ��ȡ��Ʒ�б�
    async getDishes(openids) {
        const result = await this.callDataService('get', 'dish', { openids })
        return result.success ? result.data : []
    },

    // ���Ӳ�Ʒ
    async addDish(data) {
        return await this.callDataService('add', 'dish', { data })
    },

    // ���²�Ʒ
    async updateDish(id, data) {
        return await this.callDataService('update', 'dish', { id, data })
    },

    // ɾ����Ʒ
    async deleteDish(id) {
        return await this.callDataService('delete', 'dish', { id })
    },

    // ========== ���� ==========
    // ��ȡ�����б�
    async getOrders(openids) {
        const result = await this.callDataService('get', 'order', { openids })
        return result.success ? result.data : []
    },

    // 添加订单
    async addOrder(data) {
        return await this.callDataService('add', 'order', { data })
    },
    
    // 更新订单
    async updateOrder(id, data) {
        return await this.callDataService('update', 'order', { id, data })
    },

    // ========== ���߷��� ==========
    // ���㵹��ʱ
    getCountdown(dateStr) {
        const target = new Date(dateStr)
        const now = new Date()
        const diff = target - now
        
        if (diff < 0) {
            // �ѹ�ȥ������
            return Math.floor(-diff / (1000 * 60 * 60 * 24))
        }
        
        // ��ʣ������
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }
}

export default CloudData
