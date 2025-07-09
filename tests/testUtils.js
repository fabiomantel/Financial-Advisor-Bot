// Shared test utility for safe timers
function safeSetTimeout (cb, ms) {
  const t = setTimeout(cb, ms)
  if (typeof t.unref === 'function') t.unref()
  return t
}

module.exports = { safeSetTimeout }
