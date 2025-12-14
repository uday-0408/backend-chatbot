# Backend Chatbot API - Real-time Chat System

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Recent Changes & Bug Fixes](#recent-changes--bug-fixes)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Core Logic Explained](#core-logic-explained)
- [Database Session Management](#database-session-management)
- [Socket.IO Flow](#socketio-flow)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Socket Events](#socket-events)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Project Overview

This is a real-time chat backend service built with Node.js, Express, and Socket.IO. It provides RESTful APIs and WebSocket communication for a chatbot application that supports both user-admin conversations with persistent message storage.

### Key Features

- **Real-time messaging** via Socket.IO with room-based communication
- **PostgreSQL database** with Prisma ORM for reliable data persistence
- **Smart session management** with automatic database session creation
- **Admin panel support** with live session monitoring and message history
- **Persistent chat history** with proper message threading
- **Auto-generated session IDs** using UUID for unique identification
- **CORS enabled** for cross-origin requests
- **Error handling** with automatic session recovery

## � ChatGPT Debugging Guide

### API Key Verification
1. **Check logs on startup** for API key details:
```
[chatGPTService.js - constructor] 🔑 FULL API KEY VALUE: sk-proj-...
[chatGPTService.js - constructor] 🔑 API Key length: 164
```

2. **Monitor request/response logs**:
```
[chatGPTService.js - generateResponse] 📦 Request data: {...}
[chatGPTService.js - generateResponse] 📄 Response data: {...}
```

### Common Issues & Solutions

**1. 429 Quota Exceeded Error**
- **Cause**: API key has no remaining credits
- **Solution**: Switch to backup API key in `.env`
- **Check**: OpenAI dashboard for usage/billing

**2. Invalid Response Format**
- **Cause**: Wrong API endpoint or request structure
- **Solution**: Ensure using `/v1/responses` with `{model, input}` format

**3. Network/Timeout Issues**
- **Cause**: Slow API response or network problems
- **Solution**: Check axios timeout settings and network connectivity

### Testing ChatGPT Integration

**Quick Test Script** (`temp.js`):
```javascript
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testChatGPT() {
  const response = await axios.post(
    "https://api.openai.com/v1/responses",
    {
      model: "gpt-4.1-mini",
      input: "Say hello in one short sentence"
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  console.log(response.data.output[0].content[0].text);
}

testChatGPT();
```

## �🔧 Recent Changes & Bug Fixes

### ChatGPT Integration Overhaul (December 14, 2025)

**Major Problem Solved:** ChatGPT API integration was failing with 429 quota errors and incorrect API format

#### Issues Identified & Fixed

**1. API Key Quota Exhaustion**
- **Problem**: Primary API key had exceeded OpenAI usage quota
- **Solution**: Implemented dual API key support in `.env` file
- **Current Setup**: Two API keys available for failover

**2. Complete Service Rewrite with Axios**
- **Problem**: Used Node.js `https` module with complex error handling
- **Solution**: Migrated to `axios` for cleaner, more reliable HTTP requests
- **Benefits**: Better error handling, cleaner code, easier debugging

**3. API Endpoint Format Correction**
- **Problem**: Used incorrect OpenAI endpoint `/v1/chat/completions`
- **Solution**: Switched to working endpoint `/v1/responses` with correct format
- **Working Format**:
```javascript
// Request format that actually works
{
  "model": "gpt-4.1-mini",
  "input": "user message here"
}

// Response parsing
response.data.output[0].content[0].text
```

**4. Enhanced Debugging & Logging**
- **Added**: Comprehensive logging with file/function names
- **Added**: Full API key visibility for debugging
- **Added**: Request/response data logging
- **Format**: `[filename - functionName] message`

#### Current ChatGPT Service Implementation

**File**: `src/services/chatGPTService.js`

```javascript
import axios from 'axios';

class ChatGPTService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/responses';
    // Comprehensive logging for debugging
  }

  async generateResponse(userMessage, conversationHistory = [], sessionId = null) {
    const requestData = {
      model: 'gpt-4.1-mini',
      input: userMessage  // Simplified format that works
    };

    const response = await axios.post(this.apiUrl, requestData, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.output[0].content[0].text.trim();
  }
}
```

### Critical Database Session Fix (December 14, 2024)

**Problem Solved:** "Chat session not found" error when admins tried to send messages

#### The Issue
When users connected with existing session IDs (stored in browser localStorage), the system was:
1. ✅ Creating sessions in memory (`activeSessions` Map)
2. ❌ NOT creating corresponding database records
3. ❌ When admins sent messages, `saveMessage()` couldn't find the session in database

#### The Solution Applied

**1. Enhanced `saveMessage()` Function** (`src/services/chatService.js`)
```javascript
export async function saveMessage(sessionId, sender, content, isAI = false) {
  // Find existing session or create new one
  let session = await prisma.chatSession.findUnique({
    where: { sessionId }
  });

  if (!session) {
    console.log(`Session ${sessionId} not found in database, creating new one`);
    session = await prisma.chatSession.create({
      data: { 
        sessionId,
        ip: 'unknown',
        userAgent: 'unknown'
      }
    });
  }
  // ... rest of the function
}
```

**Why this works:** Instead of throwing an error when a session doesn't exist, we now automatically create it in the database. This handles cases where users have session IDs but the database record was lost or never created.

**2. Added `getSession()` Helper Function**
```javascript
export async function getSession(sessionId) {
  return prisma.chatSession.findUnique({
    where: { sessionId }
  });
}
```

**Why this helps:** Provides a simple way to check if a session exists in the database without creating it.

**3. Enhanced Session Initialization** (`src/sockets/chatSocket.js`)
```javascript
socket.on("init_session", async ({ sessionId }, callback) => {
  // ... existing code ...
  
  if (!sessionId) {
    // Create new session in database
    sessionId = await createChatSession(ip, userAgent);
  } else {
    // Verify existing session exists in database
    try {
      const existingSession = await getSession(sessionId);
      if (!existingSession) {
        console.log("Session not found in database, creating it");
        await createChatSession('unknown', 'unknown');
      }
    } catch (error) {
      console.log("Session verification failed, will be created when first message is sent");
    }
  }
  // ... rest of the function
}
```

**Why this prevents issues:** Ensures that both memory and database stay synchronized from the beginning.

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │◄──►│   Backend API    │◄──►│   PostgreSQL    │
│   (React)       │    │   (Express.js)   │    │   Database      │
│   Chat Widget   │    │   Socket.IO      │    │   (Prisma ORM)  │
│   Admin Panel   │    │   Session Mgmt   │    │   Sessions      │
└─────────────────┘    └──────────────────┘    │   Messages      │
        │                       │               └─────────────────┘
        │              ┌─────────────────┐               │
        └──────────────►│  Socket.IO      │◄──────────────┘
                       │  Real-time      │
                       │  Rooms & Events │
                       └─────────────────┘
```

### Data Flow Architecture

```
User Types Message
        │
        ▼
┌─────────────────┐    socket.emit()    ┌─────────────────┐
│   ChatWindow    │───────────────────►│   chatSocket    │
│   (Frontend)    │                    │   (Backend)     │
└─────────────────┘                    └─────────────────┘
        │                                       │
        │ Show message immediately              │ saveMessage()
        ▼                                       ▼
┌─────────────────┐                    ┌─────────────────┐
│   Update UI     │                    │   Database      │
│   (Optimistic)  │                    │   (Persistent)  │
└─────────────────┘                    └─────────────────┘
                                               │
                                               │ Notify admins
                                               ▼
                                      ┌─────────────────┐
                                      │   Admin Panel   │
                                      │   (Real-time)   │
                                      └─────────────────┘
```

## 🧠 Core Logic Explained

### 1. Session Management Flow

**Step 1: User Opens Chat Widget**
```javascript
// Frontend generates or retrieves session ID
const sessionId = localStorage.getItem('chatSessionId') || generateUniqueId();
localStorage.setItem('chatSessionId', sessionId);

// Connect to backend with session ID
socket.emit('init_session', { sessionId });
```

**Step 2: Backend Handles Session**
```javascript
socket.on("init_session", async ({ sessionId }, callback) => {
  if (!sessionId) {
    // New user - create fresh session in database
    sessionId = await createChatSession(ip, userAgent);
  } else {
    // Existing user - ensure session exists in database
    const existingSession = await getSession(sessionId);
    if (!existingSession) {
      await createChatSession('unknown', 'unknown');
    }
  }
  
  // Add to memory for real-time tracking
  socket.join(sessionId); // Socket.IO room
  activeSessions.set(sessionId, sessionData); // Memory cache
});
```

**Why this matters:** This dual-layer approach (database + memory) ensures data persistence while maintaining real-time performance.

### 2. Message Delivery Logic

**User Message Flow:**
```javascript
// 1. User types message in frontend
const sendMessage = (message) => {
  // Show immediately in UI (optimistic update)
  setMessages(prev => [...prev, userMessage]);
  
  // Send to server for persistence and admin notification
  socket.emit('user_message', { sessionId, content: message });
};

// 2. Backend receives and processes
socket.on("user_message", async ({ sessionId, content }) => {
  // Save to database
  const msg = await saveMessage(sessionId, "user", content);
  
  // Don't echo back to sender (already shown in UI)
  // Only notify admins
  socket.to(sessionId).emit("message", formattedMessage);
  
  // Update admin dashboard
  adminSockets.forEach(adminSocket => {
    adminSocket.emit("new-message", { sessionId, message: content });
  });
});
```

**Admin Message Flow:**
```javascript
// 1. Admin types reply in dashboard
socket.emit('admin_message', { sessionId, content: reply });

// 2. Backend processes admin message
socket.on("admin_message", async ({ sessionId, content }) => {
  // Save to database
  const msg = await saveMessage(sessionId, "admin", content);
  
  // Send to user in that session room
  io.to(sessionId).emit("message", formattedMessage);
});

// 3. User receives real-time message
socket.on("message", (message) => {
  if (message.sender === 'admin') {
    setMessages(prev => [...prev, message]);
  }
});
```

**Key Insight:** Users see their own messages immediately (optimistic UI), while admin messages come through Socket.IO for real-time delivery.

### 3. Database Session Management

The system uses a two-layer session approach:

**Layer 1: Memory Cache (`activeSessions` Map)**
```javascript
const activeSessions = new Map();

// Fast access for real-time features
activeSessions.set(sessionId, {
  sessionId,
  user: `User-${sessionId.substring(0, 8)}`,
  lastMessage: content,
  timestamp: new Date().toLocaleTimeString(),
  isActive: true
});
```

**Layer 2: Database Persistence (PostgreSQL + Prisma)**
```javascript
// Permanent storage for message history
const session = await prisma.chatSession.create({
  data: { sessionId, ip, userAgent }
});

const message = await prisma.message.create({
  data: {
    chatSessionId: session.id,
    sender,
    content,
    isAI
  }
});
```

**Why both layers?**
- **Memory:** Ultra-fast access for real-time admin dashboard updates
- **Database:** Permanent storage, conversation history, crash recovery

### 4. Socket.IO Room Management

**Concept:** Each chat session is a Socket.IO "room"

```javascript
// User joins their session room
socket.join(sessionId);

// Admin can join specific session rooms to monitor
socket.join(`admin-${sessionId}`);

// Send message to all users in a room
io.to(sessionId).emit("message", data);

// Send to everyone in room except sender
socket.to(sessionId).emit("message", data);
```

**Benefits:**
- **Isolated Communication:** Messages only go to relevant users
- **Scalable:** Supports thousands of concurrent sessions
- **Efficient:** No need to track individual socket IDs
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

## ⚙️ Environment Variables

### Backend Environment Setup

Create a `.env` file in the backend root directory:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Server Configuration
PORT=4000

# OpenAI ChatGPT Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Backup API Key (commented out - quota exceeded)
# OPENAI_API_KEY=your_backup_api_key_here

# Development Settings
NODE_ENV=development
```

### Required Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/chatdb` |
| `PORT` | ✅ | Server port number | `4000` |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for ChatGPT | `sk-proj-...` |
| `NODE_ENV` | ❌ | Environment mode | `development` |

### ChatGPT API Key Management

**Current Working Configuration:**
```env
# Primary key (working)
OPENAI_API_KEY=your_openai_api_key_here

# Backup key (quota exceeded)
# OPENAI_API_KEY=your_backup_api_key_here
```

**Key Switching:**
1. **If quota exceeded**: Comment out current key, uncomment backup
2. **Check usage**: Monitor at platform.openai.com
3. **Test first**: Use provided test script before switching

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