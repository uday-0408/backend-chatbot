# Backend Chatbot API

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Socket Events](#socket-events)
- [Code Flow](#code-flow)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)

## 🎯 Project Overview

This is a real-time chat backend service built with Node.js, Express, and Socket.IO. It provides RESTful APIs and WebSocket communication for a chatbot application that supports both user-admin conversations and automated responses.

### Key Features

- **Real-time messaging** via Socket.IO
- **PostgreSQL database** with Prisma ORM
- **Session management** for users
- **Admin panel support** with live session monitoring
- **Persistent chat history**
- **Auto-generated session IDs**
- **CORS enabled** for cross-origin requests

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │◄──►│   Backend API    │◄──►│   PostgreSQL    │
│   (React)       │    │   (Express.js)   │    │   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │
        │              ┌─────────────────┐
        └──────────────►│  Socket.IO      │
                       │  (Real-time)    │
                       └─────────────────┘
```

### Component Architecture

```
Backend Service
├── HTTP API Layer (Express.js)
├── WebSocket Layer (Socket.IO)
├── Service Layer (Business Logic)
├── Data Access Layer (Prisma ORM)
└── Database Layer (PostgreSQL)
```

## 🛠️ Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express.js** | ^4.19.2 | Web framework |
| **Socket.IO** | ^4.8.1 | Real-time communication |
| **PostgreSQL** | 14+ | Primary database |
| **Prisma** | ^6.1.0 | Database ORM |
| **CORS** | ^2.8.5 | Cross-origin resource sharing |
| **dotenv** | ^17.2.3 | Environment configuration |

## 📁 Project Structure

```
backend-chatbot/
│
├── src/                          # Source code
│   ├── app.js                   # Express app configuration
│   ├── server.js                # Main server entry point
│   │
│   ├── config/                  # Configuration files
│   │   └── prisma.js           # Prisma client setup
│   │
│   ├── controllers/             # Request handlers
│   │   └── chatController.js   # Chat-related endpoints
│   │
│   ├── routes/                  # API route definitions
│   │   └── chatRoutes.js       # Chat API routes
│   │
│   ├── services/               # Business logic layer
│   │   └── chatService.js      # Chat operations
│   │
│   ├── sockets/                # Socket.IO handlers
│   │   └── chatSocket.js       # Real-time chat logic
│   │
│   └── utils/                  # Utility functions
│       └── generateSessionId.js # Session ID generator
│
├── prisma/                     # Database configuration
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
│
├── package.json               # Node.js dependencies
├── prisma.config.ts          # Prisma configuration
├── test-socket.js            # Socket testing script
└── README.md                 # This file
```

## 🗄️ Database Schema

### Tables

#### `ChatSession`
```sql
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
```

#### `Message`
```sql
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "sender" TEXT NOT NULL, -- 'user' or 'admin'
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

### Relationships
- One `ChatSession` can have many `Messages`
- Each `Message` belongs to one `ChatSession`
- Foreign key constraint ensures data integrity

## 🛤️ API Endpoints

### Chat Routes (`/api/chat`)

#### `POST /api/chat/session`
Create or retrieve a chat session.

**Request Body:**
```json
{
  "userAgent": "Mozilla/5.0...",
  "ipAddress": "192.168.1.1"
}
```

**Response:**
```json
{
  "sessionId": "sess_1234567890abcdef",
  "session": {
    "id": "sess_1234567890abcdef",
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1",
    "createdAt": "2025-12-14T10:30:00.000Z",
    "updatedAt": "2025-12-14T10:30:00.000Z"
  }
}
```

#### `POST /api/chat/message`
Send a message to the chat session.

**Request Body:**
```json
{
  "sessionId": "sess_1234567890abcdef",
  "content": "Hello, I need help!",
  "sender": "user"
}
```

**Response:**
```json
{
  "id": 1,
  "content": "Hello, I need help!",
  "sender": "user",
  "timestamp": "2025-12-14T10:30:00.000Z",
  "sessionId": "sess_1234567890abcdef"
}
```

#### `GET /api/chat/messages/:sessionId`
Retrieve all messages for a session.

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "content": "Hello, I need help!",
      "sender": "user",
      "timestamp": "2025-12-14T10:30:00.000Z",
      "sessionId": "sess_1234567890abcdef"
    }
  ]
}
```

## 🔌 Socket Events

### Client to Server Events

#### `init_session`
Initialize a new chat session.
```javascript
socket.emit('init_session', { sessionId: 'optional' }, (response) => {
  console.log('Session initialized:', response.sessionId);
});
```

#### `user_message`
Send a message from user.
```javascript
socket.emit('user_message', {
  sessionId: 'sess_123',
  content: 'Hello!'
});
```

#### `admin_message`
Send a message from admin.
```javascript
socket.emit('admin_message', {
  sessionId: 'sess_123',
  content: 'How can I help you?'
});
```

#### `admin-connect`
Register as admin connection.
```javascript
socket.emit('admin-connect');
```

#### `get-sessions`
Request list of active sessions (admin only).
```javascript
socket.emit('get-sessions');
```

#### `get-messages`
Request messages for a session (admin only).
```javascript
socket.emit('get-messages', { sessionId: 'sess_123' });
```

### Server to Client Events

#### `session_init`
Session initialization response.
```javascript
socket.on('session_init', (data) => {
  console.log('Session ID:', data.sessionId);
});
```

#### `message`
New message received.
```javascript
socket.on('message', (message) => {
  console.log('New message:', message);
});
```

#### `sessions-list`
List of active sessions (admin only).
```javascript
socket.on('sessions-list', (sessions) => {
  console.log('Active sessions:', sessions);
});
```

#### `new-message`
Notify admin about new user message.
```javascript
socket.on('new-message', (data) => {
  console.log('New user message:', data);
});
```

#### `messages-history`
Message history for a session.
```javascript
socket.on('messages-history', (messages) => {
  console.log('Message history:', messages);
});
```

## 🔄 Code Flow

### User Message Flow

1. **Frontend** sends message via Socket.IO
2. **Socket Handler** (`chatSocket.js`) receives `user_message` event
3. **Service Layer** (`chatService.js`) saves message to database
4. **Socket Handler** emits message to user session room
5. **Socket Handler** notifies all connected admins
6. **Database** stores message with timestamp

```javascript
// Flow Diagram
User Frontend → Socket.IO → chatSocket.js → chatService.js → Database
                    ↓
Admin Frontend ← Socket.IO ← Notification
```

### Admin Message Flow

1. **Admin Frontend** sends message via Socket.IO
2. **Socket Handler** receives `admin_message` event
3. **Service Layer** saves message to database
4. **Socket Handler** emits message to specific user session
5. **Socket Handler** updates session information for all admins

### Session Management Flow

1. **User** connects to frontend
2. **Frontend** generates/retrieves session ID
3. **Socket** joins user to session room
4. **Session** tracked in `activeSessions` Map
5. **Admin** can see session in dashboard
6. **Session** persists until user disconnects

## ⚙️ Setup Instructions

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- npm or yarn package manager

### Installation

1. **Clone and navigate to backend directory:**
```bash
cd backend-chatbot
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Configure database:**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) View database in browser
npx prisma studio
```

5. **Start the server:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Database Setup

1. **Create PostgreSQL database:**
```sql
CREATE DATABASE chatdb;
CREATE USER chatuser WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE chatdb TO chatuser;
```

2. **Update DATABASE_URL in .env:**
```bash
DATABASE_URL="postgresql://chatuser:your_password@localhost:5432/chatdb"
```

## 🌍 Environment Variables

Create a `.env` file in the root directory:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Server Configuration
PORT=4000
NODE_ENV=development

# CORS Configuration (optional)
CORS_ORIGIN="http://localhost:5173"
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `PORT` | Server port (optional, defaults to 4000) | `4000` |

## 🧪 Testing

### Manual Testing

1. **Test Socket Connection:**
```bash
node test-socket.js
```

2. **Test API Endpoints:**
```bash
# Create session
curl -X POST http://localhost:4000/api/chat/session \
  -H "Content-Type: application/json" \
  -d '{"userAgent": "test", "ipAddress": "127.0.0.1"}'

# Send message
curl -X POST http://localhost:4000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "your_session_id", "content": "test message", "sender": "user"}'
```

### Socket.IO Testing

Use the provided test script:
```javascript
// test-socket.js
const io = require('socket.io-client');
const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Test session initialization
  socket.emit('init_session', {}, (response) => {
    console.log('Session created:', response.sessionId);
    
    // Test sending message
    socket.emit('user_message', {
      sessionId: response.sessionId,
      content: 'Hello from test!'
    });
  });
});
```

## 🚀 Deployment

### Docker Deployment

1. **Create Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

2. **Create docker-compose.yml:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/chatdb
    depends_on:
      - db
  
  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: chatdb
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Production Considerations

1. **Environment Variables:**
   - Use production database credentials
   - Set NODE_ENV=production
   - Configure proper CORS origins

2. **Security:**
   - Enable HTTPS
   - Implement rate limiting
   - Add authentication for admin endpoints

3. **Monitoring:**
   - Add logging with Winston
   - Implement health check endpoints
   - Monitor database performance

4. **Scaling:**
   - Use Redis adapter for Socket.IO in multi-instance setup
   - Implement database connection pooling
   - Add load balancing

## 📝 Additional Notes

### File Descriptions

- **`server.js`**: Main entry point, starts HTTP server and Socket.IO
- **`app.js`**: Express application configuration, middleware setup
- **`chatSocket.js`**: WebSocket event handlers for real-time communication
- **`chatService.js`**: Database operations and business logic
- **`chatController.js`**: HTTP request handlers for REST API
- **`generateSessionId.js`**: Utility for creating unique session identifiers

### Session Management

Sessions are managed in memory using a Map structure for quick access. Each session contains:
- Session ID
- User identifier
- Last message preview
- Timestamp
- Online status

### Error Handling

The application includes comprehensive error handling:
- Database connection errors
- Socket connection errors
- Validation errors for requests
- Graceful fallbacks for failed operations

### Performance Considerations

- Database queries are optimized with proper indexing
- Socket.IO rooms are used for efficient message delivery
- Connection pooling is implemented via Prisma
- Memory usage is monitored for active sessions

---

**Last Updated**: December 14, 2025  
**Version**: 1.0.0  
**Maintainer**: Development Team