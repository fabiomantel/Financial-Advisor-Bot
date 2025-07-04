const { createLogger, transports, format } = require('winston')

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.simple()
  ),
  transports: [
    new transports.Console()
    // Add file transport if needed
  ]
})

module.exports = logger
