const express = require('express')
const { body } = require('express-validator')
const streamingController = require('../controllers/streamingController')
const enhancedWhatsappController = require('../controllers/enhancedWhatsappController')

const router = express.Router()

// Validation middleware
const validateWebhook = [
  body('Body').notEmpty().withMessage('Message body is required'),
  body('From').notEmpty().withMessage('From field is required')
]

// New streaming endpoint
router.post('/whatsapp/streaming', validateWebhook, streamingController.handleStreamingWebhook)

// Enhanced endpoint with all optimizations
router.post('/whatsapp/enhanced', validateWebhook, enhancedWhatsappController.handleWebhook)

// Enhanced health check endpoint
router.get('/health/enhanced', enhancedWhatsappController.healthCheck)

// Get enhanced stats
router.get('/stats/enhanced', (req, res) => {
  res.json(enhancedWhatsappController.getStats())
})

module.exports = router
