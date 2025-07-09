const logger = require('../utils/logger');
const config = require('../config/config')
const HybridStorageProvider = require('./storage/hybridStorageProvider')

class SmartHistoryManager {
  constructor (config) {
    this.storageProvider = new HybridStorageProvider(config)
    this.contextWindow = 5 // Only use last 5 messages for context
  }

  async getOptimizedContext (userId, currentMessage) {
    logger.info(`[HISTORY MANAGER] Getting optimized context for user: ${userId}`)
    const fullHistory = await this.storageProvider.getUserHistory(userId)
    const recentHistory = fullHistory.slice(-this.contextWindow)
    logger.debug(`[HISTORY MANAGER] Using last ${recentHistory.length} messages for context for user: ${userId}`)
    // Add current message to context
    const context = [...recentHistory, { role: 'user', content: currentMessage }]
    return context
  }

  async saveUserHistory (userId, history) {
    await this.storageProvider.saveUserHistory(userId, history)
    logger.debug(`[HISTORY MANAGER] Saved user history for user: ${userId}`)
  }
}

module.exports = SmartHistoryManager
