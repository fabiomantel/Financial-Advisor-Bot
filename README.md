# Financial Advisor Bot

A professional, extensible Node.js bot for WhatsApp, powered by OpenAI. Designed for financial advisory, but easily adaptable for any conversational automation use case.

---

## Features

- **WhatsApp Integration**: Seamlessly receive and send messages via Twilio WhatsApp API.
- **OpenAI GPT Integration**: Generate intelligent, context-aware responses using OpenAI's GPT models.
- **Robust Message Splitting**: Automatically splits long replies into multiple messages, respecting WhatsApp's 1600 character limit, with support for multi-language and emojis.
- **Structured Logging**: Professional logging of all incoming/outgoing messages and errors using Winston.
- **Validation & Error Handling**: Input validation and centralized error handling for reliability.
- **Test Coverage**: Includes unit and integration tests for core logic and message flow.

---

## Architecture

- **Express.js**: REST API server
- **Controllers**: Handle business logic for each route
- **Services**: Integrate with external APIs (Twilio, OpenAI)
- **Middlewares**: Centralized error handling and logging
- **Utils**: Reusable utilities (e.g., logger)
- **Tests**: Jest and Supertest for robust testing

```
project/
  config/           # Configuration files
  controllers/      # Route logic (e.g., WhatsApp)
  middlewares/      # Error handling, logging
  routes/           # Express route definitions
  services/         # Twilio, OpenAI integrations
  utils/            # Logger, helpers
  tests/            # Unit and integration tests
  index.js          # App entry point
```

---

## Setup

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**
   - Copy `.env.example` to `.env` and fill in your Twilio and OpenAI credentials.
4. **Run the server**
   ```bash
   node index.js
   ```
5. **Run tests**
   ```bash
   npm test
   ```

---

## Usage

- Send a WhatsApp message to your Twilio number.
- The bot will instantly reply with an acknowledgment, then follow up with an AI-generated answer.
- All message flows and errors are logged for transparency and debugging.

---

## Customization

- **Change the system prompt** in `config/config.js` to adapt the bot's persona.
- **Add new routes/controllers** for more channels or features.
- **Extend services** to integrate with other APIs.

---

## License

MIT 