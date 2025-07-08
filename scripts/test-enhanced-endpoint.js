const axios = require('axios')
const logger = require('../utils/logger')

async function testEnhancedEndpoint() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
  const testMessage = {
    From: '+1234567890',
    Body: 'Hello, this is a test message for the enhanced endpoint',
    To: process.env.TWILIO_WHATSAPP_NUMBER || '+1234567890'
  }

  logger.info('🧪 Testing Enhanced WhatsApp Endpoint')
  logger.info(`📡 Base URL: ${baseUrl}`)
  logger.info(`📱 Test message: ${testMessage.Body}`)

  try {
    const startTime = Date.now()
    
    const response = await axios.post(`${baseUrl}/whatsapp/enhanced`, testMessage, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    })

    const duration = Date.now() - startTime
    
    logger.info(`✅ Enhanced endpoint test completed in ${duration}ms`)
    logger.info(`📊 Response status: ${response.status}`)
    logger.info(`📄 Response data:`, response.data)
    // Check for immediate acknowledgment (should be status: 'success' or 'processing')
    if (response.data && (response.data.status === 'success' || response.data.status === 'processing')) {
      logger.info('✅ Immediate acknowledgment response received as expected.')
    } else {
      logger.error('❌ Immediate acknowledgment response not received as expected.')
    }

    // Test stats endpoint
    const statsResponse = await axios.get(`${baseUrl}/stats/enhanced`)
    logger.info(`📈 Enhanced stats:`, statsResponse.data)

    // Test health endpoint
    const healthResponse = await axios.get(`${baseUrl}/health/enhanced`)
    logger.info(`🏥 Enhanced health:`, healthResponse.data)

  } catch (error) {
    logger.error(`❌ Enhanced endpoint test failed: ${error.message}`)
    if (error.response) {
      logger.error(`📊 Response status: ${error.response.status}`)
      logger.error(`📄 Response data:`, error.response.data)
    }
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testEnhancedEndpoint()
    .then(() => {
      logger.info('🎉 Enhanced endpoint test completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error(`💥 Test failed: ${error.message}`)
      process.exit(1)
    })
}

module.exports = { testEnhancedEndpoint } 