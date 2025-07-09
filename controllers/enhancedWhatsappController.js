const { sendInstantReply } = require('./enhancedWhatsappInstant');
const { validateAndLoadContext } = require('./enhancedWhatsappValidation');
const { processGptAndRespond } = require('./enhancedWhatsappGpt');
const { handleError } = require('./enhancedWhatsappError');
const logger = require('../utils/logger');
const PerformanceTracer = require('../utils/performanceTracer');
const { sendResponse } = require('./enhancedWhatsappResponse');
const debugStore = require('../utils/debugStore');

class EnhancedWhatsappController {
  constructor () {
    this.tracer = new PerformanceTracer();
    this.handleWebhook = this.handleWebhook.bind(this);
    logger.info('🚀 Enhanced WhatsApp Controller initialized');
  }

  async handleWebhook(req, res) {
    res.status(200).json({ status: 'processing' });
    const bodyObj = typeof req.body === 'function' ? req.body() : req.body;
    const { From: from, Body: body } = bodyObj || {};
    const reqId = req.id;
    const isDev = process.env.NODE_ENV === 'development';
    const timings = { startTime: Date.now() };
    debugStore.add({
      type: 'incoming_message',
      from,
      body,
      meta: { reqId }
    });
    try {
      await sendInstantReply(from);
      timings.instantReplySent = Date.now();
      const { phoneNumber, context } = await validateAndLoadContext(bodyObj, reqId, isDev);
      if (!phoneNumber) return;
      timings.contextLoaded = Date.now();
      const response = await processGptAndRespond(body, phoneNumber, from, reqId, isDev, context);
      timings.gptDone = Date.now();
      await sendResponse(phoneNumber, response, reqId, isDev);
      timings.responseSent = Date.now();
      logger.info(`[TIMING] TOTAL: ${timings.responseSent - timings.startTime}ms from webhook to last message sent`);
      debugStore.add({ type: 'timing_summary', timings, meta: { reqId } });
      this.tracer.record('enhanced_processing', timings.responseSent - timings.startTime, { userId: phoneNumber });
    } catch (err) {
      debugStore.add({
        type: 'error',
        error: err.message,
        stack: err.stack,
        meta: { reqId }
      });
      await handleError(err, from, reqId, isDev);
      this.tracer.record('enhanced_error', Date.now() - timings.startTime, { error: err.message });
    }
  }
}

const enhancedController = new EnhancedWhatsappController();

// Standalone healthCheck and getStats functions for router
async function healthCheck(req, res) {
  try {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error(`❌ Health check failed: ${err.message}`);
    res.status(500).json({ status: 'unhealthy', error: err.message, timestamp: new Date().toISOString() });
  }
}

function getStats(req, res) {
  res.json({ tracer: enhancedController.tracer.getStats() });
}

module.exports = {
  handleWebhook: enhancedController.handleWebhook,
  healthCheck,
  getStats
};
