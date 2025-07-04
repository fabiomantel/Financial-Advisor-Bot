const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config/config');
const whatsappRouter = require('./routes/whatsapp');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/', whatsappRouter);

// Centralized error handler (should be last)
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});