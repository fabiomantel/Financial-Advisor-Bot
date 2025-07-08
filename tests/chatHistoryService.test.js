process.env.REDIS_URL = 'redis://localhost:6379/0';
process.env.STORAGE_TYPE = 'memory';

const ChatHistoryService = require('../services/chatHistoryService')
const InMemoryStorageProvider = require('../services/storage/inMemoryStorageProvider')
const HybridStorageProvider = require('../services/storage/hybridStorageProvider');
const config = require('../config/config');

describe('ChatHistoryService', () => {
  let storageProvider
  let chatHistoryService

  beforeEach(() => {
    storageProvider = new InMemoryStorageProvider()
    chatHistoryService = new ChatHistoryService(storageProvider)
  })

  afterEach(() => {
    storageProvider.clear()
    // Clear hybrid storage cache after each test
    const hybrid = new HybridStorageProvider(config);
    hybrid.clearCache();
  })

  describe('getUserHistory', () => {
    it('should return empty array when no history exists', async () => {
      const history = await chatHistoryService.getUserHistory('user123')
      expect(history).toEqual([])
    })

    it('should return parsed history when it exists', async () => {
      const testHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]
      await storageProvider.set('chat_history:user123', JSON.stringify(testHistory))

      const history = await chatHistoryService.getUserHistory('user123')
      expect(history).toEqual(testHistory)
    })

    it('should handle storage errors gracefully', async () => {
      // Mock storage to throw error
      storageProvider.get = jest.fn().mockRejectedValue(new Error('Storage error'))

      const history = await chatHistoryService.getUserHistory('user123')
      expect(history).toEqual([])
    })
  })

  describe('saveUserHistory', () => {
    it('should save history successfully', async () => {
      const testHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]

      await chatHistoryService.saveUserHistory('user123', testHistory)

      const savedHistory = await storageProvider.get('chat_history:user123')
      expect(JSON.parse(savedHistory)).toEqual(testHistory)
    })

    it('should handle save errors gracefully', async () => {
      // Mock storage to throw error
      storageProvider.set = jest.fn().mockRejectedValue(new Error('Save error'))

      const testHistory = [{ role: 'user', content: 'Hello' }]

      // Should not throw
      await expect(chatHistoryService.saveUserHistory('user123', testHistory))
        .resolves.toBeUndefined()
    })
  })

  describe('truncateHistory', () => {
    it('should not truncate when under limit', () => {
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]

      const result = chatHistoryService.truncateHistory(history, 2)
      expect(result).toEqual(history)
    })

    it('should truncate when over limit', () => {
      const history = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Response 2' },
        { role: 'user', content: 'Message 3' },
        { role: 'assistant', content: 'Response 3' }
      ]

      const result = chatHistoryService.truncateHistory(history, 2)
      // Should keep the last 2 messages (not pairs)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ role: 'user', content: 'Message 3' })
      expect(result[1]).toEqual({ role: 'assistant', content: 'Response 3' })
    })
  })

  describe('addUserMessage', () => {
    it('should add user message to history', () => {
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]

      const result = chatHistoryService.addUserMessage(history, 'How are you?')

      expect(result).toHaveLength(3)
      expect(result[2]).toEqual({ role: 'user', content: 'How are you?' })
    })
  })

  describe('addAssistantMessage', () => {
    it('should add assistant message to history', () => {
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]

      const result = chatHistoryService.addAssistantMessage(history, 'I am doing well!')

      expect(result).toHaveLength(3)
      expect(result[2]).toEqual({ role: 'assistant', content: 'I am doing well!' })
    })
  })

  describe('prepareMessagesForGpt', () => {
    it('should prepend system message to history', async () => {
      // Set up test history
      const testHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]
      await storageProvider.set('chat_history:user123', JSON.stringify(testHistory))

      const result = await chatHistoryService.prepareMessagesForGpt('user123', 'How are you?')

      expect(result).toHaveLength(4) // system message + 3 history messages
      expect(result[0].role).toBe('system')
      expect(result[1]).toEqual({ role: 'user', content: 'Hello' })
      expect(result[2]).toEqual({ role: 'assistant', content: 'Hi there!' })
      expect(result[3]).toEqual({ role: 'user', content: 'How are you?' })
    })
  })
})
