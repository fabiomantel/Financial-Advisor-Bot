const axios = require('axios')

async function testEnhancedEndpoint() {
  try {
    console.log('🧪 Testing Enhanced Endpoint...')
    
    const testMessage = {
      From: 'whatsapp:+972523631525',
      Body: 'השקעות לעצלנים',
      To: 'whatsapp:+1234567890'
    }

    console.log('📤 Sending test message...')
    const response = await axios.post('http://localhost:3000/whatsapp/enhanced', testMessage, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

    console.log('✅ Response received:', response.status)
    console.log('📄 Response data:', response.data)
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    if (error.response) {
      console.error('📊 Status:', error.response.status)
      console.error('📄 Data:', error.response.data)
    }
  }
}

testEnhancedEndpoint() 