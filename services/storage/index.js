const RedisStorageProvider = require('./redisStorageProvider')
const InMemoryStorageProvider = require('./inMemoryStorageProvider')
const HybridStorageProvider = require('./hybridStorageProvider')
const logger = require('../../utils/logger')

class StorageFactory {
  static createStorageProvider (type, config) {
    switch (type.toLowerCase()) {
      case 'redis':
        return new RedisStorageProvider(config)
      case 'memory':
      case 'inmemory':
        return new InMemoryStorageProvider()
      case 'hybrid':
        return new HybridStorageProvider(config)
      default:
        logger.warn(`Unknown storage type: ${type}, falling back to in-memory`)
        return new InMemoryStorageProvider()
    }
  }
}

module.exports = StorageFactory
