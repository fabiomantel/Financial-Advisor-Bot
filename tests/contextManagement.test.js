const config = require('../config/config')
const hebrew = require('../config/hebrew')
const {
  isValidPair,
  updateRecentMessages,
  incrementCounter,
  resetCounter,
  isNonText,
  isFallbackOrError,
  countGptTokens
} = require('../services/contextManagement')
const { safeSetTimeout } = require('./testUtils')

describe('Context Management Pure Functions', () => {
  describe('isNonText', () => {
    it('returns true for non-string or empty', () => {
      expect(isNonText(undefined)).toBe(true)
      expect(isNonText(null)).toBe(true)
      expect(isNonText('')).toBe(true)
      expect(isNonText('   ')).toBe(true)
      expect(isNonText(123)).toBe(true)
    })
    it('returns false for non-empty string', () => {
      expect(isNonText('hello')).toBe(false)
    })
  })

  describe('isFallbackOrError', () => {
    it('detects fallback/error phrases in Hebrew', () => {
      for (const phrase of hebrew.CONTEXT_FILTER_PHRASES) {
        expect(isFallbackOrError(phrase + ' כלשהי')).toBe(true)
      }
    })
    it('returns false for normal text', () => {
      expect(isFallbackOrError('זו תשובה תקינה.')).toBe(false)
    })
  })

  describe('isValidPair', () => {
    it('rejects non-text user or assistant', () => {
      expect(isValidPair('', 'valid answer')).toBe(false)
      expect(isValidPair('user', '')).toBe(false)
      expect(isValidPair('user', null)).toBe(false)
    })
    it('rejects short assistant message', () => {
      expect(isValidPair('user', 'short')).toBe(false)
    })
    it('rejects fallback/error assistant message', () => {
      expect(isValidPair('user', 'please rephrase')).toBe(false)
    })
    it('accepts valid pair', () => {
      const longMsg = 'a'.repeat(config.CONTEXT_MIN_MSG_LENGTH + 1)
      expect(isValidPair('user', longMsg)).toBe(true)
    })
  })

  describe('updateRecentMessages', () => {
    it('appends and trims to max pairs', () => {
      const base = []
      const userMsg = 'user message'
      const assistantMsg = 'a'.repeat(config.CONTEXT_MIN_MSG_LENGTH + 1)
      let msgs = base
      for (let i = 0; i < config.CONTEXT_RECENT_PAIRS + 2; i++) {
        msgs = updateRecentMessages(msgs, userMsg + i, assistantMsg + i)
      }
      expect(msgs.length).toBe(config.CONTEXT_RECENT_PAIRS * 2)
      // Should only keep the last N pairs
      const expectedFirstUserMsgNum = config.CONTEXT_RECENT_PAIRS + 2 - config.CONTEXT_RECENT_PAIRS
      expect(msgs[0].content).toContain(expectedFirstUserMsgNum.toString())
    })
  })

  describe('incrementCounter/resetCounter', () => {
    it('increments only if valid', () => {
      expect(incrementCounter(0, true)).toBe(1)
      expect(incrementCounter(1, false)).toBe(1)
    })
    it('resets to zero', () => {
      expect(resetCounter()).toBe(0)
    })
  })

  describe('countGptTokens', () => {
    it('returns 0 for empty array', () => {
      expect(countGptTokens([])).toBe(0)
    })
    it('counts tokens for a single message', () => {
      const arr = [{ role: 'user', content: 'hello world' }]
      expect(countGptTokens(arr)).toBeGreaterThan(0)
    })
    it('counts tokens for multiple messages', () => {
      const arr = [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'world' }
      ]
      expect(countGptTokens(arr)).toBeGreaterThan(0)
    })
    it('counts tokens for Hebrew and English', () => {
      const arr = [
        { role: 'user', content: 'שלום עולם' },
        { role: 'assistant', content: 'hello world' }
      ]
      expect(countGptTokens(arr)).toBeGreaterThan(0)
    })
  })
})
