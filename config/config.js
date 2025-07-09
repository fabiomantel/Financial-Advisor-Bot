require('dotenv').config()
const hebrew = require('./hebrew')
const logger = require('../utils/logger');

logger.info('Loaded REDIS_URL:', process.env.REDIS_URL)

module.exports = {
  PORT: process.env.PORT || 3000,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
  OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
  TWILIO_API_URL: (sid) => `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
  SYSTEM_PROMPT: hebrew.SYSTEM_PROMPT,
  INSTANT_REPLY: hebrew.INSTANT_REPLY,
  ERROR_REPLY: hebrew.ERROR_REPLY,
  MODEL: 'gpt-4o',
  INPUT_KEYS: {
    body: 'Body',
    from: 'From'
  },
  REDIS_URL: process.env.REDIS_URL,
  STORAGE_TYPE: process.env.STORAGE_TYPE || 'redis',
  // Context management config
  CONTEXT_RECENT_PAIRS: parseInt(process.env.CONTEXT_RECENT_PAIRS, 10) || 5,
  CONTEXT_SUMMARY_TRIGGER: parseInt(process.env.CONTEXT_SUMMARY_TRIGGER, 10) || 10,
  CONTEXT_MIN_MSG_LENGTH: parseInt(process.env.CONTEXT_MIN_MSG_LENGTH, 10) || 50,
  CONTEXT_FILTER_PHRASES: hebrew.CONTEXT_FILTER_PHRASES,
  CONTEXT_SUMMARY_PROMPT: hebrew.CONTEXT_SUMMARY_PROMPT,
  CONTEXT_MAX_TOKEN_COUNT: parseInt(process.env.CONTEXT_MAX_TOKEN_COUNT, 10) || 800,
  CONTEXT_SUMMARY_TRIGGER_TOKENS: parseInt(process.env.CONTEXT_SUMMARY_TRIGGER_TOKENS, 10) || 1200
}
