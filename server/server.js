const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./db');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'goalmate-super-secret-key-12345!';
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173', // Vite Frontend
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// API routing
app.use('/api', routes);

// Serve simple healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'GoalMate backend is running smoothly.' });
});

// Configure Socket.io Server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

// Middleware to authenticate Socket connection with JWT token
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('WebSocket Authentication Failed: Token missing'));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('WebSocket Authentication Failed: Token invalid'));
    }
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  });
});

// Map to track active user socket connections
const userSockets = new Map();

// Helper to broadcast status changes to friends
async function broadcastStatusChange(userId, online) {
  try {
    const friends = await db.getFriends(userId);
    const activeFriends = friends.filter(f => f.status === 'accepted');
    
    for (const friend of activeFriends) {
      io.to(`user_${friend.friendId}`).emit('friend_status_change', {
        userId,
        online,
        lastSeen: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Error broadcasting status change:', err);
  }
}

// Websocket Events
io.on('connection', async (socket) => {
  const userId = socket.userId;
  console.log(`[Socket] User Connected: ${socket.username} (${userId})`);
  
  // Track socket mapping
  userSockets.set(userId, socket.id);
  
  // Join private room for targeted notifications/events
  socket.join(`user_${userId}`);

  // Mark user as online in database & broadcast status change
  await db.updateUserOnlineStatus(userId, true);
  await broadcastStatusChange(userId, true);

  // Send initial online statuses of friends back to the connected user
  try {
    const friends = await db.getFriends(userId);
    const onlineFriendStates = friends.map(f => ({
      friendId: f.friendId,
      online: f.online
    }));
    socket.emit('friends_online_states', onlineFriendStates);
  } catch (err) {
    console.error('Error sending online friends status:', err);
  }

  // --- Real-time Chat ---
  socket.on('send_message', async (data) => {
    const { receiverId, content, sharedTask, attachment } = data;
    if (!receiverId || (!content && !sharedTask && !attachment)) return;

    try {
      // Save message to database
      const msg = await db.createMessage({
        senderId: userId,
        receiverId,
        content,
        sharedTask,
        attachment
      });

      // Dispatch to receiver's room and sender's room (only if they are different)
      io.to(`user_${receiverId}`).emit('incoming_message', msg);
      if (receiverId !== userId) {
        io.to(`user_${userId}`).emit('incoming_message', msg);
      }
      
      console.log(`[Socket] Message sent: ${socket.username} -> ${receiverId}`);
    } catch (err) {
      console.error('Failed to send socket message:', err);
    }
  });

  socket.on('add_reaction', async (data) => {
    const { messageId, emoji, receiverId } = data;
    if (!messageId || !emoji || !receiverId) return;

    try {
      const updatedMsg = await db.addMessageReaction(messageId, userId, emoji);
      if (updatedMsg) {
        // Dispatch updated message with reaction to receiver and sender rooms
        io.to(`user_${receiverId}`).emit('message_updated', updatedMsg);
        io.to(`user_${userId}`).emit('message_updated', updatedMsg);
        console.log(`[Socket] Reaction updated: ${socket.username} -> Msg ${messageId} (${emoji})`);
      }
    } catch (err) {
      console.error('Failed to add socket reaction:', err);
    }
  });

  // Typing status sync
  socket.on('typing_status', (data) => {
    const { receiverId, isTyping } = data;
    if (!receiverId) return;

    io.to(`user_${receiverId}`).emit('typing_status', {
      senderId: userId,
      isTyping
    });
  });

  // --- Accountability Nudges ---
  socket.on('nudge_friend', (data) => {
    const { friendId } = data;
    if (!friendId) return;

    io.to(`user_${friendId}`).emit('friend_nudge', {
      nudgerId: userId,
      nudgerUsername: socket.username
    });
    console.log(`[Socket] Nudge dispatched: ${socket.username} nudged ${friendId}`);
  });

  // --- Friend Request Interactivity triggers ---
  socket.on('friend_request_sent', (data) => {
    const { receiverId } = data;
    if (!receiverId) return;

    // Send toast event to receiver instantly
    io.to(`user_${receiverId}`).emit('friend_request_received', {
      senderId: userId,
      senderUsername: socket.username
    });
  });

  socket.on('friend_request_accepted', (data) => {
    const { senderId } = data;
    if (!senderId) return;

    // Tell the original request sender that they've been accepted
    io.to(`user_${senderId}`).emit('friend_request_accepted', {
      friendId: userId,
      friendUsername: socket.username
    });
  });

  // --- Tasks Check-offs Updates ---
  socket.on('task_completed_broadcast', async (data) => {
    const { taskTitle, xpAward } = data;
    try {
      const friends = await db.getFriends(userId);
      const activeFriends = friends.filter(f => f.status === 'accepted');

      for (const friend of activeFriends) {
        io.to(`user_${friend.friendId}`).emit('partner_task_completed', {
          partnerId: userId,
          partnerUsername: socket.username,
          taskTitle,
          xpAward
        });
      }
    } catch (err) {
      console.error('Task broadcast status error:', err);
    }
  });

  // --- WebRTC DM Calling ---
  socket.on('call_user', (data) => {
    const { to, offer, type } = data; // type: 'voice' | 'video'
    if (!to) return;
    io.to(`user_${to}`).emit('incoming_call', {
      from: userId,
      fromUsername: socket.username,
      offer,
      type
    });
    console.log(`[Socket] Call initiated: ${socket.username} -> ${to} (${type})`);
  });

  socket.on('answer_call', (data) => {
    const { to, answer } = data;
    if (!to) return;
    io.to(`user_${to}`).emit('call_accepted', {
      from: userId,
      answer
    });
    console.log(`[Socket] Call answered: ${socket.username} -> ${to}`);
  });

  socket.on('ice_candidate', (data) => {
    const { to, candidate } = data;
    if (!to) return;
    io.to(`user_${to}`).emit('ice_candidate', {
      from: userId,
      candidate
    });
  });

  socket.on('end_call', (data) => {
    const { to } = data;
    if (!to) return;
    io.to(`user_${to}`).emit('call_ended', {
      from: userId
    });
    console.log(`[Socket] Call ended: ${socket.username} -> ${to}`);
  });

  // --- Connection Cleanup ---
  socket.on('disconnect', async () => {
    console.log(`[Socket] User Disconnected: ${socket.username} (${userId})`);
    
    userSockets.delete(userId);
    socket.leave(`user_${userId}`);

    // Update database status & notify partners
    await db.updateUserOnlineStatus(userId, false);
    await broadcastStatusChange(userId, false);
  });
});

// Boot Database first, then run Express server
async function startServer() {
  await db.initialize();
  
  server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`   GOALMATE REAL-TIME EXPRESS BACKEND    `);
    console.log(`   Running on: http://localhost:${PORT}   `);
    console.log(`=========================================`);
  });
}

startServer().catch(err => {
  console.error('[FATAL] Failed to initialize backend server:', err);
});
