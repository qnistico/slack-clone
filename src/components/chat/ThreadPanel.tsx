import { X } from 'lucide-react';
import type { Message, User } from '../../types';
import { formatMessageContent } from '../../utils/messageFormatter';
import MessageInput from './MessageInput';

interface ThreadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  parentMessage: Message | null;
  threadMessages: Message[];
  users: User[];
  onSendReply: (content: string) => void;
  currentUserId?: string;
  currentUserName?: string;
}

export default function ThreadPanel({
  isOpen,
  onClose,
  parentMessage,
  threadMessages,
  users,
  onSendReply,
  currentUserId,
  currentUserName,
}: ThreadPanelProps) {
  if (!isOpen || !parentMessage) return null;

  const parentUser = users.find((u) => u.id === parentMessage.userId);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  return (
    <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Thread</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Parent Message */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <div className="text-3xl flex-shrink-0">{parentUser?.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-gray-900 dark:text-white">{parentUser?.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(parentMessage.createdAt)}
              </span>
            </div>
            <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
              {formatMessageContent(parentMessage.content)}
            </div>
          </div>
        </div>
        {threadMessages.length > 0 && (
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {threadMessages.length} {threadMessages.length === 1 ? 'reply' : 'replies'}
          </div>
        )}
      </div>

      {/* Thread Replies */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {threadMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No replies yet. Start the thread!
            </p>
          </div>
        ) : (
          threadMessages.map((message) => {
            const user = users.find((u) => u.id === message.userId);
            return (
              <div key={message.id} className="flex gap-3">
                <div className="text-2xl flex-shrink-0">{user?.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {user?.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                    {formatMessageContent(message.content)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Input */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <MessageInput
          channelId="thread"
          channelName="thread"
          userId={currentUserId || users[0]?.id || ''}
          userName={currentUserName || users[0]?.name || ''}
          onSendMessage={onSendReply}
          placeholder="Reply to thread..."
          workspaceMembers={users.map(u => ({ id: u.id, name: u.name }))}
        />
      </div>
    </div>
  );
}
