const logger = require('../utils/logger');
const debugStore = require('../utils/debugStore');
const { buildGptContext } = require('../services/contextBuilder');
const config = require('../config/config');
const contextState = require('../services/contextState');

const fallbackGptService = require('../services/fallbackGptService');

async function processMessageWithGpt(message, userId, onFirstChunk, debugReqId, isDev) {
  try {
    const context = await contextState.loadContext(userId);
    debugStore.add({
      type: 'context_loaded_gpt', userId, context, meta: { reqId: debugReqId }
    });
    context.last_interaction_timestamp = Date.now();
    await contextState.saveContext(userId, context);
    const gptContext = buildGptContext(context, message, config.SYSTEM_PROMPT);
    debugStore.add({
      type: 'gpt_request', userId, gptContext, meta: { reqId: debugReqId }
    });
    const gptService = new fallbackGptService();
    let fullResponse = '';
    let firstChunkReceived = false;
    const onChunk = (chunk) => {
      fullResponse += chunk;
      if (!firstChunkReceived && onFirstChunk) {
        firstChunkReceived = true;
        onFirstChunk();
      }
    };
    logger.info(`[PROCESS] Sending context to GPT for user: ${userId}`);
    await gptService.getResponse(gptContext, onChunk);
    logger.info(`[PROCESS] GPT response received for user: ${userId}`);
    debugStore.add({
      type: 'gpt_response', userId, response: fullResponse, meta: { reqId: debugReqId }
    });
    (async () => {
      try {
        const updatedContext = await contextState.loadContext(userId);
        const valid = require('../services/contextManagement').isValidPair(message, fullResponse);
        if (valid) {
          updatedContext.recent_messages = require('../services/contextManagement').updateRecentMessages(updatedContext.recent_messages, message, fullResponse);
          updatedContext.message_count_since_summary = require('../services/contextManagement').incrementCounter(updatedContext.message_count_since_summary, true);
          // Ensure we keep only CONTEXT_RECENT_PAIRS latest messages (already handled in updateRecentMessages)
        } else {
          updatedContext.message_count_since_summary = require('../services/contextManagement').incrementCounter(updatedContext.message_count_since_summary, false);
        }
        if (contextState.shouldUpdateSummary(updatedContext)) {
          logger.info(`[CONTEXT] Summary update triggered for user: ${userId}`);
          const prompt = contextState.buildSummaryPrompt(updatedContext);
          debugStore.add({
            type: 'summary_update_request', userId, prompt, meta: { reqId: debugReqId }
          });
          const summary = await gptService.getResponse([{ role: 'system', content: prompt }], null, true);
          updatedContext.summary = summary;
          // Reset the counter when summary is updated
          updatedContext.message_count_since_summary = require('../services/contextManagement').resetCounter();
          logger.info(`[CONTEXT] Summary updated for user: ${userId}, counter reset to 0`);
          debugStore.add({
            type: 'summary_update_response', userId, summary, meta: { reqId: debugReqId }
          });
        }
        updatedContext.last_interaction_timestamp = Date.now();
        await contextState.saveContext(userId, updatedContext);
        logger.info(`[CONTEXT] Context and summary updated in background for user: ${userId}`);
        debugStore.add({
          type: 'context_saved', userId, updatedContext, meta: { reqId: debugReqId }
        });
      } catch (updateErr) {
        logger.error(`[CONTEXT] Failed to update context/summary in background for user: ${userId}: ${updateErr.message}`);
      }
    })();
    return fullResponse;
  } catch (err) {
    logger.error(`[ERROR] GPT processing failed for user ${userId}: ${err.message}`);
    logger.error(`[ERROR] Stack: ${err.stack}`);
    return require('../config/hebrew').ERROR_REPLY;
  }
}

async function processGptAndRespond(body, phoneNumber, from, reqId, isDev, context) {
  let firstChunkTime;
  const timings = { gptStart: Date.now() };
  const response = await processMessageWithGpt(body, phoneNumber, () => {
    if (!firstChunkTime) {
      firstChunkTime = Date.now();
      logger.info(`[TIMING] First GPT chunk received after ${firstChunkTime - timings.gptStart}ms`);
    }
  }, isDev ? reqId : undefined, isDev);
  timings.gptEnd = Date.now();
  logger.info(`[TIMING] GPT streaming took ${timings.gptEnd - timings.gptStart}ms`);
  return response;
}

module.exports = { processGptAndRespond }; 