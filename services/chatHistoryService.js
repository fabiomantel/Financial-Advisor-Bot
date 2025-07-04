const logger = require('../utils/logger')

class ChatHistoryService {
  constructor (storageProvider) {
    this.storage = storageProvider
    logger.info('ChatHistoryService initialized with storage provider')
  }

  async getUserHistory (userId) {
    try {
      logger.info(`Retrieving chat history for user: ${userId}`)
      const historyStr = await this.storage.get(userId)
      if (historyStr) {
        const history = JSON.parse(historyStr)
        logger.info(`Retrieved chat history for user ${userId}: ${history.length} messages`)
        return history
      } else {
        logger.info(`No existing chat history found for user: ${userId}`)
        return []
      }
    } catch (err) {
      logger.error(`Failed to get chat history for ${userId}: ${err.message}`)
      return []
    }
  }

  async saveUserHistory (userId, history) {
    try {
      logger.info(`Saving chat history for user: ${userId}, messages: ${history.length}`)

      // Truncate before saving to ensure we don't exceed limits
      const truncatedHistory = this.truncateHistory(history, 20)
      if (truncatedHistory.length !== history.length) {
        logger.info(`History truncated before saving: ${history.length} → ${truncatedHistory.length} messages`)
      }

      const historyJson = JSON.stringify(truncatedHistory)
      logger.info(`Serialized history length: ${historyJson.length} chars`)

      await this.storage.set(userId, historyJson, { EX: 60 * 60 * 24 })
      logger.info(`Chat history saved successfully for user: ${userId}`)
    } catch (err) {
      logger.error(`Failed to save chat history for ${userId}: ${err.message}`)
      // Don't throw - allow conversation to continue without persistence
    }
  }

  truncateHistory (history, maxPairs = 20) {
    const maxMessages = maxPairs * 2 // user + assistant messages
    logger.info(`Truncating history: current ${history.length} messages, max ${maxMessages} messages`)

    if (history.length > maxMessages) {
      const truncated = history.slice(history.length - maxMessages)
      logger.info(`History truncated: ${history.length} → ${truncated.length} messages`)
      return truncated
    }

    logger.info(`History within limits, no truncation needed: ${history.length} messages`)
    return history
  }

  addUserMessage (history, message) {
    logger.info(`Adding user message to history: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`)
    const newHistory = [...history, { role: 'user', content: message }]
    logger.info(`History after adding user message: ${newHistory.length} messages`)
    return newHistory
  }

  addAssistantMessage (history, message) {
    logger.info(`Adding assistant message to history: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`)
    const newHistory = [...history, { role: 'assistant', content: message }]
    logger.info(`History after adding assistant message: ${newHistory.length} messages`)
    return newHistory
  }

  prepareMessagesForGpt (history, systemMessage) {
    logger.info(`Preparing messages for GPT: ${history.length} history messages + 1 system message`)
    const messages = [systemMessage, ...history]
    logger.info(`Total messages for GPT: ${messages.length}`)
    return messages
  }

  // Debug method to check storage provider health
  async healthCheck () {
    try {
      logger.info('Performing ChatHistoryService health check...')
      const testUserId = 'health_check_user'
      const testHistory = [
        { role: 'user', content: 'test message' },
        { role: 'assistant', content: 'test response' }
      ]

      // Test save
      await this.saveUserHistory(testUserId, testHistory)
      logger.info('ChatHistoryService save health check passed')

      // Test retrieve
      const retrieved = await this.getUserHistory(testUserId)
      logger.info(`ChatHistoryService retrieve health check passed, retrieved ${retrieved.length} messages`)

      // Clean up
      await this.storage.set(testUserId, '', { EX: 1 })
      logger.info('ChatHistoryService health check completed successfully')
      return true
    } catch (err) {
      logger.error('ChatHistoryService health check failed', err)
      return false
    }
  }
}

module.exports = ChatHistoryService
