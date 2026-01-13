import { Users, X } from 'lucide-react';
import type { User, Channel } from '../../types';
import { getUserAvatar } from '../../utils/avatar';

interface UserListPanelProps {
  channel: Channel;
  users: User[];
  isOpen: boolean;
  onClose: () => void;
}

export default function UserListPanel({
  channel,
  users,
  isOpen,
  onClose,
}: UserListPanelProps) {
  const channelMembers = users.filter((user) =>
    channel.members.includes(user.id)
  );

  const onlineMembers = channelMembers.filter((u) => u.status === 'online');
  const awayMembers = channelMembers.filter((u) => u.status === 'away');
  const offlineMembers = channelMembers.filter((u) => u.status === 'offline');

  if (!isOpen) return null;

  return (
    <div className="w-64 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-gray-900 dark:text-white" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Members</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">({channelMembers.length})</span>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1 transition"
        >
          <X size={18} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Online Members */}
        {onlineMembers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Online — {onlineMembers.length}
            </h4>
            <div className="space-y-1">
              {onlineMembers.map((user) => (
                <button
                  key={user.id}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <div className="relative">
                    <img
                      src={getUserAvatar(user.name, user.avatar)}
                      alt={user.name}
                      className="w-8 h-8 rounded-lg"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{user.name}</p>
                    {user.statusText && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.statusText}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Away Members */}
        {awayMembers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Away — {awayMembers.length}
            </h4>
            <div className="space-y-1">
              {awayMembers.map((user) => (
                <button
                  key={user.id}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <div className="relative">
                    <img
                      src={getUserAvatar(user.name, user.avatar)}
                      alt={user.name}
                      className="w-8 h-8 rounded-lg opacity-70"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate opacity-70 text-gray-900 dark:text-white">
                      {user.name}
                    </p>
                    {user.statusText && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.statusText}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Offline Members */}
        {offlineMembers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Offline — {offlineMembers.length}
            </h4>
            <div className="space-y-1">
              {offlineMembers.map((user) => (
                <button
                  key={user.id}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <div className="relative">
                    <img
                      src={getUserAvatar(user.name, user.avatar)}
                      alt={user.name}
                      className="w-8 h-8 rounded-lg opacity-50"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white dark:border-gray-900 rounded-full" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate opacity-50 text-gray-900 dark:text-white">
                      {user.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
