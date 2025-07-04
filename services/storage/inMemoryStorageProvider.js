const logger = require('../../utils/logger')

class InMemoryStorageProvider {
  constructor () {
    this.storage = new Map()
    this.expiryTimes = new Map()
    logger.info('InMemoryStorageProvider initialized')
  }

  async get (key) {
    try {
      const value = this.storage.get(key)
      if (!value) return null

      // Check if expired
      const expiryTime = this.expiryTimes.get(key)
      if (expiryTime && Date.now() > expiryTime) {
        this.storage.delete(key)
        this.expiryTimes.delete(key)
        return null
      }

      return value
    } catch (err) {
      logger.error(`InMemory get failed for key ${key}: ${err.message}`)
      throw err
    }
  }

  async set (key, value, options = {}) {
    try {
      this.storage.set(key, value)

      // Handle expiration
      if (options.EX) {
        const expiryTime = Date.now() + (options.EX * 1000)
        this.expiryTimes.set(key, expiryTime)
      }

      return 'OK'
    } catch (err) {
      logger.error(`InMemory set failed for key ${key}: ${err.message}`)
      throw err
    }
  }

  async disconnect () {
    try {
      this.storage.clear()
      this.expiryTimes.clear()
      logger.info('InMemoryStorageProvider disconnected')
    } catch (err) {
      logger.error('InMemoryStorageProvider disconnect failed', err)
    }
  }

  isConnected () {
    return true // Always connected for in-memory
  }

  // Utility method for testing
  clear () {
    this.storage.clear()
    this.expiryTimes.clear()
  }
}

module.exports = InMemoryStorageProvider
