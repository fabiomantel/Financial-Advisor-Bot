const enhancedController = require('../controllers/enhancedWhatsappController');
const messagingService = require('../services/messagingService');
const hebrew = require('../config/hebrew');
const httpMocks = require('node-mocks-http');

jest.mock('../services/messagingService');

// Helper to flush promises and allow async flows to complete
function flushPromises() {
  return new Promise(setImmediate);
}

describe('EnhancedWhatsappController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send immediate HTTP response, ack message, and process GPT flow', async () => {
    // Arrange: plain req.body, real Express-style res
    const req = {
      body: {
        From: '+1234567890',
        Body: 'Test message',
        To: '+1234567890',
      }
    };
    const res = httpMocks.createResponse();
    const statusSpy = jest.spyOn(res, 'status');
    const jsonSpy = jest.spyOn(res, 'json');

    // Mock sendMessage to resolve
    messagingService.sendMessage.mockResolvedValue({ success: true });
    // Spy on GPT and response methods
    const gptSpy = jest.spyOn(enhancedController, 'processMessageWithGpt').mockResolvedValue('GPT response');
    const sendResponseSpy = jest.spyOn(enhancedController, 'sendResponse').mockResolvedValue();

    // Act: call the webhook handler
    await enhancedController.handleWebhook(req, res);

    // Assert: HTTP response is sent immediately
    expect(res.statusCode).toBe(200);
    expect(jsonSpy).toHaveBeenCalledWith({ status: 'processing' });

    // Wait for ack and async flows
    await flushPromises();
    expect(messagingService.sendMessage).toHaveBeenCalledWith({
      to: expect.stringContaining('+1234567890'),
      body: hebrew.ACK_RECEIVED,
    });

    // Wait for the rest of the async processing
    await flushPromises();
    expect(gptSpy).toHaveBeenCalledWith('Test message', expect.stringContaining('+1234567890'));
    expect(sendResponseSpy).toHaveBeenCalledWith(expect.stringContaining('+1234567890'), 'GPT response');
  });

  it('should log and continue if acknowledgment send fails, and still process GPT flow', async () => {
    // Arrange: plain req.body, real Express-style res
    const req = {
      body: {
        From: '+1234567890',
        Body: 'Test message',
        To: '+1234567890',
      }
    };
    const res = httpMocks.createResponse();
    const statusSpy = jest.spyOn(res, 'status');
    const jsonSpy = jest.spyOn(res, 'json');

    // Mock sendMessage to reject
    messagingService.sendMessage.mockRejectedValue(new Error('Twilio error'));
    // Spy on GPT and response methods
    const gptSpy = jest.spyOn(enhancedController, 'processMessageWithGpt').mockResolvedValue('GPT response');
    const sendResponseSpy = jest.spyOn(enhancedController, 'sendResponse').mockResolvedValue();

    // Act: call the webhook handler
    await enhancedController.handleWebhook(req, res);

    // Assert: HTTP response is sent immediately
    expect(res.statusCode).toBe(200);
    expect(jsonSpy).toHaveBeenCalledWith({ status: 'processing' });

    // Wait for ack and async flows
    await flushPromises();
    expect(messagingService.sendMessage).toHaveBeenCalledWith({
      to: expect.stringContaining('+1234567890'),
      body: hebrew.ACK_RECEIVED,
    });

    // Wait for the rest of the async processing
    await flushPromises();
    expect(gptSpy).toHaveBeenCalledWith('Test message', expect.stringContaining('+1234567890'));
    expect(sendResponseSpy).toHaveBeenCalledWith(expect.stringContaining('+1234567890'), 'GPT response');
  });
}); 