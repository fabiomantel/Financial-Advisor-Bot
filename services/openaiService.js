const axios = require('axios');
const config = require('../config/config');

async function getGptReply(messages) {
  const response = await axios.post(
    config.OPENAI_API_URL,
    {
      model: config.MODEL,
      messages: messages,
    },
    {
      headers: {
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices[0].message.content.trim();
}

module.exports = { getGptReply }; 