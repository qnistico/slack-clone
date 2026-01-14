import { useEffect, useState } from 'react';
import { subscribeToUserPresence } from '../../services/presenceService';

interface PresenceIndicatorProps {
  userId: string;
  status?: 'online' | 'away' | 'offline';
  lastSeen?: Date | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showLastSeen?: boolean;
  className?: string;
}

export default function PresenceIndicator({
  userId,
  status: initialStatus,
  lastSeen,
  size = 'md',
  showLabel = false,
  showLastSeen = false,
  className = '',
}: PresenceIndicatorProps) {
  const [status, setStatus] = useState<'online' | 'away' | 'offline'>(initialStatus || 'offline');

  useEffect(() => {
    if (userId) {
      const unsubscribe = subscribeToUserPresence(userId, (newStatus) => {
        setStatus(newStatus);
      });
      return () => unsubscribe();
    }
  }, [userId]);

  // Use prop status if provided, otherwise use subscribed status
  const currentStatus = initialStatus || status;

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-400 dark:bg-gray-500',
  };

  const formatLastSeen = (date: Date | null | undefined): string => {
    if (!date) return '';

    const now = new Date();
    const lastSeenDate = date instanceof Date ? date : new Date(date);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return lastSeenDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusLabel = () => {
    if (currentStatus === 'online') return 'Online';
    if (currentStatus === 'away') return 'Away';
    if (showLastSeen && lastSeen) {
      return `Last seen ${formatLastSeen(lastSeen)}`;
    }
    return 'Offline';
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div
        className={`
          ${sizeClasses[size]}
          ${statusColors[currentStatus]}
          rounded-full
          flex-shrink-0
          ${currentStatus === 'online' ? 'presence-online' : ''}
          ${currentStatus === 'away' ? 'animate-pulse' : ''}
        `}
        title={getStatusLabel()}
      />
      {(showLabel || (showLastSeen && currentStatus === 'offline')) && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getStatusLabel()}
        </span>
      )}
    </div>
  );
}

// Compact version for use in message lists, user lists, etc.
export function PresenceDot({
  status,
  size = 'sm',
  className = '',
}: {
  status: 'online' | 'away' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-400 dark:bg-gray-500',
  };

  const statusLabels = {
    online: 'Online',
    away: 'Away',
    offline: 'Offline',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${statusColors[status]}
        rounded-full
        ${status === 'online' ? 'presence-online' : ''}
        ${status === 'away' ? 'animate-pulse' : ''}
        ${className}
      `}
      title={statusLabels[status]}
    />
  );
}
