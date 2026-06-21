const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const routes = require('./routes');
const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@goalmate.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[Push Warning] VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is not defined in the environment. Web Push notifications will not be sent.');
}

// Helper to send a Web Push notification to user's registered devices
async function sendWebPush(targetUserId, payload) {
  try {
    const subRecord = await db.getPushSubscription(targetUserId);
    if (subRecord && subRecord.subscription) {
      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn('[Push Warning] Cannot send Web Push: VAPID keys are not configured in the environment.');
        return;
      }
      await webpush.sendNotification(subRecord.subscription, JSON.stringify(payload));
      console.log(`[Push] Successfully dispatched Web Push notification to user: ${targetUserId}`);
    }
  } catch (err) {
    console.error(`[Push Error] Failed to send Web Push notification to user ${targetUserId}:`, err);
  }
}

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'goalmate-super-secret-key-12345!';
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Enable CORS - dynamically allow request origins in development to support mobile device testing
const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  
  const isMatch = allowedOrigins.includes(origin) || 
                  origin.startsWith('http://192.168.') || 
                  origin.startsWith('http://10.') || 
                  origin.startsWith('http://172.') ||
                  origin.endsWith('.onrender.com') ||
                  origin.includes('goalmate');
                  
  if (isMatch || process.env.NODE_ENV !== 'production') {
    callback(null, true);
  } else {
    console.error(`[CORS Blocked] Origin: ${origin} is not allowed.`);
    callback(new Error('Not allowed by CORS'));
  }
};

app.use(cors({
  origin: corsOrigin,
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

// Serve static files from the React app in production
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one of the API routes, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Configure Socket.io Server
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
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

// Map to track call ringing timeouts
const activeCallRingingTimeouts = new Map();

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

// Helper to send a push notification to a user (persists + emits socket event)
// type: 'task' or 'chat' — used to check user preferences
async function sendNotification(targetUserId, { type, title, body, data, category }) {
  try {
    // Check user notification preferences
    const prefs = await db.getNotificationPrefs(targetUserId);
    const isTaskNotif = category === 'task';
    const isChatNotif = category === 'chat';

    if (isTaskNotif && !prefs.taskNotifications) return null;
    if (isChatNotif && !prefs.chatNotifications) return null;

    // Persist notification to database
    const notification = await db.createNotification(targetUserId, {
      type,
      title,
      body,
      data: data || {}
    });

    // Emit real-time socket event
    io.to(`user_${targetUserId}`).emit('notification', notification);

    return notification;
  } catch (err) {
    console.error('Error sending notification:', err);
    return null;
  }
}

// Make sendNotification accessible from routes via app
app.set('sendNotification', sendNotification);

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

      // Persist chat notification for the receiver
      if (receiverId !== userId) {
        await sendNotification(receiverId, {
          type: 'chat_message',
          category: 'chat',
          title: `New message from ${socket.username} 💬`,
          body: content ? (content.length > 100 ? content.substring(0, 100) + '...' : content) : (sharedTask ? 'Shared a task with you' : 'Sent an attachment'),
          data: { chatUserId: userId, senderUsername: socket.username, senderId: userId }
        });
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
  socket.on('call_user', async (data) => {
    const { to, offer, type } = data; // type: 'voice' | 'video'
    if (!to) return;

    try {
      // Create a Call log in DB
      const call = await db.createCall({
        callerId: userId,
        receiverId: to,
        type,
        status: 'ringing'
      });

      // Emit call event to receiver via socket if connected
      io.to(`user_${to}`).emit('incoming_call', {
        from: userId,
        fromUsername: socket.username,
        offer,
        type,
        callId: call.id
      });

      // Send Web Push Notification to receiver so they get it backgrounded/closed
      await sendWebPush(to, {
        type: 'incoming_call',
        title: `Incoming ${type} call! 📞`,
        body: `${socket.username} is calling you...`,
        data: {
          callId: call.id,
          callerId: userId,
          callerUsername: socket.username,
          callType: type
        }
      });

      // Set a 30-second Ringing Timeout for Missed Call Auto-generation
      const timeoutId = setTimeout(async () => {
        const freshCall = await db.getCall(call.id);
        if (freshCall && freshCall.status === 'ringing') {
          // Update DB to 'missed'
          await db.updateCallStatus(call.id, 'missed');

          // Generate a missed call notification record
          await db.createNotification(to, {
            type: 'missed_call',
            title: `Missed ${type} call 📞`,
            body: `From ${socket.username}`,
            data: { callerId: userId, callId: call.id }
          });

          // Emit call_ended to both peers
          io.to(`user_${to}`).emit('call_ended', { callId: call.id, status: 'missed' });
          io.to(`user_${userId}`).emit('call_ended', { callId: call.id, status: 'missed' });
          console.log(`[Socket] Call timed out (missed): ${call.id}`);
        }
        activeCallRingingTimeouts.delete(call.id);
      }, 30000);

      activeCallRingingTimeouts.set(call.id, timeoutId);
      console.log(`[Socket] Call initiated: ${socket.username} -> ${to} (${type}) [CallID: ${call.id}]`);
    } catch (err) {
      console.error('Failed to initiate call:', err);
    }
  });

  socket.on('answer_call', async (data) => {
    const { to, answer, callId } = data;
    if (!to) return;

    try {
      // Clear ringing timeout
      if (callId && activeCallRingingTimeouts.has(callId)) {
        clearTimeout(activeCallRingingTimeouts.get(callId));
        activeCallRingingTimeouts.delete(callId);
      }

      // Update DB to 'connected'
      if (callId) {
        await db.updateCallStatus(callId, 'connected');
      }

      io.to(`user_${to}`).emit('call_accepted', {
        from: userId,
        answer,
        callId
      });
      console.log(`[Socket] Call answered: ${socket.username} -> ${to} [CallID: ${callId}]`);
    } catch (err) {
      console.error('Answer call error:', err);
    }
  });

  socket.on('ice_candidate', (data) => {
    const { to, candidate, callId } = data;
    if (!to) return;
    io.to(`user_${to}`).emit('ice_candidate', {
      from: userId,
      candidate,
      callId
    });
  });

  socket.on('reject_call', async (data) => {
    const { to, callId } = data;
    if (!to) return;

    try {
      // Clear ringing timeout
      if (callId && activeCallRingingTimeouts.has(callId)) {
        clearTimeout(activeCallRingingTimeouts.get(callId));
        activeCallRingingTimeouts.delete(callId);
      }

      // Update DB to 'rejected'
      if (callId) {
        await db.updateCallStatus(callId, 'rejected');
      }

      // Generate a notification for the caller
      await db.createNotification(to, {
        type: 'call_rejected',
        title: 'Call Rejected ❌',
        body: `${socket.username} declined your call`,
        data: { receiverId: userId, callId }
      });

      io.to(`user_${to}`).emit('call_ended', {
        from: userId,
        status: 'rejected',
        callId
      });
      console.log(`[Socket] Call rejected: ${socket.username} -> ${to}`);
    } catch (err) {
      console.error('Reject call error:', err);
    }
  });

  socket.on('end_call', async (data) => {
    const { to, callId, duration } = data;
    if (!to) return;

    try {
      // Clear ringing timeout
      if (callId && activeCallRingingTimeouts.has(callId)) {
        clearTimeout(activeCallRingingTimeouts.get(callId));
        activeCallRingingTimeouts.delete(callId);
      }

      // Update DB to 'ended'
      if (callId) {
        await db.updateCallStatus(callId, 'ended', duration || 0);
      }

      io.to(`user_${to}`).emit('call_ended', {
        from: userId,
        status: 'ended',
        callId
      });
      console.log(`[Socket] Call ended: ${socket.username} -> ${to} [CallID: ${callId}]`);
    } catch (err) {
      console.error('End call error:', err);
    }
  });

  socket.on('screen_share_status', (data) => {
    const { to, isSharing } = data;
    if (!to) return;
    io.to(`user_${to}`).emit('screen_share_status', {
      from: userId,
      isSharing
    });
  });

  socket.on('call_mode_switch', (data) => {
    const { to, newType } = data; // newType: 'voice' | 'video'
    if (!to) return;
    io.to(`user_${to}`).emit('call_mode_switched', {
      from: userId,
      newType
    });
    console.log(`[Socket] Call mode switch relay: ${socket.username} -> ${to} (${newType})`);
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
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`   GOALMATE REAL-TIME EXPRESS BACKEND    `);
    console.log(`   Running on: http://0.0.0.0:${PORT}     `);
    console.log(`=========================================`);
  });
}

startServer().catch(err => {
  console.error('[FATAL] Failed to initialize backend server:', err);
});
