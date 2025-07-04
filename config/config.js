require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER: 'whatsapp:+14155238886',
  OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
  TWILIO_API_URL: (sid) => `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
  SYSTEM_PROMPT: 'אתה יועץ פיננסי מנוסה המתמחה בהשקעות, מיסוי בישראל וניהול הון משפחתי.',
  INSTANT_REPLY: '🔍 צולל לתוך התוכנית שלנו ושלף את התובנות הרלוונטיות – תשובה מותאמת בדרך ✨',
  ERROR_REPLY: '😕 אופס! משהו השתבש – נסה שוב עוד רגע, אני כאן בשבילך.',
  MODEL: 'gpt-4o',
  INPUT_KEYS: {
    body: 'Body',
    from: 'From',
  },
  REDIS_URL: process.env.REDIS_URL,
  STORAGE_TYPE: process.env.STORAGE_TYPE || 'redis',
}; 