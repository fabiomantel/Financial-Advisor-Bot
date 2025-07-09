const logger = require('./logger');

class PerformanceTracer {
  constructor () {
    this.marks = new Map()
    this.measures = new Map()
    logger.info('PerformanceTracer initialized')
  }

  mark (name) {
    this.marks.set(name, Date.now())
    logger.debug(`📍 [Tracer] Performance mark: ${name}`)
  }

  measure (name, startMark, endMark) {
    const start = this.marks.get(startMark)
    const end = this.marks.get(endMark)

    if (start && end) {
      const duration = end - start
      this.measures.set(name, duration)
      logger.info(`📊 [Tracer] Performance measure: ${name} = ${duration}ms`)
      return duration
    }

    logger.warn(`⚠️ [Tracer] Cannot measure ${name}: marks not found`)
    return null
  }

  getMeasures () {
    return Object.fromEntries(this.measures)
  }

  clear () {
    this.marks.clear()
    this.measures.clear()
    logger.debug('[Tracer] Cleared all marks and measures')
  }

  // Helper method to measure a function execution
  async measureFunction (name, fn) {
    const startTime = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - startTime
      this.measures.set(name, duration)
      logger.info(`📊 [Tracer] Function ${name} completed in ${duration}ms`)
      return result
    } catch (err) {
      const duration = Date.now() - startTime
      logger.error(`❌ [Tracer] Function ${name} failed after ${duration}ms: ${err.message}`)
      throw err
    }
  }
}

module.exports = PerformanceTracer
