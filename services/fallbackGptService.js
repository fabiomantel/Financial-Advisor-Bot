const { getGptReplyStream } = require('./openaiService')
const logger = require('../utils/logger')

class FallbackGptService {
  constructor() {
    this.primaryModel = 'gpt-4o'
    this.fallbackModel = 'gpt-3.5-turbo'
    this.timeoutThreshold = parseInt(process.env.FALLBACK_TIMEOUT) || 5000 // 5 seconds
    logger.info(`FallbackGptService initialized: primary=${this.primaryModel}, fallback=${this.fallbackModel}, timeout=${this.timeoutThreshold}ms`)
  }
  
  async getResponse(messages, onChunk = null) {
    const startTime = Date.now()
    logger.info(`🚀 [Fallback] Starting GPT request with primary model: ${this.primaryModel}`)
    
    try {
      // Try primary model first
      const response = await this.callGptWithTimeout(messages, this.primaryModel, onChunk)
      const duration = Date.now() - startTime
      logger.info(`✅ [Fallback] Primary model response completed in ${duration}ms`)
      return response
      
    } catch (err) {
      const duration = Date.now() - startTime
      logger.warn(`⚠️ [Fallback] Primary model failed after ${duration}ms: ${err.message}`)
      
      // Fallback to faster model
      logger.info(`🔄 [Fallback] Falling back to ${this.fallbackModel}`)
      try {
        const fallbackResponse = await this.callGptWithTimeout(messages, this.fallbackModel, onChunk)
        const totalDuration = Date.now() - startTime
        logger.info(`✅ [Fallback] Fallback model response completed in ${totalDuration}ms`)
        return fallbackResponse
      } catch (fallbackErr) {
        logger.error(`💥 [Fallback] Fallback model also failed: ${fallbackErr.message}`)
        throw fallbackErr
      }
    }
  }
  
  async callGptWithTimeout(messages, model, onChunk = null) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`GPT request timeout after ${this.timeoutThreshold}ms`))
      }, this.timeoutThreshold)
      
      // Temporarily override the model in the request
      const originalModel = messages[0]?.model || 'gpt-4o'
      const messagesWithModel = messages.map(msg => ({ ...msg, model }))
      
      // Create a default onChunk if none provided
      const defaultOnChunk = onChunk || (() => {})
      
      getGptReplyStream(messagesWithModel, defaultOnChunk)
        .then((response) => {
          clearTimeout(timeout)
          resolve(response)
        })
        .catch((err) => {
          clearTimeout(timeout)
          reject(err)
        })
    })
  }
}

module.exports = FallbackGptService 