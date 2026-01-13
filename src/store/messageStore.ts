import { create } from 'zustand';
import type { Message } from '../types';
import {
  subscribeToMessages,
  sendMessage,
  updateMessage as updateFirestoreMessage,
  deleteMessage as deleteFirestoreMessage,
  addReaction as addFirestoreReaction,
  subscribeToThreadReplies,
} from '../services/firestoreService';

interface MessageState {
  messages: Message[];
  threadReplies: Record<string, Message[]>;
  isLoading: boolean;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setThreadReplies: (threadId: string, replies: Message[]) => void;
  getMessagesByChannel: (channelId: string) => Message[];
  getThreadReplies: (threadId: string) => Message[];
  sendNewMessage: (channelId: string, userId: string, content: string, threadId?: string) => Promise<void>;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string, userId: string) => Promise<void>;
  subscribeToChannelMessages: (channelId: string) => () => void;
  subscribeToThread: (threadId: string) => () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  threadReplies: {},
  isLoading: false,

  addMessage: (message) =>
    set((state) => {
      // Prevent duplicates
      if (state.messages.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: [...state.messages, message],
      };
    }),

  setMessages: (messages) => set({ messages }),

  setThreadReplies: (threadId, replies) =>
    set((state) => ({
      threadReplies: {
        ...state.threadReplies,
        [threadId]: replies,
      },
    })),

  getMessagesByChannel: (channelId) => {
    const state = get();
    return state.messages
      .filter((m) => m.channelId === channelId && !m.threadId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  getThreadReplies: (threadId) => {
    const state = get();
    return state.threadReplies[threadId] || [];
  },

  sendNewMessage: async (channelId, userId, content, threadId) => {
    set({ isLoading: true });
    try {
      await sendMessage(channelId, userId, content, threadId);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateMessage: async (messageId, content) => {
    try {
      await updateFirestoreMessage(messageId, content);
    } catch (error) {
      console.error('Failed to update message:', error);
      throw error;
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await deleteFirestoreMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  },

  addReaction: async (messageId, emoji, userId) => {
    try {
      await addFirestoreReaction(messageId, emoji, userId);
    } catch (error) {
      console.error('Failed to add reaction:', error);
      throw error;
    }
  },

  subscribeToChannelMessages: (channelId) => {
    return subscribeToMessages(channelId, (messages) => {
      set({ messages });
    });
  },

  subscribeToThread: (threadId) => {
    return subscribeToThreadReplies(threadId, (replies) => {
      set((state) => ({
        threadReplies: {
          ...state.threadReplies,
          [threadId]: replies,
        },
      }));
    });
  },
}));
