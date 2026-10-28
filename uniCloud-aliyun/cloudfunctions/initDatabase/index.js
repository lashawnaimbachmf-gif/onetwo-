'use strict';

const db = uniCloud.database();

exports.main = async (event, context) => {
    try {
        // 尝试访问 pair 集合，如果不存在会自动创建
        await db.collection('pair').limit(1).get();
        
        return {
            code: 0,
            message: '数据库集合初始化成功'
        };
    } catch (err) {
        // 如果集合不存在，尝试创建
        try {
            await db.createCollection('pair');
            return {
                code: 0,
                message: 'pair 集合创建成功'
            };
        } catch (createErr) {
            return {
                code: -1,
                message: '创建失败: ' + createErr.message
            };
        }
    }
};
