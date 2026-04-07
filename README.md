# Realtime Chatting Application (WhatsApp-style Clone)

Full-stack realtime chat app built with:
- PostgreSQL
- Express + Node.js
- React + Vite
- Socket.IO

It supports private conversations, live message delivery, typing indicators, unread counts, file/image uploads, and voice messages.

## Project Structure

```text
realtime_chatting_application/
|-- client/                  # React + Vite frontend
|   `-- src/
|       |-- components/      # Login/Register/Sidebar/Chat UI
|       `-- context/         # Auth + Socket context providers
|-- server/                  # Express API + Socket.IO server
|   |-- db/                  # PG connection + SQL schema
|   |-- middleware/          # JWT auth middleware
|   |-- routes/              # auth/users/conversations/uploads routes
|   `-- uploads/             # Uploaded files (served statically)
`-- README.md
```

## Core Features

- JWT authentication (register/login)
- User search by username or email
- Start private conversations
- Realtime messaging with Socket.IO
- Typing/stop-typing indicators
- Mark messages as read
- Unread message count per conversation
- Attachment uploads (`image/*` and generic files)
- Voice message recording/upload (`audio/webm`)

## Tech Stack

- Frontend: React 18, Vite, Axios, Socket.IO client, Emoji picker, Lucide icons
- Backend: Express 4, Socket.IO 4, PostgreSQL (`pg`), JWT, bcrypt, multer
- Database: PostgreSQL schema in `server/db/schema.sql`

## Prerequisites

- Node.js 18+ (recommended)
- npm
- PostgreSQL running locally or remotely

## Environment Variables (Server)

Create `server/.env` with:

```env
PORT=5001
DB_USER=your_db_user
DB_HOST=localhost
DB_DATABASE=realtime_chat
DB_PASSWORD=your_db_password
DB_PORT=5432
JWT_SECRET=your_long_random_secret
```

Notes:
- The frontend currently calls backend endpoints on `http://localhost:5001` in most places.
- Set `PORT=5001` for a smooth local run (or update frontend URLs if using a different port).

## Database Setup

1. Create database:
```sql
CREATE DATABASE realtime_chat;
```

2. Apply schema from:
- `server/db/schema.sql`

This creates:
- `users`
- `conversations`
- `participants`
- `messages`

## Installation

### 1. Install backend dependencies

```bash
cd server
npm install
```

### 2. Install frontend dependencies

```bash
cd ../client
npm install
```

## Run the App (Development)

Open two terminals.

Terminal 1 (backend):
```bash
cd server
npm run dev
```

Terminal 2 (frontend):
```bash
cd client
npm run dev
```

Then open the Vite URL shown in your terminal (typically `http://localhost:5173`).

## API Overview

Base URL: `http://localhost:5001/api`

- `POST /auth/register` - Register a user
- `POST /auth/login` - Login and receive JWT
- `GET /users/search?query=...` - Search users (auth required)
- `GET /conversations` - List current user conversations
- `POST /conversations` - Create/find private conversation
- `GET /conversations/:id/messages` - Fetch conversation messages
- `POST /conversations/:id/read` - Mark conversation messages as read
- `POST /upload` - Upload file (`multipart/form-data`, field: `file`)

Static uploads:
- `GET /uploads/<filename>`

## Socket Events

Client emits:
- `register_user` (`userId`)
- `join_conversation` (`conversationId`)
- `send_message` (`{ conversationId, senderId, content, messageType }`)
- `typing` (`{ conversationId, userId, username }`)
- `stop_typing` (`{ conversationId, userId }`)

Server emits:
- `receive_message`
- `refresh_conversations`
- `user_typing`
- `user_stop_typing`

## Current Limitations / Notes

- Backend CORS currently allows all origins (`origin: '*'`) for development.
- File URLs are generated as `http://localhost:5001/uploads/...`.
- One frontend call in `ChatContainer.jsx` currently uses port `5000` for fetching conversations; align this with your server `PORT`.
- No automated tests are configured yet.

## Production Hardening Checklist

- Restrict CORS origins
- Move API URL and socket URL to environment-based config
- Use HTTPS and secure cookie/token handling
- Add rate limiting + input validation
- Add tests (API + UI)
- Add object storage for uploads

## Scripts

Backend (`server/package.json`):
- `npm run dev` - start with nodemon
- `npm start` - start with node

Frontend (`client/package.json`):
- `npm run dev` - Vite dev server
- `npm run build` - production build
- `npm run preview` - preview built app
- `npm run lint` - lint frontend code
