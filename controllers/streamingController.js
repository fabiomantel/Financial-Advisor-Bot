const { getGptReplyStream } = require('../services/openaiService')
const { sendMessage, splitMessageOnWordBoundary } = require('../services/messagingService')
const { prepareMessagesForGpt } = require('../services/chatHistoryService')
const FallbackGptService = require('../services/fallbackGptService')
const PerformanceTracer = require('../utils/tracer')
const logger = require('../utils/logger')

// Refactored: Export a factory for dependency injection
function createStreamingController({
  getGptReplyStream = require('../services/openaiService').getGptReplyStream,
  sendMessage = require('../services/messagingService').sendMessage,
  splitMessageOnWordBoundary = require('../services/messagingService').splitMessageOnWordBoundary,
  prepareMessagesForGpt = require('../services/chatHistoryService').prepareMessagesForGpt,
  fallbackService = new (require('../services/fallbackGptService'))(),
  tracer = new (require('../utils/tracer'))(),
  logger = require('../utils/logger'),
  CHUNK_SEND_DELAY_MS = parseInt(process.env.CHUNK_SEND_DELAY_MS, 10) || 250,
} = {}) {
  return {
    handleStreamingWebhook: async (req, res) => {
      const { From: from, Body: body } = req.body
      logger.info(`[RECEIVE] Streaming webhook received. From: ${from}, Body: "${body}"`)
      logger.debug(`[RECEIVE] Raw payload: ${JSON.stringify(req.body)}`)
      tracer.mark('webhook_start')
      let messages
      try {
        messages = await prepareMessagesForGpt(from, body)
        logger.info(`[PROCESS] Prepared ${messages.length} messages for GPT for user: ${from}`)
      } catch (err) {
        logger.error(`[ERROR] Failed to prepare messages for user ${from}: ${err.message}`)
        return res.status(500).send('')
      }
      let fullResponse = ''
      let chunkBuffer = ''
      let messageCount = 0
      tracer.mark('gpt_start')
      try {
        await fallbackService.getResponse(messages, async (chunk) => {
          fullResponse += chunk
          chunkBuffer += chunk
          if (chunkBuffer.length >= 100 || /[.!?]$/.test(chunk)) {
            if (chunkBuffer.trim()) {
              messageCount++
              logger.debug(`[CHUNK] Sending chunk #${messageCount} to ${from}: "${chunkBuffer.trim()}"`)
              try {
                await sendMessage({ to: from, body: chunkBuffer.trim() })
                logger.debug(`[SEND] Chunk #${messageCount} sent successfully to ${from}`)
              } catch (sendErr) {
                logger.error(`[ERROR] Failed to send chunk #${messageCount} to ${from}: ${sendErr.message}`)
              }
              chunkBuffer = ''
              await new Promise(res => setTimeout(res, CHUNK_SEND_DELAY_MS))
            }
          }
        })
        if (chunkBuffer.trim()) {
          const finalChunks = splitMessageOnWordBoundary(chunkBuffer.trim(), 100)
          for (const chunk of finalChunks) {
            messageCount++
            logger.debug(`[CHUNK] Sending final chunk #${messageCount} to ${from}: "${chunk}"`)
            try {
              await sendMessage({ to: from, body: chunk })
            } catch (err) {
              logger.error(`[ERROR] Failed to send final chunk #${messageCount} to ${from}: ${err.message}`)
            }
          }
        }
        tracer.mark('gpt_end')
        tracer.measure('gpt_processing', 'gpt_start', 'gpt_end')
        logger.info(`[COMPLETE] Streaming completed for user: ${from}. Sent ${messageCount} messages, ${fullResponse.length} chars`)
      } catch (err) {
        logger.error(`[ERROR] Streaming failed for user ${from}: ${err.message}`)
        await sendMessage({ to: from, body: 'Sorry, could not process your request. Please try again.' })
      }
      tracer.mark('webhook_end')
      tracer.measure('total_processing', 'webhook_start', 'webhook_end')
      const measures = tracer.getMeasures()
      logger.info(`[PERF] Performance metrics for user ${from}: ${JSON.stringify(measures)}`)
      res.status(200).send('')
    }
  }
}

// Default export for production usage (backward compatible)
const defaultController = createStreamingController();
module.exports = defaultController;
module.exports.createStreamingController = createStreamingController; 