// GoalMate Notification Service
// Manages Service Worker registration and native push notification delivery

const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`)
  : '/api';

let swRegistration = null;

/**
 * Register the Service Worker for background notifications
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[NotificationService] Service Workers not supported in this browser.');
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[NotificationService] Service Worker registered successfully.');
    return swRegistration;
  } catch (err) {
    console.error('[NotificationService] Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Request browser notification permission
 * @returns {Promise<string>} 'granted' | 'denied' | 'default'
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('[NotificationService] Notifications not supported.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Send a notification to the Service Worker to display as a native push notification.
 * Falls back to `new Notification()` if SW is not available.
 */
export function showNativeNotification({ title, body, type, data, tag }) {
  const displayTitle = 'GoalMate';
  const displayBody = body ? `${title}\n${body}` : title;

  // Check if we should use Service Worker
  if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        title: displayTitle,
        body: displayBody,
        tag: tag || `goalmate-${type}-${Date.now()}`,
        data: {
          type,
          ...data
        },
        icon: '/favicon.svg'
      }
    });
    return;
  }

  // Fallback: Direct Notification API (only works when tab is focused)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(displayTitle, {
        body: displayBody,
        icon: '/favicon.svg',
        tag: tag || `goalmate-${type}-${Date.now()}`
      });
    } catch (e) {
      console.warn('[NotificationService] Native notification fallback failed:', e);
    }
  }
}

/**
 * Listen for Service Worker messages (e.g., notification click navigation)
 * @param {Function} onNotificationClick - callback receiving notification data
 */
export function onServiceWorkerMessage(onNotificationClick) {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, data } = event.data || {};
    if (type === 'NOTIFICATION_CLICK' && onNotificationClick) {
      onNotificationClick(data);
    }
  });
}

/**
 * Check if the app/page is currently visible
 */
export function isPageVisible() {
  return document.visibilityState === 'visible';
}

/**
 * Sync the JWT auth token to the Service Worker so it can call APIs in the background
 */
export function syncTokenWithServiceWorker(token) {
  if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage({
      type: 'SET_TOKEN',
      payload: { token }
    });
  }
}

// Convert URL-safe base64 to Uint8Array for VAPID key subscription
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
 
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
 
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe user to Web Push notifications via Service Worker PushManager
 */
export async function subscribeToPushNotifications(token) {
  if (!swRegistration) {
    console.warn('[NotificationService] SW not registered yet.');
    return;
  }

  try {
    // 1. Fetch public VAPID key
    const res = await fetch(`${API_BASE_URL}/calls/vapid-public-key`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { publicKey } = await res.json();

    if (!publicKey) {
      console.warn('[NotificationService] No VAPID public key received.');
      return;
    }

    // 2. Request push subscription
    const convertedKey = urlBase64ToUint8Array(publicKey);
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    // 3. Send subscription to server
    await fetch(`${API_BASE_URL}/calls/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ subscription })
    });

    console.log('[NotificationService] Push Subscription successful.');
  } catch (err) {
    console.error('[NotificationService] Failed to subscribe to Web Push:', err);
  }
}
