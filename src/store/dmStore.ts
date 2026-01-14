import { create } from 'zustand';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { DirectMessage, Message } from '../types';

interface DMState {
  dms: DirectMessage[];
  dmMessages: Record<string, Message[]>;
  subscribeToDMs: (userId: string) => Unsubscribe;
  subscribeToDMMessages: (dmId: string) => Unsubscribe;
}

export const useDMStore = create<DMState>((set) => ({
  dms: [],
  dmMessages: {},

  subscribeToDMs: (userId: string) => {
    const q = query(
      collection(db, 'directMessages'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const dms: DirectMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          dms.push({
            id: doc.id,
            participants: data.participants,
            updatedAt: data.updatedAt?.toDate() || new Date(),
          });
        });
        set({ dms });
      },
      (error) => {
        console.error('Error subscribing to DMs:', error);
        // Don't clear DMs on error - keep existing data
      }
    );
  },

  subscribeToDMMessages: (dmId: string) => {
    const q = query(
      collection(db, 'messages'),
      where('channelId', '==', dmId),
      where('threadId', '==', null),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          channelId: data.channelId,
          userId: data.userId,
          content: data.content,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          reactions: data.reactions || [],
          threadId: data.threadId,
          attachments: data.attachments || [],
        });
      });

      set((state) => ({
        dmMessages: {
          ...state.dmMessages,
          [dmId]: messages,
        },
      }));
    });
  },
}));
