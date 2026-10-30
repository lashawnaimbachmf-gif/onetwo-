'use strict'

const { objectId } = require('../ids')

/**
 * MongoDB 驱动。生产环境用这个；本地没装 MongoDB 时可以完全不 require 它。
 */
function create (url, dbName) {
  let dbPromise = null

  function db () {
    if (!dbPromise) {
      let mongodb
      try {
        mongodb = require('mongodb')
      } catch (e) {
        throw new Error('已配置 MONGO_URL 但未安装 mongodb 依赖，请执行：cd server && npm i mongodb')
      }
      dbPromise = mongodb.MongoClient
        .connect(url, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 })
        .then(client => client.db(dbName))
        .catch(err => {
          dbPromise = null
          throw new Error(`连接 MongoDB 失败（${url}）：${err.message}`)
        })
    }
    return dbPromise
  }

  async function coll (name) {
    const database = await db()
    return database.collection(name)
  }

  return {
    kind: 'mongo',

    async list (name, filter, options = {}) {
      let cursor = (await coll(name)).find(filter || {})
      if (options.sort && Object.keys(options.sort).length > 0) cursor = cursor.sort(options.sort)
      if (options.limit > 0) cursor = cursor.limit(options.limit)
      return cursor.toArray()
    },

    async count (name, filter) {
      return (await coll(name)).countDocuments(filter || {})
    },

    async get (name, id) {
      return (await coll(name)).findOne({ _id: id })
    },

    async insert (name, doc) {
      const record = { _id: doc._id || objectId(), ...doc }
      await (await coll(name)).insertOne(record)
      return record._id
    },

    async updateOne (name, id, patch) {
      const result = await (await coll(name)).updateOne({ _id: id }, { $set: patch })
      return result.matchedCount
    },

    async updateMany (name, filter, patch) {
      const result = await (await coll(name)).updateMany(filter || {}, { $set: patch })
      return result.modifiedCount
    },

    async deleteOne (name, id) {
      const result = await (await coll(name)).deleteOne({ _id: id })
      return result.deletedCount
    },

    async deleteMany (name, filter) {
      const result = await (await coll(name)).deleteMany(filter || {})
      return result.deletedCount
    },

    async ensureCollection (name) {
      const database = await db()
      const exists = await database.listCollections({ name }, { nameOnly: true }).hasNext()
      if (!exists) {
        try {
          await database.createCollection(name)
        } catch (e) {
          if (e.code !== 48) throw e // 48 = NamespaceExists
        }
      }
      return true
    },

    async close () {
      if (!dbPromise) return
      const database = await dbPromise
      await database.client.close()
      dbPromise = null
    }
  }
}

module.exports = { create }
