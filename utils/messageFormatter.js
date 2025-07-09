const logger = require('./logger');

/**
 * Formats a message for WhatsApp with proper text formatting
 * @param {string} message - The raw message from GPT
 * @returns {string} - Formatted message for WhatsApp
 */
function formatWhatsAppMessage (message) {
  if (!message || typeof message !== 'string') return message
  let formattedMessage = message

  // Clean up any existing WhatsApp formatting to prevent duplicates
  formattedMessage = formattedMessage.replace(/\*\*+/g, '**') // Remove extra asterisks
  formattedMessage = formattedMessage.replace(/__+/g, '__') // Remove extra underscores

  // First pass: replace headers and bold with placeholders
  formattedMessage = formattedMessage.replace(/^###\s*(.+)$/gmu, '<<BOLD>>$1<</BOLD>>')
  formattedMessage = formattedMessage.replace(/^(?![\*_])##(?!#)\s*(.+)$/gmu, '<<ITALIC>>$1<</ITALIC>>')
  formattedMessage = formattedMessage.replace(/^(?![\*_])#(?!#)\s*(.+)$/gmu, '<<BOLD>>$1<</BOLD>>')
  
  // Improved bold regex to handle nested asterisks better
  formattedMessage = formattedMessage.replace(/\*\*([^*]+?)\*\*/g, '<<BOLD>>$1<</BOLD>>')

  // Second pass: italic (only single asterisks not part of bold or header)
  formattedMessage = formattedMessage.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '_$1_')

  // Final pass: replace placeholders with WhatsApp formatting
  formattedMessage = formattedMessage.replace(/<<BOLD>>(.*?)<<\/BOLD>>/g, '*$1*')
  formattedMessage = formattedMessage.replace(/<<ITALIC>>(.*?)<<\/ITALIC>>/g, '_$1_')

  // Final cleanup: remove any remaining duplicate asterisks
  formattedMessage = formattedMessage.replace(/\*\*+/g, '*') // Convert multiple asterisks to single
  formattedMessage = formattedMessage.replace(/__+/g, '_') // Convert multiple underscores to single

  // Do not remove or add any newlines or spaces
  logger.info(`📝 Message formatted successfully, length: ${formattedMessage.length} chars`)
  return formattedMessage
}

/**
 * Adds a header to the message if it doesn't have one
 * @param {string} message - The message to add header to
 * @param {string} topic - The topic of the message
 * @returns {string} - Message with header
 */
function addMessageHeader (message, topic) {
  if (!message || !topic) {
    return message
  }

  // Check if message already has a header (starts with *)
  if (message.trim().startsWith('*')) {
    return message
  }

  // Add a formatted header
  const header = `*📋 ${topic}*\n\n`
  return header + message
}

/**
 * Ensures the message ends with a proper conclusion
 * @param {string} message - The message to add conclusion to
 * @returns {string} - Message with conclusion
 */
function addMessageConclusion (message) {
  if (!message) {
    return message
  }

  // Check if message already ends with a conclusion
  const conclusionPatterns = [
    /_תודה_/i,
    /_בברכה_/i,
    /_בהצלחה_/i,
    /_אם יש לך שאלות נוספות_/i,
    /_אשמח לעזור_/i
  ]

  for (const pattern of conclusionPatterns) {
    if (pattern.test(message)) {
      return message
    }
  }

  return message
}

module.exports = {
  formatWhatsAppMessage,
  addMessageHeader,
  addMessageConclusion
}
