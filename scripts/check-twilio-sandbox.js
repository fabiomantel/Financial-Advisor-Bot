const axios = require('axios')
require('dotenv').config()
const logger = require('../utils/logger');

async function checkWhatsAppSandbox () {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  logger.info('🔍 Checking WhatsApp Sandbox Configuration...\n')

  try {
    // Check if there are any messaging services
    logger.info('📱 Checking Messaging Services...')
    const servicesResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/MessagingServices.json`,
      {
        auth: { username: accountSid, password: authToken }
      }
    )

    if (servicesResponse.data.messaging_services && servicesResponse.data.messaging_services.length > 0) {
      servicesResponse.data.messaging_services.forEach(service => {
        logger.info(`\n📧 Service: ${service.friendly_name}`)
        logger.info(`   SID: ${service.sid}`)
        logger.info(`   Inbound Webhook: ${service.inbound_request_url || 'Not set'}`)
      })
    } else {
      logger.info('   No messaging services found')
    }

    // Check phone numbers
    logger.info('\n📞 Checking Phone Numbers...')
    const phoneResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        auth: { username: accountSid, password: authToken }
      }
    )

    if (phoneResponse.data.incoming_phone_numbers && phoneResponse.data.incoming_phone_numbers.length > 0) {
      phoneResponse.data.incoming_phone_numbers.forEach(phone => {
        logger.info(`\n📱 Phone: ${phone.phone_number}`)
        logger.info(`   Webhook URL: ${phone.webhook_url || 'Not set'}`)
        logger.info(`   Webhook Method: ${phone.webhook_method || 'Not set'}`)
        if (phone.capabilities) {
          logger.info(`   WhatsApp: ${phone.capabilities.whatsapp ? '✅' : '❌'}`)
        }
      })
    } else {
      logger.info('   No phone numbers found')
    }

    logger.info('\n💡 Manual Check Required:')
    logger.info('1. Go to: https://console.twilio.com/us1/develop/sms/manage/whatsapp-sandbox')
    logger.info('2. Check "When a message comes in" webhook URL')
    logger.info('3. Make sure it points to: https://4f3c-87-68-206-231.ngrok-free.app/whatsapp')
    logger.info('4. Method should be POST')
  } catch (error) {
    logger.error('❌ Error:', error.response?.data || error.message)
  }
}

checkWhatsAppSandbox()
