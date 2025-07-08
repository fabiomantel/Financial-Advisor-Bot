const logger = require('../utils/logger')
const PerformanceTracer = require('../utils/performanceTracer')
const { sendMessage, splitMessageOnWordBoundary } = require('../services/messagingService')
const hebrew = require('../config/hebrew')

class EnhancedWhatsappController {
  constructor() {
    this.tracer = new PerformanceTracer()
    
    // Bind methods to ensure they're accessible
    this.handleWebhook = this.handleWebhook.bind(this)
    this.validateIncomingMessage = this.validateIncomingMessage.bind(this)
    this.processPhoneNumber = this.processPhoneNumber.bind(this)
    this.processMessageWithGpt = this.processMessageWithGpt.bind(this)
    this.sendResponse = this.sendResponse.bind(this)
    this.getStats = this.getStats.bind(this)
    this.healthCheck = this.healthCheck.bind(this)
    
    logger.info('🚀 Enhanced WhatsApp Controller initialized')
  }

  async handleWebhook(req, res) {
    const startTime = Date.now()
    // Defensive: support both object and function for req.body
    const bodyObj = typeof req.body === 'function' ? req.body() : req.body;
    const { From: from, Body: body, To: to } = bodyObj || {};
    // Send ack immediately, before any validation or processing
    (async () => {
      try {
        logger.info(`[ACK] Sending immediate acknowledgment to ${from}`)
        await sendMessage({ to: from, body: hebrew.ACK_RECEIVED })
        logger.info(`[ACK] Immediate acknowledgment sent to ${from}`)
      } catch (ackErr) {
        logger.error(`[ACK] Failed to send immediate acknowledgment to ${from}: ${ackErr.message}`)
      }
    })();
    // Respond to HTTP request immediately (no Express chaining)
    res.statusCode = 200;
    res.json({ status: 'processing' });
    // Continue processing asynchronously
    (async () => {
      try {
        logger.debug('[PROCESS] Validating incoming message...')
        if (!this.validateIncomingMessage(bodyObj)) {
          logger.warn(`[PROCESS] Validation failed for incoming message from ${from}`)
          return
        }
        logger.debug(`[PROCESS] Normalizing phone number: ${from}`)
        const phoneNumber = this.processPhoneNumber(from)
        logger.info(`[PROCESS] Processed phone number: ${phoneNumber}`)
        logger.info(`[PROCESS] Processing message with GPT for user: ${phoneNumber}`)
        const response = await this.processMessageWithGpt(body, phoneNumber)
        logger.info(`[PROCESS] GPT processing complete for user: ${phoneNumber}`)
        logger.info(`[SEND] Sending response back to user: ${phoneNumber}`)
        await this.sendResponse(phoneNumber, response)
        logger.info(`[SEND] All response chunks sent to user: ${phoneNumber}`)
        const totalDuration = Date.now() - startTime
        logger.info(`[COMPLETE] Enhanced message processing complete for ${phoneNumber} in ${totalDuration}ms`)
        this.tracer.record('enhanced_processing', totalDuration, { userId: phoneNumber })
      } catch (err) {
        logger.error(`[ERROR] Enhanced webhook failed for user ${from}: ${err.message}`)
        logger.error(`[ERROR] Stack: ${err.stack}`)
        const duration = Date.now() - startTime
        this.tracer.record('enhanced_error', duration, { error: err.message })
        // Do not send fallback error message, just log
      }
    })();
  }

  async processMessageWithGpt(message, userId) {
    try {
      const chatHistoryService = require('../services/chatHistoryService')
      const StorageFactory = require('../services/storage')
      const config = require('../config/config')
      
      logger.debug(`[PROCESS] Creating storage provider for user: ${userId}`)
      const storageProvider = StorageFactory.createStorageProvider('redis', config)
      const historyService = new chatHistoryService(storageProvider)
      
      logger.debug(`[PROCESS] Retrieving chat history for user: ${userId}`)
      const messages = await historyService.prepareMessagesForGpt(userId, message)
      logger.debug(`[PROCESS] Chat history and system message prepared for GPT: ${JSON.stringify(messages)}`)
      
      const fallbackGptService = require('../services/fallbackGptService')
      const gptService = new fallbackGptService()
      
      let fullResponse = ''
      const onChunk = (chunk) => {
        logger.debug(`[CHUNK] Received GPT chunk for user ${userId}: "${chunk}"`)
        fullResponse += chunk
      }
      logger.info(`[PROCESS] Sending messages to GPT for user: ${userId}`)
      await gptService.getResponse(messages, onChunk)
      logger.info(`[PROCESS] GPT response received for user: ${userId}`)
      
      logger.debug(`[PROCESS] Saving user and assistant messages to history for user: ${userId}`)
      let history = await historyService.getUserHistory(userId)
      history = historyService.addUserMessage(history, message)
      history = historyService.addAssistantMessage(history, fullResponse)
      await historyService.saveUserHistory(userId, history)
      logger.debug(`[PROCESS] History saved for user: ${userId}`)
      
      return fullResponse
      
    } catch (err) {
      logger.error(`[ERROR] GPT processing failed for user ${userId}: ${err.message}`)
      logger.error(`[ERROR] Stack: ${err.stack}`)
      return "Oops! Something went wrong. Please try again in a moment."
    }
  }

  async sendResponse(to, response) {
    const responseText = String(response || 'Oops! Something went wrong. Please try again.')
    const chunks = splitMessageOnWordBoundary(responseText, 100)
    const toWhatsApp = this.processPhoneNumber(to)
    logger.debug(`[CHUNK] Splitting response into ${chunks.length} chunk(s) for WhatsApp: ${toWhatsApp}`)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      logger.debug(`[SEND] Sending chunk ${i + 1}/${chunks.length} to ${toWhatsApp}: "${chunk}"`)
      try {
        await sendMessage({ to: toWhatsApp, body: chunk })
        logger.debug(`[SEND] Chunk ${i + 1} sent successfully to ${toWhatsApp}`)
      } catch (err) {
        logger.error(`[ERROR] Failed to send chunk ${i + 1} to ${toWhatsApp}: ${err.message}`)
        throw err
      }
    }
  }

  validateIncomingMessage(body) {
    return body && body.From && body.Body && body.To
  }

  processPhoneNumber(phoneNumber) {
    // Remove any non-digit characters except +
    let processed = phoneNumber.replace(/[^\d+]/g, '')
    
    // Ensure it starts with +
    if (!processed.startsWith('+')) {
      processed = '+' + processed
    }
    // Ensure it starts with whatsapp:
    if (!processed.startsWith('whatsapp:')) {
      processed = 'whatsapp:' + processed
    }
    
    return processed
  }

  getStats() {
    return {
      tracer: this.tracer.getStats()
    }
  }

  async healthCheck() {
    try {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      }
    } catch (err) {
      logger.error(`❌ Health check failed: ${err.message}`)
      return {
        status: 'unhealthy',
        error: err.message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

const enhancedController = new EnhancedWhatsappController()
module.exports = enhancedController 