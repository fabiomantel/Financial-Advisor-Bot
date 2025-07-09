const { formatWhatsAppMessage } = require('./messageFormatter')

describe('formatWhatsAppMessage', () => {
  test('converts markdown headers to WhatsApp bold/italic', () => {
    expect(formatWhatsAppMessage('### Header')).toBe('*Header*')
    expect(formatWhatsAppMessage('## Subheader')).toBe('_Subheader_')
    expect(formatWhatsAppMessage('# Main')).toBe('*Main*')
  })

  test('converts **bold** and *italic* to WhatsApp', () => {
    expect(formatWhatsAppMessage('**bold**')).toBe('*bold*')
    expect(formatWhatsAppMessage('*italic*')).toBe('_italic_')
  })

  test('preserves newlines and lists', () => {
    const input = 'Line 1\nLine 2\n- Item 1\n- Item 2'
    const expected = 'Line 1\nLine 2\n- Item 1\n- Item 2'
    expect(formatWhatsAppMessage(input)).toBe(expected)
  })

  test('handles mixed formatting', () => {
    const input = '**Bold** and *italic* with `code`'
    const expected = '*Bold* and _italic_ with `code`'
    expect(formatWhatsAppMessage(input)).toBe(expected)
  })

  test('does not remove or compress newlines', () => {
    const input = 'Line 1\n\nLine 2\n\n\nLine 3'
    const expected = 'Line 1\n\nLine 2\n\n\nLine 3'
    expect(formatWhatsAppMessage(input)).toBe(expected)
  })

  test('returns non-string input unchanged', () => {
    expect(formatWhatsAppMessage(null)).toBe(null)
    expect(formatWhatsAppMessage(undefined)).toBe(undefined)
    expect(formatWhatsAppMessage(123)).toBe(123)
  })

  test('cleans up duplicate asterisks', () => {
    expect(formatWhatsAppMessage('***bold***')).toBe('*bold*')
    expect(formatWhatsAppMessage('****bold****')).toBe('*bold*')
    expect(formatWhatsAppMessage('**bold** and ***more***')).toBe('*bold* and *more*')
    expect(formatWhatsAppMessage('___italic___')).toBe('_italic_')
  })
})
