require('dotenv').config()
const hebrew = require('./hebrew')

module.exports = {
  PORT: process.env.PORT || 3000,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER: 'whatsapp:+14155238886',
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
  STORAGE_TYPE: process.env.STORAGE_TYPE || 'redis'
}
