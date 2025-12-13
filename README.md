# Backend Chatbot

A real-time chat backend application built with Node.js, Express, Socket.IO, and PostgreSQL. This application provides a robust backend infrastructure for managing chat sessions and real-time messaging between users and administrators.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [WebSocket Events](#websocket-events)
- [Setup and Installation](#setup-and-installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Usage](#usage)
- [Code Logic Explanation](#code-logic-explanation)
- [Testing](#testing)

## Overview

This backend chatbot application is designed to handle real-time bidirectional communication between clients (users) and administrators. The system creates unique chat sessions for each user, stores all messages in a PostgreSQL database, and enables live communication through WebSocket connections using Socket.IO.

### Key Features

- **Real-time Communication**: Instant message delivery using WebSocket protocol
- **Session Management**: Unique session IDs for each chat conversation
- **Persistent Storage**: All messages and sessions stored in PostgreSQL database
- **RESTful API**: HTTP endpoints for retrieving chat history
- **Dual Communication**: Support for both user and admin message types
- **IP and User Agent Tracking**: Metadata collection for session analytics
- **CORS Enabled**: Cross-origin resource sharing for frontend integration

## Architecture

The application follows a **layered architecture pattern** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                   Client Layer                      │
│          (Browser/Mobile App via Socket.IO)         │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                  Server Layer                       │
│  ┌──────────────────────────────────────────────┐  │
│  │  HTTP Server (Express.js)                    │  │
│  │  - CORS Middleware                           │  │
│  │  - Body Parsing                              │  │
│  │  - Health Check                              │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  WebSocket Server (Socket.IO)                │  │
│  │  - Connection Management                     │  │
│  │  - Room-based Communication                  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Application Layer                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │   Routes     │  │   Sockets    │                │
│  │  (HTTP API)  │  │ (WebSocket)  │                │
│  └──────────────┘  └──────────────┘                │
│         │                  │                        │
│         ▼                  ▼                        │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Controllers  │  │Chat Socket    │                │
│  │              │  │Handler        │                │
│  └──────────────┘  └──────────────┘                │
│         │                  │                        │
│         └──────────┬───────┘                        │
│                    ▼                                │
│         ┌─────────────────────┐                     │
│         │   Services Layer    │                     │
│         │  (Business Logic)   │                     │
│         └─────────────────────┘                     │
│                    │                                │
│                    ▼                                │
│         ┌─────────────────────┐                     │
│         │   Data Access       │                     │
│         │   (Prisma ORM)      │                     │
│         └─────────────────────┘                     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Database Layer                         │
│              (PostgreSQL)                           │
│  - ChatSession Table                                │
│  - Message Table                                    │
└─────────────────────────────────────────────────────┘
```

### Design Patterns Used

1. **MVC Pattern**: Model-View-Controller separation (Routes, Controllers, Services/Models)
2. **Service Layer Pattern**: Business logic isolated in service modules
3. **Dependency Injection**: Prisma client injected into services
4. **Repository Pattern**: Data access abstracted through Prisma ORM

## Technology Stack

### Core Technologies

- **Node.js**: JavaScript runtime environment (ES Modules)
- **Express.js v5.2.1**: Web application framework for HTTP server
- **Socket.IO v4.8.1**: Real-time bidirectional event-based communication
- **PostgreSQL**: Relational database for data persistence
- **Prisma ORM v7.1.0**: Modern database toolkit and ORM

### Supporting Libraries

- **@prisma/adapter-pg**: PostgreSQL adapter for Prisma
- **pg v8.16.3**: PostgreSQL client for Node.js
- **cors v2.8.5**: Cross-Origin Resource Sharing middleware
- **dotenv v17.2.3**: Environment variable management
- **socket.io-client v4.8.1**: Client library for testing

### Development Tools

- **nodemon**: Auto-restart server during development
- **ES Modules**: Modern JavaScript module system

## Project Structure

```
backend-chatbot/
│
├── src/                          # Source code directory
│   ├── app.js                    # Express application configuration
│   ├── server.js                 # Server initialization and Socket.IO setup
│   │
│   ├── config/                   # Configuration files
│   │   └── prisma.js            # Prisma client initialization with PostgreSQL adapter
│   │
│   ├── routes/                   # HTTP route definitions
│   │   └── chatRoutes.js        # Chat-related API endpoints
│   │
│   ├── controllers/              # Request handlers
│   │   └── chatController.js    # Controller for chat operations
│   │
│   ├── services/                 # Business logic layer
│   │   └── chatService.js       # Chat session and message operations
│   │
│   ├── sockets/                  # WebSocket event handlers
│   │   └── chatSocket.js        # Socket.IO event handling logic
│   │
│   └── utils/                    # Utility functions
│       └── generateSessionId.js # Session ID generation utility
│
├── prisma/                       # Prisma ORM files
│   ├── schema.prisma            # Database schema definition
│   ├── migrations/              # Database migration files
│   │   └── 20251212153812_init/ # Initial migration
│   │       └── migration.sql    # SQL migration script
│   └── migration_lock.toml      # Migration lock file
│
├── test-socket.js               # Socket.IO client test script
├── prisma.config.ts             # Prisma configuration
├── package.json                 # Project dependencies and scripts
├── package-lock.json            # Dependency lock file
├── .gitignore                   # Git ignore patterns
└── README.md                    # This file
```

### File Responsibilities

#### Core Application Files

- **`src/server.js`**: Entry point that creates HTTP server and initializes Socket.IO
- **`src/app.js`**: Express app configuration with middleware and routes
- **`src/config/prisma.js`**: Prisma client setup with PostgreSQL connection pool

#### Route Layer

- **`src/routes/chatRoutes.js`**: Defines REST API endpoints for chat operations

#### Controller Layer

- **`src/controllers/chatController.js`**: Handles HTTP requests and responses

#### Service Layer

- **`src/services/chatService.js`**: Contains business logic for chat operations

#### Socket Layer

- **`src/sockets/chatSocket.js`**: Manages WebSocket connections and events

#### Utility Layer

- **`src/utils/generateSessionId.js`**: Generates unique session identifiers

## Database Schema

The application uses PostgreSQL with Prisma ORM. The schema consists of two main models:

### ChatSession Model

Represents a unique chat conversation session.

```prisma
model ChatSession {
  id         String    @id @default(cuid())
  sessionId  String    @unique
  ip         String?
  userAgent  String?
  createdAt  DateTime  @default(now())
  messages   Message[]
}
```

**Fields:**
- `id` (String): Primary key, auto-generated CUID
- `sessionId` (String): Unique session identifier (UUID v4)
- `ip` (String, optional): Client IP address
- `userAgent` (String, optional): Client user agent string
- `createdAt` (DateTime): Timestamp of session creation
- `messages` (Message[]): Related messages (one-to-many relationship)

### Message Model

Represents individual messages within a chat session.

```prisma
model Message {
  id            String      @id @default(cuid())
  sender        String
  content       String
  createdAt     DateTime    @default(now())
  isAI          Boolean     @default(false)
  chatSession   ChatSession @relation(fields: [chatSessionId], references: [id])
  chatSessionId String
}
```

**Fields:**
- `id` (String): Primary key, auto-generated CUID
- `sender` (String): Message sender type ("user" or "admin")
- `content` (String): Message text content
- `createdAt` (DateTime): Timestamp of message creation
- `isAI` (Boolean): Flag indicating if message is AI-generated (default: false)
- `chatSessionId` (String): Foreign key to ChatSession
- `chatSession` (ChatSession): Related chat session (many-to-one relationship)

### Entity Relationship Diagram

```
┌─────────────────────────┐
│     ChatSession         │
├─────────────────────────┤
│ id (PK)                 │
│ sessionId (UNIQUE)      │
│ ip                      │
│ userAgent               │
│ createdAt               │
└─────────────────────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────────┐
│       Message           │
├─────────────────────────┤
│ id (PK)                 │
│ sender                  │
│ content                 │
│ createdAt               │
│ isAI                    │
│ chatSessionId (FK)      │
└─────────────────────────┘
```

## API Documentation

### Base URL

```
http://localhost:4000/api
```

### Endpoints

#### 1. Health Check

Check if the server is running.

```http
GET /health
```

**Response:**
```json
{
  "status": "ok"
}
```

#### 2. List All Chats

Retrieve all chat sessions with their messages.

```http
GET /api/chats
```

**Response:**
```json
[
  {
    "id": "cm4abc123...",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "ip": "127.0.0.1",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2024-12-13T10:30:00.000Z",
    "messages": [
      {
        "id": "cm4xyz789...",
        "sender": "user",
        "content": "Hello!",
        "createdAt": "2024-12-13T10:30:05.000Z",
        "isAI": false,
        "chatSessionId": "cm4abc123..."
      },
      {
        "id": "cm4xyz790...",
        "sender": "admin",
        "content": "Hi! How can I help you?",
        "createdAt": "2024-12-13T10:30:10.000Z",
        "isAI": false,
        "chatSessionId": "cm4abc123..."
      }
    ]
  }
]
```

**Logic:**
- Fetches all chat sessions ordered by creation date (newest first)
- Includes all related messages for each session
- Uses Prisma's `include` feature for eager loading

#### 3. Get Chat by Session ID

Retrieve messages for a specific chat session.

```http
GET /api/chats/:sessionId
```

**Parameters:**
- `sessionId` (string, required): The unique session identifier

**Response:**
```json
[
  {
    "id": "cm4xyz789...",
    "sender": "user",
    "content": "Hello!",
    "createdAt": "2024-12-13T10:30:05.000Z",
    "isAI": false,
    "chatSessionId": "cm4abc123..."
  }
]
```

**Logic:**
- Looks up chat session by sessionId
- Returns all messages associated with that session
- Returns empty array if session not found

## WebSocket Events

The application uses Socket.IO for real-time communication.

### Connection URL

```javascript
const socket = io("http://localhost:4000");
```

### Events Reference

#### 1. Connection Event

Triggered when a client connects to the server.

**Server-side handler:**
```javascript
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});
```

**Logic:**
- Automatically fires when Socket.IO client establishes connection
- Server logs the unique socket ID
- Socket object represents the connection and can emit/receive events

#### 2. init_session

Initialize or resume a chat session.

**Client emits:**
```javascript
socket.emit("init_session", { sessionId: null }, (response) => {
  console.log(response.sessionId); // New or existing session ID
});
```

**Parameters:**
- `sessionId` (string, optional): Existing session ID to resume, or null/undefined for new session

**Server response:**
```javascript
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Logic:**
1. If `sessionId` is provided and valid, reuse existing session
2. If `sessionId` is null/undefined:
   - Generate new UUID v4 as session ID
   - Extract IP address from socket handshake
   - Extract user agent from socket headers
   - Create new ChatSession in database
3. Join socket to a room named after the sessionId (enables targeted messaging)
4. Return sessionId in callback

**Code Flow:**
```javascript
// Extract IP and user agent from socket
const ip = socket.handshake.address;
const userAgent = socket.handshake.headers["user-agent"];

// Create database record
await prisma.chatSession.create({
  data: { sessionId, ip, userAgent }
});

// Join socket room for this session
socket.join(sessionId);
```

#### 3. user_message

Send a message from the user.

**Client emits:**
```javascript
socket.emit("user_message", {
  sessionId: "550e8400-e29b-41d4-a716-446655440000",
  content: "Hello, I need help!"
});
```

**Parameters:**
- `sessionId` (string, required): The session ID
- `content` (string, required): Message text

**Server broadcasts to session room:**
```javascript
{
  "id": "cm4xyz789...",
  "sender": "user",
  "content": "Hello, I need help!",
  "createdAt": "2024-12-13T10:30:05.000Z",
  "isAI": false,
  "chatSessionId": "cm4abc123..."
}
```

**Logic:**
1. Validate session exists in database
2. Create Message record with sender="user"
3. Emit "message" event to all sockets in the session room
4. All clients in the room (including sender) receive the message

**Code Flow:**
```javascript
// Find session to get internal ID
const session = await prisma.chatSession.findUnique({
  where: { sessionId }
});

// Save message to database
const msg = await prisma.message.create({
  data: {
    chatSessionId: session.id,
    sender: "user",
    content,
    isAI: false
  }
});

// Broadcast to all clients in the session room
io.to(sessionId).emit("message", msg);
```

#### 4. admin_message

Send a message from the administrator.

**Client emits:**
```javascript
socket.emit("admin_message", {
  sessionId: "550e8400-e29b-41d4-a716-446655440000",
  content: "How can I assist you today?"
});
```

**Parameters:**
- `sessionId` (string, required): The session ID
- `content` (string, required): Message text

**Server broadcasts to session room:**
```javascript
{
  "id": "cm4xyz790...",
  "sender": "admin",
  "content": "How can I assist you today?",
  "createdAt": "2024-12-13T10:30:10.000Z",
  "isAI": false,
  "chatSessionId": "cm4abc123..."
}
```

**Logic:**
- Identical to `user_message` except sender="admin"
- Enables bidirectional communication between users and support staff

#### 5. message (Broadcast Event)

Server broadcasts this event to notify clients of new messages.

**Client receives:**
```javascript
socket.on("message", (msg) => {
  console.log("New message:", msg);
  // Update UI with new message
});
```

**Logic:**
- This event is emitted by the server, not by clients
- Sent to all sockets in a specific session room
- Contains complete message object from database

#### 6. disconnect

Triggered when a client disconnects.

**Server-side handler:**
```javascript
socket.on("disconnect", () => {
  console.log("Client disconnected:", socket.id);
});
```

**Logic:**
- Automatically fires when socket connection is closed
- Server logs the disconnection
- Socket.IO automatically removes socket from all rooms

### Socket.IO Room-Based Architecture

The application uses **Socket.IO rooms** for efficient message routing:

```
┌─────────────────────────────────────────────────┐
│           Socket.IO Server                      │
│                                                 │
│  Room: session-123                              │
│  ├─ Socket A (User)                             │
│  └─ Socket B (Admin)                            │
│                                                 │
│  Room: session-456                              │
│  ├─ Socket C (User)                             │
│  └─ Socket D (Admin)                            │
└─────────────────────────────────────────────────┘
```

**Benefits:**
- Messages are only sent to relevant participants
- Scalable: each session is isolated
- No message leakage between sessions

## Setup and Installation

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **PostgreSQL**: v14 or higher
- **Git**: For cloning the repository

### Step 1: Clone the Repository

```bash
git clone https://github.com/uday-0408/backend-chatbot.git
cd backend-chatbot
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages defined in `package.json`:
- Express.js and middleware
- Socket.IO server and client
- Prisma ORM and PostgreSQL adapter
- Environment variable management

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
touch .env
```

Add the following configuration:

```env
# Database connection string
DATABASE_URL="postgresql://username:password@localhost:5432/chatbot_db?schema=public"

# Server port (optional, defaults to 4000)
PORT=4000
```

**Environment Variable Details:**

- **`DATABASE_URL`**: PostgreSQL connection string
  - Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
  - Replace `username`, `password`, and `chatbot_db` with your values
  - Add connection parameters as needed (e.g., `?schema=public&connect_timeout=10`)

- **`PORT`**: Server listening port (optional)
  - Default: 4000
  - Change if port is already in use

## Environment Configuration

### PostgreSQL Connection String Components

```
postgresql://[user]:[password]@[host]:[port]/[database]?[parameters]
```

**Example configurations:**

**Local Development:**
```env
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/chatbot_db"
```

**Docker Container:**
```env
DATABASE_URL="postgresql://postgres:postgres@postgres-container:5432/chatbot_db"
```

**Cloud Service (e.g., Supabase, Railway):**
```env
DATABASE_URL="postgresql://user:pass@db.example.com:5432/database?sslmode=require"
```

### Security Best Practices

1. **Never commit `.env` file** to version control (already in `.gitignore`)
2. **Use strong database passwords** with mixed characters
3. **Rotate credentials regularly** in production
4. **Use SSL/TLS** for database connections in production
5. **Limit database user permissions** to only required operations

## Database Setup

### Step 1: Create PostgreSQL Database

Connect to PostgreSQL and create the database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE chatbot_db;

# Exit psql
\q
```

### Step 2: Run Prisma Migration

Apply the database schema:

```bash
npx prisma migrate deploy
```

**What this does:**
- Reads schema from `prisma/schema.prisma`
- Executes SQL migration files in `prisma/migrations/`
- Creates `ChatSession` and `Message` tables
- Sets up foreign key relationships and indexes

### Step 3: Generate Prisma Client

Generate the Prisma client for database access:

```bash
npx prisma generate
```

**What this does:**
- Generates TypeScript types from schema
- Creates optimized database query methods
- Enables auto-completion in IDE

### Optional: View Database in Prisma Studio

Open a visual database browser:

```bash
npx prisma studio
```

This launches a web interface at `http://localhost:5555` where you can:
- View all tables and data
- Add/edit/delete records
- Test queries

### Database Migration Commands Reference

```bash
# Create a new migration after schema changes
npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Apply migrations in production
npx prisma migrate deploy
```

## Usage

### Starting the Server

#### Development Mode (with auto-restart)

```bash
npm run dev
```

**What happens:**
- Starts server with nodemon
- Automatically restarts on file changes
- Ideal for development

#### Production Mode

```bash
npm start
```

**What happens:**
- Starts server with node
- No auto-restart
- Use with process managers (PM2, systemd) in production

### Server Output

```
DATABASE_URL = postgresql://postgres:***@localhost:5432/chatbot_db
Server running on 4000
```

### Testing the Application

#### 1. Test HTTP Endpoints

**Health Check:**
```bash
curl http://localhost:4000/health
```

**List All Chats:**
```bash
curl http://localhost:4000/api/chats
```

**Get Specific Chat:**
```bash
curl http://localhost:4000/api/chats/550e8400-e29b-41d4-a716-446655440000
```

#### 2. Test WebSocket Connection

Run the included test client:

```bash
node test-socket.js
```

**Expected output:**
```
Connected: xyz123...
Session initialized: { sessionId: '550e8400-e29b-41d4-a716-446655440000' }
New message: {
  id: 'cm4xyz789...',
  sender: 'user',
  content: 'Testing message!',
  createdAt: '2024-12-13T10:30:05.000Z',
  isAI: false,
  chatSessionId: 'cm4abc123...'
}
```

#### 3. Test with Postman or Browser Console

**Browser console example:**

```javascript
// Load Socket.IO client
const script = document.createElement('script');
script.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
document.head.appendChild(script);

// Wait for script to load, then connect
setTimeout(() => {
  const socket = io("http://localhost:4000");
  
  socket.on("connect", () => {
    console.log("Connected!");
    
    socket.emit("init_session", {}, (response) => {
      console.log("Session:", response.sessionId);
      
      // Send a test message
      socket.emit("user_message", {
        sessionId: response.sessionId,
        content: "Test from browser!"
      });
    });
  });
  
  socket.on("message", (msg) => {
    console.log("Message received:", msg);
  });
}, 1000);
```

## Code Logic Explanation

### 1. Application Initialization Flow

**File: `src/server.js`**

```javascript
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { chatSocket } from "./sockets/chatSocket.js";
import dotenv from "dotenv";
dotenv.config();

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  chatSocket(io, socket);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log("Server running on", PORT));
```

**Logic Breakdown:**

1. **Environment Setup**: `dotenv.config()` loads environment variables from `.env` file
2. **HTTP Server Creation**: `http.createServer(app)` wraps Express app in Node HTTP server
3. **Socket.IO Initialization**: 
   - Creates Socket.IO server attached to HTTP server
   - Enables CORS with `origin: "*"` (allows all origins)
4. **Connection Handler**: 
   - Listens for new WebSocket connections
   - Delegates handling to `chatSocket` function
5. **Server Start**: Binds to port and starts listening for requests

### 2. Express Application Configuration

**File: `src/app.js`**

```javascript
import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

// Enable CORS
app.use(cors());

// Parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api", chatRoutes);

export default app;
```

**Middleware Stack (Order Matters):**

1. **CORS Middleware**: Adds CORS headers to all responses
2. **JSON Parser**: Parses `application/json` request bodies
3. **URL-Encoded Parser**: Parses `application/x-www-form-urlencoded` bodies
4. **Health Route**: Direct route for health checks
5. **API Routes**: All chat-related routes under `/api` prefix

**Why this order?**
- CORS must be first to add headers to all responses
- Body parsers must precede routes that use `req.body`
- Specific routes (`/health`) before generic prefixes (`/api`)

### 3. Prisma Client Configuration

**File: `src/config/prisma.js`**

```javascript
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { PrismaClient } = pkg;
const { Pool } = pg;

console.log("DATABASE_URL =", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

export default prisma;
```

**Logic Breakdown:**

1. **Connection Pool**: Creates PostgreSQL connection pool using `pg` library
   - Reuses database connections (more efficient)
   - Manages connection lifecycle automatically
2. **Prisma Adapter**: Wraps the connection pool for Prisma
   - Allows Prisma to use the `pg` driver
   - Enables connection pooling with Prisma
3. **Prisma Client**: Instantiated with the adapter
4. **Singleton Pattern**: Exported instance used throughout the application

**Why use adapter?**
- Better connection management
- Improved performance with connection pooling
- Compatible with serverless environments

### 4. Session ID Generation

**File: `src/utils/generateSessionId.js`**

```javascript
import crypto from "crypto";

export function generateSessionId() {
  return crypto.randomUUID();
}
```

**Logic:**
- Uses Node.js built-in `crypto` module
- Generates **UUID v4** (random UUID)
- Format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- Cryptographically random and unique

**Why UUID v4?**
- Extremely low collision probability (~0% for practical purposes)
- No need for centralized ID generation
- URL-safe and human-readable

### 5. Chat Service Layer

**File: `src/services/chatService.js`**

This file contains the core business logic for chat operations.

#### createChatSession Function

```javascript
export async function createChatSession(ip, userAgent) {
  const sessionId = generateSessionId();
  await prisma.chatSession.create({
    data: { sessionId, ip, userAgent }
  });
  return sessionId;
}
```

**Logic:**
1. Generate unique session ID using UUID v4
2. Create database record with session metadata
3. Return sessionId for client storage

**Use Case:** Called when a new user connects without existing session

#### saveMessage Function

```javascript
export async function saveMessage(sessionId, sender, content, isAI = false) {
  const session = await prisma.chatSession.findUnique({
    where: { sessionId }
  });

  if (!session) throw new Error("Chat session not found");

  return prisma.message.create({
    data: {
      chatSessionId: session.id,
      sender,
      content,
      isAI
    }
  });
}
```

**Logic:**
1. **Validation**: Lookup session to ensure it exists
2. **Error Handling**: Throw error if session not found
3. **Message Creation**: 
   - Link message to session using internal ID
   - Store sender type, content, and AI flag
4. **Return**: Full message object with generated ID and timestamp

**Why validate session?**
- Prevents orphaned messages
- Maintains referential integrity
- Provides clear error messages

#### getMessages Function

```javascript
export async function getMessages(sessionId) {
  const session = await prisma.chatSession.findUnique({
    where: { sessionId },
    include: { messages: true }
  });

  return session?.messages ?? [];
}
```

**Logic:**
1. **Lookup Session**: Find by unique sessionId
2. **Include Messages**: Eager load related messages (JOIN in SQL)
3. **Null Safety**: Return empty array if session not found

**Optional Chaining Explained:**
- `session?.messages`: Returns `undefined` if session is null
- `?? []`: Returns empty array if left side is null/undefined
- Prevents null pointer errors

#### getAllChats Function

```javascript
export async function getAllChats() {
  return prisma.chatSession.findMany({
    include: { messages: true },
    orderBy: { createdAt: "desc" }
  });
}
```

**Logic:**
1. **Fetch All Sessions**: No filter, retrieves all records
2. **Include Messages**: Load all related messages for each session
3. **Sort**: Order by creation date, newest first

**Performance Consideration:**
- This query can be expensive with many sessions
- Consider pagination for production (use `skip` and `take`)

### 6. Chat Controller Layer

**File: `src/controllers/chatController.js`**

Controllers handle HTTP request/response cycle.

```javascript
import { getAllChats, getMessages } from "../services/chatService.js";

export async function listChats(req, res) {
  const chats = await getAllChats();
  res.json(chats);
}

export async function getChatById(req, res) {
  const messages = await getMessages(req.params.sessionId);
  res.json(messages);
}
```

**Design Pattern:**
- **Thin Controllers**: Minimal logic, delegate to services
- **Error Handling**: Relies on Express error middleware (add for production)
- **Response Format**: Always return JSON

**Improvement Opportunities:**
- Add try-catch blocks for error handling
- Validate request parameters
- Add pagination support
- Return proper HTTP status codes

### 7. WebSocket Event Handler

**File: `src/sockets/chatSocket.js`**

```javascript
import { createChatSession, saveMessage } from "../services/chatService.js";

export function chatSocket(io, socket) {
  console.log("Client connected:", socket.id);

  socket.on("init_session", async ({ sessionId }, callback) => {
    if (!sessionId) {
      sessionId = await createChatSession(
        socket.handshake.address,
        socket.handshake.headers["user-agent"]
      );
    }

    socket.join(sessionId);
    callback({ sessionId });
  });

  socket.on("user_message", async ({ sessionId, content }) => {
    const msg = await saveMessage(sessionId, "user", content);
    io.to(sessionId).emit("message", msg);
  });

  socket.on("admin_message", async ({ sessionId, content }) => {
    const msg = await saveMessage(sessionId, "admin", content);
    io.to(sessionId).emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
}
```

**Key Concepts:**

#### Socket.IO Rooms
```javascript
socket.join(sessionId);
```
- Adds socket to a room named after the session ID
- Multiple sockets can be in the same room
- Enables targeted message broadcasting

#### Broadcasting to Rooms
```javascript
io.to(sessionId).emit("message", msg);
```
- `io.to(sessionId)`: Target specific room
- `.emit("message", msg)`: Send event to all sockets in room
- All clients (user + admin) receive the message

#### Socket Handshake Data
```javascript
socket.handshake.address        // Client IP
socket.handshake.headers        // HTTP headers
```
- Available during connection
- Used for session metadata

**Event Flow Diagram:**

```
User Client                Server                Admin Client
    │                        │                        │
    │──── connect ──────────>│                        │
    │<─── connected ─────────│                        │
    │                        │                        │
    │── init_session ───────>│                        │
    │    (no sessionId)      │                        │
    │                        │── create session ──>DB │
    │<── { sessionId } ──────│                        │
    │                        │<──────connect─────────│
    │                        │────connected──────────>│
    │                        │                        │
    │── user_message ───────>│                        │
    │                        │── save message ────>DB │
    │<────── message ────────│──── message ──────────>│
    │                        │                        │
    │                        │<────admin_message──────│
    │                        │── save message ────>DB │
    │<────── message ────────│──── message ──────────>│
```

### 8. Routing Configuration

**File: `src/routes/chatRoutes.js`**

```javascript
import express from "express";
import { listChats, getChatById } from "../controllers/chatController.js";

const router = express.Router();

router.get("/chats", listChats);
router.get("/chats/:sessionId", getChatById);

export default router;
```

**Route Definitions:**

1. **`GET /api/chats`**: List all chat sessions
   - No parameters required
   - Returns array of all sessions with messages

2. **`GET /api/chats/:sessionId`**: Get specific chat
   - Parameter: `sessionId` (UUID)
   - Returns array of messages for that session

**Express Router Benefits:**
- Modular route definitions
- Can be mounted at different paths
- Middleware can be applied to specific routers

## Testing

### Manual Testing Steps

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Test health endpoint:**
   ```bash
   curl http://localhost:4000/health
   # Expected: {"status":"ok"}
   ```

3. **Run socket test:**
   ```bash
   node test-socket.js
   ```

4. **Check database:**
   ```bash
   npx prisma studio
   ```
   - Verify ChatSession created
   - Verify Message created

5. **Test API endpoints:**
   ```bash
   # Get all chats
   curl http://localhost:4000/api/chats | json_pp
   
   # Get specific chat (replace with actual sessionId)
   curl http://localhost:4000/api/chats/YOUR_SESSION_ID | json_pp
   ```

### Integration Testing Strategy

For production, consider implementing:

1. **Unit Tests**: Test individual services and controllers
   - Use Jest or Mocha
   - Mock Prisma client

2. **Integration Tests**: Test API endpoints
   - Use Supertest for HTTP testing
   - Use Socket.IO client for WebSocket testing

3. **Database Tests**: Test with test database
   - Use `dotenv-cli` for test environment
   - Reset database between tests

### Example Test Structure (Future Implementation)

```javascript
// Example: tests/chatService.test.js
import { createChatSession, saveMessage } from '../src/services/chatService.js';

describe('Chat Service', () => {
  test('creates chat session', async () => {
    const sessionId = await createChatSession('127.0.0.1', 'test-agent');
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
  });

  test('saves message to session', async () => {
    const sessionId = await createChatSession('127.0.0.1', 'test-agent');
    const message = await saveMessage(sessionId, 'user', 'Hello');
    expect(message.content).toBe('Hello');
    expect(message.sender).toBe('user');
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Error:**
```
Error: P1001: Can't reach database server at localhost:5432
```

**Solutions:**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in `.env`
- Ensure database exists: `psql -l`
- Check firewall settings

#### 2. Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Solutions:**
- Change PORT in `.env`
- Kill process using port: `lsof -ti:4000 | xargs kill -9`

#### 3. Prisma Client Not Generated

**Error:**
```
Error: @prisma/client did not initialize yet
```

**Solution:**
```bash
npx prisma generate
```

#### 4. Migration Out of Sync

**Error:**
```
Error: The database is not in sync with the Prisma schema
```

**Solution:**
```bash
npx prisma migrate deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

ISC License

## Author

**Uday Chauhan**

- GitHub: [@uday-0408](https://github.com/uday-0408)

## Support

For issues and questions:
- Open an issue: [GitHub Issues](https://github.com/uday-0408/backend-chatbot/issues)
- Repository: [backend-chatbot](https://github.com/uday-0408/backend-chatbot)

---

**Last Updated:** December 2024
