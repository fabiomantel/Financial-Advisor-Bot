process.env.REDIS_URL = 'redis://localhost:6379/0';
process.env.STORAGE_TYPE = 'memory';

const RedisStorageProvider = require('../services/storage/redisStorageProvider')
const ChatHistoryService = require('../services/chatHistoryService')
const config = require('../config/config')
const HybridStorageProvider = require('../services/storage/hybridStorageProvider');

describe('Redis Integration Tests', () => {
  let redisProvider
  let chatHistoryService

  beforeAll(async () => {
    // Only run Redis tests if REDIS_URL is configured
    if (!config.REDIS_URL) {
      console.log('Skipping Redis tests - REDIS_URL not configured')
      return
    }

    redisProvider = new RedisStorageProvider(config)
    chatHistoryService = new ChatHistoryService(redisProvider)

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  afterAll(async () => {
    if (redisProvider) {
      await redisProvider.disconnect()
    }
  })

  beforeEach(async () => {
    if (!redisProvider) return

    // Clean up test data
    try {
      await redisProvider.client.del('test_user_1')
      await redisProvider.client.del('test_user_2')
      await redisProvider.client.del('health_check_test')
      await redisProvider.client.del('health_check_user')
    } catch (err) {
      // Ignore cleanup errors
    }
  })

  afterEach(() => {
    // Clear hybrid storage cache after each test
    const hybrid = new HybridStorageProvider(config);
    hybrid.clearCache();
  });

  describe('Redis Connection', () => {
    it('should connect to Redis successfully', async () => {
      if (!config.REDIS_URL) {
        console.log('Skipping - REDIS_URL not configured')
        return
      }

      expect(redisProvider.isConnected()).toBe(true)
    })

    it('should perform health check successfully', async () => {
      if (!config.REDIS_URL) {
        console.log('Skipping - REDIS_URL not configured')
        return
      }

      const healthCheckResult = await redisProvider.healthCheck()
      expect(healthCheckResult).toBe(true)
    })
  })

  describe('Redis Basic Operations', () => {
    it('should set and get values', async () => {
      if (!config.REDIS_URL) {
        console.log('Skipping - REDIS_URL not configured')
        return
      }

      const testKey = 'test_key'
      const testValue = 'test_value'

      // Test SET
      const setResult = await redisProvider.set(testKey, testValue)
      expect(setResult).toBe('OK')

      // Test GET
      const getResult = await redisProvider.get(testKey)
      expect(getResult).toBe(testValue)

      // Cleanup
      await redisProvider.client.del(testKey)
    })

    it('should handle expiration', async () => {
      if (!config.REDIS_URL) {
        console.log('Skipping - REDIS_URL not configured')
        return
      }

      const testKey = 'expiry_test'
      const testValue = 'expiry_value'

      // Set with 1 second expiration
      await redisProvider.set(testKey, testValue, { EX: 1 })

      // Should exist immediately
      let result = await redisProvider.get(testKey)
      expect(result).toBe(testValue)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should not exist after expiration
      result = await redisProvider.get(testKey)
      expect(result).toBeNull()
    })
  })

  describe('ChatHistoryService with Redis', () => {
    it('should save and retrieve chat history', async () => {
      if (!config.REDIS_URL) {
        console.log('Skipping - REDIS_URL not configured')
        return
      }

      const userId = 'test_user_1'
      const testHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
        { role: 'assistant', content: 'I am doing well!' }
      ]

      // Save history
      await chatHistoryService.saveUserHistory(userId, testHistory)

      // Retrieve history
      const retrieved = await chatHistoryService.getUserHistory(userId)
      expect(retrieved).toEqual(testHistory)
    })

    it('should handle empty history', async () => {
      if (!config.REDIS_URL) {
        console.log('Skipping - REDIS_URL not configured')
        return
      }

      const userId = 'test_user_2'

      // Get non-existent history
      const history = await chatHistoryService.getUserHistory(userId)
      expect(history).toEqual([])
    })

    it('should truncate history correctly', async () => {
      if (!config.REDIS_URL) {
        console.log('Skipping - REDIS_URL not configured')
        return
      }

      const userId = 'test_user_1'

      // Create history with more than 20 pairs
      const longHistory = []
      for (let i = 0; i < 50; i++) {
        longHistory.push({ role: 'user', content: `Message ${i}` })
        longHistory.push({ role: 'assistant', content: `Response ${i}` })
      }

      // Save long history
      await chatHistoryService.saveUserHistory(userId, longHistory)

      // Retrieve and check truncation
      const retrieved = await chatHistoryService.getUserHistory(userId)
      expect(retrieved.length).toBeLessThanOrEqual(40) // 20 pairs max
    })

    it('should perform health check', async () => {
      if (!config.REDIS_URL) {
        console.log('Skipping - REDIS_URL not configured')
        return
      }

      const healthCheckResult = await chatHistoryService.healthCheck()
      expect(healthCheckResult).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      if (!config.REDIS_URL) {
        console.log('Skipping - REDIS_URL not configured')
        return
      }

      // Test with invalid key (should not throw)
      const result = await redisProvider.get('')
      expect(result).toBeNull()
    })

    it('should handle JSON parsing errors', async () => {
      if (!config.REDIS_URL) {
        console.log('Skipping - REDIS_URL not configured')
        return
      }

      const userId = 'json_error_user'
      const key = `chat_history:${userId}`

      // Cleanup before test
      await redisProvider.client.del(key)

      // Store invalid JSON
      await redisProvider.set(key, 'invalid json')

      // Should handle gracefully
      const history = await chatHistoryService.getUserHistory(userId)
      expect(history).toEqual([])
    })
  })
})
