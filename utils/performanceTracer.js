const logger = require('./logger')

class PerformanceTracer {
  constructor() {
    this.metrics = new Map()
    this.startTimes = new Map()
    logger.info('PerformanceTracer initialized')
  }

  start(operation, metadata = {}) {
    const id = `${operation}-${Date.now()}-${Math.random()}`
    this.startTimes.set(id, {
      startTime: Date.now(),
      operation,
      metadata
    })
    return id
  }

  end(id) {
    const startData = this.startTimes.get(id)
    if (!startData) {
      logger.warn(`PerformanceTracer: No start data found for id: ${id}`)
      return
    }

    const duration = Date.now() - startData.startTime
    this.record(startData.operation, duration, startData.metadata)
    this.startTimes.delete(id)
  }

  record(operation, duration, metadata = {}) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0,
        errors: 0
      })
    }

    const metric = this.metrics.get(operation)
    metric.count++
    metric.totalDuration += duration
    metric.minDuration = Math.min(metric.minDuration, duration)
    metric.maxDuration = Math.max(metric.maxDuration, duration)
    metric.avgDuration = metric.totalDuration / metric.count

    // Log performance data
    const level = duration > 5000 ? 'warn' : duration > 2000 ? 'info' : 'debug'
    logger[level](`📊 [Tracer] ${operation}: ${duration}ms`, metadata)

    return metric
  }

  recordError(operation, error, metadata = {}) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0,
        errors: 0
      })
    }

    const metric = this.metrics.get(operation)
    metric.errors++

    logger.error(`❌ [Tracer] ${operation} error: ${error.message}`, metadata)
  }

  getStats() {
    const stats = {}
    
    for (const [operation, metric] of this.metrics.entries()) {
      stats[operation] = {
        count: metric.count,
        errors: metric.errors,
        successRate: metric.count > 0 ? ((metric.count - metric.errors) / metric.count * 100).toFixed(2) : 0,
        avgDuration: Math.round(metric.avgDuration),
        minDuration: metric.minDuration === Infinity ? 0 : metric.minDuration,
        maxDuration: metric.maxDuration,
        totalDuration: metric.totalDuration
      }
    }

    return stats
  }

  getOperationStats(operation) {
    const metric = this.metrics.get(operation)
    if (!metric) {
      return null
    }

    return {
      count: metric.count,
      errors: metric.errors,
      successRate: metric.count > 0 ? ((metric.count - metric.errors) / metric.count * 100).toFixed(2) : 0,
      avgDuration: Math.round(metric.avgDuration),
      minDuration: metric.minDuration === Infinity ? 0 : metric.minDuration,
      maxDuration: metric.maxDuration,
      totalDuration: metric.totalDuration
    }
  }

  clear() {
    this.metrics.clear()
    this.startTimes.clear()
    logger.info('PerformanceTracer cleared')
  }

  // Convenience methods for common operations
  async trace(operation, fn, metadata = {}) {
    const id = this.start(operation, metadata)
    
    try {
      const result = await fn()
      this.end(id)
      return result
    } catch (error) {
      this.recordError(operation, error, metadata)
      throw error
    }
  }

  traceSync(operation, fn, metadata = {}) {
    const id = this.start(operation, metadata)
    
    try {
      const result = fn()
      this.end(id)
      return result
    } catch (error) {
      this.recordError(operation, error, metadata)
      throw error
    }
  }
}

module.exports = PerformanceTracer 