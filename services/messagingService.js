const axios = require('axios')
const config = require('../config/config')
const logger = require('../utils/logger');

const MAX_BODY_LENGTH = 1600

/**
 * Robust chunking for WhatsApp: sentence-aware, code/list/formatting safe, Hebrew/mixed, error-tolerant
 * @param {string} text
 * @param {number} maxLen
 * @returns {string[]}
 */
function splitMessageOnWordBoundary (text, maxLen) {
  try {
    if (!text || typeof text !== 'string') {
      logger.warn('[CHUNK] Invalid input to splitMessageOnWordBoundary:', text)
      return ['']
    }
    if (text.length <= maxLen) return [text]

    // Helper: is inside code block
    let inCodeBlock = false
    const inInlineCode = false
    let inList = false
    const inBold = false
    const inItalic = false
    const inWhatsAppCode = false
    let buffer = ''
    const chunks = []
    const lines = text.split(/\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Detect multi-line code block
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock
        buffer += (buffer ? '\n' : '') + line
        continue
      }
      // Detect list item
      if (/^\s*([*-]|\d+\.)\s+/.test(line)) {
        inList = true
      } else {
        inList = false
      }
      // If in code block or list, treat as atomic
      if (inCodeBlock || inList) {
        if ((buffer + '\n' + line).length > maxLen) {
          if (buffer) {
            chunks.push(buffer)
            buffer = line
          } else {
            // Force split long code/list
            for (let j = 0; j < line.length; j += maxLen) {
              chunks.push(line.slice(j, j + maxLen))
            }
            buffer = ''
          }
        } else {
          buffer += (buffer ? '\n' : '') + line
        }
        continue
      }
      // Sentence-aware splitting
      const sentences = line.match(/[^.!?\n]+[.!?]?/g) || [line]
      for (const s of sentences) {
        // WhatsApp formatting: avoid splitting inside *bold*, _italic_, `code`
        // Simple stateful scan for formatting
        const safeSplit = (str) => {
          const out = []
          let cur = ''
          const fmt = { bold: false, italic: false, code: false }
          for (let i = 0; i < str.length; i++) {
            const c = str[i]
            // Improved formatting detection to prevent duplicates
            if (c === '*' && (i === 0 || str[i - 1] !== '*')) {
              fmt.bold = !fmt.bold
            } else if (c === '_' && (i === 0 || str[i - 1] !== '_')) {
              fmt.italic = !fmt.italic
            } else if (c === '`') {
              fmt.code = !fmt.code
            }
            cur += c
            if (cur.length >= maxLen && !fmt.bold && !fmt.italic && !fmt.code) {
              out.push(cur)
              cur = ''
            }
          }
          if (cur) out.push(cur)
          return out
        }
        // If sentence fits, add to buffer
        if ((buffer + (buffer ? ' ' : '') + s).length > maxLen) {
          if (buffer) {
            chunks.push(buffer.trim())
            buffer = s
          } else {
            // Sentence too long, try word boundary
            const words = s.split(' ')
            let cur = ''
            for (const w of words) {
              if ((cur + (cur ? ' ' : '') + w).length > maxLen) {
                if (cur) {
                  chunks.push(cur)
                  cur = w
                } else {
                  // Word too long, force split
                  const forced = safeSplit(w)
                  chunks.push(...forced)
                  cur = ''
                }
              } else {
                cur += (cur ? ' ' : '') + w
              }
            }
            if (cur) {
              chunks.push(cur)
              buffer = ''
            }
          }
        } else {
          buffer += (buffer ? ' ' : '') + s
        }
      }
    }
    if (buffer) chunks.push(buffer.trim())
    return chunks.filter(Boolean)
  } catch (err) {
    logger.error('[CHUNK] Error in splitMessageOnWordBoundary:', err)
    return [text]
  }
}

async function sendMessage ({ to, body }) {
  logger.info(`[SEND] Attempting to send message to ${to}. Body length: ${body.length}`)
  if (body.length > MAX_BODY_LENGTH) {
    logger.warn(`[CHUNK] Message body exceeds ${MAX_BODY_LENGTH} characters. Splitting into multiple messages for ${to}.`)
    const chunks = splitMessageOnWordBoundary(body, MAX_BODY_LENGTH)
    for (const chunk of chunks) {
      try {
        logger.debug(`[SEND] Sending chunk to ${to}: "${chunk}"`)
        await axios.post(
          config.TWILIO_API_URL(config.TWILIO_ACCOUNT_SID),
          new URLSearchParams({
            To: to,
            From: config.TWILIO_WHATSAPP_NUMBER,
            Body: chunk
          }),
          {
            auth: {
              username: config.TWILIO_ACCOUNT_SID,
              password: config.TWILIO_AUTH_TOKEN
            }
          }
        )
        logger.debug(`[SEND] Chunk sent successfully to ${to}`)
      } catch (err) {
        logger.error(`[ERROR] Twilio API error (chunked) for ${to}: ${err.message}`)
        if (err.response) {
          logger.error(`[ERROR] Twilio status: ${err.response.status}`)
          logger.error(`[ERROR] Twilio data: ${JSON.stringify(err.response.data)}`)
        }
        throw err
      }
    }
    return { success: true }
  }
  try {
    logger.debug(`[SEND] Sending message to ${to}: "${body}"`)
    await axios.post(
      config.TWILIO_API_URL(config.TWILIO_ACCOUNT_SID),
      new URLSearchParams({
        To: to,
        From: config.TWILIO_WHATSAPP_NUMBER,
        Body: body
      }),
      {
        auth: {
          username: config.TWILIO_ACCOUNT_SID,
          password: config.TWILIO_AUTH_TOKEN
        }
      }
    )
    logger.info(`[SEND] Message sent successfully to ${to}`)
    return { success: true }
  } catch (err) {
    logger.error(`[ERROR] Twilio API error for ${to}: ${err.message}`)
    if (err.response) {
      logger.error(`[ERROR] Twilio status: ${err.response.status}`)
      logger.error(`[ERROR] Twilio data: ${JSON.stringify(err.response.data)}`)
    }
    throw err
  }
}

module.exports = { sendMessage, splitMessageOnWordBoundary }
