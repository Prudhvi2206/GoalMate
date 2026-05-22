const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'goalmate-super-secret-key-12345!';

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired.' });
    }
    req.user = decoded;
    next();
  });
}

// Generate unique GM Friend Code
async function generateUniqueFriendCode() {
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    const random = Math.floor(10000 + Math.random() * 90000); // 5 digits
    code = `GM-${random}`;
    const existing = await db.getUserByCode(code);
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
}

// --- AUTHENTICATION ROUTES ---

// Register
router.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  try {
    const existingEmail = await db.getUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const existingUsername = await db.getUserByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = await generateUniqueFriendCode();
    
    // Pick a neat avatar seed based on username
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

    const user = await db.createUser({
      username: username.toLowerCase().replace(/\s+/g, ''),
      email,
      password: hashedPassword,
      code,
      avatar
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Create Feed entry for new user joining GoalMate
    await db.createFeedItem({
      userId: user.id,
      username: user.username,
      type: 'friend_joined',
      content: `joined GoalMate! Connect using their friend code: ${user.code} 🎯`
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        code: user.code,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        online: true
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to complete registration.' });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        code: user.code,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        online: true
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'An error occurred during login.' });
  }
});

// Get profile
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      code: user.code,
      avatar: user.avatar,
      xp: user.xp,
      level: user.level,
      online: !!user.online
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// Update Profile Customizations
router.put('/auth/profile', authenticateToken, async (req, res) => {
  const { username, avatar } = req.body;
  try {
    const data = {};
    if (username) {
      const existing = await db.getUserByUsername(username);
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ error: 'Username is already taken by another user.' });
      }
      data.username = username.toLowerCase().replace(/\s+/g, '');
    }
    if (avatar) data.avatar = avatar;

    const updatedUser = await db.updateUserProfile(req.user.id, data);
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      code: updatedUser.code,
      avatar: updatedUser.avatar,
      xp: updatedUser.xp,
      level: updatedUser.level,
      online: !!updatedUser.online
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// --- SOCIAL CONNECTIONS ROUTING ---

// Search users
router.get('/users/search', authenticateToken, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.json([]);
  }

  try {
    const results = await db.searchUsers(q, req.user.id);
    res.json(results);
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Failed to search users.' });
  }
});

// Get friends and requests list
router.get('/friends/list', authenticateToken, async (req, res) => {
  try {
    const friends = await db.getFriends(req.user.id);
    res.json(friends);
  } catch (err) {
    console.error('Fetch friends list error:', err);
    res.status(500).json({ error: 'Failed to retrieve friends list.' });
  }
});

// Send Friend Request (via Username, Code, or raw UserID)
router.post('/friends/request', authenticateToken, async (req, res) => {
  const { friendCode, username, friendId } = req.body;

  try {
    let targetUser = null;

    if (friendId) {
      targetUser = await db.getUserById(friendId);
    } else if (friendCode) {
      targetUser = await db.getUserByCode(friendCode);
    } else if (username) {
      targetUser = await db.getUserByUsername(username);
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user could not be found.' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself.' });
    }

    const request = await db.sendFriendRequest(req.user.id, targetUser.id);
    
    // Broadcast of WebSocket notification is handled in server.js
    res.status(201).json({
      message: 'Friend request sent successfully.',
      request: {
        id: request.id,
        senderId: req.user.id,
        receiverId: targetUser.id,
        status: request.status,
        friendId: targetUser.id,
        username: targetUser.username,
        avatar: targetUser.avatar,
        online: !!targetUser.online
      }
    });
  } catch (err) {
    console.error('Send friend request error:', err);
    res.status(500).json({ error: 'Failed to send friend request.' });
  }
});

// Accept or Reject Request
router.post('/friends/respond', authenticateToken, async (req, res) => {
  const { requestId, status } = req.body; // status: 'accepted' or 'rejected'

  if (!requestId || !['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Valid Request ID and response status are required.' });
  }

  try {
    const updated = await db.respondFriendRequest(requestId, status);
    if (!updated) {
      return res.status(404).json({ error: 'Friend request not found.' });
    }

    if (status === 'accepted') {
      // Award XP to both users for building an accountability connection!
      await db.updateUserXP(updated.user1Id, 50);
      await db.updateUserXP(updated.user2Id, 50);

      // Log feed items
      const u1 = await db.getUserById(updated.user1Id);
      const u2 = await db.getUserById(updated.user2Id);
      if (u1 && u2) {
        await db.createFeedItem({
          userId: u1.id,
          username: u1.username,
          type: 'xp_milestone',
          content: `and ${u2.username} are now official Accountability Partners! +50 XP awarded to each! 🤝🔥`
        });
      }
    }

    res.json({
      message: `Friend request successfully ${status}.`,
      friendship: updated
    });
  } catch (err) {
    console.error('Respond friend request error:', err);
    res.status(500).json({ error: 'Failed to process friend request response.' });
  }
});

// Remove Friend relationship
router.delete('/friends/remove/:friendId', authenticateToken, async (req, res) => {
  const { friendId } = req.params;

  try {
    const deleted = await db.removeFriend(req.user.id, friendId);
    if (!deleted) {
      return res.status(404).json({ error: 'Friend relationship could not be found.' });
    }
    res.json({ message: 'Friend removed successfully.' });
  } catch (err) {
    console.error('Remove friend error:', err);
    res.status(500).json({ error: 'Failed to remove friend.' });
  }
});

// --- TASKS ROUTES ---

// Get all tasks
router.get('/tasks', authenticateToken, async (req, res) => {
  const { date } = req.query; // Optional filter: YYYY-MM-DD
  try {
    const tasks = await db.getTasks(req.user.id, date);
    res.json(tasks);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Failed to retrieve tasks.' });
  }
});

// Create task
router.post('/tasks', authenticateToken, async (req, res) => {
  const { title, description, date, startTime, endTime, duration, priority, category, checklist } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'Task title and target date are required.' });
  }

  try {
    const task = await db.createTask({
      userId: req.user.id,
      title,
      description,
      date,
      startTime,
      endTime,
      duration,
      priority,
      category,
      checklist: checklist || [],
      assignedTo: 'You'
    });

    res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// Assign/share a task with a friend
router.post('/tasks/assign', authenticateToken, async (req, res) => {
  const { friendId, title, description, date, startTime, endTime, duration, priority, category, assignBoth } = req.body;

  if (!friendId || !title || !date) {
    return res.status(400).json({ error: 'Friend ID, title, and date are required.' });
  }

  try {
    // Verify target friend exists and is actually a friend
    const friends = await db.getFriends(req.user.id);
    const isFriend = friends.some(f => f.friendId === friendId && f.status === 'accepted');
    if (!isFriend) {
      return res.status(403).json({ error: 'You can only assign tasks to accepted accountability partners.' });
    }

    const targetFriend = friends.find(f => f.friendId === friendId);
    const friendUsername = targetFriend ? targetFriend.username : 'Partner';

    const sharedTaskId = assignBoth ? uuidv4() : null;

    let creatorTask = null;
    if (assignBoth) {
      creatorTask = await db.createTask({
        userId: req.user.id,
        title,
        description,
        date,
        startTime,
        endTime,
        duration,
        priority,
        category,
        acceptanceStatus: 'accepted',
        sharedTaskId,
        assignedTo: `Both:${friendUsername}`
      });
    }

    const assigneeTask = await db.createTask({
      userId: friendId, // Created in friend's bucket
      title,
      description,
      date,
      startTime,
      endTime,
      duration,
      priority,
      category,
      assignedBy: req.user.username, // Store who assigned this task
      acceptanceStatus: 'pending',
      sharedTaskId,
      assignedTo: assignBoth ? `Both:${req.user.username}` : 'You'
    });

    // Emit websocket notifications
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${friendId}`).emit('task_assigned', {
        task: assigneeTask,
        assignedBy: req.user.username
      });
    }

    res.status(201).json({
      message: assignBoth ? 'Task successfully shared with partner.' : 'Task successfully assigned to partner.',
      task: assignBoth ? creatorTask : assigneeTask
    });
  } catch (err) {
    console.error('Assign task error:', err);
    res.status(500).json({ error: 'Failed to assign task to partner.' });
  }
});

// Accept an assigned task
router.post('/tasks/:id/accept', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if task exists and belongs to the user
    const tasks = await db.getTasks(req.user.id);
    const existing = tasks.find(t => t.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    // Set acceptanceStatus to accepted
    const updated = await db.updateTask(id, { acceptanceStatus: 'accepted' });

    // Look up the creator to notify them via Socket.io
    let creator = null;
    if (existing.assignedBy) {
      creator = await db.getUserByUsername(existing.assignedBy);
    }

    const io = req.app.get('io');
    if (io && creator) {
      io.to(`user_${creator.id}`).emit('task_accepted', {
        taskId: id,
        taskTitle: existing.title,
        assigneeName: req.user.username,
        task: updated
      });
    }

    res.json({
      message: 'Task accepted successfully.',
      task: updated,
      creatorId: creator ? creator.id : null
    });
  } catch (err) {
    console.error('Accept task error:', err);
    res.status(500).json({ error: 'Failed to accept task.' });
  }
});

// Reject an assigned task
router.post('/tasks/:id/reject', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if task exists and belongs to the user
    const tasks = await db.getTasks(req.user.id);
    const existing = tasks.find(t => t.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    // Delete the task from the assignee's database
    await db.deleteTask(id);

    // Look up creator
    let creator = null;
    if (existing.assignedBy) {
      creator = await db.getUserByUsername(existing.assignedBy);
    }

    const io = req.app.get('io');
    if (io && creator) {
      io.to(`user_${creator.id}`).emit('task_rejected', {
        taskId: id,
        taskTitle: existing.title,
        assigneeName: req.user.username
      });
    }

    res.json({
      message: 'Task rejected successfully.',
      creatorId: creator ? creator.id : null
    });
  } catch (err) {
    console.error('Reject task error:', err);
    res.status(500).json({ error: 'Failed to reject task.' });
  }
});

// Update task
router.put('/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const taskData = req.body;

  try {
    // Check if task exists and belongs to the user
    const tasks = await db.getTasks(req.user.id);
    const existing = tasks.find(t => t.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    const originallyCompleted = existing.completed;

    // Handle shared task synchronization
    let partnerTask = null;
    let newCompletedBy = undefined;

    if (existing.sharedTaskId) {
      partnerTask = await db.getTaskBySharedTaskId(existing.sharedTaskId, id);
      if (partnerTask) {
        if (taskData.completed !== undefined) {
          if (taskData.completed) {
            const winner = existing.completedBy || partnerTask.completedBy;
            newCompletedBy = winner || req.user.username;
          } else {
            // If active user uncompletes, check if partner is still complete
            if (partnerTask.completed) {
              const partnerUser = await db.getUserById(partnerTask.userId);
              newCompletedBy = partnerUser ? partnerUser.username : null;
            } else {
              newCompletedBy = null;
            }
          }
          taskData.completedBy = newCompletedBy;
        }
      }
    }

    const updated = await db.updateTask(id, taskData);

    // If there is a partner task, synchronize changes and emit task_synced
    if (partnerTask) {
      const syncData = {};
      if (taskData.checklist !== undefined) syncData.checklist = taskData.checklist;
      if (taskData.notes !== undefined) syncData.notes = taskData.notes;
      // Decouple completion state: do NOT copy completed flag!
      if (newCompletedBy !== undefined) syncData.completedBy = newCompletedBy;

      const updatedPartner = await db.updateTask(partnerTask.id, syncData);

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${partnerTask.userId}`).emit('task_synced', {
          task: updatedPartner
        });
      }
    }

    // If task was toggled to completed, award XP!
    if (!originallyCompleted && updated.completed) {
      let xpAward = 20; // Default
      if (updated.priority === 'High') xpAward = 40;
      if (updated.priority === 'Critical') xpAward = 50;

      const xpResult = await db.updateUserXP(req.user.id, xpAward);
      
      // Post activity to Feed
      await db.createFeedItem({
        userId: req.user.id,
        username: req.user.username,
        type: 'task_completed',
        content: `completed their ${updated.priority} task: "${updated.title}"! (+${xpAward} XP) 🔥`
      });

      return res.json({
        task: updated,
        xpAward,
        levelUp: xpResult ? xpResult.leveledUp : false,
        xp: xpResult ? xpResult.xp : 0,
        level: xpResult ? xpResult.level : 1
      });
    }

    res.json({ task: updated });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// Nudge friend for consistency
router.post('/tasks/nudge', authenticateToken, async (req, res) => {
  const { friendId } = req.body;
  if (!friendId) {
    return res.status(400).json({ error: 'Friend ID is required to nudge.' });
  }

  try {
    const friend = await db.getUserById(friendId);
    if (!friend) {
      return res.status(404).json({ error: 'Accountability partner not found.' });
    }
    // Custom nudge handler logic will emit over Socket.io server
    res.json({ message: `Successfully sent nudge to ${friend.username}.` });
  } catch (err) {
    console.error('Nudge error:', err);
    res.status(500).json({ error: 'Failed to process nudge.' });
  }
});

// Delete task
router.delete('/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const tasks = await db.getTasks(req.user.id);
    const existing = tasks.find(t => t.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    // Handle shared task synchronization
    if (existing.sharedTaskId) {
      const partnerTask = await db.getTaskBySharedTaskId(existing.sharedTaskId, id);
      if (partnerTask) {
        await db.deleteTask(partnerTask.id);
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${partnerTask.userId}`).emit('task_deleted', {
            taskId: partnerTask.id
          });
        }
      }
    }

    await db.deleteTask(id);
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// --- CHAT / MESSAGING ROUTES ---

// Get message history with a friend
router.get('/chat/history/:friendId', authenticateToken, async (req, res) => {
  const { friendId } = req.params;
  try {
    // Verify that they are friends
    const friends = await db.getFriends(req.user.id);
    const isFriend = friends.some(f => f.friendId === friendId && f.status === 'accepted');
    if (!isFriend) {
      return res.status(403).json({ error: 'You can only message active accountability partners.' });
    }

    const messages = await db.getMessages(req.user.id, friendId);
    res.json(messages);
  } catch (err) {
    console.error('Get chat history error:', err);
    res.status(500).json({ error: 'Failed to retrieve message history.' });
  }
});

// Mark messages as read
router.post('/chat/read/:friendId', authenticateToken, async (req, res) => {
  const { friendId } = req.params;
  try {
    const count = await db.markMessagesAsRead(friendId, req.user.id); // mark sender as friend, receiver as current user
    res.json({ markedCount: count });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to update read status.' });
  }
});

// --- JOURNALS ROUTES ---

// Get all journals
router.get('/journals', authenticateToken, async (req, res) => {
  try {
    const entries = await db.getJournalEntries(req.user.id);
    res.json(entries);
  } catch (err) {
    console.error('Get journal error:', err);
    res.status(500).json({ error: 'Failed to retrieve journals.' });
  }
});

// Create journal
router.post('/journals', authenticateToken, async (req, res) => {
  const { title, content, mood, shared, date } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Journal content is required.' });
  }

  try {
    const entry = await db.createJournalEntry(req.user.id, { title, content, mood, shared, date });
    // Award +5 XP for tracking daily reflection
    const xpResult = await db.updateUserXP(req.user.id, 5);
    
    // Live Socket.io Sync for friends if shared is true/1
    const io = req.app.get('io');
    if (io && (shared === 1 || shared === true)) {
      const friendships = await db.getFriends(req.user.id);
      const acceptedFriends = friendships.filter(f => f.status === 'accepted');
      
      const author = await db.getUserById(req.user.id);
      
      for (const friend of acceptedFriends) {
        io.to(`user_${friend.friendId}`).emit('journal_shared', {
          entry: {
            ...entry,
            shared: 1,
            isSharedEntry: true,
            friendUsername: author ? author.username : req.user.username,
            friendAvatar: author ? author.avatar : ''
          }
        });
      }
    }

    res.status(201).json({
      entry,
      xpAward: 5,
      xp: xpResult ? xpResult.xp : 0,
      level: xpResult ? xpResult.level : 1
    });
  } catch (err) {
    console.error('Create journal error:', err);
    res.status(500).json({ error: 'Failed to save journal entry.' });
  }
});

// Delete journal
router.delete('/journals/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const entry = await db.getJournalById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }

    if (entry.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this journal entry.' });
    }

    const deleted = await db.deleteJournalEntry(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }

    // Real-time deletion sync
    const io = req.app.get('io');
    if (io) {
      const friendships = await db.getFriends(req.user.id);
      const acceptedFriends = friendships.filter(f => f.status === 'accepted');
      
      for (const friend of acceptedFriends) {
        io.to(`user_${friend.friendId}`).emit('journal_deleted', {
          id
        });
      }
    }

    res.json({ message: 'Journal entry successfully deleted.' });
  } catch (err) {
    console.error('Delete journal error:', err);
    res.status(500).json({ error: 'Failed to delete journal entry.' });
  }
});

// --- CAREER PIPELINES (APPLICATION TRACKER) ROUTES ---

// Get all applications
router.get('/applications', authenticateToken, async (req, res) => {
  try {
    const apps = await db.getApplications(req.user.id);
    res.json(apps);
  } catch (err) {
    console.error('Get applications error:', err);
    res.status(500).json({ error: 'Failed to retrieve job applications.' });
  }
});

// Create application
router.post('/applications', authenticateToken, async (req, res) => {
  const { company, role, status, dateApplied, appliedDate, notes, startDate, endDate, rounds } = req.body;
  if (!company || !role) {
    return res.status(400).json({ error: 'Company and Role are required fields.' });
  }

  try {
    const app = await db.createApplication(req.user.id, { 
      company, 
      role, 
      status, 
      dateApplied, 
      appliedDate, 
      notes, 
      startDate, 
      endDate, 
      rounds 
    });
    res.status(201).json(app);
  } catch (err) {
    console.error('Create application error:', err);
    res.status(500).json({ error: 'Failed to register job application.' });
  }
});

// Update application
router.put('/applications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const appData = req.body;

  try {
    const apps = await db.getApplications(req.user.id);
    const existing = apps.find(a => a.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Application not found or unauthorized.' });
    }

    const updated = await db.updateApplication(id, appData);
    res.json(updated);
  } catch (err) {
    console.error('Update application error:', err);
    res.status(500).json({ error: 'Failed to update application.' });
  }
});

// Delete application
router.delete('/applications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const apps = await db.getApplications(req.user.id);
    const existing = apps.find(a => a.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Application not found or unauthorized.' });
    }

    await db.deleteApplication(id);
    res.json({ message: 'Application successfully deleted.' });
  } catch (err) {
    console.error('Delete application error:', err);
    res.status(500).json({ error: 'Failed to delete application.' });
  }
});

// --- GLOBAL SOCIAL FEED ROUTE ---

// Get latest global achievements
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const feeds = await db.getFeed();
    res.json(feeds);
  } catch (err) {
    console.error('Get social feed error:', err);
    res.status(500).json({ error: 'Failed to retrieve social consistency feed.' });
  }
});

module.exports = router;
