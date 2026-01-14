import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Channel } from '../types';
import {
  subscribeToChannels,
  createChannel as createFirestoreChannel,
  addChannelMember,
  deleteChannel as deleteFirestoreChannel,
  updateChannel as updateFirestoreChannel,
} from '../services/firestoreService';

interface ChannelState {
  channels: Channel[];
  currentChannelId: string | null;
  currentWorkspaceId: string | null;
  isLoading: boolean;
  addChannel: (channel: Channel) => void;
  setChannels: (channels: Channel[]) => void;
  setCurrentChannel: (channelId: string) => void;
  getChannelsByWorkspace: (workspaceId: string) => Channel[];
  getCurrentChannel: () => Channel | undefined;
  createNewChannel: (
    workspaceId: string,
    name: string,
    createdBy: string,
    description?: string,
    isPrivate?: boolean
  ) => Promise<string>;
  joinChannel: (channelId: string, userId: string) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  updateChannel: (channelId: string, updates: { name?: string; description?: string; isPrivate?: boolean }) => Promise<void>;
  subscribeToWorkspaceChannels: (workspaceId: string) => () => void;
}

export const useChannelStore = create<ChannelState>()(
  persist(
    (set, get) => ({
      channels: [],
      currentChannelId: null,
      currentWorkspaceId: null,
      isLoading: false,

      addChannel: (channel) =>
        set((state) => {
          // Prevent duplicates
          if (state.channels.some((c) => c.id === channel.id)) {
            return state;
          }
          return {
            channels: [...state.channels, channel],
          };
        }),

      setChannels: (channels) => set({ channels }),

      setCurrentChannel: (channelId) => set({ currentChannelId: channelId }),

      getChannelsByWorkspace: (workspaceId) => {
        const state = get();
        return state.channels.filter((c) => c.workspaceId === workspaceId);
      },

      getCurrentChannel: () => {
        const state = get();
        return state.channels.find((c) => c.id === state.currentChannelId);
      },

      createNewChannel: async (workspaceId, name, createdBy, description, isPrivate = false) => {
        set({ isLoading: true });
        try {
          const channelId = await createFirestoreChannel(
            workspaceId,
            name,
            createdBy,
            description,
            isPrivate
          );
          return channelId;
        } catch (error) {
          console.error('Failed to create channel:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      joinChannel: async (channelId, userId) => {
        try {
          await addChannelMember(channelId, userId);
        } catch (error) {
          console.error('Failed to join channel:', error);
          throw error;
        }
      },

      deleteChannel: async (channelId) => {
        try {
          await deleteFirestoreChannel(channelId);
        } catch (error) {
          console.error('Failed to delete channel:', error);
          throw error;
        }
      },

      updateChannel: async (channelId, updates) => {
        try {
          await updateFirestoreChannel(channelId, updates);
        } catch (error) {
          console.error('Failed to update channel:', error);
          throw error;
        }
      },

      subscribeToWorkspaceChannels: (workspaceId) => {
        // Track the workspace we're subscribing to
        set({ currentWorkspaceId: workspaceId });

        return subscribeToChannels(workspaceId, (channels) => {
          // Only update if this is still the current workspace
          // This prevents stale data from old subscriptions
          const currentState = get();
          if (currentState.currentWorkspaceId === workspaceId) {
            // Only update if we got valid data (not empty due to error)
            // or if we intentionally have no channels
            set({ channels });
          }
        });
      },
    }),
    {
      name: 'channel-storage',
      partialize: (state) => ({
        currentChannelId: state.currentChannelId,
        channels: state.channels,
        currentWorkspaceId: state.currentWorkspaceId,
      }),
    }
  )
);
