const express = require('express');
const { body } = require('express-validator');
const whatsappController = require('../controllers/whatsappController');

const router = express.Router();

router.post(
  '/whatsapp',
  [
    body('Body').isString().notEmpty().withMessage('Message body is required'),
    body('From').isString().notEmpty().withMessage('Sender is required'),
  ],
  whatsappController.handleWebhook
);

module.exports = router; 