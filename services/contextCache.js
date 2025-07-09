const config = require('../config/config')
const logger = require('../utils/logger');
const { LRUCache } = require('lru-cache')

const cache = new LRUCache({
  max: config.CACHE_MAX_SIZE || 500,
  ttl: config.CACHE_TTL || 300000, // ms
  updateAgeOnGet: true
})

function getContext (userId) {
  const entry = cache.get(userId)
  if (entry) {
    logger.debug(`⚡ Context cache hit for user: ${userId}`)
    return entry
  } else {
    logger.debug(`💾 Context cache miss for user: ${userId}`)
    return null
  }
}

function setContext (userId, context) {
  cache.set(userId, context)
  logger.debug(`Set context for user: ${userId}`)
}

function clearOldEntries () {
  const before = cache.size
  cache.purgeStale()
  const after = cache.size
  if (before !== after) logger.info(`🧹 Context cache cleanup: removed ${before - after} expired entries`)
}

module.exports = {
  getContext,
  setContext,
  clearOldEntries
}
