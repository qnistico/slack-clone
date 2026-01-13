import { useState, useEffect, useRef } from 'react';
import { Smile, MessageSquare, MoreVertical, Pencil, Trash2, ArrowDown } from 'lucide-react';
import type { Message, User } from '../../types';

interface MessageListProps {
  messages: Message[];
  users: User[];
  onReactionClick?: (messageId: string, emoji: string) => void;
  onThreadClick?: (messageId: string) => void;
  onUserClick?: (userId: string) => void;
}

export default function MessageList({
  messages,
  users,
  onReactionClick,
  onThreadClick,
  onUserClick,
}: MessageListProps) {
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getUserById = (userId: string) => {
    return users.find((u) => u.id === userId);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollButton(distanceFromBottom > 100);
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('smooth');
    }
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-1 relative"
    >
      {messages.map((message) => {
        const user = getUserById(message.userId);
        const isHovered = hoveredMessageId === message.id;

        return (
          <div
            key={message.id}
            className="group relative flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded transition"
            onMouseEnter={() => setHoveredMessageId(message.id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            <button
              onClick={() => onUserClick?.(message.userId)}
              className="text-3xl flex-shrink-0 hover:opacity-80 transition cursor-pointer"
              title="View profile"
            >
              {user?.avatar}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <button
                  onClick={() => onUserClick?.(message.userId)}
                  className="font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer"
                >
                  {user?.name}
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(message.createdAt)}
                </span>
              </div>
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                {message.content}
              </p>
              {message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {message.reactions.map((reaction) => (
                    <button
                      key={reaction.emoji}
                      onClick={() => onReactionClick?.(message.id, reaction.emoji)}
                      className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full text-sm hover:bg-purple-200 transition border border-purple-200 hover:border-purple-300"
                    >
                      <span>{reaction.emoji}</span>
                      <span className="text-purple-900 font-medium text-xs">
                        {reaction.count}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => onReactionClick?.(message.id, '')}
                    className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-full text-sm hover:bg-gray-100 transition"
                  >
                    <Smile size={14} className="text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Hover Actions */}
            {isHovered && (
              <div className="absolute top-0 right-2 flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1">
                <button
                  onClick={() => onReactionClick?.(message.id, '')}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  title="Add reaction"
                >
                  <Smile size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => onThreadClick?.(message.id)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  title="Reply in thread"
                >
                  <MessageSquare size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  title="Edit message"
                >
                  <Pencil size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  title="Delete message"
                >
                  <Trash2 size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  title="More actions"
                >
                  <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="sticky bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full p-2 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          title="Scroll to bottom"
        >
          <ArrowDown size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
      )}
    </div>
  );
}
