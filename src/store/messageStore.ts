import { create } from 'zustand';
import type { Message } from '../types';

interface MessageState {
  messages: Message[];
  addMessage: (message: Message) => void;
  getMessagesByChannel: (channelId: string) => Message[];
  updateMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  addReaction: (messageId: string, emoji: string, userId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
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
  getMessagesByChannel: (channelId) => {
    const state = get();
    return state.messages
      .filter((m) => m.channelId === channelId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },
  updateMessage: (messageId, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? { ...m, content, updatedAt: new Date() }
          : m
      ),
    })),
  deleteMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),
  addReaction: (messageId, emoji, userId) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId) return m;

        const existingReaction = m.reactions.find((r) => r.emoji === emoji);
        if (existingReaction) {
          if (existingReaction.userIds.includes(userId)) {
            return m;
          }
          return {
            ...m,
            reactions: m.reactions.map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    userIds: [...r.userIds, userId],
                    count: r.count + 1,
                  }
                : r
            ),
          };
        }
        return {
          ...m,
          reactions: [
            ...m.reactions,
            { emoji, userIds: [userId], count: 1 },
          ],
        };
      }),
    })),
}));
