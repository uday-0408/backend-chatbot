# Backend Chatbot API

A real-time chatbot backend built with Node.js, Express, Socket.IO, and Prisma.

## Features

- Real-time messaging using Socket.IO
- REST API for chat management
- Database integration with Prisma ORM
- Session-based chat management
- Admin and user messaging support
- PostgreSQL database

## Project Structure

```
backend-chatbot/
│
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Auto-generated migrations
│
├── src/
│   ├── config/
│   │   └── prisma.js        # Prisma client configuration
│   │
│   ├── controllers/
│   │   ├── chatController.js  # Admin routes: list chats, get messages
│   │   └── authController.js  # Admin authentication (optional)
│   │
│   ├── services/
│   │   ├── chatService.js     # Business logic for chat operations
│   │   └── adminService.js    # Admin-specific services
│   │
│   ├── sockets/
│   │   └── chatSocket.js      # Socket.IO events handler
│   │
│   ├── routes/
│   │   ├── chatRoutes.js      # REST API routes for chats
│   │   └── authRoutes.js      # Authentication routes
│   │
│   ├── utils/
│   │   └── generateSessionId.js  # Utility functions
│   │
│   ├── app.js                 # Express app setup
│   └── server.js              # HTTP + Socket.IO server
│
├── .env                       # Environment variables
├── package.json
└── README.md
```

## Setup

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install additional dependency for UUID generation:
```bash
npm install uuid
```

3. Configure environment variables in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/chatbot"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

4. Run Prisma migrations:
```bash
npx prisma migrate dev
```

5. Generate Prisma client:
```bash
npx prisma generate
```

### Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### REST API

- `GET /api/chats` - Get all chat sessions
- `GET /api/chats/:id` - Get messages for a specific chat session
- `POST /api/auth/login` - Admin login (optional)
- `POST /api/auth/logout` - Admin logout (optional)
- `GET /health` - Health check endpoint

### Socket.IO Events

**Client to Server:**
- `join_session` - Join a chat session
- `user_message` - Send a message as user
- `admin_message` - Send a message as admin
- `typing` - Indicate typing status
- `stop_typing` - Stop typing indicator

**Server to Client:**
- `previous_messages` - Receive chat history
- `user_message` - Receive user message
- `admin_message` - Receive admin message
- `new_user_message` - Notification of new user message (for admins)
- `typing` - Typing indicator
- `stop_typing` - Stop typing indicator
- `error` - Error notifications

## Database Schema

Update your `prisma/schema.prisma` to include:

```prisma
model ChatSession {
  id        String    @id @default(uuid())
  sessionId String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}

model Message {
  id        String      @id @default(uuid())
  sessionId String
  message   String
  sender    String      // 'user' or 'admin'
  createdAt DateTime    @default(now())
  session   ChatSession @relation(fields: [sessionId], references: [sessionId])
}
```

## Development

### Update package.json scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

### Install nodemon for development (optional)

```bash
npm install --save-dev nodemon
```

## License

ISC
