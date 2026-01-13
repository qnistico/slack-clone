import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MiniNavbar from '../components/layout/MiniNavbar';
import Sidebar from '../components/sidebar/Sidebar';
import { useChannelStore } from '../store/channelStore';
import { useWorkspaceStore } from '../store/workspaceStore';

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);
  const subscribeToWorkspaceChannels = useChannelStore((state) => state.subscribeToWorkspaceChannels);

  useEffect(() => {
    if (workspaceId) {
      setCurrentWorkspace(workspaceId);
      const unsubscribe = subscribeToWorkspaceChannels(workspaceId);
      return () => unsubscribe();
    }
  }, [workspaceId, setCurrentWorkspace, subscribeToWorkspaceChannels]);

  return (
    <div className="flex h-screen">
      <MiniNavbar activeItem="home" />
      <Sidebar />
      <div className="flex-1 bg-gray-100 dark:bg-gray-900">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl text-gray-500 mb-2">👈</p>
            <p className="text-gray-600 dark:text-gray-400">Select a channel to start messaging</p>
          </div>
        </div>
      </div>
    </div>
  );
}
