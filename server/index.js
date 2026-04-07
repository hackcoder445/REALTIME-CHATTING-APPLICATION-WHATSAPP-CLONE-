const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/upload', require('./routes/uploads'));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send('Chat API is running...');
});

// Socket.io Implementation
const userSockets = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register_user', (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv_${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on('send_message', async (data) => {
    const { conversationId, senderId, content, messageType } = data;
    
    try {
      // Save message to database
      const result = await db.query(
        'INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
        [conversationId, senderId, content, messageType || 'text']
      );
      const newMessage = result.rows[0];

      // Broadcast message to everyone in the conversation
      io.to(`conv_${conversationId}`).emit('receive_message', newMessage);
      
      // Notify participants to refresh their conversation list (for unread counts/previews)
      const participants = await db.query('SELECT user_id FROM participants WHERE conversation_id = $1', [conversationId]);
      participants.rows.forEach(p => {
        const socketId = userSockets.get(p.user_id);
        if (socketId) {
          io.to(socketId).emit('refresh_conversations');
        }
      });
      
      // Update last_seen or typing status if needed
    } catch (err) {
      console.error('Error sending message:', err);
    }
  });

  socket.on('typing', (data) => {
    const { conversationId, userId, username } = data;
    socket.to(`conv_${conversationId}`).emit('user_typing', { userId, username });
  });

  socket.on('stop_typing', (data) => {
    const { conversationId, userId } = data;
    socket.to(`conv_${conversationId}`).emit('user_stop_typing', { userId });
  });

  socket.on('disconnect', () => {
    // Remove user from the map
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
