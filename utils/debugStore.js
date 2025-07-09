// DebugStore: In-memory debug info for dashboard (dev only)
class DebugStore {
  constructor () {
    this.entries = []
    this.maxEntries = 100 // Keep only the latest 100 for memory safety
  }

  add (entry) {
    if (process.env.NODE_ENV !== 'development') return;
    this.entries.push({ ...entry, timestamp: new Date().toISOString() })
    if (this.entries.length > this.maxEntries) {
      this.entries.shift()
    }
  }

  getAll () {
    return this.entries
  }

  clear () {
    this.entries = []
  }
}

const debugStore = new DebugStore()
module.exports = debugStore
