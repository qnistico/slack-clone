import { Link, useParams } from 'react-router-dom';
import { Hash, Lock, Plus, ChevronDown, MessageSquare } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChannelStore } from '../../store/channelStore';
import { useAuthStore } from '../../store/authStore';

export default function Sidebar() {
  const { workspaceId, channelId } = useParams<{ workspaceId: string; channelId?: string }>();
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
        <button className="w-full flex items-center justify-between hover:bg-purple-800 rounded px-2 py-1 transition">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentWorkspace?.icon}</span>
            <span className="text-lg font-bold">{currentWorkspace?.name}</span>
          </div>
          <ChevronDown size={18} />
        </button>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Public Channels */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-1">
              <ChevronDown size={14} />
              Channels
            </h3>
            <button className="hover:bg-purple-800 rounded p-1 transition">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-1">
            {publicChannels.map((channel) => (
              <Link
                key={`${channel.workspaceId}-${channel.id}`}
                to={`/workspace/${workspaceId}/channel/${channel.id}`}
                className={`flex items-center gap-2 px-2 py-1 rounded transition ${
                  channelId === channel.id
                    ? 'bg-purple-700 text-white font-semibold'
                    : 'hover:bg-purple-800 text-purple-100'
                }`}
              >
                <Hash size={16} className="flex-shrink-0" />
                <span className="truncate">{channel.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-1">
                <ChevronDown size={14} />
                Private Channels
              </h3>
              <button className="hover:bg-purple-800 rounded p-1 transition">
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-1">
              {privateChannels.map((channel) => (
                <Link
                  key={`${channel.workspaceId}-${channel.id}`}
                  to={`/workspace/${workspaceId}/channel/${channel.id}`}
                  className={`flex items-center gap-2 px-2 py-1 rounded transition ${
                    channelId === channel.id
                      ? 'bg-purple-700 text-white font-semibold'
                      : 'hover:bg-purple-800 text-purple-100'
                  }`}
                >
                  <Lock size={16} className="flex-shrink-0" />
                  <span className="truncate">{channel.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Direct Messages */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-1">
              <ChevronDown size={14} />
              Direct Messages
            </h3>
            <button className="hover:bg-purple-800 rounded p-1 transition">
              <Plus size={16} />
            </button>
          </div>
          <div className="px-2">
            <button className="flex items-center gap-2 text-sm text-purple-300 hover:text-white transition">
              <MessageSquare size={16} />
              <span>Start a conversation</span>
            </button>
          </div>
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
