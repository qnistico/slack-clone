import { ref, onValue, set, get } from 'firebase/database';
import { realtimeDb } from '../lib/firebase';

export interface UnreadNotification {
  type: 'dm' | 'mention' | 'call';
  fromUserId: string;
  fromUserName: string;
  channelId: string;
  workspaceId?: string; // Workspace to navigate to when clicking notification
  content?: string;
  timestamp: number;
}

/**
 * Subscribe to unread notifications for a user
 */
export function subscribeToUnreadNotifications(
  userId: string,
  onNotificationsChange: (notifications: UnreadNotification[]) => void
): () => void {
  console.log('Subscribing to notifications for user:', userId);
  const notificationsRef = ref(realtimeDb, `notifications/${userId}`);

  const unsubscribe = onValue(notificationsRef, (snapshot) => {
    const data = snapshot.val() as Record<string, UnreadNotification> | null;
    console.log('Notifications snapshot:', data);
    if (data) {
      const notifications = Object.values(data);
      // Sort by timestamp, newest first
      notifications.sort((a, b) => b.timestamp - a.timestamp);
      console.log('Notifications found:', notifications.length);
      onNotificationsChange(notifications);
    } else {
      console.log('No notifications found');
      onNotificationsChange([]);
    }
  }, (error) => {
    console.error('Error subscribing to notifications:', error);
  });

  return () => unsubscribe();
}

/**
 * Add a notification for a user
 */
export async function addNotification(
  toUserId: string,
  notification: Omit<UnreadNotification, 'timestamp'>
): Promise<void> {
  console.log('Adding notification for user:', toUserId, notification);
  const notificationId = `${notification.type}_${notification.channelId}_${Date.now()}`;
  const notificationRef = ref(realtimeDb, `notifications/${toUserId}/${notificationId}`);

  try {
    await set(notificationRef, {
      ...notification,
      timestamp: Date.now(),
    });
    console.log('Notification added successfully');
  } catch (error) {
    console.error('Error adding notification:', error);
    throw error;
  }
}

/**
 * Clear all notifications for a user
 */
export async function clearNotifications(userId: string): Promise<void> {
  const notificationsRef = ref(realtimeDb, `notifications/${userId}`);
  await set(notificationsRef, null);
}

/**
 * Clear notifications for a specific channel
 */
export async function clearChannelNotifications(
  userId: string,
  channelId: string
): Promise<void> {
  const notificationsRef = ref(realtimeDb, `notifications/${userId}`);
  const snapshot = await get(notificationsRef);
  const data = snapshot.val() as Record<string, UnreadNotification> | null;

  if (data) {
    for (const [key, notification] of Object.entries(data)) {
      if (notification.channelId === channelId) {
        await set(ref(realtimeDb, `notifications/${userId}/${key}`), null);
      }
    }
  }
}

/**
 * Get the count of unread notifications
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const notificationsRef = ref(realtimeDb, `notifications/${userId}`);
  const snapshot = await get(notificationsRef);
  const data = snapshot.val() as Record<string, UnreadNotification> | null;

  return data ? Object.keys(data).length : 0;
}
