import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
  get,
  update,
  remove,
} from 'firebase/database';
import { doc, setDoc } from 'firebase/firestore';
import { realtimeDb, db } from '../lib/firebase';

// ============================================
// ONLINE/OFFLINE PRESENCE
// ============================================

export const setUserOnline = async (userId: string) => {
  const userStatusRef = ref(realtimeDb, `status/${userId}`);

  // Set user as online
  await set(userStatusRef, {
    state: 'online',
    lastChanged: serverTimestamp(),
  });

  // When user disconnects, set to offline
  await onDisconnect(userStatusRef).set({
    state: 'offline',
    lastChanged: serverTimestamp(),
  });

  // Also update Firestore
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, {
    status: 'online',
    lastSeen: new Date(),
  }, { merge: true });
};

export const setUserOffline = async (userId: string) => {
  const userStatusRef = ref(realtimeDb, `status/${userId}`);

  await set(userStatusRef, {
    state: 'offline',
    lastChanged: serverTimestamp(),
  });

  // Also update Firestore
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, {
    status: 'offline',
    lastSeen: new Date(),
  }, { merge: true });
};

export const setUserAway = async (userId: string) => {
  const userStatusRef = ref(realtimeDb, `status/${userId}`);

  await set(userStatusRef, {
    state: 'away',
    lastChanged: serverTimestamp(),
  });

  // Also update Firestore
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, {
    status: 'away',
  }, { merge: true });
};

export const subscribeToUserPresence = (
  userId: string,
  callback: (status: 'online' | 'offline' | 'away') => void
) => {
  const userStatusRef = ref(realtimeDb, `status/${userId}`);

  return onValue(userStatusRef, (snapshot) => {
    const data = snapshot.val();
    if (data && data.state) {
      callback(data.state);
    } else {
      callback('offline');
    }
  });
};

export const subscribeToMultipleUsersPresence = (
  userIds: string[],
  callback: (presenceMap: Record<string, 'online' | 'offline' | 'away'>) => void
) => {
  const unsubscribers: (() => void)[] = [];
  const presenceMap: Record<string, 'online' | 'offline' | 'away'> = {};

  userIds.forEach((userId) => {
    const userStatusRef = ref(realtimeDb, `status/${userId}`);
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val();
      presenceMap[userId] = data?.state || 'offline';
      callback({ ...presenceMap });
    });
    unsubscribers.push(unsubscribe);
  });

  // Return function to unsubscribe from all
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
};

// ============================================
// TYPING INDICATORS
// ============================================

export const setUserTyping = async (channelId: string, userId: string, userName: string) => {
  const typingRef = ref(realtimeDb, `typing/${channelId}/${userId}`);

  await set(typingRef, {
    userName,
    timestamp: serverTimestamp(),
  });

  // Auto-remove after 5 seconds
  await onDisconnect(typingRef).remove();

  // Set a timeout to remove typing indicator
  setTimeout(async () => {
    await remove(typingRef);
  }, 5000);
};

export const removeUserTyping = async (channelId: string, userId: string) => {
  const typingRef = ref(realtimeDb, `typing/${channelId}/${userId}`);
  await remove(typingRef);
};

export const subscribeToTypingIndicators = (
  channelId: string,
  currentUserId: string,
  callback: (typingUsers: { userId: string; userName: string }[]) => void
) => {
  const typingRef = ref(realtimeDb, `typing/${channelId}`);

  return onValue(typingRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const typingUsers = Object.entries(data)
        .filter(([userId]) => userId !== currentUserId)
        .map(([userId, userData]: [string, any]) => ({
          userId,
          userName: userData.userName,
        }));

      callback(typingUsers);
    } else {
      callback([]);
    }
  });
};
