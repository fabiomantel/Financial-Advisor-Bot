const logger = require('./utils/logger');
const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config/config')
const whatsappRouter = require('./routes/whatsapp')
const errorHandler = require('./middlewares/errorHandler')
const debugStore = require('./utils/debugStore')
const path = require('path')

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use('/', whatsappRouter)

if (process.env.NODE_ENV === 'development') {
  // Serve static dashboard
  app.use('/debug-dashboard', express.static(path.join(__dirname, 'debug-dashboard.html')))
  // Serve debug data as JS
  app.get('/debug-data.js', (req, res) => {
    res.type('application/javascript')
    res.send('window.DEBUG_DATA = ' + JSON.stringify(debugStore.getAll()) + ';')
  })
}

// Centralized error handler (should be last)
app.use(errorHandler)

app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`)
})
