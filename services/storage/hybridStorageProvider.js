const logger = require('../../utils/logger')
const RedisStorageProvider = require('./redisStorageProvider')
const InMemoryStorageProvider = require('./inMemoryStorageProvider')

class HybridStorageProvider {
  constructor(config) {
    this.memoryCache = new Map() // Fast access
    this.redisProvider = new RedisStorageProvider(config) // Persistence
    this.memoryProvider = new InMemoryStorageProvider() // Fallback
    this.maxCacheSize = 1000
    this.cacheTTL = 300000 // 5 minutes
    this.lastCleanup = Date.now()
    this.cleanupInterval = 600000 // 10 minutes
    this.stats = {
      memoryHits: 0,
      redisHits: 0,
      misses: 0,
      saves: 0
    }
  }

  async get(key) {
    const startTime = Date.now()
    logger.debug(`🔍 [Hybrid] Getting key: ${key}`)
    
    try {
      // Check memory first
      if (this.memoryCache.has(key)) {
        const cached = this.memoryCache.get(key)
        if (Date.now() - cached.timestamp < this.cacheTTL) {
          this.stats.memoryHits++
          const duration = Date.now() - startTime
          logger.debug(`⚡ [Hybrid] Memory cache hit in ${duration}ms`)
          return cached.value
        } else {
          // Expired, remove from cache
          this.memoryCache.delete(key)
        }
      }

      // Try Redis
      try {
        const value = await this.redisProvider.get(key)
        if (value !== null) {
          this.stats.redisHits++
          const duration = Date.now() - startTime
          logger.debug(`💾 [Hybrid] Redis hit in ${duration}ms`)
          
          // Cache in memory for next time
          this.setMemoryCache(key, value)
          return value
        }
      } catch (redisErr) {
        logger.warn(`⚠️ [Hybrid] Redis failed, trying memory: ${redisErr.message}`)
        
        // Fallback to memory storage
        const value = await this.memoryProvider.get(key)
        if (value !== null) {
          this.stats.memoryHits++
          const duration = Date.now() - startTime
          logger.debug(`💾 [Hybrid] Memory storage hit in ${duration}ms`)
          return value
        }
      }

      this.stats.misses++
      const duration = Date.now() - startTime
      logger.debug(`❌ [Hybrid] Cache miss in ${duration}ms`)
      return null

    } catch (err) {
      logger.error(`❌ [Hybrid] Get operation failed: ${err.message}`)
      return null
    }
  }

  async set(key, value, options = {}) {
    const startTime = Date.now()
    logger.debug(`💾 [Hybrid] Setting key: ${key}`)
    
    try {
      this.stats.saves++
      
      // Set in memory cache
      this.setMemoryCache(key, value)
      
      // Set in Redis asynchronously (don't wait)
      setImmediate(async () => {
        try {
          await this.redisProvider.set(key, value, options)
          logger.debug(`✅ [Hybrid] Redis save completed for ${key}`)
        } catch (redisErr) {
          logger.warn(`⚠️ [Hybrid] Redis save failed, using memory: ${redisErr.message}`)
          await this.memoryProvider.set(key, value, options)
        }
      })

      const duration = Date.now() - startTime
      logger.debug(`✅ [Hybrid] Set operation completed in ${duration}ms`)
      return 'OK'

    } catch (err) {
      logger.error(`❌ [Hybrid] Set operation failed: ${err.message}`)
      throw err
    }
  }

  setMemoryCache(key, value) {
    // Check if cleanup is needed
    this.clearOldEntries()
    
    // Add to memory cache
    this.memoryCache.set(key, {
      value,
      timestamp: Date.now()
    })
    
    // Limit cache size
    if (this.memoryCache.size > this.maxCacheSize) {
      this.evictOldest()
    }
  }

  clearOldEntries() {
    const now = Date.now()
    if (now - this.lastCleanup < this.cleanupInterval) {
      return
    }

    logger.info(`🧹 [Hybrid] Starting cache cleanup...`)
    let removedCount = 0

    for (const [key, cached] of this.memoryCache.entries()) {
      if (now - cached.timestamp > this.cacheTTL) {
        this.memoryCache.delete(key)
        removedCount++
      }
    }

    this.lastCleanup = now
    logger.info(`🧹 [Hybrid] Cache cleanup completed: removed ${removedCount} entries`)
  }

  evictOldest() {
    let oldestKey = null
    let oldestTime = Date.now()

    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey)
      logger.debug(`🗑️ [Hybrid] Evicted oldest cache entry: ${oldestKey}`)
    }
  }

  async healthCheck() {
    try {
      const redisHealth = await this.redisProvider.healthCheck()
      const memoryHealth = await this.memoryProvider.healthCheck()
      
      logger.info(`🏥 [Hybrid] Health check - Redis: ${redisHealth}, Memory: ${memoryHealth}`)
      return redisHealth && memoryHealth
    } catch (err) {
      logger.error(`❌ [Hybrid] Health check failed: ${err.message}`)
      return false
    }
  }

  async disconnect() {
    try {
      await this.redisProvider.disconnect()
      this.memoryCache.clear()
      logger.info(`🔌 [Hybrid] Disconnected successfully`)
    } catch (err) {
      logger.error(`❌ [Hybrid] Disconnect failed: ${err.message}`)
    }
  }

  getStats() {
    const totalRequests = this.stats.memoryHits + this.stats.redisHits + this.stats.misses
    const hitRate = totalRequests > 0 ? ((this.stats.memoryHits + this.stats.redisHits) / totalRequests * 100).toFixed(2) : 0
    
    return {
      ...this.stats,
      totalRequests,
      hitRate: `${hitRate}%`,
      cacheSize: this.memoryCache.size,
      maxCacheSize: this.maxCacheSize
    }
  }

  // Implement the same interface as other storage providers
  async getUserHistory(userId) {
    // Check memory first
    if (this.memoryCache.has(userId)) {
      logger.info(`[HYBRID STORAGE] Cache hit for user: ${userId}`);
      return this.memoryCache.get(userId);
    }
    logger.info(`[HYBRID STORAGE] Cache miss for user: ${userId}, loading from Redis`);
    const history = await this.redisProvider.getUserHistory(userId);
    this.memoryCache.set(userId, history);
    this.clearOldEntries();
    return history;
  }

  async saveUserHistory(userId, history) {
    this.memoryCache.set(userId, history);
    await this.redisProvider.saveUserHistory(userId, history);
    logger.debug(`[HYBRID STORAGE] Saved user history for user: ${userId}`);
    this.clearOldEntries();
  }

  clearCache() {
    this.memoryCache.clear();
  }
}

module.exports = HybridStorageProvider 