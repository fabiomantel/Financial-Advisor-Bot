const { getGptReplyStream } = require('./openaiService')
const logger = require('../utils/logger');
const debugStore = require('../utils/debugStore');

class FallbackGptService {
  constructor () {
    this.primaryModel = 'gpt-4o'
    this.fallbackModel = 'gpt-3.5-turbo'
    this.timeoutThreshold = parseInt(process.env.FALLBACK_TIMEOUT) || 5000 // 5 seconds
    logger.info(`FallbackGptService initialized: primary=${this.primaryModel}, fallback=${this.fallbackModel}, timeout=${this.timeoutThreshold}ms`)
  }

  async getResponse (messages, onChunk = null, collectAll = false) {
    const startTime = Date.now()
    logger.info(`🚀 [Fallback] Starting GPT request with primary model: ${this.primaryModel}`)

    try {
      // Try primary model first
      const response = await this.callGptWithTimeout(messages, this.primaryModel, onChunk, collectAll)
      const duration = Date.now() - startTime
      logger.info(`✅ [Fallback] Primary model response completed in ${duration}ms`)
      return response
    } catch (err) {
      const duration = Date.now() - startTime
      logger.warn(`⚠️ [Fallback] Primary model failed after ${duration}ms: ${err.message}`)
      debugStore.add({
        type: 'primary_model_error',
        error: err.message,
        model: this.primaryModel,
        duration: duration
      });

      // Fallback to faster model
      logger.info(`🔄 [Fallback] Falling back to ${this.fallbackModel}`)
      try {
        const fallbackResponse = await this.callGptWithTimeout(messages, this.fallbackModel, onChunk, collectAll)
        const totalDuration = Date.now() - startTime
        logger.info(`✅ [Fallback] Fallback model response completed in ${totalDuration}ms`)
        return fallbackResponse
      } catch (fallbackErr) {
        logger.error(`💥 [Fallback] Fallback model also failed: ${fallbackErr.message}`)
        debugStore.add({
          type: 'fallback_error',
          error: fallbackErr.message,
          primaryModel: this.primaryModel,
          fallbackModel: this.fallbackModel,
          duration: Date.now() - startTime
        });
        throw fallbackErr
      }
    }
  }

  async callGptWithTimeout (messages, model, onChunk = null, collectAll = false) {
    if (process.env.NODE_ENV === 'development') {
      logger.info('[DEBUG] OpenAI payload:', JSON.stringify({ model, messages }, null, 2))
    }
    return new Promise((resolve, reject) => {
      let idleTimer
      const resetIdle = () => {
        if (idleTimer) clearTimeout(idleTimer)
        idleTimer = setTimeout(() => {
          reject(new Error(`GPT stream idle for ${this.timeoutThreshold}ms`))
        }, this.timeoutThreshold)
      }
      resetIdle()

      // Temporarily override the model in the request
      const originalModel = messages[0]?.model || 'gpt-4o'
      const messagesWithModel = messages.map(msg => ({ ...msg, model }))

      // Wrap the onChunk to reset the idle timer
      const wrappedOnChunk = (chunk) => {
        resetIdle()
        if (onChunk) onChunk(chunk)
      }

      getGptReplyStream(messagesWithModel, wrappedOnChunk, collectAll)
        .then((response) => {
          clearTimeout(idleTimer)
          resolve(response)
        })
        .catch((err) => {
          clearTimeout(idleTimer)
          reject(err)
        })
    })
  }
}

module.exports = FallbackGptService
