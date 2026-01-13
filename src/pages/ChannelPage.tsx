import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useChannelStore } from '../store/channelStore';
import { useMessageStore } from '../store/messageStore';
import { useAuthStore } from '../store/authStore';
import MiniNavbar from '../components/layout/MiniNavbar';
import Sidebar from '../components/sidebar/Sidebar';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import UserListPanel from '../components/sidebar/UserListPanel';
import ThemeToggle from '../components/layout/ThemeToggle';
import { mockUsers } from '../utils/mockData';

export default function ChannelPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const channels = useChannelStore((state) => state.channels);
  const messages = useMessageStore((state) => state.messages);
  const addMessage = useMessageStore((state) => state.addMessage);
  const addReaction = useMessageStore((state) => state.addReaction);

  const [isUserListOpen, setIsUserListOpen] = useState(true);

  const currentChannel = channels.find((c) => c.id === channelId);
  const channelMessages = messages.filter((m) => m.channelId === channelId);

  const handleSendMessage = (content: string) => {
    if (!currentUser || !channelId) return;

    addMessage({
      id: `msg-${Date.now()}`,
      channelId,
      userId: currentUser.id,
      content,
      createdAt: new Date(),
      reactions: [],
    });
  };

  const handleReactionClick = (messageId: string, emoji: string) => {
    if (!currentUser) return;
    if (emoji) {
      addReaction(messageId, emoji, currentUser.id);
    }
    // TODO: Open emoji picker when emoji is empty
  };

  const handleThreadClick = (messageId: string) => {
    console.log('Open thread for message:', messageId);
    // TODO: Implement thread panel
  };

  if (!currentChannel) {
    return <div>Channel not found</div>;
  }

  return (
    <div className="flex h-screen">
      <MiniNavbar activeItem="home" />
      <Sidebar />
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        {/* Channel Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              {currentChannel.isPrivate ? '🔒' : '#'} {currentChannel.name}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {currentChannel.members.length} members
              </span>
            </h1>
            {currentChannel.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {currentChannel.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsUserListOpen(!isUserListOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
              title="Toggle member list"
            >
              <Users size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <MessageList
          messages={channelMessages}
          users={mockUsers}
          onReactionClick={handleReactionClick}
          onThreadClick={handleThreadClick}
        />
        <MessageInput
          channelName={currentChannel.name}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* User List Panel */}
      <UserListPanel
        channel={currentChannel}
        users={mockUsers}
        isOpen={isUserListOpen}
        onClose={() => setIsUserListOpen(false)}
      />
    </div>
  );
}
