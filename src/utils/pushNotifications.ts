import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

// Helper to convert base64 VAPID public key to Uint8Array required by pushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if notifications are supported and permitted in this browser
 */
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permissions and register service worker to get a PushSubscription
 */
export async function subscribeToPushNotifications(currentUserUid: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { success: false, error: 'Push notifications are not supported in this browser.' };
    }

    // 1. Request Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied.' };
    }

    // 2. Register / Get active Service Worker Registration
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    // Wait for the service worker to become active
    await navigator.serviceWorker.ready;

    // 3. Fetch VAPID public key from backend
    const response = await fetch('/api/vapid-public-key');
    if (!response.ok) {
      throw new Error('Failed to fetch public VAPID key from backend');
    }
    const { publicKey } = await response.json();

    if (!publicKey) {
      throw new Error('Public VAPID key is empty or not configured');
    }

    // 4. Subscribe the user using pushManager
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    // 5. Save subscription to Firestore under current user's profile
    const userDocRef = doc(db, 'users', currentUserUid);
    
    // We convert the subscription to a plain object to store safely in Firestore
    const subscriptionJson = subscription.toJSON();

    await updateDoc(userDocRef, {
      pushSubscriptions: arrayUnion(subscriptionJson)
    });

    console.log('Successfully registered for Push Notifications and saved to Firestore!');
    return { success: true };

  } catch (error: any) {
    console.error('Failed to subscribe to Push Notifications:', error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}

/**
 * Triggers a push notification to a recipient user from the backend
 */
export async function sendFriendRequestPushNotification(recipientUid: string, senderName: string): Promise<boolean> {
  try {
    const response = await fetch('/api/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientUid,
        title: 'New Friend Request! 🤝',
        body: `${senderName} has added you as a friend on Seniority Social Club!`,
        url: '/'
      }),
    });

    if (!response.ok) {
      console.warn('Backend responded with error for send-push:', await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to trigger push notification:', error);
    return false;
  }
}
