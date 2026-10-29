'use strict'

const config = require('../../config')

let driver = null

function getDriver () {
  if (driver) return driver
  if (config.mongoUrl) {
    driver = require('./mongo-driver').create(config.mongoUrl, config.mongoDb)
  } else {
    driver = require('./file-driver').create(config.dataDir)
  }
  return driver
}

/** 把 uniCloud 的 db.command.in(...) 转成驱动认识的 { $in: [...] } */
function commandIn (values) {
  return { __uniOp: 'in', values: Array.isArray(values) ? values : [values] }
}

function normalizeFilter (filter) {
  if (!filter || typeof filter !== 'object') return {}
  const out = {}
  for (const key of Object.keys(filter)) {
    const value = filter[key]
    if (value && typeof value === 'object' && value.__uniOp === 'in') {
      out[key] = { $in: value.values }
    } else {
      out[key] = value
    }
  }
  return out
}

function sanitizePatch (patch) {
  if (!patch || typeof patch !== 'object') return {}
  const out = {}
  for (const key of Object.keys(patch)) {
    if (key === '_id' || key === 'id') continue
    out[key] = patch[key]
  }
  return out
}

class Query {
  constructor (db, collection, state) {
    this._db = db
    this._collection = collection
    this._state = state
  }

  _next (patch) {
    return new Query(this._db, this._collection, { ...this._state, ...patch })
  }

  where (filter) {
    return this._next({ filter: { ...this._state.filter, ...normalizeFilter(filter) } })
  }

  orderBy (field, direction = 'asc') {
    const sort = { ...this._state.sort, [field]: String(direction).toLowerCase() === 'desc' ? -1 : 1 }
    return this._next({ sort })
  }

  limit (n) {
    return this._next({ limit: Number(n) || 0 })
  }

  async get () {
    const driver = getDriver()
    const data = await driver.list(this._collection, this._state.filter, {
      sort: this._state.sort,
      limit: this._state.limit
    })
    return { data }
  }

  async count () {
    return getDriver().count(this._collection, this._state.filter)
  }

  async update (patch) {
    const updated = await getDriver().updateMany(this._collection, this._state.filter, sanitizePatch(patch))
    return { updated }
  }

  async remove () {
    const deleted = await getDriver().deleteMany(this._collection, this._state.filter)
    return { deleted }
  }
}

class DocumentRef {
  constructor (collection, id) {
    this._collection = collection
    this._id = id
  }

  async get () {
    const doc = await getDriver().get(this._collection, this._id)
    return { data: doc ? [doc] : [] }
  }

  async update (patch) {
    const updated = await getDriver().updateOne(this._collection, this._id, sanitizePatch(patch))
    return { updated }
  }

  async set (doc) {
    const updated = await getDriver().updateOne(this._collection, this._id, sanitizePatch(doc))
    return { updated }
  }

  async remove () {
    const deleted = await getDriver().deleteOne(this._collection, this._id)
    return { deleted }
  }
}

class CollectionRef extends Query {
  constructor (db, name) {
    super(db, name, { filter: {}, sort: {}, limit: 0 })
  }

  doc (id) {
    if (!id) throw new Error('doc(id) 缺少 id')
    return new DocumentRef(this._collection, String(id))
  }

  async add (doc) {
    const id = await getDriver().insert(this._collection, { ...(doc || {}) })
    return { id }
  }
}

class Database {
  constructor () {
    this.command = { in: commandIn }
  }

  collection (name) {
    if (!name || typeof name !== 'string') throw new Error('collection(name) 需要集合名')
    return new CollectionRef(this, name)
  }

  async createCollection (name) {
    try {
      await getDriver().ensureCollection(name)
      return { errCode: 0 }
    } catch (e) {
      if (e && (e.code === 48 || e.codeName === 'NamespaceExists')) return { errCode: 0 }
      throw e
    }
  }

  serverDate () {
    return new Date()
  }
}

/** 与 uniCloud.database() 同名同形，方便云函数原样移植 */
function database () {
  return new Database()
}

function describeDriver () {
  const d = getDriver()
  return d.kind === 'mongo'
    ? `mongodb (${config.mongoDb})`
    : `本地文件存储 (${config.dataDir})`
}

module.exports = { database, describeDriver, getDriver }
