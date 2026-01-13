import { Link, useParams } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChannelStore } from '../../store/channelStore';
import { useAuthStore } from '../../store/authStore';

export default function Sidebar() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const channels = useChannelStore((state) => state.channels);

  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);
  const workspaceChannels = channels.filter((c) => c.workspaceId === workspaceId);
  const publicChannels = workspaceChannels.filter((c) => !c.isPrivate);
  const privateChannels = workspaceChannels.filter((c) => c.isPrivate);

  return (
    <div className="w-64 bg-purple-900 text-white flex flex-col h-screen">
      {/* Workspace Header */}
      <div className="p-4 border-b border-purple-800">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="text-2xl">{currentWorkspace?.icon}</span>
          {currentWorkspace?.name}
        </h2>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Public Channels */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-purple-300 mb-2">Channels</h3>
          <div className="space-y-1">
            {publicChannels.map((channel) => (
              <Link
                key={channel.id}
                to={`/workspace/${workspaceId}/channel/${channel.id}`}
                className="block px-2 py-1 rounded hover:bg-purple-800 transition"
              >
                # {channel.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-purple-300 mb-2">
              Private Channels
            </h3>
            <div className="space-y-1">
              {privateChannels.map((channel) => (
                <Link
                  key={channel.id}
                  to={`/workspace/${workspaceId}/channel/${channel.id}`}
                  className="block px-2 py-1 rounded hover:bg-purple-800 transition"
                >
                  🔒 {channel.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Direct Messages */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-purple-300 mb-2">
            Direct Messages
          </h3>
          <p className="text-xs text-purple-400 px-2">Coming soon...</p>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-purple-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{currentUser?.avatar}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  currentUser?.status === 'online'
                    ? 'bg-green-500'
                    : currentUser?.status === 'away'
                      ? 'bg-yellow-500'
                      : 'bg-gray-500'
                }`}
              />
              <p className="text-xs text-purple-300">{currentUser?.status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
