const StorageFactory = require('../services/storage')
const config = require('../config/config')
const logger = require('../utils/logger');

async function testStorage () {
  try {
    logger.info('🧪 Testing Storage Provider...')

    // Test storage factory
    const storageProvider = StorageFactory.createStorageProvider('redis', config)
    logger.info('✅ Storage provider created:', storageProvider.constructor.name)

    // Test basic operations
    await storageProvider.set('test_key', 'test_value')
    logger.info('✅ Set operation successful')

    const value = await storageProvider.get('test_key')
    logger.info('✅ Get operation successful:', value)

    // Test health check
    const health = await storageProvider.healthCheck()
    logger.info('✅ Health check:', health)
  } catch (error) {
    logger.error('❌ Storage test failed:', error.message)
    logger.error('Stack:', error.stack)
  }
}

testStorage()
