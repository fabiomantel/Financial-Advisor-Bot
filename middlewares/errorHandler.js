const logger = require('../utils/logger');
const config = require('../config/config')

function errorHandler (err, req, res, next) {
  if (err.response && err.response.data) {
    logger.error('API Error:', err.response.data)
  } else {
    logger.error('Error:', err.message || err)
  }
  res.status(500).json({ error: config.ERROR_REPLY })
}

module.exports = errorHandler
