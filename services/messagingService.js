const axios = require('axios')
const config = require('../config/config')
const logger = require('../utils/logger')

const MAX_BODY_LENGTH = 1600

function splitMessageOnWordBoundary (text, maxLen) {
  if (text === '') return ['']
  const chunks = []
  let current = ''
  for (const word of text.split(' ')) {
    // If adding the next word would exceed the limit
    if ((current + (current ? ' ' : '') + word).length > maxLen) {
      if (current) {
        chunks.push(current.trim())
        current = word
      } else {
        // Single word longer than maxLen, force split
        for (let i = 0; i < word.length; i += maxLen) {
          chunks.push(word.slice(i, i + maxLen))
        }
        current = ''
      }
    } else {
      current += (current ? ' ' : '') + word
    }
  }
  if (current) chunks.push(current.trim())
  return chunks
}

async function sendMessage ({ to, body }) {
  // Split the body into chunks of 1600 characters or less, on word boundaries
  if (body.length > MAX_BODY_LENGTH) {
    logger.warn(`Message body exceeds ${MAX_BODY_LENGTH} characters. Splitting into multiple messages on word boundaries.`)
    const chunks = splitMessageOnWordBoundary(body, MAX_BODY_LENGTH)
    for (const chunk of chunks) {
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
    }
    return { success: true }
  }
  // If body is within limit, send as usual
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
  return { success: true }
}

module.exports = { sendMessage, splitMessageOnWordBoundary }
