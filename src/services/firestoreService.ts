import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  limit,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Message, Channel, Workspace, Reaction } from '../types/index';

// ============================================
// WORKSPACE OPERATIONS
// ============================================

export const createWorkspace = async (
  name: string,
  ownerId: string,
  icon?: string
): Promise<string> => {
  const workspaceRef = await addDoc(collection(db, 'workspaces'), {
    name,
    ownerId,
    icon: icon || null,
    createdAt: serverTimestamp(),
  });
  return workspaceRef.id;
};

export const getWorkspacesByUser = async (userId: string): Promise<Workspace[]> => {
  const q = query(collection(db, 'workspaces'), where('ownerId', '==', userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
    ownerId: doc.data().ownerId,
    icon: doc.data().icon,
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
  }));
};

export const subscribeToWorkspaces = (
  userId: string,
  callback: (workspaces: Workspace[]) => void
) => {
  const q = query(collection(db, 'workspaces'), where('ownerId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const workspaces = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      ownerId: doc.data().ownerId,
      icon: doc.data().icon,
      createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
    }));
    callback(workspaces);
  });
};

// ============================================
// CHANNEL OPERATIONS
// ============================================

export const createChannel = async (
  workspaceId: string,
  name: string,
  createdBy: string,
  description?: string,
  isPrivate: boolean = false
): Promise<string> => {
  const channelRef = await addDoc(collection(db, 'channels'), {
    workspaceId,
    name,
    description: description || null,
    isPrivate,
    createdBy,
    createdAt: serverTimestamp(),
    members: [createdBy],
  });
  return channelRef.id;
};

export const getChannelsByWorkspace = async (workspaceId: string): Promise<Channel[]> => {
  const q = query(collection(db, 'channels'), where('workspaceId', '==', workspaceId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    workspaceId: doc.data().workspaceId,
    name: doc.data().name,
    description: doc.data().description,
    isPrivate: doc.data().isPrivate,
    createdBy: doc.data().createdBy,
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
    members: doc.data().members || [],
  }));
};

export const subscribeToChannels = (
  workspaceId: string,
  callback: (channels: Channel[]) => void
) => {
  const q = query(collection(db, 'channels'), where('workspaceId', '==', workspaceId));

  return onSnapshot(q, (snapshot) => {
    const channels = snapshot.docs.map((doc) => ({
      id: doc.id,
      workspaceId: doc.data().workspaceId,
      name: doc.data().name,
      description: doc.data().description,
      isPrivate: doc.data().isPrivate,
      createdBy: doc.data().createdBy,
      createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      members: doc.data().members || [],
    }));
    callback(channels);
  });
};

export const addChannelMember = async (channelId: string, userId: string): Promise<void> => {
  const channelRef = doc(db, 'channels', channelId);
  const channelSnap = await getDoc(channelRef);

  if (channelSnap.exists()) {
    const members = channelSnap.data().members || [];
    if (!members.includes(userId)) {
      await updateDoc(channelRef, {
        members: [...members, userId],
      });
    }
  }
};

export const deleteChannel = async (channelId: string): Promise<void> => {
  await deleteDoc(doc(db, 'channels', channelId));
};

// ============================================
// MESSAGE OPERATIONS
// ============================================

export const sendMessage = async (
  channelId: string,
  userId: string,
  content: string,
  threadId?: string
): Promise<string> => {
  const messageRef = await addDoc(collection(db, 'messages'), {
    channelId,
    userId,
    content,
    threadId: threadId || null,
    reactions: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return messageRef.id;
};

export const updateMessage = async (messageId: string, content: string): Promise<void> => {
  const messageRef = doc(db, 'messages', messageId);
  await updateDoc(messageRef, {
    content,
    updatedAt: serverTimestamp(),
  });
};

export const deleteMessage = async (messageId: string): Promise<void> => {
  await deleteDoc(doc(db, 'messages', messageId));
};

export const addReaction = async (
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> => {
  const messageRef = doc(db, 'messages', messageId);
  const messageSnap = await getDoc(messageRef);

  if (messageSnap.exists()) {
    const reactions: Reaction[] = messageSnap.data().reactions || [];
    const existingReaction = reactions.find((r) => r.emoji === emoji);

    if (existingReaction) {
      if (!existingReaction.userIds.includes(userId)) {
        existingReaction.userIds.push(userId);
        existingReaction.count = existingReaction.userIds.length;
      } else {
        // Remove user from reaction
        existingReaction.userIds = existingReaction.userIds.filter((id) => id !== userId);
        existingReaction.count = existingReaction.userIds.length;
      }

      // Filter out reactions with no users
      const updatedReactions = reactions.filter((r) => r.userIds.length > 0);

      await updateDoc(messageRef, {
        reactions: updatedReactions,
      });
    } else {
      await updateDoc(messageRef, {
        reactions: [
          ...reactions,
          {
            emoji,
            userIds: [userId],
            count: 1,
          },
        ],
      });
    }
  }
};

export const subscribeToMessages = (
  channelId: string,
  callback: (messages: Message[]) => void
) => {
  // Simplified query - filter threadId on client side to avoid composite index requirement
  const q = query(
    collection(db, 'messages'),
    where('channelId', '==', channelId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const allMessages = snapshot.docs.map((doc) => ({
      id: doc.id,
      channelId: doc.data().channelId,
      userId: doc.data().userId,
      content: doc.data().content,
      createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (doc.data().updatedAt as Timestamp)?.toDate(),
      reactions: doc.data().reactions || [],
      threadId: doc.data().threadId,
    }));

    // Filter out thread replies on the client side
    const messages = allMessages.filter((m) => !m.threadId);
    callback(messages);
  });
};

export const subscribeToThreadReplies = (
  threadId: string,
  callback: (messages: Message[]) => void
) => {
  const q = query(
    collection(db, 'messages'),
    where('threadId', '==', threadId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      channelId: doc.data().channelId,
      userId: doc.data().userId,
      content: doc.data().content,
      createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (doc.data().updatedAt as Timestamp)?.toDate(),
      reactions: doc.data().reactions || [],
      threadId: doc.data().threadId,
    }));
    callback(messages);
  });
};
