const RedisStorageProvider = require('./redisStorageProvider')
const InMemoryStorageProvider = require('./inMemoryStorageProvider')
const logger = require('../../utils/logger')

class StorageFactory {
  static createStorageProvider (type, config) {
    switch (type.toLowerCase()) {
      case 'redis':
        return new RedisStorageProvider(config)
      case 'memory':
      case 'inmemory':
        return new InMemoryStorageProvider()
      default:
        logger.warn(`Unknown storage type: ${type}, falling back to in-memory`)
        return new InMemoryStorageProvider()
    }
  }
}

module.exports = StorageFactory
