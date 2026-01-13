import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useChannelStore } from '../store/channelStore';
import { useMessageStore } from '../store/messageStore';
import {
  mockUsers,
  mockWorkspaces,
  mockChannels,
  mockMessages,
} from '../utils/mockData';

export function useMockData() {
  const login = useAuthStore((state) => state.login);
  const addWorkspace = useWorkspaceStore((state) => state.addWorkspace);
  const addChannel = useChannelStore((state) => state.addChannel);
  const addMessage = useMessageStore((state) => state.addMessage);

  useEffect(() => {
    // Login as first user
    login(mockUsers[0]);

    // Add workspaces
    mockWorkspaces.forEach((workspace) => {
      addWorkspace(workspace);
    });

    // Add channels
    mockChannels.forEach((channel) => {
      addChannel(channel);
    });

    // Add messages
    mockMessages.forEach((message) => {
      addMessage(message);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
}
