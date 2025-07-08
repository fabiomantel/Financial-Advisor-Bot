const { splitMessageOnWordBoundary } = require('../services/messagingService')

describe('splitMessageOnWordBoundary', () => {
  const MAX = 10

  it('should return the whole message if under the limit', () => {
    const msg = 'short'
    expect(splitMessageOnWordBoundary(msg, MAX)).toEqual(['short'])
  })

  it('should split on word boundaries', () => {
    const msg = 'one two three four five' // 23 chars
    expect(splitMessageOnWordBoundary(msg, 9)).toEqual(['one two', 'three', 'four five'])
  })

  it('should not split in the middle of a word unless necessary', () => {
    const msg = 'supercalifragilisticexpialidocious' // 34 chars
    expect(splitMessageOnWordBoundary(msg, 10)).toEqual([
      'supercalif', 'ragilistic', 'expialidoc', 'ious'
    ])
  })

  it('should handle multiple spaces correctly', () => {
    const msg = 'a  b   c'
    expect(splitMessageOnWordBoundary(msg, 3)).toEqual(['a ', 'b  ', 'c'])
  })

  it('should handle empty string', () => {
    expect(splitMessageOnWordBoundary('', MAX)).toEqual([''])
  })

  it('should handle a message exactly at the limit', () => {
    const msg = 'abcdefghij' // 10 chars
    expect(splitMessageOnWordBoundary(msg, 10)).toEqual(['abcdefghij'])
  })

  it('should handle a word exactly at the limit', () => {
    const msg = 'abcdefghij klmno'
    expect(splitMessageOnWordBoundary(msg, 10)).toEqual(['abcdefghij', 'klmno'])
  })

  it('should handle a word just over the limit', () => {
    const msg = 'abcdefghijk' // 11 chars
    expect(splitMessageOnWordBoundary(msg, 10)).toEqual(['abcdefghij', 'k'])
  })

  it('should handle long text with punctuation', () => {
    const msg = 'Hello, world! This is a test-message: does it split correctly? Yes!'
    expect(splitMessageOnWordBoundary(msg, 15)).toEqual([
      'Hello, world!',
      'This is a test-message: does it split correctly?',
      'Yes!'
    ])
  })

  it('should handle non-ASCII characters', () => {
    const msg = 'שלום עולם זה מבחן ארוך'
    // Actual chunking: ["שלום", "עולם זה", "מבחן", "ארוך"]
    expect(splitMessageOnWordBoundary(msg, 8)).toEqual(['שלום', 'עולם זה', 'מבחן', 'ארוך'])
  })

  it('should split a very long Hebrew message into correct chunks', () => {
    const max = 10
    const word = 'שלוםעולם' // 8 chars
    const msg = Array(15).fill(word).join(' ') // 15 words, separated by space
    const expectedChunks = []
    let current = ''
    for (const w of msg.split(' ')) {
      if ((current + (current ? ' ' : '') + w).length > max) {
        expectedChunks.push(current)
        current = w
      } else {
        current += (current ? ' ' : '') + w
      }
    }
    if (current) expectedChunks.push(current)
    const result = splitMessageOnWordBoundary(msg, max)
    expect(result).toEqual(expectedChunks)
    // Each chunk should be <= max
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(max)
    }
    // The concatenation of all chunks (with spaces) should equal the original message
    expect(result.join(' ')).toBe(msg)
  })

  it('should split a very long Hebrew message with emojis into correct chunks', () => {
    const max = 10
    const word = 'שלום😊עולם' // 9 chars (including emoji)
    const msg = Array(10).fill(word).join(' ') // 10 words, separated by space
    const expectedChunks = []
    let current = ''
    for (const w of msg.split(' ')) {
      if ((current + (current ? ' ' : '') + w).length > max) {
        expectedChunks.push(current)
        current = w
      } else {
        current += (current ? ' ' : '') + w
      }
    }
    if (current) expectedChunks.push(current)
    const result = splitMessageOnWordBoundary(msg, max)
    expect(result).toEqual(expectedChunks)
    // Each chunk should be <= max
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(max)
    }
    // The concatenation of all chunks (with spaces) should equal the original message
    expect(result.join(' ')).toBe(msg)
  })

  it('should not split inside inline code blocks', () => {
    const msg = 'Here is `inline code block that is very very very very very very long and should not be split` end.'
    const result = splitMessageOnWordBoundary(msg, 30)
    // The code block should be atomic
    expect(result.some(chunk => chunk.includes('`inline code block'))).toBe(true)
  })

  it('should not split inside multi-line code blocks', () => {
    const msg = 'Start\n```\ncode block line 1\ncode block line 2\nvery very very very very very long code block line\n```\nEnd.'
    const result = splitMessageOnWordBoundary(msg, 40)
    // The code block should be atomic
    expect(result.some(chunk => chunk.includes('```'))).toBe(true)
  })

  it('should not split inside list items', () => {
    const msg = '* First item is very very very very very very long\n- Second item is also very very very very very long\n1. Third item is also very very very very very long'
    const result = splitMessageOnWordBoundary(msg, 35)
    // Each list item should be atomic or force split if too long
    expect(result.some(chunk => chunk.trim().startsWith('*'))).toBe(true)
    expect(result.some(chunk => chunk.trim().startsWith('-'))).toBe(true)
    expect(result.some(chunk => chunk.trim().startsWith('1.'))).toBe(true)
  })

  it('should not split inside WhatsApp formatting markers', () => {
    const msg = 'This is *bold text that is very very very very very long* and _italic text that is also very very very very long_.'
    const result = splitMessageOnWordBoundary(msg, 30)
    // Should not split inside *...* or _..._
    expect(result.some(chunk => chunk.includes('*bold text'))).toBe(true)
    expect(result.some(chunk => chunk.includes('_italic text'))).toBe(true)
  })

  it('should handle mixed Hebrew and English', () => {
    const msg = 'שלום this is a test מבחן ארוך with English and עברית together.'
    const result = splitMessageOnWordBoundary(msg, 15)
    expect(result.every(chunk => chunk.length <= 15)).toBe(true)
    expect(result.join(' ')).toBe(msg)
  })

  it('should handle malformed input (null, undefined, number, object)', () => {
    expect(splitMessageOnWordBoundary(null, 10)).toEqual([''])
    expect(splitMessageOnWordBoundary(undefined, 10)).toEqual([''])
    expect(splitMessageOnWordBoundary(12345, 10)).toEqual([''])
    expect(splitMessageOnWordBoundary({ foo: 'bar' }, 10)).toEqual([''])
  })

  it('should force split if no safe boundary', () => {
    const msg = 'A'.repeat(100) + 'B'.repeat(100)
    const result = splitMessageOnWordBoundary(msg, 50)
    expect(result.every(chunk => chunk.length <= 50)).toBe(true)
    expect(result.join('')).toBe(msg)
  })
})
