const express = require('express')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Log all incoming requests
app.use((req, res, next) => {
  console.log('=== INCOMING REQUEST ===')
  console.log(`Method: ${req.method}`)
  console.log(`URL: ${req.url}`)
  console.log('Headers:', req.headers)
  console.log('Body:', req.body)
  console.log('========================')
  next()
})

// Handle webhook
app.post('/whatsapp', (req, res) => {
  console.log('✅ Webhook received!')
  console.log('Body:', req.body)
  res.sendStatus(200)
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`)
  console.log(`Webhook URL: http://localhost:${PORT}/whatsapp`)
})
