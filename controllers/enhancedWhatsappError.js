const logger = require('../utils/logger');
const { sendMessage } = require('../services/messagingService');
const hebrew = require('../config/hebrew');

async function handleError(err, from, reqId, isDev) {
  logger.error(`[ERROR] Enhanced webhook failed for user ${from}: ${err.message}`);
  logger.error(`[ERROR] Stack: ${err.stack}`);
  try {
    await sendMessage({ to: from, body: hebrew.ERROR_REPLY });
  } catch (sendErr) {
    logger.error(`[ERROR] Failed to send error reply to ${from}: ${sendErr.message}`);
  }
}

module.exports = { handleError }; 