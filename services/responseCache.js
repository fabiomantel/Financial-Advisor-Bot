const logger = require('../utils/logger')
const crypto = require('crypto')

class ResponseCache {
  constructor() {
    this.cache = new Map()
    this.ttl = 300000 // 5 minutes
    this.lastCleanup = Date.now()
    this.cleanupInterval = 600000 // 10 minutes
    this.maxCacheSize = 500
    this.stats = {
      hits: 0,
      misses: 0,
      saves: 0,
      evictions: 0
    }
  }

  async getCachedResponse(userMessage, context) {
    const startTime = Date.now()
    const key = this.generateKey(userMessage, context)
    logger.debug(`🔍 [Cache] Checking response cache for key: ${key.substring(0, 20)}...`)
    
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      const duration = Date.now() - startTime
      this.stats.hits++
      logger.info(`⚡ [Cache] Cache hit! Response served in ${duration}ms`)
      return cached.response
    }
    
    const duration = Date.now() - startTime
    this.stats.misses++
    logger.debug(`💾 [Cache] Cache miss in ${duration}ms`)
    return null
  }

  async setCachedResponse(userMessage, context, response) {
    const key = this.generateKey(userMessage, context)
    
    // Check if cleanup is needed
    this.clearOldEntries()
    
    // Add to cache
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    })
    
    this.stats.saves++
    logger.debug(`💾 [Cache] Cached response for key: ${key.substring(0, 20)}...`)
    
    // Limit cache size
    if (this.cache.size > this.maxCacheSize) {
      this.evictOldest()
    }
  }

  generateKey(userMessage, context) {
    // Create a hash of the user message and context
    const content = userMessage + JSON.stringify(context)
    return crypto.createHash('md5').update(content).digest('hex')
  }

  clearOldEntries() {
    const now = Date.now()
    if (now - this.lastCleanup < this.cleanupInterval) {
      return
    }

    logger.info(`🧹 [Cache] Starting response cache cleanup...`)
    let removedCount = 0

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }

    this.lastCleanup = now
    logger.info(`🧹 [Cache] Response cache cleanup completed: removed ${removedCount} entries`)
  }

  evictOldest() {
    let oldestKey = null
    let oldestTime = Date.now()

    for (const [key, cached] of this.cache.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++
      logger.debug(`🗑️ [Cache] Evicted oldest cache entry: ${oldestKey.substring(0, 20)}...`)
    }
  }

  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0
    
    return {
      ...this.stats,
      totalRequests,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      ttl: this.ttl
    }
  }

  clear() {
    this.cache.clear()
    logger.info(`🗑️ [Cache] Cache cleared`)
  }

  // Cache management methods
  async warmCache(commonQuestions) {
    logger.info(`🔥 [Cache] Warming cache with ${commonQuestions.length} common questions`)
    
    for (const question of commonQuestions) {
      try {
        // This would typically call GPT to generate responses
        // For now, we'll just log the warming process
        logger.debug(`🔥 [Cache] Warming cache for: ${question.substring(0, 50)}...`)
      } catch (err) {
        logger.warn(`⚠️ [Cache] Failed to warm cache for question: ${err.message}`)
      }
    }
    
    logger.info(`🔥 [Cache] Cache warming completed`)
  }

  async getCacheHealth() {
    const stats = this.getStats()
    const health = {
      status: 'healthy',
      issues: []
    }

    if (stats.hitRate < 10) {
      health.status = 'warning'
      health.issues.push('Low cache hit rate')
    }

    if (stats.cacheSize > this.maxCacheSize * 0.9) {
      health.status = 'warning'
      health.issues.push('Cache nearly full')
    }

    return health
  }
}

module.exports = ResponseCache 