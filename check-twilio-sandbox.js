const axios = require('axios');
require('dotenv').config();

async function checkWhatsAppSandbox() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  console.log('🔍 Checking WhatsApp Sandbox Configuration...\n');
  
  try {
    // Check if there are any messaging services
    console.log('📱 Checking Messaging Services...');
    const servicesResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/MessagingServices.json`,
      {
        auth: { username: accountSid, password: authToken }
      }
    );
    
    if (servicesResponse.data.messaging_services && servicesResponse.data.messaging_services.length > 0) {
      servicesResponse.data.messaging_services.forEach(service => {
        console.log(`\n📧 Service: ${service.friendly_name}`);
        console.log(`   SID: ${service.sid}`);
        console.log(`   Inbound Webhook: ${service.inbound_request_url || 'Not set'}`);
      });
    } else {
      console.log('   No messaging services found');
    }
    
    // Check phone numbers
    console.log('\n📞 Checking Phone Numbers...');
    const phoneResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        auth: { username: accountSid, password: authToken }
      }
    );
    
    if (phoneResponse.data.incoming_phone_numbers && phoneResponse.data.incoming_phone_numbers.length > 0) {
      phoneResponse.data.incoming_phone_numbers.forEach(phone => {
        console.log(`\n📱 Phone: ${phone.phone_number}`);
        console.log(`   Webhook URL: ${phone.webhook_url || 'Not set'}`);
        console.log(`   Webhook Method: ${phone.webhook_method || 'Not set'}`);
        if (phone.capabilities) {
          console.log(`   WhatsApp: ${phone.capabilities.whatsapp ? '✅' : '❌'}`);
        }
      });
    } else {
      console.log('   No phone numbers found');
    }
    
    console.log('\n💡 Manual Check Required:');
    console.log('1. Go to: https://console.twilio.com/us1/develop/sms/manage/whatsapp-sandbox');
    console.log('2. Check "When a message comes in" webhook URL');
    console.log('3. Make sure it points to: https://4f3c-87-68-206-231.ngrok-free.app/whatsapp');
    console.log('4. Method should be POST');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkWhatsAppSandbox(); 