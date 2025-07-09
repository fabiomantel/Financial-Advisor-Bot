const logger = require('../utils/logger');
const PerformanceTracer = require('../utils/performanceTracer')
const SmartHistoryManager = require('./historyManager')
const FallbackGptService = require('./fallbackGptService')
const { sendMessage, splitMessageOnWordBoundary } = require('./messagingService')

class ProcessingPipeline {
  constructor ({ historyManager, gptService, sendMessageFn } = {}) {
    this.tracer = new PerformanceTracer()
    this.maxRetries = 3
    this.retryDelay = 1000 // 1 second
    this.historyManager = historyManager || new SmartHistoryManager()
    this.gptService = gptService || new FallbackGptService()
    this.sendMessage = sendMessageFn || sendMessage
  }

  async process (message) {
    const startTime = Date.now()
    const pipelineId = `pipeline-${Date.now()}`

    logger.info(`🚀 [Pipeline] Starting processing for ${message.from}`)

    try {
      // Parallel processing of all tasks
      const parallelStart = Date.now()
      const tasks = [
        this.loadContext(message.from),
        this.prepareGptRequest(message),
        this.validateMessage(message)
      ]
      const [context, gptRequest, validation] = await Promise.all(tasks)
      const parallelDuration = Date.now() - parallelStart
      logger.info(`⚡ [Pipeline] Parallel tasks completed in ${parallelDuration}ms`)

      // Validation check
      if (!validation.valid) {
        logger.warn(`❌ [Pipeline] Message validation failed: ${validation.error}`)
        return this.sendErrorResponse(message.to, validation.error)
      }

      // Process GPT response with retry logic
      const gptStart = Date.now()
      const gptResponse = await this.processGptResponseWithRetry(message, gptRequest, context)
      const gptDuration = Date.now() - gptStart
      logger.info(`🧠 [Pipeline] GPT processing completed in ${gptDuration}ms`)

      // Save context asynchronously
      setImmediate(async () => {
        try {
          await this.saveContextAsync(message.from, message.body, gptResponse)
          logger.debug('💾 [Pipeline] Context saved asynchronously')
        } catch (saveErr) {
          logger.error(`❌ [Pipeline] Failed to save context: ${saveErr.message}`)
        }
      })

      const chunks = splitMessageOnWordBoundary(gptResponse, 100)
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        logger.debug(`[PIPELINE] Sending chunk ${i + 1}/${chunks.length} to ${message.to}: "${chunk}"`)
        try {
          await sendMessage({ to: message.to, body: chunk })
          logger.debug(`[PIPELINE] Chunk ${i + 1} sent successfully to ${message.to}`)
        } catch (err) {
          logger.error(`[PIPELINE] Failed to send chunk ${i + 1} to ${message.to}: ${err.message}`)
        }
      }

      const totalDuration = Date.now() - startTime
      logger.info(`🎉 [Pipeline] Processing completed in ${totalDuration}ms`)

      this.tracer.record('pipeline_processing', totalDuration, {
        pipelineId,
        userId: message.from,
        parallelDuration,
        gptDuration,
        validation: validation.valid
      })

      return gptResponse
    } catch (err) {
      logger.error(`💥 [Pipeline] Processing failed: ${err.message}`)

      this.tracer.record('pipeline_error', Date.now() - startTime, {
        pipelineId,
        userId: message.from,
        error: err.message
      })

      throw err
    }
  }

  async loadContext (userId) {
    const startTime = Date.now()
    logger.debug(`📚 [Pipeline] Loading context for ${userId}`)

    try {
      const context = await this.historyManager.getOptimizedContext(userId)
      const duration = Date.now() - startTime
      logger.debug(`✅ [Pipeline] Context loaded in ${duration}ms`)

      return context
    } catch (err) {
      logger.error(`❌ [Pipeline] Failed to load context: ${err.message}`)
      return []
    }
  }

  async prepareGptRequest (message) {
    const startTime = Date.now()
    logger.debug(`🤖 [Pipeline] Preparing GPT request for ${message.from}`)

    try {
      const gptRequest = [{ role: 'user', content: message.body }]
      const duration = Date.now() - startTime
      logger.debug(`✅ [Pipeline] GPT request prepared in ${duration}ms`)

      return gptRequest
    } catch (err) {
      logger.error(`❌ [Pipeline] Failed to prepare GPT request: ${err.message}`)
      throw err
    }
  }

  async validateMessage (message) {
    const startTime = Date.now()
    logger.debug(`🔍 [Pipeline] Validating message from ${message.from}`)

    try {
      // Basic validation
      if (!message.body || message.body.trim().length === 0) {
        return { valid: false, error: 'Empty message' }
      }

      if (message.body.length > 1000) {
        return { valid: false, error: 'Message too long' }
      }

      // Check for spam patterns
      if (this.isSpam(message.body)) {
        return { valid: false, error: 'Spam detected' }
      }

      const duration = Date.now() - startTime
      logger.debug(`✅ [Pipeline] Message validated in ${duration}ms`)

      return { valid: true }
    } catch (err) {
      logger.error(`❌ [Pipeline] Validation failed: ${err.message}`)
      return { valid: false, error: 'Validation error' }
    }
  }

  isSpam (message) {
    // Simple spam detection
    const spamPatterns = [
      /(buy|sell|investment|profit|money|cash|earn|rich|wealth)/i,
      /(http|www|\.com|\.net|\.org)/i,
      /(call|text|message|contact|reach)/i
    ]

    return spamPatterns.some(pattern => pattern.test(message))
  }

  async processGptResponseWithRetry (message, gptRequest, context) {
    let lastError = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`🔄 [Pipeline] GPT attempt ${attempt}/${this.maxRetries}`)

        let fullResponse = ''
        await this.gptService.getResponse(gptRequest, (chunk) => {
          fullResponse += chunk
        })
        logger.info(`✅ [Pipeline] GPT response successful on attempt ${attempt}`)

        return fullResponse
      } catch (err) {
        lastError = err
        logger.warn(`⚠️ [Pipeline] GPT attempt ${attempt} failed: ${err.message}`)

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt)
        }
      }
    }

    logger.error('💥 [Pipeline] All GPT attempts failed')
    throw lastError
  }

  async saveContextAsync (userId, userMessage, botResponse) {
    try {
      const chatHistoryService = require('./chatHistoryService')
      const storageProvider = require('./storage')
      const historyService = new chatHistoryService(storageProvider)
      // Add user message
      let history = await historyService.getUserHistory(userId)
      history = historyService.addUserMessage(history, userMessage)
      // Add bot response
      history = historyService.addAssistantMessage(history, botResponse)
      // Save asynchronously
      await historyService.saveUserHistory(userId, history)
    } catch (err) {
      logger.error(`❌ [Pipeline] Failed to save context: ${err.message}`)
    }
  }

  async sendErrorResponse (to, error) {
    const errorMessage = '😕 אופס! משהו השתבש. נסה שוב עוד רגע.'
    await this.sendMessage({ to, body: errorMessage })
    logger.info(`[PIPELINE] Sent error response to ${to}: ${error}`)
  }

  delay (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getPipelineStats () {
    return {
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      tracerStats: this.tracer.getStats()
    }
  }
}

module.exports = ProcessingPipeline
