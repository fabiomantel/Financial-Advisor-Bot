const RedisStorageProvider = require('./storage/redisStorageProvider')
const config = require('../config/config')
const logger = require('../utils/logger');
const {
  isValidPair,
  updateRecentMessages,
  incrementCounter,
  resetCounter,
  countGptTokens
} = require('./contextManagement')

const redis = new RedisStorageProvider(config)

const CONTEXT_KEY = userId => `chat_context:${userId}`

async function loadContext (userId) {
  try {
    const raw = await redis.get(CONTEXT_KEY(userId))
    if (!raw) {
      logger.info(`No context found for user ${userId}, initializing new context`)
      return {
        summary: '',
        recent_messages: [],
        message_count_since_summary: 0,
        last_interaction_timestamp: Date.now()
      }
    }
    const ctx = JSON.parse(raw)
    logger.debug(`Loaded context for user ${userId}`)
    return ctx
  } catch (err) {
    logger.error(`Failed to load context for user ${userId}: ${err.message}`)
    // Fallback to empty context
    return {
      summary: '',
      recent_messages: [],
      message_count_since_summary: 0,
      last_interaction_timestamp: Date.now()
    }
  }
}

async function saveContext (userId, context) {
  if (process.env.NODE_ENV === 'test') {
    // Synchronous for test environment
    try {
      await redis.set(CONTEXT_KEY(userId), JSON.stringify(context))
      logger.debug(`(Sync) Saved context for user ${userId} (test env)`)
    } catch (err) {
      logger.error(`(Sync) Failed to save context for user ${userId} (test env): ${err.message}`)
    }
  } else {
    // Fire-and-forget async save
    setImmediate(async () => {
      try {
        await redis.set(CONTEXT_KEY(userId), JSON.stringify(context))
        logger.debug(`(Async) Saved context for user ${userId}`)
      } catch (err) {
        logger.error(`(Async) Failed to save context for user ${userId}: ${err.message}`)
      }
    })
    logger.debug(`Scheduled async save for user ${userId}`)
  }
}

// Update context with a new user/assistant message pair
async function updateContextWithPair (userId, userMsg, assistantMsg, callback) {
  const ctx = await loadContext(userId)
  const valid = isValidPair(userMsg, assistantMsg)
  if (valid) {
    ctx.recent_messages = updateRecentMessages(ctx.recent_messages, userMsg, assistantMsg)
    ctx.message_count_since_summary = incrementCounter(ctx.message_count_since_summary, true)
    setImmediate(() => logger.info(`Accepted message pair for user ${userId}, counter now ${ctx.message_count_since_summary}`))
  } else {
    ctx.message_count_since_summary = incrementCounter(ctx.message_count_since_summary, false)
    setImmediate(() => logger.info(`Rejected message pair for user ${userId}, counter unchanged`))
  }
  ctx.last_interaction_timestamp = Date.now()
  saveContext(userId, ctx)
  // Fire-and-forget analytics event (placeholder)
  setImmediate(() => {
    // analytics.track('context_update', { userId, valid, timestamp: ctx.last_interaction_timestamp })
  })
  if (callback) setImmediate(() => callback(ctx))
  return ctx
}

const shouldUpdateSummary = (context) => {
  const byCount = context.message_count_since_summary >= config.CONTEXT_SUMMARY_TRIGGER
  const byTokens = countGptTokens(context.recent_messages || []) >= config.CONTEXT_SUMMARY_TRIGGER_TOKENS
  if (byCount) logger.info('Summary trigger: message count threshold reached')
  if (byTokens) logger.info('Summary trigger: token count threshold reached')
  return byCount || byTokens
}

function buildSummaryPrompt (context) {
  // Compose the summary prompt using config, current summary, and recent messages
  const recentPairs = context.recent_messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n')
  return config.CONTEXT_SUMMARY_PROMPT
    .replace('<current_summary>', context.summary || '')
    .replace('<recent_message_pairs>', recentPairs)
}

async function updateSummary (userId, newSummary) {
  const ctx = await loadContext(userId)
  ctx.summary = newSummary
  // Reset the counter when summary is updated
  ctx.message_count_since_summary = resetCounter()
  ctx.last_interaction_timestamp = Date.now()
  await saveContext(userId, ctx)
  logger.info(`Updated summary for user ${userId}, counter reset to 0`)
  return ctx
}

module.exports = {
  loadContext,
  saveContext,
  updateContextWithPair,
  shouldUpdateSummary,
  buildSummaryPrompt,
  updateSummary
}
