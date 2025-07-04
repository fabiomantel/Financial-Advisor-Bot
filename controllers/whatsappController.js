const config = require('../config/config');
const { sendMessage } = require('../services/messagingService');
const { getGptReply } = require('../services/openaiService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const ChatHistoryService = require('../services/chatHistoryService');
const StorageFactory = require('../services/storage');

// Initialize storage and chat history service
const storageProvider = StorageFactory.createStorageProvider(config.STORAGE_TYPE, config);
const chatHistoryService = new ChatHistoryService(storageProvider);

logger.info(`Initialized WhatsApp controller with storage type: ${config.STORAGE_TYPE}`);

const SYSTEM_MESSAGE = {
  role: 'system',
  content: 'אתה פביו מנטל – אדריכלות פיננסית לצמיחה. יועץ פיננסי מנוסה, מומחה בהשקעות, מיסוי בישראל וניהול הון משפחתי. ענה בעברית, בגובה העיניים, עם דגש על ערך פרקטי.'
};

exports.handleWebhook = async (req, res, next) => {
  try {
    // Log the raw incoming webhook data
    logger.info('=== INCOMING WEBHOOK DATA ===');
    logger.info(`Raw body: ${JSON.stringify(req.body)}`);
    logger.info(`Headers: ${JSON.stringify(req.headers)}`);
    logger.info(`Content-Type: ${req.headers['content-type']}`);
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed for incoming message', { errors: errors.array(), body: req.body });
      return res.status(400).json({ errors: errors.array() });
    }

    const userMessage = req.body[config.INPUT_KEYS.body];
    let from = req.body[config.INPUT_KEYS.from];
    
    // Fix encoding issues with the From field
    logger.info(`Original From field: "${from}"`);
    
    // Handle URL encoding issues and normalize phone number format
    if (from) {
      // Decode URL encoding if needed
      if (from.includes(' ')) {
        const decodedFrom = decodeURIComponent(from);
        logger.info(`Decoded From field: "${decodedFrom}"`);
        from = decodedFrom;
      }
      
      // Normalize phone number format to ensure consistent Redis keys
      if (from.startsWith('whatsapp:')) {
        let phonePart = from.substring(9).trim(); // Remove 'whatsapp:' prefix and trim spaces
        
        // Always add plus for Israeli numbers (972...) and for numbers missing plus
        if (!phonePart.startsWith('+')) {
          phonePart = `+${phonePart}`;
        }
        from = `whatsapp:${phonePart}`;
        logger.info(`Normalized From field: "${from}"`);
      }
    }
    
    logger.info(`Final From field: "${from}"`);
    logger.info(`Message body: "${userMessage}"`);
    logger.info(`Message received from ${from}: ${userMessage}`);
    
    // Send instant reply (but don't fail if it doesn't work)
    let instantReplySent = false;
    try {
      await sendMessage({ to: from, body: config.INSTANT_REPLY });
      logger.info(`Instant reply sent to ${from}`);
      instantReplySent = true;
    } catch (err) {
      logger.error(`Failed to send instant reply to ${from}: ${err.message}`);
      // Continue processing even if instant reply fails
      logger.info(`Continuing with chat history processing despite instant reply failure`);
    }

    // Get chat history
    logger.info(`=== STARTING CHAT HISTORY PROCESSING FOR ${from} ===`);
    let history = await chatHistoryService.getUserHistory(from);
    logger.info(`Initial history for ${from}: ${history.length} messages`);
    
    // Add new user message and truncate if needed
    history = chatHistoryService.addUserMessage(history, userMessage);
    history = chatHistoryService.truncateHistory(history, 20);
    logger.info(`History after adding user message: ${history.length} messages`);
    
    // Prepare messages for GPT
    const messagesForGpt = chatHistoryService.prepareMessagesForGpt(history, SYSTEM_MESSAGE);
    logger.info(`Prepared ${messagesForGpt.length} messages for GPT`);

    // Process GPT reply
    try {
      const botReply = await getGptReply(messagesForGpt);
      logger.info(`GPT reply received: ${botReply.substring(0, 100)}...`);
      
      // Add assistant reply to history
      history = chatHistoryService.addAssistantMessage(history, botReply);
      history = chatHistoryService.truncateHistory(history, 20);
      logger.info(`History after adding assistant message: ${history.length} messages`);
      
      // Save updated history
      logger.info(`=== SAVING CHAT HISTORY TO REDIS FOR ${from} ===`);
      await chatHistoryService.saveUserHistory(from, history);
      logger.info(`=== CHAT HISTORY SAVED SUCCESSFULLY FOR ${from} ===`);
      
      // Try to send the bot reply (but don't fail if it doesn't work)
      try {
        await sendMessage({ to: from, body: botReply });
        logger.info(`Bot reply sent to ${from}: ${botReply.substring(0, 100)}...`);
      } catch (err) {
        logger.error(`Failed to send bot reply to ${from}: ${err.message}`);
        // Still return success since we processed the message
      }
      
      res.sendStatus(200);
    } catch (err) {
      logger.error(`Failed to process GPT reply for ${from}: ${err.message}`);
      // On error, try to send error reply to user
      try {
        await sendMessage({ to: from, body: config.ERROR_REPLY });
      } catch (sendErr) {
        logger.error(`Failed to send error reply to ${from}: ${sendErr.message}`);
      }
      next(err);
    }
  } catch (err) {
    logger.error(`Unexpected error in handleWebhook: ${err.message}`);
    next(err);
  }
};

// Health check endpoint for debugging
exports.healthCheck = async (req, res) => {
  try {
    logger.info('Health check requested');
    
    const healthStatus = {
      timestamp: new Date().toISOString(),
      storage: {
        type: config.STORAGE_TYPE,
        connected: storageProvider.isConnected()
      },
      services: {
        chatHistory: 'initialized'
      }
    };

    // Test storage health if connected
    if (storageProvider.isConnected()) {
      try {
        const storageHealth = await storageProvider.healthCheck();
        healthStatus.storage.health = storageHealth;
        
        const chatHistoryHealth = await chatHistoryService.healthCheck();
        healthStatus.services.chatHistory = chatHistoryHealth ? 'healthy' : 'unhealthy';
      } catch (err) {
        logger.error('Health check failed', err);
        healthStatus.storage.health = false;
        healthStatus.services.chatHistory = 'error';
      }
    } else {
      healthStatus.storage.health = false;
      healthStatus.services.chatHistory = 'no_connection';
    }

    res.json(healthStatus);
  } catch (err) {
    logger.error('Health check error', err);
    res.status(500).json({ error: 'Health check failed', details: err.message });
  }
};

// Test endpoint for Redis operations
exports.testRedis = async (req, res) => {
  try {
    logger.info('=== TESTING REDIS OPERATIONS ===');
    
    const testUserId = 'test_user_' + Date.now();
    const testMessage = 'Test message from API';
    
    // Test 1: Get empty history
    logger.info('Test 1: Getting empty history');
    let history = await chatHistoryService.getUserHistory(testUserId);
    logger.info(`Empty history result: ${history.length} messages`);
    
    // Test 2: Add user message
    logger.info('Test 2: Adding user message');
    history = chatHistoryService.addUserMessage(history, testMessage);
    logger.info(`History after user message: ${history.length} messages`);
    
    // Test 3: Add assistant message
    logger.info('Test 3: Adding assistant message');
    const assistantReply = 'This is a test assistant reply';
    history = chatHistoryService.addAssistantMessage(history, assistantReply);
    logger.info(`History after assistant message: ${history.length} messages`);
    
    // Test 4: Save to Redis
    logger.info('Test 4: Saving to Redis');
    await chatHistoryService.saveUserHistory(testUserId, history);
    logger.info('History saved to Redis');
    
    // Test 5: Retrieve from Redis
    logger.info('Test 5: Retrieving from Redis');
    const retrievedHistory = await chatHistoryService.getUserHistory(testUserId);
    logger.info(`Retrieved history: ${retrievedHistory.length} messages`);
    
    // Test 6: Health check
    logger.info('Test 6: Health check');
    const healthResult = await chatHistoryService.healthCheck();
    logger.info(`Health check result: ${healthResult}`);
    
    const result = {
      success: true,
      testUserId,
      originalHistory: history.length,
      retrievedHistory: retrievedHistory.length,
      healthCheck: healthResult,
      messages: retrievedHistory
    };
    
    logger.info('=== REDIS TEST COMPLETED SUCCESSFULLY ===');
    res.json(result);
    
  } catch (err) {
    logger.error('Redis test failed', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      stack: err.stack 
    });
  }
};

// Get chat history for a specific user
exports.getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    logger.info(`=== RETRIEVING CHAT HISTORY FOR ${userId} ===`);
    const history = await chatHistoryService.getUserHistory(userId);
    logger.info(`Retrieved ${history.length} messages for ${userId}`);
    
    res.json({
      userId,
      messageCount: history.length,
      messages: history
    });
    
  } catch (err) {
    logger.error(`Failed to get user history: ${err.message}`);
    res.status(500).json({ 
      error: 'Failed to retrieve chat history',
      details: err.message 
    });
  }
}; 