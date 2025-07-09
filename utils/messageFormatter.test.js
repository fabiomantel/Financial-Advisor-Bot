const { formatWhatsAppMessage } = require('./messageFormatter')

describe('formatWhatsAppMessage', () => {
  it('converts markdown headers to WhatsApp bold/italic', () => {
    expect(formatWhatsAppMessage('### Header')).toBe('*Header*')
    expect(formatWhatsAppMessage('## Subheader')).toBe('_Subheader_')
    expect(formatWhatsAppMessage('# Main')).toBe('*Main*')
  })

  it('converts **bold** and *italic* to WhatsApp', () => {
    expect(formatWhatsAppMessage('**bold**')).toBe('*bold*')
    expect(formatWhatsAppMessage('*italic*')).toBe('_italic_')
  })

  it('preserves newlines and lists', () => {
    const input = '* Header\n\n* Item 1\n* Item 2\n- Item 3\n1. First\n2. Second\n> Quote'
    const expected = '* Header\n\n* Item 1\n* Item 2\n- Item 3\n1. First\n2. Second\n> Quote'
    expect(formatWhatsAppMessage(input)).toBe(expected)
  })

  it('handles mixed formatting', () => {
    const input = '### כותרת\n\n**מודגש** *נטוי*\n- רשימה\n1. ממוספר\n> ציטוט'
    const expected = '*כותרת*\n\n*מודגש* _נטוי_\n- רשימה\n1. ממוספר\n> ציטוט'
    expect(formatWhatsAppMessage(input)).toBe(expected)
  })

  it('does not remove or compress newlines', () => {
    const input = 'Line1\n\nLine2\n\n\nLine3'
    const expected = 'Line1\n\nLine2\n\n\nLine3'
    expect(formatWhatsAppMessage(input)).toBe(expected)
  })

  it('returns non-string input unchanged', () => {
    expect(formatWhatsAppMessage(null)).toBe(null)
    expect(formatWhatsAppMessage(undefined)).toBe(undefined)
    expect(formatWhatsAppMessage(123)).toBe(123)
  })
})
