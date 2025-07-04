const config = require('../config/config');
const { sendMessage } = require('../services/messagingService');
const { getGptReply } = require('../services/openaiService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

exports.handleWebhook = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed for incoming message', { errors: errors.array(), body: req.body });
      return res.status(400).json({ errors: errors.array() });
    }

    const userMessage = req.body[config.INPUT_KEYS.body];
    const from = req.body[config.INPUT_KEYS.from];
    logger.info(`Message received from ${from}: ${userMessage}`);
    
    // Send instant reply
    try {
      await sendMessage({ to: from, body: config.INSTANT_REPLY });
      logger.info(`Instant reply sent to ${from}`);
    } catch (err) {
      logger.error(`Failed to send instant reply to ${from}: ${err.message}`);
      return next(err);
    }

    // Process GPT reply
    try {
      const botReply = await getGptReply(userMessage);
      await sendMessage({ to: from, body: botReply });
      logger.info(`Bot reply sent to ${from}: ${botReply}`);
      res.sendStatus(200);
    } catch (err) {
      logger.error(`Failed to process/send bot reply to ${from}: ${err.message}`);
      // On error, send error reply to user
      await sendMessage({ to: from, body: config.ERROR_REPLY });
      next(err);
    }
  } catch (err) {
    logger.error(`Unexpected error in handleWebhook: ${err.message}`);
    next(err);
  }
}; 