const logger = require('../utils/logger');
const config = require('../config/config')
const { countGptTokens } = require('./contextManagement')

/**
 * Build the GPT context array for a user message, fitting under max token count.
 * - Always includes the system prompt (if present)
 * - Includes the summary as a short system message (if present)
 * - Includes as many recent_messages as will fit (oldest to newest)
 * - ALWAYS includes the current user message as the last message, even if it means dropping older context
 */
function buildGptContext (context, currentUserMessage, systemPrompt) {
  const maxTokens = config.CONTEXT_MAX_TOKEN_COUNT
  const messages = []
  // 1. System prompt
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  // 2. Summary as a short system message (if present)
  if (context.summary && context.summary.trim()) {
    messages.push({ role: 'system', content: `[סיכום שיחה עד כה]: ${context.summary.trim().slice(0, 200)}` })
  }
  // 3. Add as many recent_messages as will fit (oldest to newest)
  const recents = Array.isArray(context.recent_messages) ? context.recent_messages : []
  let usedTokens = countGptTokens(messages)
  // Prepare the user message (always last)
  let userMsg = null
  if (currentUserMessage && currentUserMessage.trim()) {
    userMsg = { role: 'user', content: currentUserMessage }
  }
  const userMsgTokens = userMsg ? countGptTokens([userMsg]) : 0
  // Fill with as many recents as possible, but always leave room for userMsg
  const includedRecents = []
  for (let i = 0; i < recents.length; i++) {
    const candidate = [recents[i]]
    const tokensWithCandidate = usedTokens + countGptTokens(candidate) + userMsgTokens
    if (tokensWithCandidate > maxTokens) break
    includedRecents.push(recents[i])
    usedTokens += countGptTokens(candidate)
  }
  messages.push(...includedRecents)
  // 4. Always add the user message as the last message
  if (userMsg) {
    messages.push(userMsg)
    usedTokens += userMsgTokens
  }
  logger.debug(`Built GPT context: ${messages.length} messages, ${usedTokens} tokens (max ${maxTokens})`)
  return messages
}

module.exports = { buildGptContext }
