const { createStreamingController } = require('../controllers/streamingController')
const openaiService = require('../services/openaiService')
const messagingService = require('../services/messagingService')
const chatHistoryService = require('../services/chatHistoryService')
const FallbackGptService = require('../services/fallbackGptService')
const httpMocks = require('node-mocks-http')
const { safeSetTimeout } = require('./testUtils')

jest.mock('../services/openaiService')
jest.mock('../services/messagingService')
jest.mock('../services/chatHistoryService')
jest.mock('../services/fallbackGptService')

const chatHistory = require('../services/chatHistoryService')

const mockUser = '+1234567890'
const mockBody = 'Tell me about financial planning.'
const mockMessages = [{ role: 'user', content: mockBody }]

function createMockReqRes () {
  const req = httpMocks.createRequest({
    method: 'POST',
    body: { From: mockUser, Body: mockBody }
  })
  const res = httpMocks.createResponse()
  res.status = jest.fn(() => res)
  res.send = jest.fn(() => res)
  return { req, res }
}

describe('streamingController.handleStreamingWebhook', () => {
  let controller
  let mockSendMessage
  let mockPrepareMessagesForGpt
  let mockFallbackService
  let mockSplitMessageOnWordBoundary
  let mockLogger
  let mockTracer

  beforeEach(() => {
    jest.clearAllMocks()
    mockSendMessage = jest.fn().mockResolvedValue({ success: true })
    mockPrepareMessagesForGpt = jest.fn().mockResolvedValue(mockMessages)
    mockSplitMessageOnWordBoundary = jest.fn((msg, len) => [msg])
    mockLogger = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }
    mockTracer = {
      mark: jest.fn(),
      measure: jest.fn(),
      getMeasures: jest.fn(() => ({}))
    }
    mockFallbackService = {
      getResponse: jest.fn().mockImplementation(async (messages, onChunk) => {
        if (onChunk) {
          const chunk = 'A'.repeat(100) + '.'
          await onChunk(chunk)
        }
        return 'A'.repeat(100) + '.'
      })
    }
    controller = createStreamingController({
      sendMessage: mockSendMessage,
      prepareMessagesForGpt: mockPrepareMessagesForGpt,
      fallbackService: mockFallbackService,
      splitMessageOnWordBoundary: mockSplitMessageOnWordBoundary,
      logger: mockLogger,
      tracer: mockTracer,
      CHUNK_SEND_DELAY_MS: 0
    })
  })

  it('streams GPT response chunks and completes', async () => {
    const { req, res } = createMockReqRes()
    await controller.handleStreamingWebhook(req, res)
    await safeSetTimeout(r => r, 10)
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    expect(mockSendMessage).toHaveBeenCalledWith({ to: mockUser, body: expect.stringContaining('A'.repeat(100)) })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith('')
  }, 15000)

  it('handles OpenAI/GPT errors gracefully', async () => {
    const { req, res } = createMockReqRes()
    mockSendMessage.mockClear()
    mockFallbackService.getResponse.mockImplementation(() => { throw new Error('GPT error') })
    await controller.handleStreamingWebhook(req, res)
    await safeSetTimeout(r => r, 10)
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    expect(mockSendMessage).toHaveBeenCalledWith({ to: mockUser, body: expect.stringContaining('Sorry') })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith('')
  }, 15000)

  it('handles message preparation errors gracefully', async () => {
    mockPrepareMessagesForGpt.mockRejectedValue(new Error('History error'))
    const { req, res } = createMockReqRes()
    await controller.handleStreamingWebhook(req, res)
    // Should not send any chunked messages, just 500
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.send).toHaveBeenCalledWith('')
  })
})
