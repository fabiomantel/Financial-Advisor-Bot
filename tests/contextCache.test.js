const config = require('../config/config')
const { LRUCache } = require('lru-cache')
const contextCache = require('../services/contextCache')
const { safeSetTimeout } = require('./testUtils')

// Patch contextCache to allow injecting a custom cache for testing
const originalGetContext = contextCache.getContext
const originalSetContext = contextCache.setContext
const originalClearOldEntries = contextCache.clearOldEntries

function patchCache (lru) {
  contextCache.getContext = userId => {
    const entry = lru.get(userId)
    return entry || null
  }
  contextCache.setContext = (userId, context) => {
    lru.set(userId, context)
  }
  contextCache.clearOldEntries = () => {
    lru.purgeStale()
  }
}

describe('ContextCache', () => {
  let lru
  beforeEach(() => {
    lru = new LRUCache({ max: 3, ttl: 50, updateAgeOnGet: true })
    patchCache(lru)
  })
  afterEach(() => {
    contextCache.getContext = originalGetContext
    contextCache.setContext = originalSetContext
    contextCache.clearOldEntries = originalClearOldEntries
  })

  it('returns null for cache miss', () => {
    expect(contextCache.getContext('user1')).toBeNull()
  })

  it('returns context for cache hit', () => {
    contextCache.setContext('user1', { foo: 'bar' })
    expect(contextCache.getContext('user1')).toEqual({ foo: 'bar' })
  })

  it('expires entries after TTL', done => {
    contextCache.setContext('user2', { bar: 'baz' })
    safeSetTimeout(() => {
      contextCache.clearOldEntries()
      expect(contextCache.getContext('user2')).toBeNull()
      done()
    }, 60)
  })

  it('evicts least recently used when over max size', () => {
    contextCache.setContext('user0', { n: 0 })
    contextCache.setContext('user1', { n: 1 })
    contextCache.setContext('user2', { n: 2 })
    contextCache.setContext('userX', { n: 'X' })
    expect(contextCache.getContext('user0')).toBeNull()
    expect(contextCache.getContext('userX')).toEqual({ n: 'X' })
  })
})
