const express = require('express')
const bodyParser = require('body-parser')
const logger = require('../utils/logger');

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Log all incoming requests
app.use((req, res, next) => {
  logger.info('=== INCOMING REQUEST ===')
  logger.info(`Method: ${req.method}`)
  logger.info(`URL: ${req.url}`)
  logger.info('Headers:', req.headers)
  logger.info('Body:', req.body)
  logger.info('========================')
  next()
})

// Handle webhook
app.post('/whatsapp', (req, res) => {
  logger.info('✅ Webhook received!')
  logger.info('Body:', req.body)
  res.sendStatus(200)
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const PORT = 3001
app.listen(PORT, () => {
  logger.info(`Test server running on port ${PORT}`)
  logger.info(`Webhook URL: http://localhost:${PORT}/whatsapp`)
})
