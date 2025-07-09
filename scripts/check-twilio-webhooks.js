const axios = require('axios')
require('dotenv').config()
const logger = require('../utils/logger');

async function checkTwilioWebhooks () {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    logger.error('❌ Missing Twilio credentials in .env file')
    return
  }

  logger.info('🔍 Checking Twilio webhook configuration...\n')
  logger.info(`📋 Account SID: ${accountSid}`)
  logger.info(`📱 WhatsApp Number: ${process.env.TWILIO_WHATSAPP_NUMBER}\n`)

  try {
    // Check Phone Numbers (including WhatsApp-enabled numbers)
    logger.info('📞 Checking Phone Numbers...')
    const phoneResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    )

    if (phoneResponse.data.incoming_phone_numbers && phoneResponse.data.incoming_phone_numbers.length > 0) {
      logger.info(`Found ${phoneResponse.data.incoming_phone_numbers.length} phone number(s):`)

      phoneResponse.data.incoming_phone_numbers.forEach((phone, index) => {
        logger.info(`\n📱 Phone Number ${index + 1}:`)
        logger.info(`   Number: ${phone.phone_number}`)
        logger.info(`   Friendly Name: ${phone.friendly_name || 'Not set'}`)
        logger.info(`   Webhook URL: ${phone.webhook_url || '❌ Not set'}`)
        logger.info(`   Webhook Method: ${phone.webhook_method || '❌ Not set'}`)

        if (phone.capabilities) {
          logger.info('   Capabilities:')
          logger.info(`     - SMS: ${phone.capabilities.sms ? '✅' : '❌'}`)
          logger.info(`     - MMS: ${phone.capabilities.mms ? '✅' : '❌'}`)
          logger.info(`     - Voice: ${phone.capabilities.voice ? '✅' : '❌'}`)
          logger.info(`     - WhatsApp: ${phone.capabilities.whatsapp ? '✅' : '❌'}`)
        }
      })
    } else {
      logger.info('   ❌ No phone numbers found')
    }

    // Check if you're using WhatsApp Sandbox
    logger.info('\n📱 WhatsApp Sandbox Status:')
    logger.info('   If you\'re using WhatsApp Sandbox, you need to configure it in the Twilio Console.')
    logger.info('   Go to: https://console.twilio.com/us1/develop/sms/manage/whatsapp-sandbox')
    logger.info('   Set the "When a message comes in" webhook URL.')

    logger.info('\n✅ Webhook configuration check completed!')
    logger.info('\n💡 To fix incoming messages:')
    logger.info('   1. Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message')
    logger.info('   2. Set "When a message comes in" webhook URL to: https://your-domain.com/webhook')
    logger.info('   3. For local development, use ngrok: ngrok http 3000')
    logger.info('   4. Set webhook method to: POST')
    logger.info('   5. Make sure your server is accessible from the internet')
  } catch (error) {
    logger.error('❌ Error checking webhook configuration:', error.response?.data || error.message)
    logger.info('\n💡 Manual check required:')
    logger.info('   1. Go to https://console.twilio.com/')
    logger.info('   2. Navigate to Messaging → Try it out → Send a WhatsApp message')
    logger.info('   3. Check the webhook configuration there')
  }
}

checkTwilioWebhooks()
