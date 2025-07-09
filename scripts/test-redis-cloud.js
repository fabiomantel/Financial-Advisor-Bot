const Redis = require('redis')
const config = require('../config/config')
const logger = require('../utils/logger');

async function testRedisCloudConnection () {
  logger.info('Testing Redis Cloud connection...')
  logger.info('Connection URL:', config.REDIS_URL.replace(/\/\/.*@/, '//***:***@')) // Hide password in logs

  const client = Redis.createClient({
    url: config.REDIS_URL,
    socket: {
      connectTimeout: 10000,
      lazyConnect: true
    }
  })

  client.on('error', (err) => {
    logger.error('Redis connection error:', err.message)
  })

  client.on('connect', () => {
    logger.info('✅ Redis Cloud connection established successfully!')
  })

  client.on('ready', () => {
    logger.info('✅ Redis Cloud client ready')
  })

  try {
    await client.connect()

    // Test basic operations
    logger.info('Testing basic operations...')

    // SET operation
    await client.set('test_key', 'test_value')
    logger.info('✅ SET operation successful')

    // GET operation
    const value = await client.get('test_key')
    logger.info('✅ GET operation successful, retrieved:', value)

    // Test with expiration
    await client.set('expiry_test', 'will_expire', { EX: 5 })
    logger.info('✅ SET with expiration successful')

    // Clean up
    await client.del('test_key', 'expiry_test')
    logger.info('✅ Cleanup successful')

    logger.info('🎉 All Redis Cloud tests passed!')
  } catch (err) {
    logger.error('❌ Redis Cloud test failed:', err.message)
    logger.error('Please check your connection string and credentials')
  } finally {
    await client.quit()
    logger.info('Redis connection closed')
  }
}

// Run the test
testRedisCloudConnection().catch(console.error)
