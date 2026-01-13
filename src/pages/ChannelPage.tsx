import { useParams } from 'react-router-dom';
import { useChannelStore } from '../store/channelStore';
import { useMessageStore } from '../store/messageStore';
import { useAuthStore } from '../store/authStore';
import Sidebar from '../components/sidebar/Sidebar';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import { mockUsers } from '../utils/mockData';

export default function ChannelPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const channels = useChannelStore((state) => state.channels);
  const messages = useMessageStore((state) => state.messages);
  const addMessage = useMessageStore((state) => state.addMessage);

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

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-white">
        <div className="border-b border-gray-200 p-4">
          <h1 className="text-xl font-bold">
            {currentChannel?.isPrivate ? '🔒' : '#'} {currentChannel?.name}
          </h1>
          {currentChannel?.description && (
            <p className="text-sm text-gray-600 mt-1">
              {currentChannel.description}
            </p>
          )}
        </div>
        <MessageList messages={channelMessages} users={mockUsers} />
        <MessageInput
          channelName={currentChannel?.name || ''}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
