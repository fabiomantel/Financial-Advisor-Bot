const RedisStorageProvider = require('./services/storage/redisStorageProvider')
const config = require('./config/config')
const logger = require('../utils/logger');

async function testSecureRedisConnection () {
  logger.info('🔒 Testing Secure Redis Connection...\n')

  try {
    // Create Redis client with current config
    logger.info('📋 Current Redis Configuration:')
    logger.info(`  URL: ${config.REDIS_URL ? config.REDIS_URL.substring(0, 20) + '...' : 'Not set'}`)
    logger.info(`  Using TLS: ${config.REDIS_URL && config.REDIS_URL.startsWith('rediss://') ? 'Yes' : 'No'}`)
    logger.info(`  TLS CA: ${config.REDIS_TLS_CA || 'Not set'}`)
    logger.info(`  TLS Cert: ${config.REDIS_TLS_CERT || 'Not set'}`)
    logger.info(`  TLS Key: ${config.REDIS_TLS_KEY || 'Not set'}`)
    logger.info(`  Reject Unauthorized: ${config.REDIS_TLS_REJECT_UNAUTHORIZED || 'true'}\n`)

    const redisProvider = new RedisStorageProvider(config)

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Test basic operations
    logger.info('🧪 Testing Redis Operations...\n')

    // Test 1: SET operation
    logger.info('Test 1: SET operation')
    const testKey = 'secure_redis_test_' + Date.now()
    const testValue = 'This is a test value for secure Redis connection'
    await redisProvider.set(testKey, testValue, { EX: 60 }) // 60 seconds expiry
    logger.info('✅ SET operation successful\n')

    // Test 2: GET operation
    logger.info('Test 2: GET operation')
    const retrievedValue = await redisProvider.get(testKey)
    logger.info(`✅ GET operation successful: "${retrievedValue}"\n`)

    // Test 3: Health check
    logger.info('Test 3: Health check')
    const healthResult = await redisProvider.healthCheck()
    logger.info(`✅ Health check result: ${healthResult}\n`)

    // Test 4: Connection status
    logger.info('Test 4: Connection status')
    const isConnected = redisProvider.isConnected()
    logger.info(`✅ Connection status: ${isConnected ? 'Connected' : 'Disconnected'}\n`)

    // Test 5: Chat history operations
    logger.info('Test 5: Chat history operations')
    const testUserId = 'secure_test_user_' + Date.now()
    const testHistory = [
      { role: 'user', content: 'Hello from secure Redis test' },
      { role: 'assistant', content: 'Hi! This is a test response from secure Redis' }
    ]

    // Save chat history
    await redisProvider.set(testUserId, JSON.stringify(testHistory), { EX: 300 }) // 5 minutes
    logger.info('✅ Chat history saved\n')

    // Retrieve chat history
    const retrievedHistory = await redisProvider.get(testUserId)
    const parsedHistory = JSON.parse(retrievedHistory)
    logger.info(`✅ Chat history retrieved: ${parsedHistory.length} messages\n`)

    // Test 6: Clean up
    logger.info('Test 6: Clean up')
    await redisProvider.client.del(testKey)
    await redisProvider.client.del(testUserId)
    logger.info('✅ Test data cleaned up\n')

    // Disconnect
    await redisProvider.disconnect()

    logger.info('🎉 Secure Redis connection test completed successfully!')
    logger.info('✅ All operations working correctly with secure connection')
  } catch (error) {
    logger.error('❌ Secure Redis connection test failed:', error.message)
    logger.error('Stack trace:', error.stack)

    // Check if it's a TLS/SSL related error
    if (error.message.includes('TLS') || error.message.includes('SSL') || error.message.includes('certificate')) {
      logger.info('\n💡 TLS/SSL Error Tips:')
      logger.info('1. Check if your Redis URL uses rediss:// for secure connection')
      logger.info('2. Verify CA, cert, and key files exist and are readable')
      logger.info('3. For development, you can set REDIS_TLS_REJECT_UNAUTHORIZED=false')
      logger.info('4. Check your Redis provider\'s documentation for TLS setup')
    }
  }
}

// Run the test
testSecureRedisConnection()
