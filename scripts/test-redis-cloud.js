const Redis = require('redis')
const config = require('../config/config')

async function testRedisCloudConnection() {
  console.log('Testing Redis Cloud connection...')
  console.log('Connection URL:', config.REDIS_URL.replace(/\/\/.*@/, '//***:***@')) // Hide password in logs
  
  const client = Redis.createClient({
    url: config.REDIS_URL,
    socket: {
      connectTimeout: 10000,
      lazyConnect: true
    }
  })

  client.on('error', (err) => {
    console.error('Redis connection error:', err.message)
  })

  client.on('connect', () => {
    console.log('✅ Redis Cloud connection established successfully!')
  })

  client.on('ready', () => {
    console.log('✅ Redis Cloud client ready')
  })

  try {
    await client.connect()
    
    // Test basic operations
    console.log('Testing basic operations...')
    
    // SET operation
    await client.set('test_key', 'test_value')
    console.log('✅ SET operation successful')
    
    // GET operation
    const value = await client.get('test_key')
    console.log('✅ GET operation successful, retrieved:', value)
    
    // Test with expiration
    await client.set('expiry_test', 'will_expire', { EX: 5 })
    console.log('✅ SET with expiration successful')
    
    // Clean up
    await client.del('test_key', 'expiry_test')
    console.log('✅ Cleanup successful')
    
    console.log('🎉 All Redis Cloud tests passed!')
    
  } catch (err) {
    console.error('❌ Redis Cloud test failed:', err.message)
    console.error('Please check your connection string and credentials')
  } finally {
    await client.quit()
    console.log('Redis connection closed')
  }
}

// Run the test
testRedisCloudConnection().catch(console.error) 