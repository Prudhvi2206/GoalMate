// Storage service for GoalMate
// Simulates a persistent server database in LocalStorage with rich mock data and real-time social events

const STORAGE_KEY = 'goalmate_db_v1';

// Preset categories and priorities
export const CATEGORIES = ['Work', 'Coding', 'Health', 'Habits', 'Career', 'General'];
export const PRIORITIES = ['High', 'Medium', 'Low'];

const DEFAULT_FRIENDS = [
  { id: 'f1', name: 'Sarah Miller', code: 'GM-28491', avatar: '👩‍💻', streak: 12, xp: 2450, level: 5, status: 'Active', activeTask: 'Refactoring React Hooks', online: true },
  { id: 'f2', name: 'Alex Rivera', code: 'GM-10982', avatar: '🏃‍♂️', streak: 8, xp: 1820, level: 4, status: 'Active', activeTask: 'Morning 5K Run', online: true },
  { id: 'f3', name: 'Marcus Chen', code: 'GM-57391', avatar: '🎨', streak: 3, xp: 980, level: 2, status: 'Idle', activeTask: 'Designing Figma Wireframes', online: false }
];

const DEFAULT_APPLICATIONS = [
  {
    id: 'a1',
    company: 'Google',
    role: 'Software Engineering Intern',
    appliedDate: '2026-05-10',
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    status: 'Interviewing',
    rounds: [
      { id: 'r1', name: 'Resume Screen', status: 'completed' },
      { id: 'r2', name: 'Online Coding Challenge', status: 'completed' },
      { id: 'r3', name: 'Technical Round 1 (Algorithms)', status: 'completed' },
      { id: 'r4', name: 'Technical Round 2 (System Design)', status: 'pending' },
      { id: 'r5', name: 'Behavioral Round', status: 'pending' }
    ]
  },
  {
    id: 'a2',
    company: 'Stripe',
    role: 'Frontend Architect Intern',
    appliedDate: '2026-05-01',
    startDate: '2026-06-15',
    endDate: '2026-09-15',
    status: 'Offered',
    rounds: [
      { id: 's1', name: 'Initial Screen', status: 'completed' },
      { id: 's2', name: 'Take-home Assessment', status: 'completed' },
      { id: 's3', name: 'Frontend Tech Review', status: 'completed' },
      { id: 's4', name: 'Culture Fit Chat', status: 'completed' }
    ]
  },
  {
    id: 'a3',
    company: 'Microsoft',
    role: 'Product Management Intern',
    appliedDate: '2026-05-18',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    status: 'Applied',
    rounds: [
      { id: 'm1', name: 'Resume Selection', status: 'completed' },
      { id: 'm2', name: 'First Round Phone Screen', status: 'pending' }
    ]
  }
];

const DEFAULT_FEED = [
  { id: 'feed-1', type: 'achievement', userName: 'Sarah Miller', avatar: '👩‍💻', content: 'unlocked the "Consistency King" Badge! 👑', time: '10 mins ago' },
  { id: 'feed-2', type: 'complete', userName: 'Alex Rivera', avatar: '🏃‍♂️', content: 'completed "Morning 5K Run" (Health) 🏃‍♂️', time: '1 hour ago' },
  { id: 'feed-3', type: 'complete', userName: 'Marcus Chen', avatar: '🎨', content: 'completed "Portfolio Homepage Wireframe" (Coding) 🎨', time: '3 hours ago' }
];

export const loadDatabase = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load local database, falling back to defaults", error);
  }

  // Generate initial database
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const defaultTasks = [
    {
      id: 't1',
      title: 'LeetCode Daily Challenge',
      description: 'Solve at least one Medium binary search or graph exploration question.',
      date: todayStr,
      startTime: '09:00',
      endTime: '10:30',
      duration: '1.5',
      priority: 'High',
      category: 'Coding',
      assignedTo: 'You',
      expiryTime: Date.now() + 45000000,
      status: 'pending',
      subtasks: [
        { id: 'sub-1', text: 'Solve daily search question', completed: true },
        { id: 'sub-2', text: 'Write down visual complexity proof', completed: false },
        { id: 'sub-3', text: 'Refactor code to single-pass linear time', completed: false }
      ],
      notes: 'Focus on recursion limit issues.'
    },
    {
      id: 't2',
      title: 'Update Internship Spreadsheet',
      description: 'Follow up with recruiter emails and record progress on the pipeline.',
      date: todayStr,
      startTime: '11:00',
      endTime: '12:00',
      duration: '1',
      priority: 'Medium',
      category: 'Career',
      assignedTo: 'You',
      expiryTime: Date.now() + 54000000,
      status: 'pending',
      subtasks: [
        { id: 'sub-4', text: 'Reply to Stripe recruiter', completed: false },
        { id: 'sub-5', text: 'Check Google Portal updates', completed: false }
      ],
      notes: 'Stripe recruiter asked for dates availability.'
    },
    {
      id: 't3',
      title: 'Evening Cardio & Stretch',
      description: '30 mins low-intensity running followed by foam rolling.',
      date: todayStr,
      startTime: '18:00',
      endTime: '19:00',
      duration: '1',
      priority: 'Low',
      category: 'Health',
      assignedTo: 'You',
      expiryTime: Date.now() + 79200000,
      status: 'completed',
      completedAt: Date.now() - 3600000,
      subtasks: [
        { id: 'sub-6', text: 'Run 5K track', completed: true },
        { id: 'sub-7', text: 'Hamstring stretch', completed: true }
      ],
      notes: 'Felt highly energized today.'
    },
    {
      id: 't4',
      title: 'Review System Design Fundamentals',
      description: 'Pre-schedule and outline tomorrow\'s prep on distributed rate limiters.',
      date: tomorrowStr,
      startTime: '10:00',
      endTime: '12:00',
      duration: '2',
      priority: 'Medium',
      category: 'Coding',
      assignedTo: 'You',
      expiryTime: Date.now() + 86400000 + 36000000,
      status: 'pending',
      subtasks: [
        { id: 'sub-8', text: 'Read token bucket paper', completed: false }
      ],
      notes: ''
    }
  ];

  const defaultJournal = [
    {
      id: 'j1',
      date: yesterdayStr,
      title: 'Productive Dashboard Setup',
      content: 'Finished drafting the base layouts for the task boards and analytics charts. Kept my LeetCode streak active. Felt robust.',
      mood: '📝',
      shared: true
    },
    {
      id: 'j2',
      date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
      title: 'Tired but persistent',
      content: 'Struggled to get out of bed early, but managed to finish all daily tasks after noon. Friends nudged me, which really helped.',
      mood: '🧘',
      shared: false
    }
  ];

  const defaultChat = [
    { id: 'c1', senderId: 'f1', receiverId: 'You', text: 'Hey Prudhvi! Did you solve today\'s LeetCode challenge? It was pretty tough.', timestamp: Date.now() - 7200000 },
    { id: 'c2', senderId: 'You', receiverId: 'f1', text: 'Yes, just completed it! I used a binary search approach.', timestamp: Date.now() - 3600000 },
    { id: 'c3', senderId: 'f1', receiverId: 'You', text: 'Awesome! Keep that streak going! 🚀', timestamp: Date.now() - 1800000 },
    { id: 'c4', senderId: 'f2', receiverId: 'You', text: 'Heading out for my morning run! Nudge me if I am not back by 8 AM.', timestamp: Date.now() - 14400000 }
  ];

  const initialDB = {
    auth: {
      isLoggedIn: true, // Seed logged in by default to let them play immediately
      email: 'user@goalmate.com',
      username: 'prudhvi_achiever'
    },
    user: {
      name: 'Prudhvi',
      username: 'prudhvi_achiever',
      code: 'GM-78392',
      streak: 5,
      level: 2,
      xp: 420,
      xpNeeded: 1000,
      totalCompleted: 24,
      totalMissed: 3,
      badges: [
        { id: 'b1', name: 'Streak Starter', icon: '🔥', description: 'Maintain a consistency streak for 5 days.' },
        { id: 'b2', name: 'Early Bird', icon: '🌅', description: 'Complete a High priority task before 10 AM.' },
        { id: 'b3', name: 'Interview Scout', icon: '💼', description: 'Log your first three internship applications.' }
      ]
    },
    tasks: defaultTasks,
    friends: DEFAULT_FRIENDS,
    pendingReceivedRequests: [
      { id: 'req-1', fromUser: 'Elena Rostova', code: 'GM-93049', avatar: '👩‍🚀' }
    ],
    pendingSentRequests: [],
    applications: DEFAULT_APPLICATIONS,
    feed: DEFAULT_FEED,
    journal: defaultJournal,
    chatHistory: defaultChat,
    activityLog: [
      { date: yesterdayStr, completed: 2, total: 3, hours: 4.5 },
      { date: new Date(Date.now() - 172800000).toISOString().split('T')[0], completed: 3, total: 3, hours: 6 },
      { date: new Date(Date.now() - 259200000).toISOString().split('T')[0], completed: 1, total: 2, hours: 2.5 },
      { date: new Date(Date.now() - 345600000).toISOString().split('T')[0], completed: 4, total: 4, hours: 8 },
      { date: new Date(Date.now() - 432000000).toISOString().split('T')[0], completed: 0, total: 1, hours: 0 }
    ],
    theme: 'dark'
  };

  saveDatabase(initialDB);
  return initialDB;
};

export const saveDatabase = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save local database", error);
  }
};

// Generates a mock update event from friends to make the social feed feel active and real-time
export const triggerRandomFriendAction = (db) => {
  const randomFriend = db.friends[Math.floor(Math.random() * db.friends.length)];
  const actionType = Math.random();
  let feedItem = null;

  if (actionType < 0.4) {
    // Friend completed a task
    const mockTasks = [
      'Finished mock interview practice with AI 🤖',
      'Completed LeetCode dynamic programming review 💻',
      'Completed 45-minute Strength Training workout 🏋️‍♂️',
      'Read 2 chapters of Designing Data-Intensive Applications 📚',
      'Submitted draft application to NVIDIA 🚀'
    ];
    const taskTitle = mockTasks[Math.floor(Math.random() * mockTasks.length)];
    const categories = ['Coding', 'Career', 'Health', 'General'];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    
    randomFriend.xp += 100;
    if (randomFriend.xp >= randomFriend.level * 1000) {
      randomFriend.level += 1;
      feedItem = {
        id: `feed-sim-${Date.now()}`,
        type: 'achievement',
        userName: randomFriend.name,
        avatar: randomFriend.avatar,
        content: `leveled up to Level ${randomFriend.level}! 🎉`,
        time: 'Just now'
      };
    } else {
      feedItem = {
        id: `feed-sim-${Date.now()}`,
        type: 'complete',
        userName: randomFriend.name,
        avatar: randomFriend.avatar,
        content: `completed "${taskTitle}" (${cat})`,
        time: 'Just now'
      };
    }
    
    randomFriend.activeTask = mockTasks[Math.floor(Math.random() * mockTasks.length)];
    randomFriend.status = 'Active';
  } else if (actionType < 0.7) {
    randomFriend.streak += 1;
    feedItem = {
      id: `feed-sim-${Date.now()}`,
      type: 'complete',
      userName: randomFriend.name,
      avatar: randomFriend.avatar,
      content: `extended their productivity streak to ${randomFriend.streak} days! 🔥`,
      time: 'Just now'
    };
  } else {
    const newTasks = [
      'Writing test cases for Node API',
      'Reviewing Resume bullet points',
      'Cooking meal-prep recipes',
      'Solving daily Sudoku'
    ];
    randomFriend.activeTask = newTasks[Math.floor(Math.random() * newTasks.length)];
    randomFriend.status = Math.random() > 0.3 ? 'Active' : 'Idle';
  }

  const updatedFeed = feedItem ? [feedItem, ...db.feed.slice(0, 15)] : db.feed;
  const updatedFriends = db.friends.map(f => f.id === randomFriend.id ? { ...randomFriend } : f);

  return {
    ...db,
    friends: updatedFriends,
    feed: updatedFeed
  };
};
