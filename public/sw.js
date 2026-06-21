// GoalMate Service Worker - Background Notification Engine
// This service worker enables native push notifications even when the app tab is not focused.

const APP_NAME = 'GoalMate';
const NOTIFICATION_ICON = '/favicon.svg';

let authToken = null;

// Install event - activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

// Activate event - claim all clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SET_TOKEN') {
    authToken = payload.token;
    console.log('[SW] Authentication token synchronized.');
  }

  if (type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data, icon } = payload;

    const options = {
      body: body || `${APP_NAME} Alert`,
      icon: icon || NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      tag: tag || `goalmate-${Date.now()}`,
      data: data || {},
      vibrate: [100, 50, 100],
      requireInteraction: false,
      silent: false,
      actions: []
    };

    // Add context-specific actions
    if (data?.type?.startsWith('task_') || data?.type?.startsWith('chat_')) {
      options.actions = [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    }

    event.waitUntil(
      self.registration.showNotification(title || APP_NAME, options)
    );
  }
});

// Handle background incoming push notifications (e.g. Call events)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    
    if (payload.type === 'incoming_call') {
      const { title, body, data } = payload;
      
      const options = {
        body: body || 'GoalMate Incoming Call',
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_ICON,
        tag: `call-${data.callId}`,
        data: {
          type: 'incoming_call',
          ...data
        },
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 400],
        actions: [
          { action: 'accept', title: 'Accept' },
          { action: 'decline', title: 'Decline' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    }
  } catch (err) {
    console.error('[SW] Failed to parse push notification content:', err);
  }
});

// Handle notification click - navigate to the relevant view or perform call API actions
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  const action = event.action;

  notification.close();

  if (action === 'dismiss') return;

  // Handle incoming call click actions
  if (data.type === 'incoming_call') {
    if (action === 'decline') {
      // Reject call via API
      event.waitUntil(
        fetch('/api/calls/reject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            callId: data.callId,
            callerId: data.callerId
          })
        }).catch(err => console.error('[SW] Failed to reject call via API:', err))
      );
      return;
    }

    // Accept action (or clicked on notification directly)
    let targetUrl = `/?view=chat&action=accept_call&callId=${data.callId || ''}&callerId=${data.callerId || ''}&callType=${data.callType || ''}`;
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If the app is already open, focus it and emit action
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: {
                type: 'incoming_call',
                action: action || 'accept',
                ...data
              }
            });
            return client.focus();
          }
        }
        // Otherwise, open a new window
        return self.clients.openWindow(targetUrl);
      })
    );
    return;
  }

  // Determine the URL to navigate to based on notification type
  let targetUrl = '/';

  if (data.type?.startsWith('chat_')) {
    targetUrl = `/?view=chat&userId=${data.chatUserId || ''}`;
  } else if (data.type?.startsWith('task_')) {
    targetUrl = `/?view=dashboard&taskId=${data.taskId || ''}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: data
          });
          return client.focus();
        }
      }
      // Otherwise, open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed:', event.notification.tag);
});
