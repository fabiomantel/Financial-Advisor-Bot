const config = require('../config/config')
const logger = require('../utils/logger');

const cache = new Map()
const maxSize = config.CACHE_MAX_SIZE || 500
const ttl = config.CACHE_TTL || 300000 // 5 minutes

function getCachedResponse (key) {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < ttl) {
    logger.info(`⚡ Cache hit for key: ${key.substring(0, 20)}...`)
    // Move to end (LRU)
    cache.delete(key)
    cache.set(key, entry)
    return entry.response
  }
  if (entry) {
    logger.info(`🧹 Cache expired for key: ${key.substring(0, 20)}...`)
    cache.delete(key)
  } else {
    logger.info(`💾 Cache miss for key: ${key.substring(0, 20)}...`)
  }
  return null
}

function setCachedResponse (key, response) {
  cache.set(key, { response, timestamp: Date.now() })
  if (cache.size > maxSize) {
    // Remove least recently used (first entry)
    const lruKey = cache.keys().next().value
    cache.delete(lruKey)
    logger.info(`🧹 LRU eviction: removed ${lruKey}`)
  }
  clearOldEntries()
}

function clearOldEntries () {
  const now = Date.now()
  let removed = 0
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > ttl) {
      cache.delete(key)
      removed++
    }
  }
  if (removed > 0) logger.info(`🧹 Cache cleanup: removed ${removed} expired entries`)
}

module.exports = {
  getCachedResponse,
  setCachedResponse,
  clearOldEntries
}
