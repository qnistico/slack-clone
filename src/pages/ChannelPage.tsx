import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Trash2 } from 'lucide-react';
import { useChannelStore } from '../store/channelStore';
import { useMessageStore } from '../store/messageStore';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import MiniNavbar from '../components/layout/MiniNavbar';
import Sidebar from '../components/sidebar/Sidebar';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import UserListPanel from '../components/sidebar/UserListPanel';
import ThreadPanel from '../components/chat/ThreadPanel';
import UserProfileModal from '../components/modals/UserProfileModal';
import TypingIndicator from '../components/chat/TypingIndicator';
import type { Message, User } from '../types/index';
import { updateMessage, deleteMessage as deleteMessageFromDb } from '../services/firestoreService';

export default function ChannelPage() {
  const navigate = useNavigate();
  const { channelId, workspaceId } = useParams<{ channelId: string; workspaceId: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const subscribeToUserWorkspaces = useWorkspaceStore((state) => state.subscribeToUserWorkspaces);
  const channels = useChannelStore((state) => state.channels);
  const subscribeToWorkspaceChannels = useChannelStore((state) => state.subscribeToWorkspaceChannels);
  const deleteChannel = useChannelStore((state) => state.deleteChannel);
  const messages = useMessageStore((state) => state.messages);
  const sendNewMessage = useMessageStore((state) => state.sendNewMessage);
  const addReaction = useMessageStore((state) => state.addReaction);
  const subscribeToChannelMessages = useMessageStore((state) => state.subscribeToChannelMessages);
  const subscribeToThread = useMessageStore((state) => state.subscribeToThread);
  const threadReplies = useMessageStore((state) => state.threadReplies);

  // Subscribe to user workspaces
  useEffect(() => {
    if (currentUser) {
      const unsubscribe = subscribeToUserWorkspaces(currentUser.id);
      return () => unsubscribe();
    }
  }, [currentUser, subscribeToUserWorkspaces]);

  // Subscribe to channels in the workspace
  useEffect(() => {
    if (workspaceId) {
      const unsubscribe = subscribeToWorkspaceChannels(workspaceId);
      return () => unsubscribe();
    }
  }, [workspaceId, subscribeToWorkspaceChannels]);

  // Subscribe to messages in the channel
  useEffect(() => {
    if (channelId) {
      const unsubscribe = subscribeToChannelMessages(channelId);
      return () => unsubscribe();
    }
  }, [channelId, subscribeToChannelMessages]);

  const [isUserListOpen, setIsUserListOpen] = useState(true);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [activeThreadParent, setActiveThreadParent] = useState<Message | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const currentChannel = channels.find((c) => c.id === channelId);
  const channelMessages = channelId
    ? messages
        .filter((m) => m.channelId === channelId && !m.threadId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    : [];

  useEffect(() => {
    if (activeThreadParent) {
      const unsubscribe = subscribeToThread(activeThreadParent.id);
      return () => unsubscribe();
    }
  }, [activeThreadParent, subscribeToThread]);

  const handleSendMessage = async (content: string) => {
    if (!currentUser || !channelId) return;

    try {
      await sendNewMessage(channelId, currentUser.id, content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleReactionClick = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    if (emoji) {
      try {
        await addReaction(messageId, emoji, currentUser.id);
      } catch (error) {
        console.error('Failed to add reaction:', error);
      }
    }
  };

  const handleThreadClick = (messageId: string) => {
    const message = channelMessages.find((m) => m.id === messageId);
    if (message) {
      setActiveThreadParent(message);
      setIsThreadOpen(true);
    }
  };

  const handleSendThreadReply = async (content: string) => {
    if (!currentUser || !activeThreadParent || !channelId) return;

    try {
      await sendNewMessage(channelId, currentUser.id, content, activeThreadParent.id);
    } catch (error) {
      console.error('Failed to send thread reply:', error);
    }
  };

  const threadMessages = activeThreadParent ? (threadReplies[activeThreadParent.id] || []) : [];

  const handleUserClick = async (userId: string) => {
    try {
      const { getUserById } = await import('../services/firestoreService');
      const userData = await getUserById(userId);

      if (userData && userData.name && userData.email) {
        setSelectedUser(userData as User);
        setIsProfileModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const handleDeleteChannel = async () => {
    if (!channelId || !currentChannel || !currentUser) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete #${currentChannel.name}? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await deleteChannel(channelId);
        navigate(`/workspace/${workspaceId}`);
      } catch (error) {
        console.error('Failed to delete channel:', error);
        alert('Failed to delete channel. Please try again.');
      }
    }
  };

  const handleEditMessage = async (messageId: string, currentContent: string) => {
    const newContent = prompt('Edit your message:', currentContent);
    if (newContent && newContent.trim() && newContent !== currentContent) {
      try {
        await updateMessage(messageId, newContent.trim());
      } catch (error) {
        console.error('Failed to edit message:', error);
        alert('Failed to edit message. Please try again.');
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessageFromDb(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const isChannelOwner = currentUser && currentChannel && currentChannel.createdBy === currentUser.id;

  if (!currentChannel) {
    return (
      <div className="flex h-screen">
        <MiniNavbar activeItem="home" />
        <Sidebar />
        <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading channel...</p>
          </div>
        </div>
      </div>
    );
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
            {isChannelOwner && (
              <button
                onClick={handleDeleteChannel}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition text-red-600 dark:text-red-400"
                title="Delete channel"
              >
                <Trash2 size={20} />
              </button>
            )}
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
          users={[currentUser!]}
          onReactionClick={handleReactionClick}
          onThreadClick={handleThreadClick}
          onUserClick={handleUserClick}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          currentUserId={currentUser?.id}
        />
        {currentUser && channelId && (
          <>
            <TypingIndicator channelId={channelId} currentUserId={currentUser.id} />
            <MessageInput
              channelId={channelId}
              channelName={currentChannel.name}
              userId={currentUser.id}
              userName={currentUser.name}
              onSendMessage={handleSendMessage}
            />
          </>
        )}
      </div>

      {/* Thread Panel */}
      {isThreadOpen && (
        <ThreadPanel
          isOpen={isThreadOpen}
          onClose={() => {
            setIsThreadOpen(false);
            setActiveThreadParent(null);
          }}
          parentMessage={activeThreadParent}
          threadMessages={threadMessages}
          users={[currentUser!]}
          onSendReply={handleSendThreadReply}
        />
      )}

      {/* User List Panel */}
      <UserListPanel
        channel={currentChannel}
        users={[currentUser!]}
        isOpen={isUserListOpen}
        onClose={() => setIsUserListOpen(false)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />
    </div>
  );
}
