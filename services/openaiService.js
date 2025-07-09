const axios = require('axios')
const config = require('../config/config')
const logger = require('../utils/logger');

async function getGptReply (messages) {
  const response = await axios.post(
    config.OPENAI_API_URL,
    {
      model: config.MODEL,
      messages
    },
    {
      headers: {
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  )
  return response.data.choices[0].message.content.trim()
}

async function getGptReplyStream (messages, onChunk, collectAll = false) {
  const startTime = Date.now()
  logger.info(`🚀 [OpenAI] Starting GPT streaming for ${messages.length} messages`)
  return new Promise((resolve, reject) => {
    try {
      axios.post(
        config.OPENAI_API_URL,
        {
          model: config.MODEL,
          messages,
          stream: true
        },
        {
          headers: {
            Authorization: `Bearer ${config.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      ).then(response => {
        let chunkCount = 0
        let totalTokens = 0
        let allContent = ''
        response.data.on('data', (chunk) => {
          const lines = chunk.toString().split('\n')
          lines.forEach(line => {
            if (line === 'data: [DONE]') return; // Skip [DONE] lines
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.choices[0].delta.content) {
                  chunkCount++
                  totalTokens += data.choices[0].delta.content.length
                  if (collectAll) allContent += data.choices[0].delta.content
                  // logger.debug(`📦 [OpenAI] GPT chunk #${chunkCount}: "${data.choices[0].delta.content}"`)
                  if (onChunk && typeof onChunk === 'function') {
                    onChunk(data.choices[0].delta.content)
                  }
                }
              } catch (parseErr) {
                logger.warn(`⚠️ [OpenAI] Failed to parse GPT chunk: ${parseErr.message}`)
              }
            }
          })
        })
        response.data.on('end', () => {
          const duration = Date.now() - startTime
          logger.info(`✅ [OpenAI] GPT streaming completed: ${chunkCount} chunks, ${totalTokens} tokens, ${duration}ms`)
          if (collectAll) {
            resolve(allContent.trim())
          } else {
            resolve('Streaming completed')
          }
        })
        response.data.on('error', (err) => {
          logger.error(`❌ [OpenAI] GPT streaming error: ${err.message}`)
          reject(err)
        })
      }).catch(err => {
        logger.error(`💥 [OpenAI] GPT streaming failed: ${err.message}`)
        reject(err)
      })
    } catch (err) {
      logger.error(`💥 [OpenAI] GPT streaming failed: ${err.message}`)
      reject(err)
    }
  })
}

module.exports = {
  getGptReply,
  getGptReplyStream
}
