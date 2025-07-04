# Financial Advisor Bot

A WhatsApp chatbot that provides financial advisory services using OpenAI's GPT-4, with modular storage architecture for chat history persistence.

## Features

- **WhatsApp Integration**: Seamless messaging via Twilio
- **AI-Powered Responses**: Contextual financial advice using OpenAI GPT-4
- **Chat History**: Persistent conversation memory with modular storage
- **Multi-Provider Storage**: Support for Redis and In-Memory storage
- **Error Resilience**: Graceful handling of storage failures
- **Scalable Architecture**: Clean separation of concerns with dependency injection

## Architecture

### Storage Abstraction Layer

The application uses a **Storage Provider Pattern** that abstracts database operations, making it easy to switch between different storage solutions:

```
Controller → ChatHistoryService → StorageProvider → Database
```

#### Available Storage Providers

1. **Redis** (Default): Fast, in-memory storage with persistence
2. **In-Memory**: Lightweight storage for development/testing

### Core Components

- **`ChatHistoryService`**: Manages conversation history operations
- **`StorageFactory`**: Creates appropriate storage provider instances
- **`StorageProvider`**: Abstract interface for storage operations
- **`WhatsAppController`**: Handles incoming messages (storage-agnostic)

## Configuration

### Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# Storage Configuration
STORAGE_TYPE=redis  # Options: redis, memory
REDIS_URL=redis://default:password@host:port

# App Configuration
PORT=3000
NODE_ENV=development
```

### Storage Provider Setup

#### Redis (Recommended for Production)
```env
STORAGE_TYPE=redis
REDIS_URL=redis://default:password@host:port
```

#### In-Memory (Development/Testing)
```env
STORAGE_TYPE=memory
```

## Installation

```bash
npm install
```

## Usage

### Development
```bash
npm start
```

### Production
```bash
NODE_ENV=production npm start
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npx jest tests/chatHistoryService.test.js
```

## Adding New Storage Providers

The architecture makes it easy to add new storage providers:

1. **Create Provider Class**:
```javascript
// services/storage/myCustomStorageProvider.js
class MyCustomStorageProvider {
  async get(key) { /* implementation */ }
  async set(key, value, options) { /* implementation */ }
  async disconnect() { /* implementation */ }
  isConnected() { /* implementation */ }
}
```

2. **Add to Factory**:
```javascript
// services/storage/index.js
case 'mycustom':
  return new MyCustomStorageProvider(config);
```

3. **Configure**:
```env
STORAGE_TYPE=mycustom
```

## API Endpoints

### POST /whatsapp
Handles incoming WhatsApp webhooks from Twilio.

**Request Body:**
```json
{
  "Body": "User message",
  "From": "whatsapp:+1234567890"
}
```

**Response:**
- `200`: Message processed successfully
- `400`: Validation error
- `500`: Internal server error

## Error Handling

- **Storage Failures**: Chat continues without history persistence
- **API Failures**: Users receive friendly error messages
- **Validation Errors**: Detailed error responses for debugging

## Performance Considerations

- **History Limiting**: Maximum 20 message pairs per user
- **Automatic Cleanup**: 24-hour expiration for Redis entries
- **Graceful Degradation**: Service continues even if storage is unavailable

## Security

- Environment variables for sensitive configuration
- Input validation on all endpoints
- Error messages don't expose internal details
- Secure Redis connections

## Contributing

1. Follow the existing architecture patterns
2. Add tests for new features
3. Update documentation for API changes
4. Use the storage abstraction for any persistence needs

## License

MIT License - see LICENSE file for details. 