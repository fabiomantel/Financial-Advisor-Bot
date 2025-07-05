const logger = require('../utils/logger')

console.log('=== TESTING ENHANCED LOGGING ===')

// Test basic logging
logger.info('🚀 === NEW WHATSAPP MESSAGE RECEIVED ===')
logger.info('📱 From: +1234567890')
logger.info('💬 Message: "Hello, this is a test"')
logger.info('📋 Content-Type: application/json')

// Test processing logs
logger.info('🔧 Processing phone number: "whatsapp:+1234567890"')
logger.info('✅ Normalized phone: "whatsapp:+1234567890"')
logger.info('⚡ Sending instant reply to whatsapp:+1234567890')
logger.info('✅ Instant reply sent successfully')

// Test chat history logs
logger.info('🗂️ === CHAT HISTORY PROCESSING ===')
logger.info('📊 Chat history: 2 previous messages')
logger.info('📝 History updated: 3 messages (max 20)')
logger.info('🤖 Preparing 4 messages for GPT')

// Test GPT logs
logger.info('🧠 === GPT PROCESSING ===')
logger.info('💭 GPT Response: "שלום! אני פביו מנטל, יועץ פיננסי מנוסה. איך אני יכול לעזור לך היום?"')

// Test Redis logs
logger.info('💾 === SAVING TO REDIS ===')
logger.info('✅ Chat history saved successfully')

// Test completion logs
logger.info('📤 Sending bot reply to whatsapp:+1234567890')
logger.info('✅ Bot reply sent successfully')
logger.info('🎉 === MESSAGE PROCESSING COMPLETE ===')

console.log('=== LOGGING TEST COMPLETE ===') 