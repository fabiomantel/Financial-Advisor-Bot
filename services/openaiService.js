const axios = require('axios');
const config = require('../config/config');

async function getGptReply(userMessage) {
  const response = await axios.post(
    config.OPENAI_API_URL,
    {
      model: config.MODEL,
      messages: [
        { role: 'system', content: config.SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
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