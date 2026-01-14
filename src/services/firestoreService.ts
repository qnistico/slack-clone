import {
  collection,
  doc,
  addDoc,
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
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Message, Channel, Workspace, Reaction, WorkspaceInvite } from '../types/index';

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
    members: [ownerId], // Owner is automatically a member
    icon: icon || null,
    createdAt: serverTimestamp(),
  });
  return workspaceRef.id;
};

export const deleteWorkspace = async (workspaceId: string): Promise<void> => {
  // Delete all channels in the workspace
  const channelsQuery = query(collection(db, 'channels'), where('workspaceId', '==', workspaceId));
  const channelsSnapshot = await getDocs(channelsQuery);

  const deletePromises = channelsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);

  // Delete all messages in the workspace channels
  const messagesQuery = query(collection(db, 'messages'), where('channelId', 'in',
    channelsSnapshot.docs.length > 0 ? channelsSnapshot.docs.map(d => d.id) : ['__non_existent__']
  ));
  const messagesSnapshot = await getDocs(messagesQuery);

  const deleteMessagePromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deleteMessagePromises);

  // Delete the workspace
  await deleteDoc(doc(db, 'workspaces', workspaceId));
};

export const getWorkspacesByUser = async (userId: string): Promise<Workspace[]> => {
  try {
    // Try to query for workspaces where user is a member
    const memberQuery = query(collection(db, 'workspaces'), where('members', 'array-contains', userId));
    const memberSnapshot = await getDocs(memberQuery);

    // Also query for workspaces where user is the owner (for backwards compatibility)
    const ownerQuery = query(collection(db, 'workspaces'), where('ownerId', '==', userId));
    const ownerSnapshot = await getDocs(ownerQuery);

    // Combine results and deduplicate
    const workspaceMap = new Map<string, Workspace>();

    [...memberSnapshot.docs, ...ownerSnapshot.docs].forEach((doc) => {
      if (!workspaceMap.has(doc.id)) {
        workspaceMap.set(doc.id, {
          id: doc.id,
          name: doc.data().name,
          ownerId: doc.data().ownerId,
          members: doc.data().members || [doc.data().ownerId],
          icon: doc.data().icon,
          createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
        });
      }
    });

    return Array.from(workspaceMap.values());
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    // Fallback to owner-only query if members query fails
    const ownerQuery = query(collection(db, 'workspaces'), where('ownerId', '==', userId));
    const ownerSnapshot = await getDocs(ownerQuery);

    return ownerSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      ownerId: doc.data().ownerId,
      members: doc.data().members || [doc.data().ownerId],
      icon: doc.data().icon,
      createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
    }));
  }
};

export const subscribeToWorkspaces = (
  userId: string,
  callback: (workspaces: Workspace[]) => void
) => {
  // We need to subscribe to both queries:
  // 1. Workspaces where user is in members array (new workspaces + invited workspaces)
  // 2. Workspaces where user is owner (for backwards compatibility with old workspaces)

  const memberQuery = query(collection(db, 'workspaces'), where('members', 'array-contains', userId));
  const ownerQuery = query(collection(db, 'workspaces'), where('ownerId', '==', userId));

  let memberWorkspaces: Workspace[] = [];
  let ownerWorkspaces: Workspace[] = [];

  const mergeAndCallback = () => {
    // Merge results and deduplicate by ID
    const workspaceMap = new Map<string, Workspace>();

    [...memberWorkspaces, ...ownerWorkspaces].forEach((workspace) => {
      if (!workspaceMap.has(workspace.id)) {
        workspaceMap.set(workspace.id, workspace);
      }
    });

    callback(Array.from(workspaceMap.values()));
  };

  const unsubscribeMember = onSnapshot(
    memberQuery,
    (snapshot) => {
      memberWorkspaces = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        ownerId: doc.data().ownerId,
        members: doc.data().members || [doc.data().ownerId],
        icon: doc.data().icon,
        createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      }));
      mergeAndCallback();
    },
    (error) => {
      console.error('Error in member workspaces subscription:', error);
      // Don't clear workspaces on error
    }
  );

  const unsubscribeOwner = onSnapshot(
    ownerQuery,
    (snapshot) => {
      ownerWorkspaces = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        ownerId: doc.data().ownerId,
        members: doc.data().members || [doc.data().ownerId],
        icon: doc.data().icon,
        createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      }));
      mergeAndCallback();
    },
    (error) => {
      console.error('Error in owner workspaces subscription:', error);
      // Don't clear workspaces on error
    }
  );

  // Return a function that unsubscribes from both
  return () => {
    unsubscribeMember();
    unsubscribeOwner();
  };
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

  return onSnapshot(
    q,
    (snapshot) => {
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
    },
    (error) => {
      console.error('Error in channels subscription:', error);
      // Don't call callback with empty array on error - keep existing data
    }
  );
};

export const addChannelMember = async (channelId: string, userId: string): Promise<void> => {
  const channelRef = doc(db, 'channels', channelId);
  await updateDoc(channelRef, {
    members: arrayUnion(userId),
  });
};

export const deleteChannel = async (channelId: string): Promise<void> => {
  await deleteDoc(doc(db, 'channels', channelId));
};

export const updateChannel = async (
  channelId: string,
  updates: { name?: string; description?: string; isPrivate?: boolean }
): Promise<void> => {
  const channelRef = doc(db, 'channels', channelId);
  await updateDoc(channelRef, updates);
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

// Track in-flight reaction operations to prevent race conditions
const pendingReactions = new Map<string, Promise<void>>();

export const addReaction = async (
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> => {
  // Create a unique key for this reaction operation
  const operationKey = `${messageId}-${emoji}-${userId}`;

  // If there's already a pending operation for this exact reaction, skip
  if (pendingReactions.has(operationKey)) {
    console.log('addReaction: Skipping duplicate operation:', operationKey);
    return pendingReactions.get(operationKey);
  }

  console.log('addReaction called:', { messageId, emoji, userId });

  const operation = (async () => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);

      if (messageSnap.exists()) {
        const reactions: Reaction[] = messageSnap.data().reactions || [];
        const existingReaction = reactions.find((r) => r.emoji === emoji);

        console.log('addReaction: Current reactions:', reactions);
        console.log('addReaction: Existing reaction for emoji:', existingReaction);

        if (existingReaction) {
          if (!existingReaction.userIds.includes(userId)) {
            console.log('addReaction: Adding user to existing reaction');
            existingReaction.userIds.push(userId);
            existingReaction.count = existingReaction.userIds.length;
          } else {
            // Remove user from reaction
            console.log('addReaction: Removing user from existing reaction');
            existingReaction.userIds = existingReaction.userIds.filter((id) => id !== userId);
            existingReaction.count = existingReaction.userIds.length;
          }

          // Filter out reactions with no users
          const updatedReactions = reactions.filter((r) => r.userIds.length > 0);

          console.log('addReaction: Updated reactions:', updatedReactions);

          await updateDoc(messageRef, {
            reactions: updatedReactions,
          });
        } else {
          console.log('addReaction: Creating new reaction');
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
    } finally {
      // Clean up the pending operation after a short delay
      setTimeout(() => {
        pendingReactions.delete(operationKey);
      }, 500);
    }
  })();

  pendingReactions.set(operationKey, operation);
  return operation;
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

// ============================================
// USER OPERATIONS
// ============================================

export const getUserById = async (userId: string): Promise<any> => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      id: userSnap.id,
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      status: data.status,
      statusText: data.statusText,
      createdAt: (data.createdAt as Timestamp)?.toDate(),
      lastSeen: (data.lastSeen as Timestamp)?.toDate(),
    };
  }
  return null;
};

export const getUserByEmail = async (email: string) => {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
    lastSeen: (doc.data().lastSeen as Timestamp)?.toDate(),
  };
};

// ============================================
// WORKSPACE INVITE OPERATIONS
// ============================================

export const createWorkspaceInvite = async (
  workspaceId: string,
  email: string,
  invitedBy: string
): Promise<string> => {
  // Check if there's already a pending invite for this email and workspace
  const existingInviteQuery = query(
    collection(db, 'workspace-invites'),
    where('workspaceId', '==', workspaceId),
    where('email', '==', email.toLowerCase()),
    where('status', '==', 'pending')
  );
  const existingInvites = await getDocs(existingInviteQuery);

  if (!existingInvites.empty) {
    throw new Error('An invite is already pending for this email address');
  }

  const inviteRef = await addDoc(collection(db, 'workspace-invites'), {
    workspaceId,
    email: email.toLowerCase(),
    invitedBy,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return inviteRef.id;
};

export const getWorkspaceInvites = async (workspaceId: string): Promise<WorkspaceInvite[]> => {
  const q = query(
    collection(db, 'workspace-invites'),
    where('workspaceId', '==', workspaceId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    workspaceId: doc.data().workspaceId,
    email: doc.data().email,
    invitedBy: doc.data().invitedBy,
    status: doc.data().status,
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
  }));
};

export const getPendingInvitesByEmail = async (email: string): Promise<WorkspaceInvite[]> => {
  const q = query(
    collection(db, 'workspace-invites'),
    where('email', '==', email.toLowerCase()),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    workspaceId: doc.data().workspaceId,
    email: doc.data().email,
    invitedBy: doc.data().invitedBy,
    status: doc.data().status,
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
  }));
};

export const acceptWorkspaceInvite = async (inviteId: string, userId: string, workspaceId: string) => {
  // Update invite status
  await updateDoc(doc(db, 'workspace-invites', inviteId), {
    status: 'accepted',
  });

  // Add user to workspace members using arrayUnion (atomic operation)
  // arrayUnion automatically prevents duplicates
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  await updateDoc(workspaceRef, {
    members: arrayUnion(userId),
  });

  // Add user to all public channels in the workspace
  const channelsQuery = query(
    collection(db, 'channels'),
    where('workspaceId', '==', workspaceId),
    where('isPrivate', '==', false)
  );
  const channelsSnapshot = await getDocs(channelsQuery);

  // Update all public channels to include the new user
  const channelUpdates = channelsSnapshot.docs.map((channelDoc) =>
    updateDoc(channelDoc.ref, {
      members: arrayUnion(userId),
    })
  );

  await Promise.all(channelUpdates);
};

export const declineWorkspaceInvite = async (inviteId: string) => {
  // Update invite status
  await updateDoc(doc(db, 'workspace-invites', inviteId), {
    status: 'declined',
  });
};

export const addWorkspaceMember = async (workspaceId: string, userId: string): Promise<void> => {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  await updateDoc(workspaceRef, {
    members: arrayUnion(userId),
  });
};

// Helper function to fix workspace membership for current owner
// Use this when workspace has wrong owner ID
export const fixWorkspaceOwnership = async (workspaceId: string, newOwnerId: string): Promise<void> => {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  await updateDoc(workspaceRef, {
    ownerId: newOwnerId,
    members: arrayUnion(newOwnerId),
  });
};


// ============================================
// DIRECT MESSAGE OPERATIONS
// ============================================

export const createOrGetDM = async (userId1: string, userId2: string): Promise<string> => {
  // Check if DM already exists
  const participants = [userId1, userId2].sort(); // Sort to ensure consistent order
  const q = query(
    collection(db, "directMessages"),
    where("participants", "==", participants)
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  // Create new DM
  const dmRef = await addDoc(collection(db, "directMessages"), {
    participants,
    updatedAt: serverTimestamp(),
  });

  return dmRef.id;
};

export const sendDMMessage = async (
  dmId: string,
  userId: string,
  content: string,
  senderName?: string
): Promise<string> => {
  const messageRef = await addDoc(collection(db, "messages"), {
    channelId: dmId, // We reuse channelId field for DM id
    userId,
    content,
    createdAt: serverTimestamp(),
    reactions: [],
    threadId: null,
  });

  // Update DMs last activity
  await updateDoc(doc(db, "directMessages", dmId), {
    updatedAt: serverTimestamp(),
  });

  // Send notification to the other user
  try {
    const dmDoc = await getDoc(doc(db, "directMessages", dmId));
    if (dmDoc.exists()) {
      const participants = dmDoc.data().participants as string[];
      const otherUserId = participants.find(id => id !== userId);

      if (otherUserId && senderName) {
        // Import notification service dynamically to avoid circular deps
        const { addNotification } = await import('./notificationService');
        await addNotification(otherUserId, {
          type: 'dm',
          fromUserId: userId,
          fromUserName: senderName,
          channelId: dmId,
          content: content.substring(0, 100), // Preview
        });
      }
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    // Don't throw - notification failure shouldn't block message sending
  }

  return messageRef.id;
};
