const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  : '/api';

// Utility helper to execute HTTP requests with authorization headers
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('goalmate_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    const errorObj = new Error(data.error || 'An unexpected error occurred.');
    errorObj.status = response.status;
    throw errorObj;
  }

  return data;
}

const api = {
  // --- Authentication ---
  auth: {
    register: (username, email, password) => 
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
      }),

    login: (email, password) => 
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),

    getMe: () => 
      request('/auth/me', {
        method: 'GET'
      }),

    updateProfile: (username, avatar) => 
      request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ username, avatar })
      })
  },

  // --- Accountability/Social Connect ---
  social: {
    searchUsers: (query) => 
      request(`/users/search?q=${encodeURIComponent(query)}`, {
        method: 'GET'
      }),

    getFriends: () => 
      request('/friends/list', {
        method: 'GET'
      }),

    sendFriendRequest: ({ friendCode, username, friendId }) => 
      request('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ friendCode, username, friendId })
      }),

    respondFriendRequest: (requestId, status) => 
      request('/friends/respond', {
        method: 'POST',
        body: JSON.stringify({ requestId, status }) // status: 'accepted' | 'rejected'
      }),

    removeFriend: (friendId) => 
      request(`/friends/remove/${friendId}`, {
        method: 'DELETE'
      })
  },

  // --- Tasks Operations ---
  tasks: {
    getTasks: (date) => {
      const url = date ? `/tasks?date=${encodeURIComponent(date)}` : '/tasks';
      return request(url, { method: 'GET' });
    },

    createTask: (taskData) => 
      request('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      }),

    assignTask: (taskData) => 
      request('/tasks/assign', {
        method: 'POST',
        body: JSON.stringify(taskData)
      }),

    updateTask: (taskId, taskData) => 
      request(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(taskData)
      }),

    deleteTask: (taskId) => 
      request(`/tasks/${taskId}`, {
        method: 'DELETE'
      }),

    acceptTask: (taskId) => 
      request(`/tasks/${taskId}/accept`, {
        method: 'POST'
      }),

    rejectTask: (taskId) => 
      request(`/tasks/${taskId}/reject`, {
        method: 'POST'
      }),

    nudgeFriend: (friendId) => 
      request('/tasks/nudge', {
        method: 'POST',
        body: JSON.stringify({ friendId })
      })
  },

  // --- Team Chat Message histories ---
  chat: {
    getHistory: (friendId) => 
      request(`/chat/history/${friendId}`, {
        method: 'GET'
      }),

    markAsRead: (friendId) => 
      request(`/chat/read/${friendId}`, {
        method: 'POST'
      })
  },

  // --- Journals Reflect logs ---
  journals: {
    getJournals: () => 
      request('/journals', {
        method: 'GET'
      }),

    createJournal: (journalData) => 
      request('/journals', {
        method: 'POST',
        body: JSON.stringify(journalData)
      }),

    deleteJournal: (id) => 
      request(`/journals/${id}`, {
        method: 'DELETE'
      })
  },

  // --- Career Internships Pipeline ---
  career: {
    getApplications: () => 
      request('/applications', {
        method: 'GET'
      }),

    createApplication: (appData) => 
      request('/applications', {
        method: 'POST',
        body: JSON.stringify(appData)
      }),

    updateApplication: (appId, appData) => 
      request(`/applications/${appId}`, {
        method: 'PUT',
        body: JSON.stringify(appData)
      }),

    deleteApplication: (appId) => 
      request(`/applications/${appId}`, {
        method: 'DELETE'
      })
  },

  // --- Activity Feed ---
  feed: {
    getFeed: () => 
      request('/feed', {
        method: 'GET'
      })
  },

  // --- Notifications ---
  notifications: {
    getNotifications: (limit = 50) => 
      request(`/notifications?limit=${limit}`, {
        method: 'GET'
      }),

    getUnreadCount: () => 
      request('/notifications/unread-count', {
        method: 'GET'
      }),

    markRead: (notificationId) => 
      request(`/notifications/read/${notificationId}`, {
        method: 'POST'
      }),

    markAllRead: () => 
      request('/notifications/read-all', {
        method: 'POST'
      }),

    getPrefs: () => 
      request('/notifications/prefs', {
        method: 'GET'
      }),

    updatePrefs: (prefs) => 
      request('/notifications/prefs', {
        method: 'PUT',
        body: JSON.stringify(prefs)
      })
  },

  // --- Calling ---
  calls: {
    getHistory: () => 
      request('/calls/history', {
        method: 'GET'
      }),
    subscribePush: (subscription) => 
      request('/calls/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription })
      })
  }
};

export default api;
