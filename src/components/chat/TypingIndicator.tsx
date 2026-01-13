import { useEffect, useState } from 'react';
import { subscribeToTypingIndicators } from '../../services/presenceService';

interface TypingIndicatorProps {
  channelId: string;
  currentUserId: string;
}

export default function TypingIndicator({ channelId, currentUserId }: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToTypingIndicators(channelId, currentUserId, (users) => {
      setTypingUsers(users);
    });

    return () => {
      unsubscribe();
    };
  }, [channelId, currentUserId]);

  if (typingUsers.length === 0) {
    return null;
  }

  const renderTypingText = () => {
    if (typingUsers.length === 1) {
      return (
        <span>
          <strong>{typingUsers[0].userName}</strong> is typing...
        </span>
      );
    } else if (typingUsers.length === 2) {
      return (
        <span>
          <strong>{typingUsers[0].userName}</strong> and <strong>{typingUsers[1].userName}</strong>{' '}
          are typing...
        </span>
      );
    } else if (typingUsers.length === 3) {
      return (
        <span>
          <strong>{typingUsers[0].userName}</strong>, <strong>{typingUsers[1].userName}</strong>,
          and <strong>{typingUsers[2].userName}</strong> are typing...
        </span>
      );
    } else {
      return <span>Several people are typing...</span>;
    }
  };

  return (
    <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></span>
      </div>
      {renderTypingText()}
    </div>
  );
}
