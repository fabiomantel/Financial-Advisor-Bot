// WARNING: Do not import any local files here! Only import from 'winston' and Node modules to avoid circular dependencies.
const { createLogger, transports, format } = require('winston');

const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp(),
    format.colorize(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new transports.Console({
      colorize: true
    })
  ]
});

module.exports = logger;
