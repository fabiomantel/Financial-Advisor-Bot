const redis = require('redis')
const fs = require('fs')
const logger = require('../../utils/logger')

class RedisStorageProvider {
  constructor (config) {
    // TLS options if provided
    const socketOptions = {}
    let usingTLS = false
    if (config.REDIS_URL && config.REDIS_URL.startsWith('rediss://')) {
      usingTLS = true
      socketOptions.tls = true
      // Optionally add CA, cert, key if provided
      if (config.REDIS_TLS_CA) {
        socketOptions.ca = fs.readFileSync(config.REDIS_TLS_CA)
      }
      if (config.REDIS_TLS_CERT) {
        socketOptions.cert = fs.readFileSync(config.REDIS_TLS_CERT)
      }
      if (config.REDIS_TLS_KEY) {
        socketOptions.key = fs.readFileSync(config.REDIS_TLS_KEY)
      }
      // Optionally allow self-signed
      if (config.REDIS_TLS_REJECT_UNAUTHORIZED === 'false') {
        socketOptions.rejectUnauthorized = false
      }
    } else {
      // Fallback to previous config
      socketOptions.rejectUnauthorized = false
    }

    logger.info(`Creating Redis client. Secure TLS: ${usingTLS}`)
    this.client = redis.createClient({
      url: config.REDIS_URL,
      socket: socketOptions
    })

    this.setupEventHandlers()
    this.connect()
  }

  setupEventHandlers () {
    this.client.on('error', (err) => {
      logger.error('Redis Client Error', err)
    })

    this.client.on('connect', () => {
      logger.info('Redis client connected')
    })

    this.client.on('ready', () => {
      logger.info('Redis client ready')
    })

    this.client.on('end', () => {
      logger.info('Redis client disconnected')
    })

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting')
    })
  }

  async connect () {
    try {
      logger.info('Attempting to connect to Redis...')
      await this.client.connect()
      logger.info('Redis connection established successfully')
    } catch (err) {
      logger.error('Redis connection failed', err)
    }
  }

  async get (key) {
    try {
      logger.info(`Redis GET operation for key: ${key}`)
      const result = await this.client.get(key)
      if (result) {
        logger.info(`Redis GET successful for key: ${key}, data length: ${result.length} chars`)
      } else {
        logger.info(`Redis GET returned null for key: ${key}`)
      }
      return result
    } catch (err) {
      logger.error(`Redis GET failed for key ${key}: ${err.message}`)
      throw err
    }
  }

  async set (key, value, options = {}) {
    try {
      logger.info(`Redis SET operation for key: ${key}, value length: ${value.length} chars`)
      if (options.EX) {
        logger.info(`Redis SET with expiration: ${options.EX} seconds`)
      }
      const result = await this.client.set(key, value, options)
      logger.info(`Redis SET successful for key: ${key}, result: ${result}`)
      return result
    } catch (err) {
      logger.error(`Redis SET failed for key ${key}: ${err.message}`)
      throw err
    }
  }

  async disconnect () {
    try {
      logger.info('Disconnecting Redis client...')
      await this.client.disconnect()
      logger.info('Redis client disconnected successfully')
    } catch (err) {
      logger.error('Redis disconnect failed', err)
    }
  }

  isConnected () {
    const connected = this.client.isReady
    logger.info(`Redis connection status: ${connected ? 'connected' : 'disconnected'}`)
    return connected
  }

  // Debug method to check Redis connection and basic operations
  async healthCheck () {
    try {
      logger.info('Performing Redis health check...')
      const testKey = 'health_check_test'
      const testValue = 'test_value'

      // Test SET
      await this.client.set(testKey, testValue)
      logger.info('Redis SET health check passed')

      // Test GET
      const retrieved = await this.client.get(testKey)
      logger.info(`Redis GET health check passed, retrieved: ${retrieved}`)

      // Clean up
      await this.client.del(testKey)
      logger.info('Redis health check completed successfully')
      return true
    } catch (err) {
      logger.error('Redis health check failed', err)
      return false
    }
  }
}

module.exports = RedisStorageProvider
