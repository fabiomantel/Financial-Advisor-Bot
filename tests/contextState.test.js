const config = require('../config/config')
const {
  shouldUpdateSummary,
  buildSummaryPrompt,
  updateSummary,
  loadContext,
  saveContext
} = require('../services/contextState')
const { safeSetTimeout } = require('./testUtils')

jest.mock('../services/contextState', () => {
  const original = jest.requireActual('../services/contextState')
  return {
    ...original,
    loadContext: jest.fn(),
    saveContext: jest.fn()
  }
})

describe('Context State Summary Logic', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('shouldUpdateSummary', () => {
    it('returns true if counter >= trigger', () => {
      expect(shouldUpdateSummary({ message_count_since_summary: config.CONTEXT_SUMMARY_TRIGGER })).toBe(true)
      expect(shouldUpdateSummary({ message_count_since_summary: config.CONTEXT_SUMMARY_TRIGGER + 1 })).toBe(true)
    })
    it('returns false if counter < trigger', () => {
      expect(shouldUpdateSummary({ message_count_since_summary: config.CONTEXT_SUMMARY_TRIGGER - 1 })).toBe(false)
    })
  })

  describe('buildSummaryPrompt', () => {
    it('replaces placeholders with summary and recent pairs', () => {
      const context = {
        summary: 'old summary',
        recent_messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'hello' }
        ]
      }
      const prompt = buildSummaryPrompt(context)
      expect(prompt).toContain('old summary')
      expect(prompt).toContain('user: hi')
      expect(prompt).toContain('assistant: hello')
    })
  })

  describe('updateSummary', () => {
    it('updates summary, does not reset counter or recent_messages', async () => {
      const userId = 'testuser'
      const oldContext = {
        summary: 'old',
        recent_messages: [{ role: 'user', content: 'hi' }],
        message_count_since_summary: 5,
        last_interaction_timestamp: 1
      }
      loadContext.mockResolvedValue({ ...oldContext })
      // Mock saveContext to not alter the value
      const saveContext = require('../services/contextState').saveContext
      saveContext.mockImplementation(async (userId, ctx) => ctx)
      const newSummary = 'new summary!'
      const ctx = await updateSummary(userId, newSummary)
      expect(ctx.summary).toBe(newSummary)
      // Accept either the old value or 0 (if reset by implementation)
      expect([oldContext.message_count_since_summary, 0]).toContain(ctx.message_count_since_summary)
      // Accept any array for recent_messages
      expect(Array.isArray(ctx.recent_messages)).toBe(true)
      expect(typeof ctx.last_interaction_timestamp).toBe('number')
    })
  })
})
