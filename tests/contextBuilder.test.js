const { buildGptContext } = require('../services/contextBuilder')
const { safeSetTimeout } = require('./testUtils')

describe('buildGptContext', () => {
  const systemPrompt = 'system prompt!'
  const summary = 'summary here.'
  const recent = [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hello' }
  ]
  const userMsg = 'current user message'

  it('includes all fields in correct order and roles', () => {
    const ctx = { summary, recent_messages: recent }
    const arr = buildGptContext(ctx, userMsg, systemPrompt)
    expect(arr[0]).toEqual({ role: 'system', content: systemPrompt })
    expect(arr[1]).toEqual({ role: 'system', content: expect.stringContaining(summary) })
    expect(arr[2]).toEqual(recent[0])
    expect(arr[3]).toEqual(recent[1])
    expect(arr[4]).toEqual({ role: 'user', content: userMsg })
  })

  it('omits summary if missing', () => {
    const ctx = { summary: '', recent_messages: recent }
    const arr = buildGptContext(ctx, userMsg, systemPrompt)
    expect(arr[0].role).toBe('system')
    expect(arr[1]).toEqual(recent[0])
  })

  it('omits recent_messages if missing', () => {
    const ctx = { summary }
    const arr = buildGptContext(ctx, userMsg, systemPrompt)
    expect(arr[0].role).toBe('system')
    expect(arr[1].role).toBe('system')
    expect(arr[arr.length - 1].role).toBe('user')
  })

  it('omits user message if empty', () => {
    const ctx = { summary, recent_messages: recent }
    const arr = buildGptContext(ctx, '', systemPrompt)
    expect(arr[arr.length - 1].role).not.toBe('user')
  })

  it('works with only system prompt', () => {
    const ctx = {}
    const arr = buildGptContext(ctx, '', systemPrompt)
    expect(arr.length).toBe(1)
    expect(arr[0].role).toBe('system')
  })
})
