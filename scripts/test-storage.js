const StorageFactory = require('../services/storage')
const config = require('../config/config')

async function testStorage() {
  try {
    console.log('🧪 Testing Storage Provider...')
    
    // Test storage factory
    const storageProvider = StorageFactory.createStorageProvider('redis', config)
    console.log('✅ Storage provider created:', storageProvider.constructor.name)
    
    // Test basic operations
    await storageProvider.set('test_key', 'test_value')
    console.log('✅ Set operation successful')
    
    const value = await storageProvider.get('test_key')
    console.log('✅ Get operation successful:', value)
    
    // Test health check
    const health = await storageProvider.healthCheck()
    console.log('✅ Health check:', health)
    
  } catch (error) {
    console.error('❌ Storage test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

testStorage() 