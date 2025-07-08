const logger = require('../utils/logger')
const StorageFactory = require('./storage')

class ChatHistoryService {
  constructor(storageProvider) {
    this.storageProvider = storageProvider
    this.maxHistoryLength = 20
    logger.info(`ChatHistoryService initialized with storage type: ${storageProvider.constructor.name}`)
  }

  async getUserHistory(userId) {
    try {
      const history = await this.storageProvider.get(`chat_history:${userId}`)
      const parsedHistory = history ? JSON.parse(history) : []
      
      // Truncate history if it exceeds the limit
      const truncatedHistory = this.truncateHistory(parsedHistory)
      
      // If truncation occurred, save the truncated version back to storage
      if (truncatedHistory.length !== parsedHistory.length) {
        await this.saveUserHistory(userId, truncatedHistory)
      }
      
      return truncatedHistory
    } catch (err) {
      logger.error(`Failed to get user history for ${userId}: ${err.message}`)
      return []
    }
  }

  async saveUserHistory(userId, history) {
    try {
      await this.storageProvider.set(`chat_history:${userId}`, JSON.stringify(history), { ttl: 86400 }) // 24 hours
      logger.debug(`Saved user history for ${userId}: ${history.length} messages`)
    } catch (err) {
      logger.error(`Failed to save user history for ${userId}: ${err.message}`)
    }
  }

  addUserMessage(history, message) {
    // Ensure message is a string
    const messageStr = String(message || '')
    logger.info(`Adding user message to history: "${messageStr.substring(0, 50)}${messageStr.length > 50 ? '...' : ''}"`)
    const newHistory = [...history, { role: 'user', content: messageStr }]
    logger.info(`History after adding user message: ${newHistory.length} messages`)
    return newHistory
  }

  addAssistantMessage(history, message) {
    // Ensure message is a string
    const messageStr = String(message || '')
    logger.info(`Adding assistant message to history: "${messageStr.substring(0, 50)}${messageStr.length > 50 ? '...' : ''}"`)
    const newHistory = [...history, { role: 'assistant', content: messageStr }]
    logger.info(`History after adding assistant message: ${newHistory.length} messages`)
    return newHistory
  }

  async addUserMessageAsync(history, message, userId) {
    const startTime = Date.now()
    const messageStr = String(message || '')
    logger.info(`📝 [Async] Adding user message to history: "${messageStr.substring(0, 50)}${messageStr.length > 50 ? '...' : ''}"`)
    
    // Add to memory immediately
    const newHistory = [...history, { role: 'user', content: messageStr }]
    
    // Save to Redis asynchronously (don't wait)
    setImmediate(async () => {
      try {
        const saveStart = Date.now()
        await this.saveUserHistory(userId, newHistory)
        const saveDuration = Date.now() - saveStart
        logger.debug(`💾 [Async] Redis save completed in ${saveDuration}ms`)
      } catch (saveErr) {
        logger.error(`❌ [Async] Redis save failed: ${saveErr.message}`)
      }
    })
    
    const totalDuration = Date.now() - startTime
    logger.info(`✅ [Async] History updated in ${totalDuration}ms`)
    return newHistory
  }

  truncateHistory(history, maxLength = this.maxHistoryLength) {
    if (history.length <= maxLength) return history
    const truncated = history.slice(-maxLength)
    logger.info(`Truncated history from ${history.length} to ${truncated.length} messages`)
    return truncated
  }

  async prepareMessagesForGpt(userId, currentMessage) {
    const startTime = Date.now()
    logger.info(`📝 [GPT] Preparing messages for user: ${userId}`)
    
    try {
      // Get user history
      const history = await this.getUserHistory(userId)
      logger.debug(`📊 [GPT] Retrieved ${history.length} history messages`)
      
      // Add current message
      const updatedHistory = this.addUserMessage(history, currentMessage)
      const truncatedHistory = this.truncateHistory(updatedHistory)
      
      // Prepare system message
      const systemMessage = {
        role: 'system',
        content: 'אתה פביו מנטל – אדריכלות פיננסית לצמיחה. יועץ פיננסי מנוסה, מומחה בהשקעות, מיסוי בישראל וניהול הון משפחתי. ענה בעברית, בגובה העיניים, עם דגש על ערך פרקטי. השתמש בעיצוב טקסט WhatsApp בלבד:\n\n- כותרות ראשיות: *כותרת ראשית*\n- כותרות משניות: _כותרת משנית_\n- רשימות: * פריט ראשון\n- רשימות: - פריט שני\n- הדגשות: _טקסט מודגש_\n- ציטוטים: > טקסט חשוב\n- קוד: `מונח טכני`\n- קו חוצה: ~טקסט מיושן~\n\nחשוב: אל תשתמש ב-### או markdown אחר. השתמש רק בעיצוב WhatsApp. וודא שהכוכביות והקווים התחתונים מופיעים בדיוק כמו שצריך: *טקסט* ו_טקסט_. השתמש ברווחים נכונים בין הכוכביות לטקסט.\n\nאל תשאל שאלות בתשובות שלך. תן מידע ישיר ופרקטי ללא שאלות.'
      }
      
      const messages = [systemMessage, ...truncatedHistory]
      const duration = Date.now() - startTime
      logger.info(`✅ [GPT] Prepared ${messages.length} messages in ${duration}ms`)
      
      return messages
    } catch (err) {
      logger.error(`❌ [GPT] Failed to prepare messages: ${err.message}`)
      throw err
    }
  }

  async healthCheck() {
    try {
      await this.storageProvider.healthCheck()
      return true
    } catch (err) {
      logger.error(`ChatHistoryService health check failed: ${err.message}`)
      return false
    }
  }
}

module.exports = ChatHistoryService

// Named export for direct use in streamingController
const defaultProvider = {
  get: async () => '[]',
  set: async () => {},
  healthCheck: async () => true
};
const defaultService = new ChatHistoryService(defaultProvider);
module.exports.prepareMessagesForGpt = defaultService.prepareMessagesForGpt.bind(defaultService);

