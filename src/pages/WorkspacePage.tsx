import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MiniNavbar from '../components/layout/MiniNavbar';
import Sidebar from '../components/sidebar/Sidebar';
import { useChannelStore } from '../store/channelStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { DEMO_WORKSPACE_ID } from '../services/demoActivityService';

export default function WorkspacePage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);
  const subscribeToUserWorkspaces = useWorkspaceStore((state) => state.subscribeToUserWorkspaces);
  const subscribeToWorkspaceChannels = useChannelStore((state) => state.subscribeToWorkspaceChannels);
  const channels = useChannelStore((state) => state.channels);

  // Subscribe to user workspaces
  useEffect(() => {
    if (currentUser) {
      const unsubscribe = subscribeToUserWorkspaces(currentUser.id);
      return () => unsubscribe();
    }
  }, [currentUser, subscribeToUserWorkspaces]);

  // Subscribe to workspace channels
  useEffect(() => {
    if (workspaceId) {
      setCurrentWorkspace(workspaceId);
      const unsubscribe = subscribeToWorkspaceChannels(workspaceId);
      return () => unsubscribe();
    }
  }, [workspaceId, setCurrentWorkspace, subscribeToWorkspaceChannels]);

  // Auto-redirect to first channel in demo workspace
  useEffect(() => {
    if (workspaceId === DEMO_WORKSPACE_ID && channels.length > 0) {
      const workspaceChannels = channels.filter(c => c.workspaceId === workspaceId);
      if (workspaceChannels.length > 0) {
        // Redirect to the first channel (usually #general)
        navigate(`/workspace/${workspaceId}/channel/${workspaceChannels[0].id}`, { replace: true });
      }
    }
  }, [workspaceId, channels, navigate]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop: Mini Navbar + Sidebar + Content */}
      <div className="hidden lg:flex h-full w-full">
        <MiniNavbar activeItem="home" />
        <Sidebar />
        <div className="flex-1 bg-white dark:bg-gray-900">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl text-gray-500 mb-2">👈</p>
              <p className="text-gray-600 dark:text-gray-400">Select a channel to start messaging</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Show full sidebar as the main screen */}
      <div className="lg:hidden flex h-full w-full">
        <MiniNavbar activeItem="home" />
        <Sidebar />
      </div>
    </div>
  );
}
