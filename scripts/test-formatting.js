const { formatWhatsAppMessage } = require('../utils/messageFormatter')

// Test message with various formatting
const testMessage = `*📋 תוכנית מיסוי נדלן*

_📋 תוכנית מיסוי נדל"ן בארה"ב_השקעה בנדל"ן בארה"ב מצריכה הבנה מעמיקה של מערכת המס האמריקאית, הכוללת מספר מרכיבים חשובים שכל משקיע צריך להכיר:

*1._מס רכישה_*:
- _העמלות משתנות ממדינה למדינה_: מס הרכישה בארה"ב מכונה לעיתים "Property Transfer Tax" והוא משתנה לפי החוקים המקומיים של כל מדינה ועיר.

*2._מס רכוש (Property Tax)_*:
- _תשלום שנתי_: מדובר במס המחושב על פי ערך הנכס ומשולם לעיתים קרובות ברמה המחוזית.

_אם יש לך שאלות נוספות או זקוק למידע נוסף, אני כאן לעזור!_🏠💼`

console.log('=== ORIGINAL MESSAGE ===')
console.log(testMessage)
console.log('\n=== FORMATTED MESSAGE ===')
const formatted = formatWhatsAppMessage(testMessage)
console.log(formatted)
console.log('\n=== MESSAGE LENGTH ===')
console.log(`Original: ${testMessage.length} chars`)
console.log(`Formatted: ${formatted.length} chars`) 