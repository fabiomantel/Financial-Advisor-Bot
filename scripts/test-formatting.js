const { formatWhatsAppMessage } = require('../utils/messageFormatter')
const logger = require('../utils/logger');

// Test message with various formatting
const testMessage = `*📋 תוכנית מיסוי נדלן*

_📋 תוכנית מיסוי נדל"ן בארה"ב_השקעה בנדל"ן בארה"ב מצריכה הבנה מעמיקה של מערכת המס האמריקאית, הכוללת מספר מרכיבים חשובים שכל משקיע צריך להכיר:

*1._מס רכישה_*:
- _העמלות משתנות ממדינה למדינה_: מס הרכישה בארה"ב מכונה לעיתים "Property Transfer Tax" והוא משתנה לפי החוקים המקומיים של כל מדינה ועיר.

*2._מס רכוש (Property Tax)_*:
- _תשלום שנתי_: מדובר במס המחושב על פי ערך הנכס ומשולם לעיתים קרובות ברמה המחוזית.

_אם יש לך שאלות נוספות או זקוק למידע נוסף, אני כאן לעזור!_🏠💼`

logger.info('=== ORIGINAL MESSAGE ===')
logger.info(testMessage)
logger.info('\n=== FORMATTED MESSAGE ===')
const formatted = formatWhatsAppMessage(testMessage)
logger.info(formatted)
logger.info('\n=== MESSAGE LENGTH ===')
logger.info(`Original: ${testMessage.length} chars`)
logger.info(`Formatted: ${formatted.length} chars`)
