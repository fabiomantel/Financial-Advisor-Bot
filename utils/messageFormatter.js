const logger = require('./logger')

/**
 * Formats a message for WhatsApp with proper text formatting
 * @param {string} message - The raw message from GPT
 * @returns {string} - Formatted message for WhatsApp
 */
function formatWhatsAppMessage(message) {
  if (!message || typeof message !== 'string') return message;
  let formattedMessage = message;

  // Convert markdown headers to WhatsApp bold/italic
  formattedMessage = formattedMessage.replace(/^###\s*(.+)$/gm, '*$1*');
  formattedMessage = formattedMessage.replace(/^##\s*(.+)$/gm, '_$1_');
  formattedMessage = formattedMessage.replace(/^#\s*(.+)$/gm, '*$1*');

  // Convert **bold** to *bold*
  formattedMessage = formattedMessage.replace(/\*\*([^\*]+)\*\*/g, '*$1*');

  // Convert *italic* to _italic_ ONLY if not at the start of a line (to avoid list items)
  formattedMessage = formattedMessage.replace(/(^|[^\w])\*([^\*\n]+)\*/g, (match, p1, p2) => {
    // If at the start of a line and followed by a space, it's a list item, not italic
    if (p1.endsWith('\n') && /^\s/.test(p2)) return match;
    return `${p1}_${p2}_`;
  });

  // Do not remove or add any newlines or spaces
  logger.info(`📝 Message formatted successfully, length: ${formattedMessage.length} chars`);
  return formattedMessage;
}

/**
 * Adds a header to the message if it doesn't have one
 * @param {string} message - The message to add header to
 * @param {string} topic - The topic of the message
 * @returns {string} - Message with header
 */
function addMessageHeader(message, topic) {
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
function addMessageConclusion(message) {
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