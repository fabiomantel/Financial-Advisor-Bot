const RedisStorageProvider = require('./services/storage/redisStorageProvider')
const config = require('./config/config')

async function testSecureRedisConnection () {
  console.log('🔒 Testing Secure Redis Connection...\n')

  try {
    // Create Redis client with current config
    console.log('📋 Current Redis Configuration:')
    console.log(`  URL: ${config.REDIS_URL ? config.REDIS_URL.substring(0, 20) + '...' : 'Not set'}`)
    console.log(`  Using TLS: ${config.REDIS_URL && config.REDIS_URL.startsWith('rediss://') ? 'Yes' : 'No'}`)
    console.log(`  TLS CA: ${config.REDIS_TLS_CA || 'Not set'}`)
    console.log(`  TLS Cert: ${config.REDIS_TLS_CERT || 'Not set'}`)
    console.log(`  TLS Key: ${config.REDIS_TLS_KEY || 'Not set'}`)
    console.log(`  Reject Unauthorized: ${config.REDIS_TLS_REJECT_UNAUTHORIZED || 'true'}\n`)

    const redisProvider = new RedisStorageProvider(config)

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Test basic operations
    console.log('🧪 Testing Redis Operations...\n')

    // Test 1: SET operation
    console.log('Test 1: SET operation')
    const testKey = 'secure_redis_test_' + Date.now()
    const testValue = 'This is a test value for secure Redis connection'
    await redisProvider.set(testKey, testValue, { EX: 60 }) // 60 seconds expiry
    console.log('✅ SET operation successful\n')

    // Test 2: GET operation
    console.log('Test 2: GET operation')
    const retrievedValue = await redisProvider.get(testKey)
    console.log(`✅ GET operation successful: "${retrievedValue}"\n`)

    // Test 3: Health check
    console.log('Test 3: Health check')
    const healthResult = await redisProvider.healthCheck()
    console.log(`✅ Health check result: ${healthResult}\n`)

    // Test 4: Connection status
    console.log('Test 4: Connection status')
    const isConnected = redisProvider.isConnected()
    console.log(`✅ Connection status: ${isConnected ? 'Connected' : 'Disconnected'}\n`)

    // Test 5: Chat history operations
    console.log('Test 5: Chat history operations')
    const testUserId = 'secure_test_user_' + Date.now()
    const testHistory = [
      { role: 'user', content: 'Hello from secure Redis test' },
      { role: 'assistant', content: 'Hi! This is a test response from secure Redis' }
    ]

    // Save chat history
    await redisProvider.set(testUserId, JSON.stringify(testHistory), { EX: 300 }) // 5 minutes
    console.log('✅ Chat history saved\n')

    // Retrieve chat history
    const retrievedHistory = await redisProvider.get(testUserId)
    const parsedHistory = JSON.parse(retrievedHistory)
    console.log(`✅ Chat history retrieved: ${parsedHistory.length} messages\n`)

    // Test 6: Clean up
    console.log('Test 6: Clean up')
    await redisProvider.client.del(testKey)
    await redisProvider.client.del(testUserId)
    console.log('✅ Test data cleaned up\n')

    // Disconnect
    await redisProvider.disconnect()

    console.log('🎉 Secure Redis connection test completed successfully!')
    console.log('✅ All operations working correctly with secure connection')
  } catch (error) {
    console.error('❌ Secure Redis connection test failed:', error.message)
    console.error('Stack trace:', error.stack)

    // Check if it's a TLS/SSL related error
    if (error.message.includes('TLS') || error.message.includes('SSL') || error.message.includes('certificate')) {
      console.log('\n💡 TLS/SSL Error Tips:')
      console.log('1. Check if your Redis URL uses rediss:// for secure connection')
      console.log('2. Verify CA, cert, and key files exist and are readable')
      console.log('3. For development, you can set REDIS_TLS_REJECT_UNAUTHORIZED=false')
      console.log('4. Check your Redis provider\'s documentation for TLS setup')
    }
  }
}

// Run the test
testSecureRedisConnection()
