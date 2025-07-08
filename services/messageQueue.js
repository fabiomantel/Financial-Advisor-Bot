const logger = require('../utils/logger')
const config = require('../config/config')
const PerformanceTracer = require('../utils/performanceTracer')
const { sendMessage, splitMessageOnWordBoundary } = require('./messagingService')
const FallbackGptService = require('./fallbackGptService')
const SmartHistoryManager = require('../services/historyManager')

class MessageQueue {
  constructor(config, { historyManager, gptService, sendMessageFn } = {}) {
    this.queue = []
    this.processing = false
    this.historyManager = historyManager || new SmartHistoryManager(config)
    this.gptService = gptService || new FallbackGptService()
    this.sendMessage = sendMessageFn || sendMessage
    this.processingQueue = new Map()
    this.maxConcurrent = 10
    this.activeProcesses = 0
    this.tracer = new PerformanceTracer()
  }

  async enqueue(message) {
    logger.info(`[QUEUE] Enqueuing message from ${message.from}`)
    this.queue.push(message)
    this.processNext()
  }

  async processNext() {
    if (this.processing || this.queue.length === 0) return
    this.processing = true
    const message = this.queue.shift()
    logger.info(`[QUEUE] Processing message from ${message.from}`)
    try {
      // 2. Parallel processing: context and GPT response
      logger.info(`[QUEUE] Starting parallel context and GPT processing for ${message.from}`)
      const [context, gptResponse] = await Promise.all([
        this.historyManager.getOptimizedContext(message.from, message.body),
        this.gptService.getResponse(
          [{ role: 'user', content: message.body }],
          null // onChunk handler for streaming can be added later
        )
      ])
      logger.info(`[QUEUE] Parallel processing complete for ${message.from}`)

      // 3. Stream response (for now, send as one message; chunking can be added)
      await this.streamResponse(message.to, gptResponse)
      logger.info(`[QUEUE] Response sent to ${message.to}`)
    } catch (err) {
      logger.error(`[ERROR] Failed to process message from ${message.from}: ${err.message}`)
    } finally {
      this.processing = false
      if (this.queue.length > 0) {
        this.processNext()
      }
    }
  }

  async streamResponse(to, response) {
    logger.info(`[QUEUE] Streaming response to ${to}`)
    const chunks = splitMessageOnWordBoundary(response, 100)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      logger.debug(`[QUEUE] Sending chunk ${i + 1}/${chunks.length} to ${to}: "${chunk}"`)
      try {
        await this.sendMessage({ to, body: chunk })
        logger.debug(`[QUEUE] Chunk ${i + 1} sent successfully to ${to}`)
      } catch (err) {
        logger.error(`[QUEUE] Failed to send chunk ${i + 1} to ${to}: ${err.message}`)
      }
    }
  }

  async processMessage(message) {
    const startTime = Date.now()
    const messageId = `${message.from}-${Date.now()}`
    
    logger.info(`[Queue] Processing message ${messageId} from ${message.from}`)
    
    try {
      // Check if we can process immediately
      if (this.activeProcesses >= this.maxConcurrent) {
        logger.warn(`⚠️ [Queue] Max concurrent processes reached, queuing message ${messageId}`)
        return this.queueMessage(message, messageId)
      }

      this.activeProcesses++
      this.processingQueue.set(messageId, { status: 'processing', startTime })

      // 2. Parallel processing
      const parallelStart = Date.now()
      const [context, gptResponse] = await Promise.all([
        this.getContext(message.from),
        this.getGptResponse(message.body, message.from)
      ])
      const parallelDuration = Date.now() - parallelStart
      logger.info(`⚡ [Queue] Parallel processing completed in ${parallelDuration}ms`)

      // 3. Stream response
      const streamStart = Date.now()
      await this.streamResponse(message.to, gptResponse)
      const streamDuration = Date.now() - streamStart
      logger.info(`📤 [Queue] Response streaming completed in ${streamDuration}ms`)

      const totalDuration = Date.now() - startTime
      logger.info(`🎉 [Queue] Message ${messageId} completed in ${totalDuration}ms`)
      
      this.tracer.record('message_processing', totalDuration, {
        messageId,
        userId: message.from,
        parallelDuration,
        streamDuration
      })

    } catch (err) {
      logger.error(`❌ [Queue] Failed to process message ${messageId}: ${err.message}`)
      await this.sendErrorResponse(message.to, err.message)
      
      this.tracer.record('message_error', Date.now() - startTime, {
        messageId,
        userId: message.from,
        error: err.message
      })
    } finally {
      this.activeProcesses--
      this.processingQueue.delete(messageId)
    }
  }

  async queueMessage(message, messageId) {
    logger.info(`📋 [Queue] Queuing message ${messageId}`)
    
    // For now, process immediately (can be enhanced with Redis queue later)
    return this.processMessage(message)
  }

  async getContext(userId) {
    const chatHistoryService = require('./chatHistoryService')
    const storageProvider = require('./storage')
    const historyService = new chatHistoryService(storageProvider)
    
    return await historyService.getUserHistory(userId)
  }

  async getGptResponse(message, userId) {
    const gptService = new FallbackGptService()
    
    const messages = await this.prepareMessagesForGpt(userId, message)
    return await gptService.getResponse(messages)
  }

  async prepareMessagesForGpt(userId, currentMessage) {
    const chatHistoryService = require('./chatHistoryService')
    const storageProvider = require('./storage')
    const historyService = new chatHistoryService(storageProvider)
    
    return await historyService.prepareMessagesForGpt(userId, currentMessage)
  }

  async sendErrorResponse(to, error) {
    const errorMessage = "😕 אופס! משהו השתבש. נסה שוב עוד רגע."
    await this.sendMessage({ to, body: errorMessage })
  }

  getQueueStatus() {
    return {
      activeProcesses: this.activeProcesses,
      maxConcurrent: this.maxConcurrent,
      queueSize: this.processingQueue.size,
      processingMessages: Array.from(this.processingQueue.keys())
    }
  }
}

module.exports = MessageQueue 