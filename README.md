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

## Secure Redis Connection (TLS/SSL)

This project supports secure connections to Redis using TLS/SSL. To enable a secure connection, use a `rediss://` URL in your `.env` file and optionally provide CA, cert, and key files if required by your Redis provider.

### Example `.env` settings for secure Redis:

```
REDIS_URL=rediss://your-redis-host:port
# Optional for custom CA/cert/key:
REDIS_TLS_CA=./path/to/ca.pem
REDIS_TLS_CERT=./path/to/client-cert.pem
REDIS_TLS_KEY=./path/to/client-key.pem
# Allow self-signed certs (not recommended for production):
REDIS_TLS_REJECT_UNAUTHORIZED=false
```

- If your Redis provider (e.g., Redis Cloud, AWS ElastiCache, Upstash) provides a `rediss://` URL, just set `REDIS_URL` accordingly.
- If you need to provide a custom CA, client certificate, or key, set the corresponding environment variables to the file paths.
- By default, the client will reject unauthorized/self-signed certificates. Set `REDIS_TLS_REJECT_UNAUTHORIZED=false` only for development/testing.

**Logs will indicate whether a secure Redis connection is being used.**

## Deployment & CI/CD

This project includes a complete CI/CD pipeline with Docker containerization and GitHub Actions automation.

### 🐳 Docker Deployment

#### Local Development with Docker Compose

```bash
# Start the entire stack (app + Redis)
npm run docker:compose

# View logs
npm run docker:compose:logs

# Stop the stack
npm run docker:compose:down
```

#### Production Docker Build

```bash
# Build the Docker image
npm run docker:build

# Run the container
npm run docker:run
```

### 🔄 CI/CD Pipeline

The project uses GitHub Actions for automated testing, building, and deployment:

1. **Test & Lint**: Runs on every push and PR
   - Unit tests with Jest
   - ESLint code quality checks
   - Security audits with npm audit

2. **Build & Push**: Creates Docker images on main branch
   - Multi-stage Docker build
   - Pushes to GitHub Container Registry
   - Includes proper tagging and caching

3. **Deploy**: Automatic deployment to staging/production
   - Staging: Deploys on main branch pushes
   - Production: Manual approval required

### 🔐 Environment Configuration

#### Development
```bash
# Copy development config
cp env.development .env

# Edit with your local settings
nano .env
```

#### Production
Set these GitHub Secrets in your repository:

**Required Secrets:**
- `OPENAI_API_KEY`: Your OpenAI API key
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
- `REDIS_URL`: Your production Redis URL (use `rediss://` for secure connections)

**Optional Secrets (for secure Redis):**
- `REDIS_TLS_CA`: Path to CA certificate file
- `REDIS_TLS_CERT`: Path to client certificate file
- `REDIS_TLS_KEY`: Path to client key file
- `REDIS_TLS_REJECT_UNAUTHORIZED`: Set to "false" for self-signed certs

### 🚀 Deployment Options

#### Option 1: Docker Compose (Recommended for VPS)
```bash
# On your server
git clone <your-repo>
cd Financial-Advisor-Bot
cp env.production .env
# Edit .env with production values
docker-compose -f docker-compose.prod.yml up -d
```

#### Option 2: Kubernetes
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/
```

#### Option 3: Cloud Platforms
- **Heroku**: Use the included `Procfile`
- **AWS ECS**: Use the Docker image from GitHub Container Registry
- **Google Cloud Run**: Deploy the container directly
- **DigitalOcean App Platform**: Connect your GitHub repo

### 📊 Monitoring & Health Checks

The application includes built-in health checks:

```bash
# Check application health
curl http://localhost:3000/health

# Docker health check
docker inspect <container-id> | grep Health -A 10
```

### 🔧 Development Commands

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Security audit
npm run security:audit

# Fix security issues
npm run security:fix

# Development with hot reload
npm run dev

# Production start
npm start
```

### 🛡️ Security Best Practices

1. **Environment Variables**: Never commit secrets to the repository
2. **Docker Security**: Runs as non-root user
3. **TLS/SSL**: Use secure Redis connections in production
4. **Dependency Scanning**: Automated security audits in CI/CD
5. **Health Checks**: Built-in monitoring for container health

### 📝 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment (development/production) | Yes | `development` |
| `PORT` | Application port | No | `3000` |
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Yes | - |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Yes | - |
| `REDIS_URL` | Redis connection URL | Yes | - |
| `STORAGE_TYPE` | Storage provider type | No | `redis` |
| `LOG_LEVEL` | Logging level | No | `info` |

## License

MIT License - see LICENSE file for details. 