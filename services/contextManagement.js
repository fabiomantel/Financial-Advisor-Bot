const config = require('../config/config')
const logger = require('../utils/logger');
const { encoding_for_model } = require('@dqbd/tiktoken')

// Helper: Detect if a message is non-text (e.g., image, audio, sticker)
const isNonText = (msg) => typeof msg !== 'string' || msg.trim() === ''

// Helper: Detect fallback/error messages
const isFallbackOrError = (msg) => {
  if (!msg || typeof msg !== 'string') return true
  const lower = msg.toLowerCase()
  return config.CONTEXT_FILTER_PHRASES.some(phrase => lower.includes(phrase.toLowerCase()))
}

// Validate a user/assistant message pair for context inclusion
function isValidPair (userMsg, assistantMsg) {
  if (isNonText(userMsg) || isNonText(assistantMsg)) {
    logger.debug('Rejected non-text message for context')
    return false
  }
  if (assistantMsg.length < config.CONTEXT_MIN_MSG_LENGTH) {
    logger.debug('Rejected short assistant message for context')
    return false
  }
  if (isFallbackOrError(assistantMsg)) {
    logger.debug('Rejected fallback/error assistant message for context')
    return false
  }
  return true
}

// Append a valid pair to recent_messages, trim to max length
function updateRecentMessages (recentMessages, userMsg, assistantMsg) {
  const newPair = [
    { role: 'user', content: userMsg },
    { role: 'assistant', content: assistantMsg }
  ]
  const updated = [...recentMessages, ...newPair]
  // Only keep the last N pairs (N*2 messages)
  const max = config.CONTEXT_RECENT_PAIRS * 2
  return updated.slice(-max)
}

// Increment counter for valid pair, reset if summary updated
function incrementCounter (counter, valid) {
  return valid ? counter + 1 : counter
}

function resetCounter () {
  return 0
}

// Count GPT tokens in an array of message objects
function countGptTokens (messages, model = 'gpt-3.5-turbo') {
  const enc = encoding_for_model(model)
  let total = 0
  for (const msg of messages) {
    if (!msg || !msg.content) continue
    total += enc.encode(msg.content).length
  }
  enc.free()
  return total
}

module.exports = {
  isValidPair,
  updateRecentMessages,
  incrementCounter,
  resetCounter,
  isNonText,
  isFallbackOrError,
  countGptTokens
}
