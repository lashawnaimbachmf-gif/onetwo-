'use strict'

const fs = require('fs')
const path = require('path')
const { objectId } = require('../ids')

/**
 * 文件存储驱动：每个集合一个 JSON 文件。
 * 只为「本地没有 MongoDB 也能把项目跑起来」准备，生产环境请配 MONGO_URL。
 */
function create (dataDir) {
  fs.mkdirSync(dataDir, { recursive: true })
  const cache = new Map()

  function fileOf (name) {
    return path.join(dataDir, name + '.json')
  }

  function load (name) {
    if (cache.has(name)) return cache.get(name)
    const file = fileOf(name)
    let docs = []
    if (fs.existsSync(file)) {
      const text = fs.readFileSync(file, 'utf8')
      try {
        docs = JSON.parse(text)
      } catch (e) {
        throw new Error(`数据文件解析失败，请检查 ${file}: ${e.message}`)
      }
      if (!Array.isArray(docs)) docs = []
    }
    cache.set(name, docs)
    return docs
  }

  function save (name) {
    const docs = load(name)
    const file = fileOf(name)
    const tmp = `${file}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(docs, null, 2), 'utf8')
    fs.renameSync(tmp, file)
  }

  function matches (doc, filter) {
    for (const key of Object.keys(filter || {})) {
      const expected = filter[key]
      const actual = doc[key]
      if (expected && typeof expected === 'object' && Array.isArray(expected.$in)) {
        if (!expected.$in.includes(actual)) return false
      } else if (actual !== expected) {
        return false
      }
    }
    return true
  }

  function sortDocs (docs, sort) {
    const keys = Object.keys(sort || {})
    if (keys.length === 0) return docs
    return docs.sort((a, b) => {
      for (const key of keys) {
        const dir = sort[key]
        const av = a[key]
        const bv = b[key]
        if (av === bv) continue
        if (av === undefined || av === null) return 1
        if (bv === undefined || bv === null) return -1
        if (av > bv) return dir === -1 ? -1 : 1
        if (av < bv) return dir === -1 ? 1 : -1
      }
      return 0
    })
  }

  return {
    kind: 'file',

    async list (name, filter, options = {}) {
      let docs = load(name).filter(doc => matches(doc, filter))
      docs = sortDocs(docs, options.sort)
      if (options.limit > 0) docs = docs.slice(0, options.limit)
      return docs.map(doc => ({ ...doc }))
    },

    async count (name, filter) {
      return load(name).filter(doc => matches(doc, filter)).length
    },

    async get (name, id) {
      const doc = load(name).find(item => item._id === id)
      return doc ? { ...doc } : null
    },

    async insert (name, doc) {
      const docs = load(name)
      const record = { _id: doc._id || objectId(), ...doc }
      docs.push(record)
      save(name)
      return record._id
    },

    async updateOne (name, id, patch) {
      const docs = load(name)
      const index = docs.findIndex(item => item._id === id)
      if (index === -1) return 0
      docs[index] = { ...docs[index], ...patch, _id: id }
      save(name)
      return 1
    },

    async updateMany (name, filter, patch) {
      const docs = load(name)
      let updated = 0
      for (let i = 0; i < docs.length; i++) {
        if (!matches(docs[i], filter)) continue
        docs[i] = { ...docs[i], ...patch, _id: docs[i]._id }
        updated++
      }
      if (updated > 0) save(name)
      return updated
    },

    async deleteOne (name, id) {
      const docs = load(name)
      const index = docs.findIndex(item => item._id === id)
      if (index === -1) return 0
      docs.splice(index, 1)
      save(name)
      return 1
    },

    async deleteMany (name, filter) {
      const docs = load(name)
      const kept = docs.filter(doc => !matches(doc, filter))
      const deleted = docs.length - kept.length
      if (deleted > 0) {
        cache.set(name, kept)
        save(name)
      }
      return deleted
    },

    async ensureCollection (name) {
      if (!fs.existsSync(fileOf(name))) save(name)
      return true
    }
  }
}

module.exports = { create }
