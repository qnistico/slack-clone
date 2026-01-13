import type { Message, User } from '../../types';

interface MessageListProps {
  messages: Message[];
  users: User[];
}

export default function MessageList({ messages, users }: MessageListProps) {
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

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const user = getUserById(message.userId);
        return (
          <div key={message.id} className="flex gap-3 hover:bg-gray-50 p-2 rounded">
            <div className="text-3xl">{user?.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-gray-900">{user?.name}</span>
                <span className="text-xs text-gray-500">
                  {formatTime(message.createdAt)}
                </span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap break-words">
                {message.content}
              </p>
              {message.reactions.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {message.reactions.map((reaction) => (
                    <button
                      key={reaction.emoji}
                      className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full text-sm hover:bg-purple-200 transition"
                    >
                      <span>{reaction.emoji}</span>
                      <span className="text-purple-900 font-medium">
                        {reaction.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
