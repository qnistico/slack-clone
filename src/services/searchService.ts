import {
  collection,
  query,
  where,
  getDocs,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User } from '../types';

export interface SearchResult {
  id: string;
  type: 'message' | 'channel' | 'dm';
  content: string;
  channelId?: string;
  channelName?: string;
  userId?: string;
  createdAt?: Date;
  isDM?: boolean;
}

// Search messages across channels and DMs
export const searchMessages = async (
  searchQuery: string,
  workspaceId: string,
  workspaceMembers: User[],
  currentUserId?: string
): Promise<SearchResult[]> => {
  const results: SearchResult[] = [];
  const lowerQuery = searchQuery.toLowerCase();

  if (!workspaceId) {
    return [];
  }

  try {
    // 1. Search channels by name first
    const channelsQuery = query(
      collection(db, 'channels'),
      where('workspaceId', '==', workspaceId)
    );
    const channelsSnapshot = await getDocs(channelsQuery);

    const channelMap = new Map<string, { name: string; isPrivate: boolean }>();

    channelsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      channelMap.set(doc.id, { name: data.name, isPrivate: data.isPrivate });

      // Add channel to results if name matches
      if (data.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `channel-${doc.id}`,
          type: 'channel',
          content: data.description || '',
          channelId: doc.id,
          channelName: data.name,
          isDM: false,
        });
      }
    });

    // 2. Search messages in all workspace channels
    // Note: Firestore doesn't support full-text search, so we fetch recent messages
    // and filter client-side. For production, consider Algolia or Elasticsearch.
    const channelIds = Array.from(channelMap.keys());

    if (channelIds.length > 0) {
      // Firestore limits 'in' queries to 10 items (changed from 30 in older versions)
      const batchSize = 10;
      for (let i = 0; i < channelIds.length; i += batchSize) {
        const batch = channelIds.slice(i, i + batchSize);

        try {
          // Query without orderBy to avoid needing composite index
          // Then sort results client-side
          const messagesQuery = query(
            collection(db, 'messages'),
            where('channelId', 'in', batch),
            limit(200)
          );

          const messagesSnapshot = await getDocs(messagesQuery);

          messagesSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data.content && data.content.toLowerCase().includes(lowerQuery)) {
              const channel = channelMap.get(data.channelId);
              results.push({
                id: doc.id,
                type: 'message',
                content: data.content,
                channelId: data.channelId,
                channelName: channel?.name || 'Unknown',
                userId: data.userId,
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                isDM: false,
              });
            }
          });
        } catch {
        }
      }
    }

    // 3. Search DMs
    // Get only DMs where the current user is a participant (required by Firestore rules)
    const userIds = workspaceMembers.map(m => m.id);

    if (userIds.length > 0 && currentUserId) {
      // Query only DMs where current user is a participant
      const dmQuery = query(
        collection(db, 'directMessages'),
        where('participants', 'array-contains', currentUserId)
      );
      const dmSnapshot = await getDocs(dmQuery);

      const relevantDmIds: string[] = [];
      const dmParticipantsMap = new Map<string, string[]>();

      dmSnapshot.docs.forEach((doc) => {
        const participants = doc.data().participants as string[];
        // Check if this DM involves workspace members
        if (participants.some(p => userIds.includes(p))) {
          relevantDmIds.push(doc.id);
          dmParticipantsMap.set(doc.id, participants);
        }
      });

      // Search messages in DMs
      if (relevantDmIds.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < relevantDmIds.length; i += batchSize) {
          const batch = relevantDmIds.slice(i, i + batchSize);

          try {
            // Query without orderBy to avoid needing composite index
            const dmMessagesQuery = query(
              collection(db, 'messages'),
              where('channelId', 'in', batch),
              limit(100)
            );

            const dmMessagesSnapshot = await getDocs(dmMessagesQuery);

            dmMessagesSnapshot.docs.forEach((doc) => {
              const data = doc.data();
              if (data.content && data.content.toLowerCase().includes(lowerQuery)) {
                const participants = dmParticipantsMap.get(data.channelId);
                const otherUser = workspaceMembers.find(
                  m => participants?.includes(m.id) && m.id !== data.userId
                );

                results.push({
                  id: doc.id,
                  type: 'message',
                  content: data.content,
                  channelId: data.channelId,
                  channelName: otherUser?.name || 'Direct Message',
                  userId: data.userId,
                  createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                  isDM: true,
                });
              }
            });
          } catch {
          }
        }
      }
    }

    // Sort by date, most recent first
    results.sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Limit total results
    return results.slice(0, 50);
  } catch {
    return [];
  }
};
