import { useState, useEffect, useRef } from 'react';
import { Smile, MessageSquare, MoreVertical, Pencil, Trash2, ArrowDown } from 'lucide-react';
import type { Message, User } from '../../types';
import { getUserAvatar } from '../../utils/avatar';
import { formatMessageContent } from '../../utils/messageFormatter';
import EmojiPicker from './EmojiPicker';

interface MessageListProps {
  messages: Message[];
  users: User[];
  onReactionClick?: (messageId: string, emoji: string) => void;
  onThreadClick?: (messageId: string) => void;
  onUserClick?: (userId: string) => void;
  onEditMessage?: (messageId: string, currentContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  currentUserId?: string;
}

export default function MessageList({
  messages,
  users,
  onReactionClick,
  onThreadClick,
  onUserClick,
  onEditMessage,
  onDeleteMessage,
  currentUserId,
}: MessageListProps) {
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside and clear active state
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(null);
        setActiveMessageId(null);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);

  // Handle emoji picker state changes
  const handleEmojiPickerChange = (messageId: string, isOpen: boolean) => {
    if (isOpen) {
      setActiveMessageId(messageId);
    } else {
      setActiveMessageId(null);
    }
  };

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
        const isActive = activeMessageId === message.id;
        const shouldShowActionBar = isHovered || isActive;

        return (
          <div
            key={message.id}
            className="group relative flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded transition"
            onMouseEnter={() => setHoveredMessageId(message.id)}
            onMouseLeave={() => {
              // Only clear hover if this message is not active (picker/menu open)
              if (!isActive) {
                setHoveredMessageId(null);
              }
            }}
          >
            <button
              onClick={() => onUserClick?.(message.userId)}
              className="flex-shrink-0 hover:opacity-80 transition cursor-pointer"
              title="View profile"
            >
              <img
                src={getUserAvatar(user?.name || 'Unknown', user?.avatar)}
                alt={user?.name}
                className="w-10 h-10 rounded-lg"
              />
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
              <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                {formatMessageContent(message.content)}
              </div>
              {message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {message.reactions.map((reaction) => {
                    const hasReacted = currentUserId && reaction.userIds?.includes(currentUserId);
                    const reactionUsers = reaction.userIds
                      ?.map(id => users.find(u => u.id === id)?.name)
                      .filter(Boolean)
                      .slice(0, 3);
                    const remainingCount = (reaction.userIds?.length || 0) - 3;
                    const tooltipText = reactionUsers?.length
                      ? reactionUsers.join(', ') + (remainingCount > 0 ? ` and ${remainingCount} more` : '')
                      : 'React';

                    return (
                      <button
                        key={reaction.emoji}
                        onClick={() => onReactionClick?.(message.id, reaction.emoji)}
                        className={`reaction-btn group/reaction flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-all duration-200 ${
                          hasReacted
                            ? 'bg-purple-100 dark:bg-purple-900/40 border-2 border-purple-400 dark:border-purple-500 hover:bg-purple-200 dark:hover:bg-purple-900/60'
                            : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        title={tooltipText}
                      >
                        <span className="reaction-emoji text-base leading-none">{reaction.emoji}</span>
                        <span className={`font-medium text-xs ${
                          hasReacted
                            ? 'text-purple-700 dark:text-purple-300'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}>
                          {reaction.count}
                        </span>
                      </button>
                    );
                  })}
                  <EmojiPicker
                    onEmojiSelect={(emoji) => onReactionClick?.(message.id, emoji)}
                    buttonClassName="flex items-center gap-1 px-2 py-0.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-full text-sm hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200"
                    customButton={
                      <Smile size={14} className="text-gray-400 dark:text-gray-500" />
                    }
                    align="right"
                  />
                </div>
              )}
            </div>

            {/* Hover Actions */}
            {shouldShowActionBar && (
              <div className="absolute top-0 right-2 flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1 z-10">
                <div className="relative">
                  <EmojiPicker
                    onEmojiSelect={(emoji) => onReactionClick?.(message.id, emoji)}
                    buttonClassName="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                    onOpenChange={(isOpen) => handleEmojiPickerChange(message.id, isOpen)}
                  />
                </div>
                <button
                  onClick={() => onThreadClick?.(message.id)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  title="Reply in thread"
                >
                  <MessageSquare size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                {currentUserId === message.userId && (
                  <>
                    <button
                      onClick={() => onEditMessage?.(message.id, message.content)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                      title="Edit message"
                    >
                      <Pencil size={16} className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this message?')) {
                          onDeleteMessage?.(message.id);
                        }
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                      title="Delete message"
                    >
                      <Trash2 size={16} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </>
                )}
                <div className="relative" ref={showMoreMenu === message.id ? moreMenuRef : undefined}>
                  <button
                    onClick={() => {
                      const isOpening = showMoreMenu !== message.id;
                      setShowMoreMenu(isOpening ? message.id : null);
                      setActiveMessageId(isOpening ? message.id : null);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                    title="More actions"
                  >
                    <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
                  </button>
                  {showMoreMenu === message.id && (
                    <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px] z-20">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(message.content);
                          setShowMoreMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        Copy text
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          setShowMoreMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        Copy link
                      </button>
                    </div>
                  )}
                </div>
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
