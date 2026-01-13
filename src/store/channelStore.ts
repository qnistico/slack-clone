import { create } from 'zustand';
import type { Channel } from '../types';

interface ChannelState {
  channels: Channel[];
  currentChannelId: string | null;
  addChannel: (channel: Channel) => void;
  setCurrentChannel: (channelId: string) => void;
  getChannelsByWorkspace: (workspaceId: string) => Channel[];
  getCurrentChannel: () => Channel | undefined;
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  currentChannelId: null,
  addChannel: (channel) =>
    set((state) => ({
      channels: [...state.channels, channel],
    })),
  setCurrentChannel: (channelId) => set({ currentChannelId: channelId }),
  getChannelsByWorkspace: (workspaceId) => {
    const state = get();
    return state.channels.filter((c) => c.workspaceId === workspaceId);
  },
  getCurrentChannel: () => {
    const state = get();
    return state.channels.find((c) => c.id === state.currentChannelId);
  },
}));
