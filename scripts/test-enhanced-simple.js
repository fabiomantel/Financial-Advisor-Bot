const axios = require('axios')
const logger = require('../utils/logger');

async function testEnhancedEndpoint () {
  try {
    logger.info('🧪 Testing Enhanced Endpoint...')

    const testMessage = {
      From: 'whatsapp:+972523631525',
      Body: 'השקעות לעצלנים',
      To: 'whatsapp:+1234567890'
    }

    logger.info('📤 Sending test message...')
    const response = await axios.post('http://localhost:3000/whatsapp/enhanced', testMessage, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

    logger.info('✅ Response received:', response.status)
    logger.info('📄 Response data:', response.data)
  } catch (error) {
    logger.error('❌ Test failed:', error.message)
    if (error.response) {
      logger.error('📊 Status:', error.response.status)
      logger.error('📄 Data:', error.response.data)
    }
  }
}

testEnhancedEndpoint()
