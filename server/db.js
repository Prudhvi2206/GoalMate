const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Seed Users Configuration
const SEED_USERS = [
  {
    id: 'sarah-uuid-1111',
    username: 'sarah',
    email: 'sarah@goalmate.com',
    password: 'password123', // Will be hashed
    code: 'GM-28491',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    xp: 2450,
    level: 12,
    online: false,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'alex-uuid-2222',
    username: 'alex',
    email: 'alex@goalmate.com',
    password: 'password123', // Will be hashed
    code: 'GM-10982',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    xp: 1820,
    level: 9,
    online: false,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'marcus-uuid-3333',
    username: 'marcus',
    email: 'marcus@goalmate.com',
    password: 'password123', // Will be hashed
    code: 'GM-57391',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    xp: 3100,
    level: 15,
    online: false,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

// --- MONGOOSE SCHEMAS ---

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  avatar: { type: String },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  online: { type: Boolean, default: false },
  lastSeen: { type: String },
  createdAt: { type: String }
}, { collection: 'users' });

const friendshipSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user1Id: { type: String, required: true },
  user2Id: { type: String, required: true },
  status: { type: String, default: 'pending' }, // 'pending' | 'accepted'
  senderId: { type: String, required: true },
  createdAt: { type: String }
}, { collection: 'friendships' });

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: String },
  startTime: { type: String },
  endTime: { type: String },
  duration: { type: String },
  priority: { type: String },
  category: { type: String },
  completed: { type: Boolean, default: false },
  checklist: { type: Array, default: [] }, // Array of checklist objects
  notes: { type: String, default: '' },
  assignedBy: { type: String, default: null },
  expiryTime: { type: String },
  warningSent: { type: Boolean, default: false },
  expired: { type: Boolean, default: false },
  completedAt: { type: String, default: null },
  acceptanceStatus: { type: String, default: 'accepted' },
  sharedTaskId: { type: String, default: null },
  completedBy: { type: String, default: null },
  assignedTo: { type: String, default: null }
}, { collection: 'tasks' });

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  content: { type: String },
  timestamp: { type: String },
  isRead: { type: Boolean, default: false },
  sharedTask: { type: mongoose.Schema.Types.Mixed, default: null },
  attachment: { type: String, default: null },
  reactions: { type: Array, default: [] }
}, { collection: 'messages' });

const journalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  mood: { type: String, default: '' },
  shared: { type: Number, default: 1 },
  date: { type: String },
  createdAt: { type: String }
}, { collection: 'journals' });

const applicationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  company: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, default: 'applied' },
  dateApplied: { type: String },
  notes: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  rounds: { type: mongoose.Schema.Types.Mixed, default: [] }
}, { collection: 'applications' });

const feedSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  type: { type: String },
  content: { type: String },
  timestamp: { type: String }
}, { collection: 'feed' });

// --- MONGOOSE MODELS ---

const User = mongoose.model('User', userSchema);
const Friendship = mongoose.model('Friendship', friendshipSchema);
const Task = mongoose.model('Task', taskSchema);
const Message = mongoose.model('Message', messageSchema);
const Journal = mongoose.model('Journal', journalSchema);
const Application = mongoose.model('Application', applicationSchema);
const Feed = mongoose.model('Feed', feedSchema);

function computeTaskStatus(task) {
  if (task.completed) {
    return 'completed';
  }
  if (task.expired) {
    return 'expired';
  }
  if (task.expiryTime) {
    const exp = new Date(task.expiryTime).getTime();
    if (!isNaN(exp) && exp < Date.now()) {
      return 'expired';
    }
  }
  return 'pending';
}

class DatabaseManager {
  constructor() {
    this.connectionUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/goalmate';
  }

  async initialize() {
    console.log('[DB] Connecting to MongoDB at:', this.connectionUri);
    try {
      await mongoose.connect(this.connectionUri);
      console.log('[DB] Connected to MongoDB database successfully.');

      // Seed default users if the users collection is completely empty
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('[DB] Database is empty. Seeding initial records...');
        await this.seed();
      }
    } catch (err) {
      console.error('[DB FATAL] MongoDB initialization failed:', err);
      throw err;
    }
  }

  async seed() {
    try {
      // Seed users
      for (const u of SEED_USERS) {
        const hashed = await bcrypt.hash(u.password, 10);
        const newUser = new User({
          ...u,
          password: hashed
        });
        await newUser.save();
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Seed initial tasks
      const task1 = new Task({
        id: uuidv4(),
        userId: 'sarah-uuid-1111',
        title: 'Complete System Architecture Draft',
        description: 'Detailing server and client real-time components',
        date: today,
        startTime: '09:00',
        endTime: '12:00',
        duration: '3 hours',
        priority: 'High',
        category: 'Engineering',
        completed: true,
        checklist: [{ id: 'c1', text: 'Define SQLite Tables', completed: true }, { id: 'c2', text: 'Add Fallback Handler', completed: true }],
        notes: 'Successfully implemented the dual-fallback DB schema!',
        assignedBy: null,
        expiryTime: new Date(now.getTime() + 12 * 3600 * 1000).toISOString(),
        warningSent: true,
        expired: false,
        completedAt: new Date().toISOString()
      });
      await task1.save();

      const task2 = new Task({
        id: uuidv4(),
        userId: 'marcus-uuid-3333',
        title: 'Review GoalMate PRs',
        description: 'Verify state and websocket synchronization rules',
        date: today,
        startTime: '14:00',
        endTime: '15:30',
        duration: '1.5 hours',
        priority: 'Medium',
        category: 'Review',
        completed: false,
        checklist: [],
        notes: '',
        assignedBy: null,
        expiryTime: new Date(now.getTime() + 18 * 3600 * 1000).toISOString(),
        warningSent: false,
        expired: false,
        completedAt: null
      });
      await task2.save();

      // Seed initial feed
      const feed1 = new Feed({
        id: uuidv4(),
        userId: 'sarah-uuid-1111',
        username: 'sarah',
        type: 'task_completed',
        content: 'completed a High priority task: Complete System Architecture Draft!',
        timestamp: new Date().toISOString()
      });
      await feed1.save();

      const feed2 = new Feed({
        id: uuidv4(),
        userId: 'marcus-uuid-3333',
        username: 'marcus',
        type: 'xp_milestone',
        content: 'reached 3,100 XP and leveled up to Level 15! 🚀',
        timestamp: new Date(now.getTime() - 2 * 3600 * 1000).toISOString()
      });
      await feed2.save();

      // Seed friendships
      const friendship1 = new Friendship({
        id: uuidv4(),
        user1Id: 'sarah-uuid-1111',
        user2Id: 'marcus-uuid-3333',
        status: 'accepted',
        senderId: 'sarah-uuid-1111',
        createdAt: new Date().toISOString()
      });
      await friendship1.save();

      const friendship2 = new Friendship({
        id: uuidv4(),
        user1Id: 'sarah-uuid-1111',
        user2Id: 'alex-uuid-2222',
        status: 'accepted',
        senderId: 'alex-uuid-2222',
        createdAt: new Date().toISOString()
      });
      await friendship2.save();

      console.log('[DB] Seeding finished successfully!');
    } catch (err) {
      console.error('[DB] Seeding failed:', err);
    }
  }

  // --- Auth API ---
  async getUserByEmail(email) {
    if (!email) return null;
    return await User.findOne({ email: new RegExp('^' + email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }).lean();
  }

  async getUserById(id) {
    if (!id) return null;
    return await User.findOne({ id }).lean();
  }

  async getUserByUsername(username) {
    if (!username) return null;
    return await User.findOne({ username: new RegExp('^' + username.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }).lean();
  }

  async getUserByCode(code) {
    if (!code) return null;
    return await User.findOne({ code: new RegExp('^' + code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }).lean();
  }

  async createUser({ username, email, password, code, avatar }) {
    const newUser = new User({
      id: uuidv4(),
      username,
      email,
      password,
      code,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      xp: 0,
      level: 1,
      online: false,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    await newUser.save();
    return newUser.toObject();
  }

  async searchUsers(query, excludeUserId) {
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');
    const users = await User.find({
      id: { $ne: excludeUserId },
      $or: [
        { username: regex },
        { code: regex }
      ]
    }).select('id username avatar code xp level online').lean();
    return users.map(u => ({ ...u, online: !!u.online }));
  }

  async updateUserXP(userId, xpAdded) {
    const user = await User.findOne({ id: userId });
    if (!user) return null;
    user.xp += xpAdded;
    const newLevel = Math.max(1, Math.floor(user.xp / 200) + 1);
    const leveledUp = newLevel > user.level;
    user.level = newLevel;
    await user.save();
    return { xp: user.xp, level: user.level, leveledUp };
  }

  async updateUserOnlineStatus(userId, online) {
    const user = await User.findOne({ id: userId });
    if (!user) return null;
    user.online = !!online;
    user.lastSeen = new Date().toISOString();
    await user.save();
    return user.toObject();
  }

  async updateUserProfile(userId, data) {
    const user = await User.findOne({ id: userId });
    if (!user) return null;
    if (data.avatar) user.avatar = data.avatar;
    if (data.username) user.username = data.username;
    await user.save();
    return user.toObject();
  }

  // --- Friends API ---
  async getFriends(userId) {
    const friendships = await Friendship.find({
      $or: [
        { user1Id: userId },
        { user2Id: userId }
      ]
    }).lean();

    const result = [];
    for (const f of friendships) {
      const friendId = f.user1Id === userId ? f.user2Id : f.user1Id;
      const friendUser = await User.findOne({ id: friendId }).lean();
      if (friendUser) {
        result.push({
          friendshipId: f.id,
          friendId: friendUser.id,
          username: friendUser.username,
          avatar: friendUser.avatar,
          code: friendUser.code,
          xp: friendUser.xp,
          level: friendUser.level,
          online: !!friendUser.online,
          lastSeen: friendUser.lastSeen,
          status: f.status,
          senderId: f.senderId
        });
      }
    }
    return result;
  }

  async sendFriendRequest(senderId, receiverId) {
    const existing = await Friendship.findOne({
      $or: [
        { user1Id: senderId, user2Id: receiverId },
        { user1Id: receiverId, user2Id: senderId }
      ]
    }).lean();

    if (existing) return existing;

    const request = new Friendship({
      id: uuidv4(),
      user1Id: senderId,
      user2Id: receiverId,
      status: 'pending',
      senderId,
      createdAt: new Date().toISOString()
    });
    await request.save();
    return request.toObject();
  }

  async respondFriendRequest(requestId, status) {
    const request = await Friendship.findOne({ id: requestId });
    if (!request) return null;

    if (status === 'accepted') {
      request.status = 'accepted';
      await request.save();
      return request.toObject();
    } else {
      await Friendship.deleteOne({ id: requestId });
      return { ...request.toObject(), status: 'rejected' };
    }
  }

  async removeFriend(userId, friendId) {
    const res = await Friendship.deleteOne({
      $or: [
        { user1Id: userId, user2Id: friendId },
        { user1Id: friendId, user2Id: userId }
      ]
    });
    return res.deletedCount > 0;
  }

  // --- Tasks API ---
  async getTasks(userId, date) {
    const query = { userId };
    if (date) {
      query.date = date;
    }
    const tasks = await Task.find(query).lean();
    return tasks.map(t => {
      let assignedTo = t.assignedTo;
      if (!assignedTo) {
        if (t.assignedBy) {
          assignedTo = t.sharedTaskId ? `Both:${t.assignedBy}` : 'You';
        } else if (t.sharedTaskId) {
          assignedTo = 'Both:Partner';
        } else {
          assignedTo = 'You';
        }
      }
      const mapped = {
        ...t,
        completed: !!t.completed,
        warningSent: !!t.warningSent,
        expired: !!t.expired,
        checklist: Array.isArray(t.checklist) ? t.checklist : [],
        assignedTo
      };
      mapped.status = computeTaskStatus(mapped);
      return mapped;
    });
  }

  async createTask(taskData) {
    let expiryTime = taskData.expiryTime;
    if (!expiryTime) {
      const targetDate = taskData.date || new Date().toISOString().split('T')[0];
      const targetEndTime = taskData.endTime || '23:59';
      const targetStartTime = taskData.startTime || '00:00';
      
      let expiryDateObj = new Date(`${targetDate}T${targetEndTime}:00+05:30`);
      
      // Support cross-midnight tasks: if endTime is smaller than startTime, task expires on the next day
      if (targetEndTime < targetStartTime) {
        const dateObj = new Date(targetDate);
        dateObj.setDate(dateObj.getDate() + 1);
        const nextDayStr = dateObj.toISOString().split('T')[0];
        expiryDateObj = new Date(`${nextDayStr}T${targetEndTime}:00+05:30`);
      }
      
      expiryTime = expiryDateObj.toISOString();
    }

    const task = new Task({
      id: uuidv4(),
      userId: taskData.userId,
      title: taskData.title,
      description: taskData.description || '',
      date: taskData.date,
      startTime: taskData.startTime || '00:00',
      endTime: taskData.endTime || '23:59',
      duration: taskData.duration || '24 hours',
      priority: taskData.priority || 'Medium',
      category: taskData.category || 'General',
      completed: !!taskData.completed,
      checklist: Array.isArray(taskData.checklist) ? taskData.checklist : [],
      notes: taskData.notes || '',
      assignedBy: taskData.assignedBy || null,
      expiryTime,
      warningSent: !!taskData.warningSent,
      expired: !!taskData.expired,
      completedAt: taskData.completed ? new Date().toISOString() : null,
      acceptanceStatus: taskData.acceptanceStatus || 'accepted',
      sharedTaskId: taskData.sharedTaskId || null,
      completedBy: taskData.completedBy || null,
      assignedTo: taskData.assignedTo || null
    });
    await task.save();
    
    const mapped = task.toObject();
    mapped.status = computeTaskStatus(mapped);
    return mapped;
  }

  async updateTask(taskId, taskData) {
    const task = await Task.findOne({ id: taskId });
    if (!task) return null;

    if (taskData.title !== undefined) task.title = taskData.title;
    if (taskData.description !== undefined) task.description = taskData.description;
    if (taskData.date !== undefined) task.date = taskData.date;
    if (taskData.startTime !== undefined) task.startTime = taskData.startTime;
    if (taskData.endTime !== undefined) task.endTime = taskData.endTime;
    if (taskData.duration !== undefined) task.duration = taskData.duration;
    if (taskData.priority !== undefined) task.priority = taskData.priority;
    if (taskData.category !== undefined) task.category = taskData.category;
    if (taskData.notes !== undefined) task.notes = taskData.notes;

    if (taskData.expiryTime !== undefined) {
      task.expiryTime = taskData.expiryTime;
    } else if (taskData.date !== undefined || taskData.endTime !== undefined) {
      const dateVal = taskData.date !== undefined ? taskData.date : task.date;
      const endTimeVal = taskData.endTime !== undefined ? taskData.endTime : task.endTime;
      const startTimeVal = taskData.startTime !== undefined ? taskData.startTime : task.startTime;
      
      let expiryDateObj = new Date(`${dateVal}T${endTimeVal || '23:59'}:00+05:30`);
      
      // Support cross-midnight tasks: if endTime is smaller than startTime, task expires on the next day
      if (endTimeVal && startTimeVal && endTimeVal < startTimeVal) {
        const dateObj = new Date(dateVal);
        dateObj.setDate(dateObj.getDate() + 1);
        const nextDayStr = dateObj.toISOString().split('T')[0];
        expiryDateObj = new Date(`${nextDayStr}T${endTimeVal}:00+05:30`);
      }
      
      task.expiryTime = expiryDateObj.toISOString();
    }

    if (taskData.completed !== undefined) {
      task.completed = !!taskData.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
    }
    if (taskData.checklist !== undefined) {
      task.checklist = Array.isArray(taskData.checklist) ? taskData.checklist : [];
    }
    if (taskData.warningSent !== undefined) task.warningSent = !!taskData.warningSent;
    if (taskData.expired !== undefined) task.expired = !!taskData.expired;
    if (taskData.acceptanceStatus !== undefined) task.acceptanceStatus = taskData.acceptanceStatus;
    if (taskData.sharedTaskId !== undefined) task.sharedTaskId = taskData.sharedTaskId;
    if (taskData.completedBy !== undefined) task.completedBy = taskData.completedBy;
    if (taskData.assignedTo !== undefined) task.assignedTo = taskData.assignedTo;

    await task.save();

    const mapped = task.toObject();
    mapped.status = computeTaskStatus(mapped);
    return mapped;
  }

  async deleteTask(taskId) {
    const res = await Task.deleteOne({ id: taskId });
    return res.deletedCount > 0;
  }

  async getTaskBySharedTaskId(sharedTaskId, excludeTaskId) {
    return await Task.findOne({ sharedTaskId, id: { $ne: excludeTaskId } }).lean();
  }

  // --- Chat/Messages API ---
  async getMessages(userId1, userId2) {
    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 }
      ]
    }).sort({ timestamp: 1 }).lean();

    return messages.map(m => ({
      ...m,
      isRead: !!m.isRead,
      reactions: Array.isArray(m.reactions) ? m.reactions : []
    }));
  }

  async createMessage({ senderId, receiverId, content, sharedTask, attachment }) {
    const message = new Message({
      id: uuidv4(),
      senderId,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
      isRead: false,
      sharedTask: sharedTask || null,
      attachment: attachment || null,
      reactions: []
    });
    await message.save();
    return message.toObject();
  }

  async addMessageReaction(messageId, userId, emoji) {
    const msg = await Message.findOne({ id: messageId });
    if (!msg) return null;
    
    if (!msg.reactions) msg.reactions = [];

    const index = msg.reactions.findIndex(r => r.userId === userId && r.emoji === emoji);
    if (index !== -1) {
      msg.reactions.splice(index, 1);
    } else {
      msg.reactions.push({ userId, emoji });
    }

    // Force Mongoose to mark the mixed array as modified
    msg.markModified('reactions');
    await msg.save();
    return msg.toObject();
  }

  async markMessagesAsRead(senderId, receiverId) {
    const res = await Message.updateMany(
      { senderId, receiverId, isRead: false },
      { $set: { isRead: true } }
    );
    return res.modifiedCount;
  }

  // --- Journals API ---
  async getJournalById(id) {
    if (!id) return null;
    return await Journal.findOne({ id }).lean();
  }

  async getJournalEntries(userId) {
    // 1. Get accepted friends
    const friendships = await Friendship.find({
      status: 'accepted',
      $or: [
        { user1Id: userId },
        { user2Id: userId }
      ]
    }).lean();

    const friendIds = friendships.map(f => f.user1Id === userId ? f.user2Id : f.user1Id);
    
    // 2. Fetch friend user objects for mapping usernames/avatars
    const friendUsers = await User.find({ id: { $in: friendIds } }).select('id username avatar').lean();
    const friendMap = {};
    friendUsers.forEach(u => {
      friendMap[u.id] = { username: u.username, avatar: u.avatar };
    });

    // 3. Query journals (own + friends' shared ones)
    const journals = await Journal.find({
      $or: [
        { userId },
        { userId: { $in: friendIds }, shared: { $in: [1, true] } }
      ]
    }).sort({ date: -1, createdAt: -1 }).lean();

    return journals.map(j => {
      const isFriendShared = j.userId !== userId;
      const mapped = {
        ...j,
        shared: j.shared === undefined ? 1 : j.shared,
        isSharedEntry: isFriendShared
      };
      if (isFriendShared && friendMap[j.userId]) {
        mapped.friendUsername = friendMap[j.userId].username;
        mapped.friendAvatar = friendMap[j.userId].avatar;
      }
      return mapped;
    });
  }

  async createJournalEntry(userId, arg2, arg3) {
    let title = '';
    let content = '';
    let mood = '';
    let shared = 1;
    let date = null;

    if (typeof arg2 === 'object' && arg2 !== null) {
      title = arg2.title || '';
      content = arg2.content || '';
      mood = arg2.mood || '';
      shared = arg2.shared !== undefined ? (arg2.shared ? 1 : 0) : 1;
      date = arg2.date || null;
    } else {
      content = arg2 || '';
      date = arg3 || null;
    }

    const entry = new Journal({
      id: uuidv4(),
      userId,
      title,
      content,
      mood,
      shared,
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    });
    await entry.save();
    return entry.toObject();
  }

  async deleteJournalEntry(id) {
    const res = await Journal.deleteOne({ id });
    return res.deletedCount > 0;
  }

  // --- Career Pipelines API ---
  async getApplications(userId) {
    return await Application.find({ userId }).sort({ dateApplied: -1 }).lean();
  }

  async createApplication(userId, appData) {
    const rounds = Array.isArray(appData.rounds)
      ? appData.rounds.map(r => typeof r === 'string' ? { id: uuidv4(), name: r, status: 'pending' } : r)
      : [];

    const app = new Application({
      id: uuidv4(),
      userId,
      company: appData.company,
      role: appData.role,
      status: appData.status || 'applied',
      dateApplied: appData.dateApplied || appData.appliedDate || new Date().toISOString().split('T')[0],
      notes: appData.notes || '',
      startDate: appData.startDate || '',
      endDate: appData.endDate || '',
      rounds
    });
    await app.save();
    return app.toObject();
  }

  async updateApplication(appId, appData) {
    const updateFields = {};

    if (appData.company !== undefined) updateFields.company = appData.company;
    if (appData.role !== undefined) updateFields.role = appData.role;
    if (appData.status !== undefined) updateFields.status = appData.status;
    if (appData.dateApplied !== undefined) updateFields.dateApplied = appData.dateApplied;
    if (appData.appliedDate !== undefined) updateFields.dateApplied = appData.appliedDate;
    if (appData.notes !== undefined) updateFields.notes = appData.notes;
    if (appData.startDate !== undefined) updateFields.startDate = appData.startDate;
    if (appData.endDate !== undefined) updateFields.endDate = appData.endDate;
    if (appData.rounds !== undefined) {
      let parsed = appData.rounds;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (e) {
          console.error("Failed to parse rounds JSON", e);
        }
      }
      updateFields.rounds = parsed;
    }

    const updated = await Application.findOneAndUpdate(
      { id: appId },
      { $set: updateFields },
      { new: true, lean: true }
    );
    return updated;
  }

  async deleteApplication(appId) {
    const res = await Application.deleteOne({ id: appId });
    return res.deletedCount > 0;
  }

  // --- Feed API ---
  async getFeed() {
    return await Feed.find().sort({ timestamp: -1 }).limit(50).lean();
  }

  async createFeedItem({ userId, username, type, content }) {
    const item = new Feed({
      id: uuidv4(),
      userId,
      username,
      type,
      content,
      timestamp: new Date().toISOString()
    });
    await item.save();
    return item.toObject();
  }
}

module.exports = new DatabaseManager();
