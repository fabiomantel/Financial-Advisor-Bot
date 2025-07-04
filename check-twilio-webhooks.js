const axios = require('axios');
require('dotenv').config();

async function checkTwilioWebhooks() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.error('❌ Missing Twilio credentials in .env file');
    return;
  }

  console.log('🔍 Checking Twilio webhook configuration...\n');
  console.log(`📋 Account SID: ${accountSid}`);
  console.log(`📱 WhatsApp Number: ${process.env.TWILIO_WHATSAPP_NUMBER}\n`);

  try {
    // Check Phone Numbers (including WhatsApp-enabled numbers)
    console.log('📞 Checking Phone Numbers...');
    const phoneResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    );

    if (phoneResponse.data.incoming_phone_numbers && phoneResponse.data.incoming_phone_numbers.length > 0) {
      console.log(`Found ${phoneResponse.data.incoming_phone_numbers.length} phone number(s):`);
      
      phoneResponse.data.incoming_phone_numbers.forEach((phone, index) => {
        console.log(`\n📱 Phone Number ${index + 1}:`);
        console.log(`   Number: ${phone.phone_number}`);
        console.log(`   Friendly Name: ${phone.friendly_name || 'Not set'}`);
        console.log(`   Webhook URL: ${phone.webhook_url || '❌ Not set'}`);
        console.log(`   Webhook Method: ${phone.webhook_method || '❌ Not set'}`);
        
        if (phone.capabilities) {
          console.log(`   Capabilities:`);
          console.log(`     - SMS: ${phone.capabilities.sms ? '✅' : '❌'}`);
          console.log(`     - MMS: ${phone.capabilities.mms ? '✅' : '❌'}`);
          console.log(`     - Voice: ${phone.capabilities.voice ? '✅' : '❌'}`);
          console.log(`     - WhatsApp: ${phone.capabilities.whatsapp ? '✅' : '❌'}`);
        }
      });
    } else {
      console.log('   ❌ No phone numbers found');
    }

    // Check if you're using WhatsApp Sandbox
    console.log('\n📱 WhatsApp Sandbox Status:');
    console.log('   If you\'re using WhatsApp Sandbox, you need to configure it in the Twilio Console.');
    console.log('   Go to: https://console.twilio.com/us1/develop/sms/manage/whatsapp-sandbox');
    console.log('   Set the "When a message comes in" webhook URL.');

    console.log('\n✅ Webhook configuration check completed!');
    console.log('\n💡 To fix incoming messages:');
    console.log('   1. Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message');
    console.log('   2. Set "When a message comes in" webhook URL to: https://your-domain.com/webhook');
    console.log('   3. For local development, use ngrok: ngrok http 3000');
    console.log('   4. Set webhook method to: POST');
    console.log('   5. Make sure your server is accessible from the internet');

  } catch (error) {
    console.error('❌ Error checking webhook configuration:', error.response?.data || error.message);
    console.log('\n💡 Manual check required:');
    console.log('   1. Go to https://console.twilio.com/');
    console.log('   2. Navigate to Messaging → Try it out → Send a WhatsApp message');
    console.log('   3. Check the webhook configuration there');
  }
}

checkTwilioWebhooks(); 