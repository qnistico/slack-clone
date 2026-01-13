import { X, Mail, Calendar, MessageSquare } from 'lucide-react';
import type { User } from '../../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSendMessage?: (userId: string) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  onSendMessage,
}: UserProfileModalProps) {
  if (!isOpen || !user) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatJoinDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: User['status']) => {
    switch (status) {
      case 'online':
        return 'Active';
      case 'away':
        return 'Away';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header with Avatar */}
        <div className="relative bg-gradient-to-r from-purple-600 to-purple-800 h-24">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-12 mb-4">
            <div className="w-24 h-24 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center text-6xl border-4 border-white dark:border-gray-800 shadow-lg">
              {user.avatar}
            </div>
            <div
              className={`absolute bottom-2 right-2 w-4 h-4 ${getStatusColor(user.status)} rounded-full border-2 border-white dark:border-gray-800`}
            />
          </div>

          {/* User Info */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 ${getStatusColor(user.status)} rounded-full`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {getStatusText(user.status)}
                </span>
              </div>
              {user.statusText && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                  "{user.statusText}"
                </p>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Email
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Member Since
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatJoinDate(new Date())}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            {onSendMessage && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => onSendMessage(user.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <MessageSquare size={18} />
                  Send Message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
