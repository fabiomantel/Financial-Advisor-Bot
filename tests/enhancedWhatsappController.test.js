const messagingService = require('../services/messagingService')
const hebrew = require('../config/hebrew')
const httpMocks = require('node-mocks-http')
const logger = require('../utils/logger');

const controller = require('../controllers/enhancedWhatsappController')

jest.mock('../services/fallbackGptService', () => {
  return jest.fn().mockImplementation(() => ({
    getResponse: jest.fn().mockResolvedValue('GPT reply')
  }))
})

jest.mock('../services/messagingService')

jest.mock('../controllers/enhancedWhatsappGpt', () => ({
  processGptAndRespond: jest.fn().mockResolvedValue('GPT response')
}))
jest.mock('../controllers/enhancedWhatsappResponse', () => ({
  sendResponse: jest.fn().mockResolvedValue()
}))

const { processGptAndRespond } = require('../controllers/enhancedWhatsappGpt');
const { sendResponse } = require('../controllers/enhancedWhatsappResponse');

// Remove fake timers
// jest.useFakeTimers();

describe('EnhancedWhatsappController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    // No timer cleanup needed
  })

  afterAll(() => {
    // If any global resources need to be closed, do it here
  })

  it('should send immediate HTTP response, ack message, and process GPT flow', async () => {
    // Arrange: plain req.body, real Express-style res
    const req = {
      body: {
        From: '+1234567890',
        Body: 'Test message',
        To: '+1234567890'
      }
    }
    const res = httpMocks.createResponse()
    const jsonSpy = jest.spyOn(res, 'json')

    // Mock sendMessage to resolve
    messagingService.sendMessage.mockResolvedValue({ success: true })

    // Act: call the webhook handler
    await controller.handleWebhook(req, res)

    // Assert: HTTP response is sent immediately
    expect(res.statusCode).toBe(200)
    expect(jsonSpy).toHaveBeenCalledWith({ status: 'processing' })

    // Wait for ack and async flows
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(messagingService.sendMessage).toHaveBeenCalledWith({
      to: expect.stringContaining('+1234567890'),
      body: hebrew.INSTANT_REPLY
    })

    // Wait for the rest of the async processing
    await new Promise(resolve => setTimeout(resolve, 500))
    // Check that processGptAndRespond was called
    const found = processGptAndRespond.mock.calls.some(call =>
      call[0] === 'Test message' &&
      typeof call[1] === 'string' &&
      typeof call[2] === 'string'
    )
    if (!found) {
      logger.debug('processGptAndRespond calls:', processGptAndRespond.mock.calls)
    }
    expect(found).toBe(true)
    // sendResponse should be called
    expect(sendResponse).toHaveBeenCalled()
  }, 20000)

  it('should log and continue if acknowledgment send fails, and still process GPT flow', async () => {
    // Arrange: plain req.body, real Express-style res
    const req = {
      body: {
        From: '+1234567890',
        Body: 'Test message',
        To: '+1234567890'
      }
    }
    const res = httpMocks.createResponse()
    const jsonSpy = jest.spyOn(res, 'json')

    // Mock sendMessage to reject
    messagingService.sendMessage.mockRejectedValue(new Error('Twilio error'))

    // Act: call the webhook handler
    await controller.handleWebhook(req, res)

    // Assert: HTTP response is sent immediately
    expect(res.statusCode).toBe(200)
    expect(jsonSpy).toHaveBeenCalledWith({ status: 'processing' })

    // Wait for ack and async flows
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(messagingService.sendMessage).toHaveBeenCalledWith({
      to: expect.stringContaining('+1234567890'),
      body: hebrew.INSTANT_REPLY
    })

    // Wait for the rest of the async processing
    await new Promise(resolve => setTimeout(resolve, 500))
    // Check that processGptAndRespond was called
    const found2 = processGptAndRespond.mock.calls.some(call =>
      call[0] === 'Test message' &&
      typeof call[1] === 'string' &&
      typeof call[2] === 'string'
    )
    if (!found2) {
      logger.debug('processGptAndRespond calls:', processGptAndRespond.mock.calls)
    }
    expect(found2).toBe(true)
    // sendResponse should be called
    expect(sendResponse).toHaveBeenCalled()
  }, 20000)
})
