const logger = require('../utils/logger');
const { sendMessage } = require('../services/messagingService');
const debugStore = require('../utils/debugStore');

const MAX_WHATSAPP_LENGTH = 4096;

async function sendResponse(to, response, debugReqId, isDev) {
  const responseText = String(response || 'Oops! Something went wrong. Please try again.');
  const toWhatsApp = processPhoneNumber(to);
  if (responseText.length <= MAX_WHATSAPP_LENGTH) {
    logger.debug(`[SEND] Sending single message to ${toWhatsApp}: "${responseText}"`);
    try {
      await sendMessage({ to: toWhatsApp, body: responseText });
      debugStore.add({
        type: 'message_sent',
        to: toWhatsApp,
        body: responseText,
        meta: { reqId: debugReqId }
      });
      logger.debug(`[SEND] Message sent successfully to ${toWhatsApp}`);
    } catch (err) {
      logger.error(`[ERROR] Failed to send message to ${toWhatsApp}: ${err.message}`);
      debugStore.add({
        type: 'message_send_error',
        to: toWhatsApp,
        error: err.message,
        meta: { reqId: debugReqId }
      });
      throw err;
    }
  } else {
    // Split into the minimum number of large chunks (up to 4096 chars each)
    const chunks = [];
    for (let i = 0; i < responseText.length; i += MAX_WHATSAPP_LENGTH) {
      chunks.push(responseText.slice(i, i + MAX_WHATSAPP_LENGTH));
    }
    logger.warn(`[SEND] Response too long (${responseText.length} chars), splitting into ${chunks.length} WhatsApp messages.`);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      logger.debug(`[SEND] Sending chunk ${i + 1}/${chunks.length} to ${toWhatsApp}: "${chunk.slice(0, 80)}..."`);
      try {
        await sendMessage({ to: toWhatsApp, body: chunk });
        debugStore.add({
          type: 'message_sent_chunk',
          to: toWhatsApp,
          chunkIndex: i,
          chunkTotal: chunks.length,
          body: chunk,
          meta: { reqId: debugReqId }
        });
        logger.debug(`[SEND] Chunk ${i + 1} sent successfully to ${toWhatsApp}`);
      } catch (err) {
        logger.error(`[ERROR] Failed to send chunk ${i + 1} to ${toWhatsApp}: ${err.message}`);
        debugStore.add({
          type: 'message_send_error',
          to: toWhatsApp,
          chunkIndex: i,
          error: err.message,
          meta: { reqId: debugReqId }
        });
        throw err;
      }
    }
  }
}

function processPhoneNumber(phoneNumber) {
  let processed = phoneNumber.replace(/[^\d+]/g, '');
  if (!processed.startsWith('+')) processed = '+' + processed;
  if (!processed.startsWith('whatsapp:')) processed = 'whatsapp:' + processed;
  return processed;
}

module.exports = { sendResponse }; 