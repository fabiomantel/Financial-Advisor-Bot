const express = require('express')
const { body } = require('express-validator')
const whatsappController = require('../controllers/whatsappController')

const router = express.Router()

// Validation middleware
const validateWebhook = [
  body('Body').notEmpty().withMessage('Message body is required'),
  body('From').notEmpty().withMessage('From field is required')
]

// Alias for existing Twilio webhook URL
router.post('/whatsapp', validateWebhook, whatsappController.handleWebhook)

// Health check endpoint
router.get('/health', whatsappController.healthCheck)

// Test Redis endpoint
router.get('/test-redis', whatsappController.testRedis)

// Get user chat history
router.get('/history/:userId', whatsappController.getUserHistory)

module.exports = router
