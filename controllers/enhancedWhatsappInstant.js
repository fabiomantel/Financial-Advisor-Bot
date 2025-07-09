const logger = require('../utils/logger');
const { sendMessage } = require('../services/messagingService');
const hebrew = require('../config/hebrew');

async function sendInstantReply(from) {
  try {
    logger.info(`[INSTANT] Sending instant reply to ${from}`);
    await sendMessage({ to: from, body: hebrew.INSTANT_REPLY });
    logger.info(`[INSTANT] Instant reply sent to ${from}`);
  } catch (err) {
    logger.error(`[INSTANT] Failed to send instant reply to ${from}: ${err.message}`);
  }
}

module.exports = { sendInstantReply }; 