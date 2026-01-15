import { useEffect, useState } from 'react';
import { X, Bell, CheckCircle, MessageSquare } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { subscribeToUnreadNotifications, clearNotifications, clearChannelNotifications } from '../../services/notificationService';
import { getUserAvatar } from '../../utils/avatar';
import { DEMO_WORKSPACE_ID } from '../../services/demoActivityService';
import type { UnreadNotification } from '../../services/notificationService';

interface ActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityPanel({ isOpen, onClose }: ActivityPanelProps) {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [notifications, setNotifications] = useState<UnreadNotification[]>([]);

  useEffect(() => {
    if (!currentUser || !isOpen) return;

    const unsubscribe = subscribeToUnreadNotifications(currentUser.id, (notifs) => {
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  const handleNotificationClick = async (notification: UnreadNotification) => {
    // Clear notifications for this channel when clicked
    if (currentUser) {
      await clearChannelNotifications(currentUser.id, notification.channelId);
    }

    if (notification.type === 'dm') {
      // Use workspaceId from notification, fall back to current workspace, or use Demo Workspace
      const targetWorkspaceId = notification.workspaceId || workspaceId || DEMO_WORKSPACE_ID;
      navigate(`/workspace/${targetWorkspaceId}/dm/${notification.channelId}`);
      onClose();
    }
  };

  const handleClearAll = async () => {
    if (currentUser) {
      await clearNotifications(currentUser.id);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-20 w-80 bg-white dark:bg-gray-900 h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell size={20} />
            Activity
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        {notifications.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              You're all caught up
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Looks like things are quiet for now. When there's new activity, you'll see it here.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Clear all button */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClearAll}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                Mark all as read
              </button>
            </div>

            {/* Notifications list */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((notification, index) => (
                <button
                  key={`${notification.channelId}-${notification.timestamp}-${index}`}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition"
                >
                  <div className="flex gap-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={getUserAvatar(notification.fromUserName)}
                        alt={notification.fromUserName}
                        className="w-10 h-10 rounded-lg"
                      />
                      {notification.type === 'dm' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <MessageSquare size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {notification.fromUserName}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {notification.type === 'dm' ? 'Sent you a message' : 'Activity'}
                      </p>
                      {notification.content && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 truncate">
                          "{notification.content}"
                        </p>
                      )}
                    </div>
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
