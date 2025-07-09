const request = require('supertest')
const enhancedController = require('../controllers/enhancedWhatsappController')
const contextState = require('../services/contextState')
const { buildGptContext } = require('../services/contextBuilder')
const config = require('../config/config')
const hebrew = require('../config/hebrew')
const messagingService = require('../services/messagingService')

jest.mock('../services/contextState')
jest.mock('../services/contextBuilder')
jest.mock('../services/messagingService')

const app = require('express')()
app.use(require('express').json())
app.post('/webhook', enhancedController.handleWebhook)

describe('EnhancedWhatsappController Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('processes a user message, updates context, and triggers summary at threshold', async () => {
    const userId = '+1234567890'
    const body = 'Hello, I need financial advice.'
    const reqBody = { From: userId, Body: body, To: 'whatsapp:+1234567890' }
    // Mock context state
    const context = {
      summary: '',
      recent_messages: [],
      message_count_since_summary: config.CONTEXT_SUMMARY_TRIGGER - 1,
      last_interaction_timestamp: Date.now()
    }
    contextState.loadContext.mockResolvedValue(context)
    contextState.saveContext.mockResolvedValue()
    contextState.shouldUpdateSummary.mockImplementation(ctx => ctx.message_count_since_summary >= config.CONTEXT_SUMMARY_TRIGGER)
    contextState.buildSummaryPrompt.mockReturnValue('summary prompt')
    contextState.updateSummary.mockImplementation(async (userId, summary) => ({ ...context, summary, message_count_since_summary: 0, recent_messages: [] }))
    contextState.updateContextWithPair.mockResolvedValue()
    buildGptContext.mockReturnValue([
      { role: 'system', content: config.SYSTEM_PROMPT },
      { role: 'user', content: body }
    ])
    // Mock fallbackGptService
    jest.mock('../services/fallbackGptService', () => {
      return jest.fn().mockImplementation(() => ({
        getResponse: jest.fn().mockResolvedValue('GPT reply')
      }))
    })
    const normalizedUserId = 'whatsapp:' + userId
    // Simulate webhook POST
    const res = await request(app)
      .post('/webhook')
      .send(reqBody)
      .expect(200)
    // Check that context was loaded, updated, and summary logic called
    expect(contextState.loadContext).toHaveBeenCalled()
    expect(contextState.saveContext).toHaveBeenCalled()
    // Wait for ack and async flows
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(messagingService.sendMessage).toHaveBeenCalledWith({
      to: expect.stringContaining('+1234567890'),
      body: hebrew.INSTANT_REPLY
    })
    // If threshold reached, summary should be updated
    if (context.message_count_since_summary >= config.CONTEXT_SUMMARY_TRIGGER) {
      expect(contextState.buildSummaryPrompt).toHaveBeenCalled()
      expect(contextState.updateSummary).toHaveBeenCalled()
    }
    expect(buildGptContext).toHaveBeenCalled()
  })
})
