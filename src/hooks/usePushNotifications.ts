import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { trackEvent } from '@/lib/analytics';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const { info, error: showError } = useToast();

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Check if already subscribed
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        setIsSubscribed(true);
        setSubscription(existingSubscription);
      }
    } catch (err) {
      console.error('Error checking subscription status:', err);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      showError('Not Supported', 'Push notifications are not supported in this browser.');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        info('Permission Granted', 'You will now receive notifications from Tradia.');
        trackEvent('feature_used', { feature: 'push_permission_granted' });
        return true;
      } else {
        showError('Permission Denied', 'Push notifications are disabled. You can enable them in your browser settings.');
        trackEvent('feature_used', { feature: 'push_permission_denied' });
        return false;
      }
    } catch (err) {
      console.error('Error requesting permission:', err);
      showError('Permission Error', 'Failed to request notification permission.');
      return false;
    }
  }, [isSupported, info, showError]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    // Request permission first
    const hasPermission = permission === 'granted' || await requestPermission();
    if (!hasPermission) return false;

    try {
      const registration = await navigator.serviceWorker.ready;

      // You'll need to get these from your push service (like Firebase, etc.)
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        showError('Configuration Error', 'Push notifications are not properly configured.');
        return false;
      }

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setSubscription(pushSubscription);
      setIsSubscribed(true);

      // Send subscription to your backend
      await sendSubscriptionToBackend(pushSubscription);

      info('Subscribed', 'You will now receive push notifications from Tradia.');
      trackEvent('feature_used', {
        feature: 'push_subscribed',
        endpoint: pushSubscription.endpoint,
      });

      return true;
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      showError('Subscription Failed', 'Failed to subscribe to push notifications.');
      trackEvent('feature_used', { feature: 'push_subscription_failed' });
      return false;
    }
  }, [isSupported, permission, requestPermission, info, showError]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;

    try {
      const success = await subscription.unsubscribe();
      if (success) {
        setSubscription(null);
        setIsSubscribed(false);

        // Remove subscription from backend
        await removeSubscriptionFromBackend(subscription);

        info('Unsubscribed', 'You will no longer receive push notifications.');
        trackEvent('feature_used', { feature: 'push_unsubscribed' });
      }

      return success;
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
      showError('Unsubscribe Failed', 'Failed to unsubscribe from push notifications.');
      return false;
    }
  }, [subscription, info, showError]);

  const sendNotification = useCallback(async (payload: PushNotificationPayload) => {
    if (!isSubscribed) {
      console.warn('Cannot send notification: not subscribed');
      return;
    }

    try {
      // In a real implementation, you'd send this to your push service
      // For now, we'll use the service worker directly for testing
      const registration = await navigator.serviceWorker.ready;

      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/icon-192x192.png',
        data: payload.data,
        // actions: payload.actions, // Not supported in all browsers
        // vibrate: [100, 50, 100], // Not in NotificationOptions type
        requireInteraction: false,
      });

      trackEvent('feature_used', {
        feature: 'push_notification_sent',
      });
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  }, [isSubscribed]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    sendNotification,
  };
};

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray as Uint8Array<ArrayBuffer>;
}

// Backend integration functions
async function sendSubscriptionToBackend(subscription: PushSubscription) {
  try {
    // Send subscription to your backend API
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      }),
    });
  } catch (err) {
    console.error('Failed to send subscription to backend:', err);
  }
}

async function removeSubscriptionFromBackend(subscription: PushSubscription) {
  try {
    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    });
  } catch (err) {
    console.error('Failed to remove subscription from backend:', err);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
