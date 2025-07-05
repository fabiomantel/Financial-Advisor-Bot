const config = require('../config/config')
const { sendMessage } = require('../services/messagingService')
const { getGptReply } = require('../services/openaiService')
const { validationResult } = require('express-validator')
const logger = require('../utils/logger')
const ChatHistoryService = require('../services/chatHistoryService')
const StorageFactory = require('../services/storage')
const { formatWhatsAppMessage, addMessageHeader, addMessageConclusion } = require('../utils/messageFormatter')

// Initialize storage and chat history service
const storageProvider = StorageFactory.createStorageProvider(config.STORAGE_TYPE, config)
const chatHistoryService = new ChatHistoryService(storageProvider)

logger.info(`Initialized WhatsApp controller with storage type: ${config.STORAGE_TYPE}`)

const SYSTEM_MESSAGE = {
  role: 'system',
  content: 'אתה פביו מנטל – אדריכלות פיננסית לצמיחה. יועץ פיננסי מנוסה, מומחה בהשקעות, מיסוי בישראל וניהול הון משפחתי. ענה בעברית, בגובה העיניים, עם דגש על ערך פרקטי. השתמש בעיצוב טקסט WhatsApp בלבד:\n\n- כותרות ראשיות: *כותרת ראשית*\n- כותרות משניות: _כותרת משנית_\n- רשימות: * פריט ראשון\n- רשימות: - פריט שני\n- הדגשות: _טקסט מודגש_\n- ציטוטים: > טקסט חשוב\n- קוד: `מונח טכני`\n- קו חוצה: ~טקסט מיושן~\n\nחשוב: אל תשתמש ב-### או markdown אחר. השתמש רק בעיצוב WhatsApp. וודא שהכוכביות והקווים התחתונים מופיעים בדיוק כמו שצריך: *טקסט* ו_טקסט_. השתמש ברווחים נכונים בין הכוכביות לטקסט.'
}

exports.handleWebhook = async (req, res, next) => {
  try {
    // Enhanced logging for incoming webhook
    logger.info('🚀 === NEW WHATSAPP MESSAGE RECEIVED ===')
    logger.info(`📱 From: ${req.body[config.INPUT_KEYS.from] || 'Unknown'}`)
    logger.info(`💬 Message: "${req.body[config.INPUT_KEYS.body] || 'No message'}"`)
    logger.info(`📋 Content-Type: ${req.headers['content-type'] || 'Not specified'}`)

    // Validate request
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      logger.warn('❌ Validation failed for incoming message', { 
        errors: errors.array(), 
        body: req.body 
      })
      return res.status(400).json({ errors: errors.array() })
    }

    const userMessage = req.body[config.INPUT_KEYS.body]
    let from = req.body[config.INPUT_KEYS.from]

    // Enhanced phone number processing with clear logging
    logger.info(`🔧 Processing phone number: "${from}"`)

    if (from) {
      // Decode URL encoding if needed
      if (from.includes(' ')) {
        const decodedFrom = decodeURIComponent(from)
        logger.info(`🔓 URL decoded: "${from}" → "${decodedFrom}"`)
        from = decodedFrom
      }

      // Normalize phone number format
      if (from.startsWith('whatsapp:')) {
        let phonePart = from.substring(9).trim()
        
        if (!phonePart.startsWith('+')) {
          phonePart = `+${phonePart}`
          logger.info(`➕ Added plus prefix: "${phonePart}"`)
        }
        
        from = `whatsapp:${phonePart}`
        logger.info(`✅ Normalized phone: "${from}"`)
      }
    }

    logger.info(`📞 Final phone number: "${from}"`)
    logger.info(`💬 User message: "${userMessage}"`)

    // Send instant reply
    logger.info(`⚡ Sending instant reply to ${from}`)
    try {
      const instantReplyResult = await sendMessage({ to: from, body: config.INSTANT_REPLY })
      logger.info(`✅ Instant reply sent successfully`)
    } catch (err) {
      logger.error(`❌ Failed to send instant reply: ${err.message}`)
      logger.info(`🔄 Continuing with chat processing...`)
    }

    // Chat history processing
    logger.info(`🗂️ === CHAT HISTORY PROCESSING ===`)
    let history = await chatHistoryService.getUserHistory(from)
    logger.info(`📊 Chat history: ${history.length} previous messages`)

    // Add user message to history
    history = chatHistoryService.addUserMessage(history, userMessage)
    history = chatHistoryService.truncateHistory(history, 20)
    logger.info(`📝 History updated: ${history.length} messages (max 20)`)

    // Prepare for GPT
    const messagesForGpt = chatHistoryService.prepareMessagesForGpt(history, SYSTEM_MESSAGE)
    logger.info(`🤖 Preparing ${messagesForGpt.length} messages for GPT`)

    // Process with GPT
    logger.info(`🧠 === GPT PROCESSING ===`)
    try {
      const rawBotReply = await getGptReply(messagesForGpt)
      logger.info(`💭 Raw GPT Response: "${rawBotReply.substring(0, 100)}${rawBotReply.length > 100 ? '...' : ''}"`)

      // Format the bot reply for WhatsApp
      logger.info(`🎨 === FORMATTING MESSAGE ===`)
      let formattedBotReply = formatWhatsAppMessage(rawBotReply)
      
      // Add header if needed (extract topic from user message)
      const userMessageWords = userMessage.split(' ').slice(0, 3).join(' ')
      formattedBotReply = addMessageHeader(formattedBotReply, userMessageWords)
      
      // Add conclusion if needed
      formattedBotReply = addMessageConclusion(formattedBotReply)
      
      logger.info(`📝 Formatted message length: ${formattedBotReply.length} chars`)
      logger.info(`📝 Formatted message preview: "${formattedBotReply.substring(0, 200)}..."`)

      // Update history with formatted bot reply
      history = chatHistoryService.addAssistantMessage(history, formattedBotReply)
      history = chatHistoryService.truncateHistory(history, 20)
      logger.info(`📝 History updated with formatted bot reply: ${history.length} messages`)

      // Save to Redis
      logger.info(`💾 === SAVING TO REDIS ===`)
      await chatHistoryService.saveUserHistory(from, history)
      logger.info(`✅ Chat history saved successfully`)

      // Send formatted bot reply
      logger.info(`📤 Sending formatted bot reply to ${from}`)
      try {
        const botReplyResult = await sendMessage({ to: from, body: formattedBotReply })
        logger.info(`✅ Formatted bot reply sent successfully`)
      } catch (err) {
        logger.error(`❌ Failed to send formatted bot reply: ${err.message}`)
      }

      logger.info(`🎉 === MESSAGE PROCESSING COMPLETE ===`)
      res.status(200).send('')
    } catch (err) {
      logger.error(`❌ GPT processing failed: ${err.message}`)
      // Send formatted error reply to user
      try {
        const formattedErrorReply = formatWhatsAppMessage(config.ERROR_REPLY)
        const errorReplyResult = await sendMessage({ to: from, body: formattedErrorReply })
        logger.info(`📤 Formatted error reply sent to user`)
      } catch (sendErr) {
        logger.error(`❌ Failed to send formatted error reply: ${sendErr.message}`)
      }
      res.status(200).send('')
    }
  } catch (err) {
    logger.error(`💥 === UNEXPECTED ERROR ===`)
    logger.error(`❌ Error: ${err.message}`)
    logger.error(`📍 Stack: ${err.stack}`)
    res.status(200).send('')
  }
}

// Health check endpoint for debugging
exports.healthCheck = async (req, res) => {
  try {
    logger.info('🏥 === HEALTH CHECK REQUESTED ===')

    const healthStatus = {
      timestamp: new Date().toISOString(),
      storage: {
        type: config.STORAGE_TYPE,
        connected: storageProvider.isConnected()
      },
      services: {
        chatHistory: 'initialized'
      }
    }

    logger.info(`💾 Storage type: ${config.STORAGE_TYPE}`)
    logger.info(`🔗 Storage connected: ${storageProvider.isConnected() ? '✅ Yes' : '❌ No'}`)

    // Test storage health if connected
    if (storageProvider.isConnected()) {
      try {
        const storageHealth = await storageProvider.healthCheck()
        healthStatus.storage.health = storageHealth
        logger.info(`💾 Storage health: ${storageHealth ? '✅ Healthy' : '❌ Unhealthy'}`)

        const chatHistoryHealth = await chatHistoryService.healthCheck()
        healthStatus.services.chatHistory = chatHistoryHealth ? 'healthy' : 'unhealthy'
        logger.info(`🗂️ Chat history health: ${chatHistoryHealth ? '✅ Healthy' : '❌ Unhealthy'}`)
      } catch (err) {
        logger.error('❌ Health check failed', err)
        healthStatus.storage.health = false
        healthStatus.services.chatHistory = 'error'
      }
    } else {
      healthStatus.storage.health = false
      healthStatus.services.chatHistory = 'no_connection'
      logger.warn('⚠️ Storage not connected')
    }

    logger.info('✅ Health check completed')
    res.json(healthStatus)
  } catch (err) {
    logger.error('💥 Health check error', err)
    res.status(500).json({ error: 'Health check failed', details: err.message })
  }
}

// Test endpoint for Redis operations
exports.testRedis = async (req, res) => {
  try {
    logger.info('🧪 === REDIS OPERATIONS TEST ===')

    const testUserId = 'test_user_' + Date.now()
    const testMessage = 'Test message from API'

    // Test 1: Get empty history
    logger.info('📋 Test 1: Getting empty history')
    let history = await chatHistoryService.getUserHistory(testUserId)
    logger.info(`📊 Empty history: ${history.length} messages`)

    // Test 2: Add user message
    logger.info('📝 Test 2: Adding user message')
    history = chatHistoryService.addUserMessage(history, testMessage)
    logger.info(`📊 History after user message: ${history.length} messages`)

    // Test 3: Add assistant message
    logger.info('🤖 Test 3: Adding assistant message')
    const assistantReply = 'This is a test assistant reply'
    history = chatHistoryService.addAssistantMessage(history, assistantReply)
    logger.info(`📊 History after assistant message: ${history.length} messages`)

    // Test 4: Save to Redis
    logger.info('💾 Test 4: Saving to Redis')
    await chatHistoryService.saveUserHistory(testUserId, history)
    logger.info('✅ History saved to Redis')

    // Test 5: Retrieve from Redis
    logger.info('📥 Test 5: Retrieving from Redis')
    const retrievedHistory = await chatHistoryService.getUserHistory(testUserId)
    logger.info(`📊 Retrieved history: ${retrievedHistory.length} messages`)

    // Test 6: Health check
    logger.info('🏥 Test 6: Health check')
    const healthResult = await chatHistoryService.healthCheck()
    logger.info(`💚 Health check result: ${healthResult ? '✅ Healthy' : '❌ Unhealthy'}`)

    const result = {
      success: true,
      testUserId,
      originalHistory: history.length,
      retrievedHistory: retrievedHistory.length,
      healthCheck: healthResult,
      messages: retrievedHistory
    }

    logger.info('🎉 === REDIS TEST COMPLETED SUCCESSFULLY ===')
    res.json(result)
  } catch (err) {
    logger.error('💥 Redis test failed', err)
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    })
  }
}

// Get chat history for a specific user
exports.getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    logger.info(`=== RETRIEVING CHAT HISTORY FOR ${userId} ===`)
    const history = await chatHistoryService.getUserHistory(userId)
    logger.info(`Retrieved ${history.length} messages for ${userId}`)

    res.json({
      userId,
      messageCount: history.length,
      messages: history
    })
  } catch (err) {
    logger.error(`Failed to get user history: ${err.message}`)
    res.status(500).json({
      error: 'Failed to retrieve chat history',
      details: err.message
    })
  }
}
