const { formatWhatsAppMessage } = require('../utils/messageFormatter')
const logger = require('../utils/logger');

// Real WhatsApp message that's having formatting issues
const realMessage = `*📋 למה צריך יעוץ*

_📋 למה צריך ייעוץ פיננסי?_ייעוץ פיננסי יכול להיות כלי קריטי לניהול והגדלת נכסים כלכליים, במיוחד בעידן שבו שוקי ההון והפיננסים נעשים מורכבים יותר. הנה כמה סיבות עיקריות לפנות לייעוץ פיננסי:

1. _תכנון פיננסי אישי_:
   - יועץ פיננסי עוזר לך להגדיר מטרות ויעדים כלכליים, ולפתח תוכנית מסודרת להשגתן. בין אם מדובר בקניית דירה, חיסכון לפרישה או תכנון הוצאות עתידיות.

2. _ניהול סיכונים_:
   - כל תיק השקעות כרוך בסיכונים. יועץ פיננסי יכול להציע דרכים למזער את הסיכון ולשם כך לבחור בתמהיל השקעות מתאים.

3. _מיצוי הטבות מס_:
   - יועצים פיננסיים מבינים את חוקי המס ויכולים לסייע לך למקסם את הטבות המס שלך על ידי שימוש נכון בהשקעות כמו קופות גמל, קרנות השתלמות ותכנון מס נכון.

4. _בחירת השקעות מתאימות_:
   - יועץ פיננסי עוזר לבחור את המוצרים הפיננסים המתאימים ביותר לצורכיך הפרטיים ולמצב השוק, תוך בחינת סיכוי מול סיכון.

5. _גיוון תיק נכסים_:
   - באמצעות ייעוץ מקצועי, ניתן לבנות תיק נכסים מגוון העומד בהתאמה אישית לצרכים והיכולות שלך.

6. _עדכונים ושינויים בשוק_:
   - יועצים תמיד מתעדכנים בשינויים רגולטוריים, כלכליים ושוקיים, ומסוגלים לספק ייעוץ בהתאמה לאירועים עדכניים.

7. _יעדים לטווח ארוך_:
   - תכנון פיננסי מקצועי כולל התמקדות בהשגת יעדים לטווח ארוך, כגון פרישה או חינוך לילדים.

8. _פיקוח ומעקב שוטף_:
   - יועץ פיננסי מספק מעקב רציף אחרי התוכניות הכלכליות שלך, ומבצע עדכונים ושינויים במידת הצורך בהתאם לשינויים בחיים האישיים שלך או בשוק.

בהנחה שיש לך תוכניות פיננסיות מורכבות או מקצועי שאתה רוצה לנהל טוב יותר, ייעוץ פיננסי יכול להיות הצעד הנכון עבורך לדאוג לעתיד כלכלי בטוח ונכון יותר._אם יש לך עוד שאלות או זקוק לעוד מידע, אני כאן לעזור!_📊💲

נוספת!_ 💼_אשמח לעזור בכל שאלה`

logger.info('=== ORIGINAL MESSAGE ===')
logger.info(realMessage)
logger.info('\n=== FORMATTED MESSAGE ===')
const formatted = formatWhatsAppMessage(realMessage)
logger.info(formatted)
logger.info('\n=== MESSAGE LENGTH ===')
logger.info(`Original: ${realMessage.length} chars`)
logger.info(`Formatted: ${formatted.length} chars`)

// Check for specific formatting issues
logger.info('\n=== FORMATTING ANALYSIS ===')
logger.info('Contains literal underscores:', formatted.includes('_'))
logger.info('Contains literal asterisks:', formatted.includes('*'))
logger.info('Number of newlines:', (formatted.match(/\n/g) || []).length)
logger.info('Number of double newlines:', (formatted.match(/\n\n/g) || []).length)
