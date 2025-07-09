const logger = require('../utils/logger');
const debugStore = require('../utils/debugStore');
const contextState = require('../services/contextState');

function validateIncomingMessage(body) {
  return body && body.From && body.Body && body.To;
}

function processPhoneNumber(phoneNumber) {
  let processed = phoneNumber.replace(/[^\d+]/g, '');
  if (!processed.startsWith('+')) processed = '+' + processed;
  if (!processed.startsWith('whatsapp:')) processed = 'whatsapp:' + processed;
  return processed;
}

async function validateAndLoadContext(bodyObj, reqId, isDev) {
  const { From: from, Body: body, To: to } = bodyObj || {};
  if (!validateIncomingMessage(bodyObj)) {
    debugStore.add({
      type: 'validation_failed', from, body, to, meta: { reqId }
    });
    logger.warn(`[PROCESS] Validation failed for incoming message from ${from}`);
    return { phoneNumber: null, context: null };
  }
  logger.debug(`[PROCESS] Normalizing phone number: ${from}`);
  const phoneNumber = processPhoneNumber(from);
  logger.info(`[PROCESS] Processed phone number: ${phoneNumber}`);
  const context = await contextState.loadContext(phoneNumber);
  debugStore.add({
    type: 'context_loaded', phoneNumber, context, meta: { reqId }
  });
  return { phoneNumber, context };
}

module.exports = { validateAndLoadContext }; 