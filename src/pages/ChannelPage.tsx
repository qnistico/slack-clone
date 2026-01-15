import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Trash2, Menu, ArrowLeft, Settings } from 'lucide-react';
import { useChannelStore } from '../store/channelStore';
import { useMessageStore } from '../store/messageStore';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import MiniNavbar from '../components/layout/MiniNavbar';
import Sidebar from '../components/sidebar/Sidebar';
import MobileSidebarMenu from '../components/layout/MobileSidebarMenu';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import UserListPanel from '../components/sidebar/UserListPanel';
import ThreadPanel from '../components/chat/ThreadPanel';
import UserProfileModal from '../components/modals/UserProfileModal';
import EditChannelModal from '../components/modals/EditChannelModal';
import TypingIndicator from '../components/chat/TypingIndicator';
import type { Message, User } from '../types/index';
import { updateMessage, deleteMessage as deleteMessageFromDb, getUserById, addChannelMember, addWorkspaceMember } from '../services/firestoreService';
import { MessageListSkeleton } from '../components/common/Skeleton';
import { demoActivityService, DEMO_WORKSPACE_ID } from '../services/demoActivityService';

export default function ChannelPage() {
  const navigate = useNavigate();
  const { channelId, workspaceId } = useParams<{ channelId: string; workspaceId: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const subscribeToUserWorkspaces = useWorkspaceStore((state) => state.subscribeToUserWorkspaces);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const channels = useChannelStore((state) => state.channels);
  const subscribeToWorkspaceChannels = useChannelStore((state) => state.subscribeToWorkspaceChannels);
  const deleteChannel = useChannelStore((state) => state.deleteChannel);
  const updateChannel = useChannelStore((state) => state.updateChannel);
  const messages = useMessageStore((state) => state.messages);
  const sendNewMessage = useMessageStore((state) => state.sendNewMessage);
  const addReaction = useMessageStore((state) => state.addReaction);
  const subscribeToChannelMessages = useMessageStore((state) => state.subscribeToChannelMessages);
  const subscribeToThread = useMessageStore((state) => state.subscribeToThread);
  const threadReplies = useMessageStore((state) => state.threadReplies);

  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);

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
      setIsLoadingMessages(true);
      const unsubscribe = subscribeToChannelMessages(channelId);
      // Give a small delay for initial load
      const timer = setTimeout(() => setIsLoadingMessages(false), 500);
      return () => {
        unsubscribe();
        clearTimeout(timer);
      };
    }
  }, [channelId, subscribeToChannelMessages]);

  // Fix user name if missing
  useEffect(() => {
    const fixUserName = async () => {
      if (!currentUser) return;

      // Check if current user's name is missing from Firestore
      const userDoc = await getUserById(currentUser.id);
      if (userDoc && !userDoc.name && currentUser.name) {
        console.log('Fixing user name in Firestore...');
        const { doc: firestoreDoc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const userRef = firestoreDoc(db, 'users', currentUser.id);
        await setDoc(userRef, { name: currentUser.name }, { merge: true });
        console.log('User name fixed!');
      }
    };

    fixUserName();
  }, [currentUser]);

  // Fetch workspace members
  useEffect(() => {
    const fetchWorkspaceMembers = async () => {
      if (!workspaceId || workspaces.length === 0) return;

      const currentWorkspace = workspaces.find(w => w.id === workspaceId);
      if (!currentWorkspace) {
        console.log('Workspace not found:', workspaceId);
        return;
      }

      if (!currentWorkspace.members || currentWorkspace.members.length === 0) {
        console.log('No members in workspace');
        setWorkspaceMembers([]);
        return;
      }

      try {
        console.log('Fetching members for workspace:', currentWorkspace.name);
        console.log('Workspace owner ID:', currentWorkspace.ownerId);
        console.log('Member IDs in workspace:', currentWorkspace.members);
        console.log('Current user ID:', currentUser?.id);
        console.log('Current user name:', currentUser?.name);

        // Add current user to workspace if they're the owner but not in members
        if (currentUser && currentWorkspace.ownerId === currentUser.id && !currentWorkspace.members.includes(currentUser.id)) {
          console.log('Owner not in members list, adding to workspace...');
          await addWorkspaceMember(workspaceId, currentUser.id);
        }

        const membersPromises = currentWorkspace.members.map(memberId => getUserById(memberId));
        const membersData = await Promise.all(membersPromises);
        console.log('Raw members data from Firestore:', membersData);
        const validMembers = membersData.filter((m): m is User => m !== null);

        // Always include current user in the list
        if (currentUser && !validMembers.find(m => m.id === currentUser.id)) {
          console.log('Adding current user to members list');
          validMembers.push(currentUser);
        }

        console.log('Loaded workspace members:', validMembers.map(m => ({ id: m.id, name: m.name })));
        setWorkspaceMembers(validMembers);
      } catch (error) {
        console.error('Failed to fetch workspace members:', error);
      }
    };

    fetchWorkspaceMembers();
  }, [workspaceId, workspaces]);

  const [isUserListOpen, setIsUserListOpen] = useState(false); // Hidden by default - teammates shown in sidebar
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [activeThreadParent, setActiveThreadParent] = useState<Message | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isEditChannelModalOpen, setIsEditChannelModalOpen] = useState(false);

  const currentChannel = channels.find((c) => c.id === channelId);

  // Auto-join channel if user is not a member
  useEffect(() => {
    const autoJoinChannel = async () => {
      console.log('Auto-join check:', {
        hasCurrentUser: !!currentUser,
        currentUserId: currentUser?.id,
        hasCurrentChannel: !!currentChannel,
        channelName: currentChannel?.name,
        channelMembers: currentChannel?.members,
        hasChannelId: !!channelId,
      });

      if (!currentUser || !currentChannel || !channelId) {
        console.log('Auto-join skipped: missing required data');
        return;
      }

      const isMember = currentChannel.members?.includes(currentUser.id);
      console.log('Is user already a member?', isMember);

      if (!isMember) {
        try {
          console.log('Auto-joining channel:', currentChannel.name);
          await addChannelMember(channelId, currentUser.id);
          console.log('Successfully joined channel');
        } catch (error) {
          console.error('Failed to auto-join channel:', error);
        }
      }
    };

    autoJoinChannel();
  }, [currentUser, currentChannel, channelId]);

  // Demo workspace: Start simulated activity sequence
  // Use currentUser.id instead of currentUser object to prevent re-runs
  const currentUserId = currentUser?.id;
  useEffect(() => {
    if (!workspaceId || !channelId || !currentUserId) return;

    // Only trigger in demo workspace
    if (workspaceId === DEMO_WORKSPACE_ID) {
      // Start the demo activity sequence (typing indicator, then notification)
      // Note: We don't call stop() on cleanup - let the sequence finish naturally
      demoActivityService.startActivitySequence(workspaceId, channelId, currentUserId);
    }
  }, [workspaceId, channelId, currentUserId]);

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

      console.log('Clicked user data:', userData);

      if (userData) {
        setSelectedUser(userData as User);
        setIsProfileModalOpen(true);
      } else {
        console.error('User data not found for ID:', userId);
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

  const handleEditChannel = async (data: { name: string; description: string; isPrivate: boolean }) => {
    if (!channelId || !currentChannel) return;

    try {
      await updateChannel(channelId, {
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate,
      });
    } catch (error) {
      console.error('Failed to update channel:', error);
      alert('Failed to update channel. Please try again.');
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
      <div className="flex h-screen overflow-hidden">
        <div className="hidden lg:block">
          <MiniNavbar activeItem="home" />
        </div>
        <div className="hidden lg:block">
          <Sidebar />
        </div>
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
    <div className="flex h-screen overflow-hidden">
      {/* Desktop: Mini Navbar */}
      <div className="hidden lg:block">
        <MiniNavbar activeItem="home" />
      </div>

      {/* Desktop: Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile: Unified sidebar menu with MiniNavbar + Sidebar */}
      <MobileSidebarMenu
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        activeItem="home"
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-w-0">
        {/* Channel Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Mobile back button */}
            <button
              onClick={() => navigate(`/workspace/${workspaceId}`)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition flex-shrink-0"
              title="Back to workspace"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>

            {/* Mobile hamburger menu */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition flex-shrink-0"
              title="Toggle sidebar"
            >
              <Menu size={20} className="text-gray-600 dark:text-gray-400" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-bold flex items-center gap-1 sm:gap-2 text-gray-900 dark:text-white">
                <span className="truncate">
                  {currentChannel.isPrivate ? '🔒' : '#'} {currentChannel.name}
                </span>
                <span className="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                  {currentChannel.members.length}
                </span>
              </h1>
              {currentChannel.description && (
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1 truncate">
                  {currentChannel.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isChannelOwner && (
              <>
                <button
                  onClick={() => setIsEditChannelModalOpen(true)}
                  className="p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                  title="Edit channel"
                >
                  <Settings size={18} className="sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={handleDeleteChannel}
                  className="p-2 sm:p-2.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition text-red-600 dark:text-red-400"
                  title="Delete channel"
                >
                  <Trash2 size={18} className="sm:w-5 sm:h-5" />
                </button>
              </>
            )}
            <button
              onClick={() => setIsUserListOpen(!isUserListOpen)}
              className="p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
              title="Toggle member list"
            >
              <Users size={18} className="sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {isLoadingMessages ? (
          <MessageListSkeleton count={6} />
        ) : (
          <MessageList
            messages={channelMessages}
            users={workspaceMembers}
            onReactionClick={handleReactionClick}
            onThreadClick={handleThreadClick}
            onUserClick={handleUserClick}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            currentUserId={currentUser?.id}
          />
        )}
        {currentUser && channelId && (
          <>
            <TypingIndicator channelId={channelId} currentUserId={currentUser.id} />
            <MessageInput
              channelId={channelId}
              channelName={currentChannel.name}
              userId={currentUser.id}
              userName={currentUser.name}
              onSendMessage={handleSendMessage}
              workspaceMembers={workspaceMembers.map(m => ({ id: m.id, name: m.name }))}
            />
          </>
        )}
      </div>

      {/* Thread Panel - Full screen on mobile, sidebar on desktop */}
      {isThreadOpen && (
        <ThreadPanel
          isOpen={isThreadOpen}
          onClose={() => {
            setIsThreadOpen(false);
            setActiveThreadParent(null);
          }}
          parentMessage={activeThreadParent}
          threadMessages={threadMessages}
          users={workspaceMembers}
          onSendReply={handleSendThreadReply}
          currentUserId={currentUser?.id}
          currentUserName={currentUser?.name}
        />
      )}

      {/* User List Panel - Full screen on mobile, sidebar on desktop */}
      <UserListPanel
        channel={currentChannel}
        users={workspaceMembers}
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

      {/* Edit Channel Modal */}
      <EditChannelModal
        isOpen={isEditChannelModalOpen}
        onClose={() => setIsEditChannelModalOpen(false)}
        onSubmit={handleEditChannel}
        channel={currentChannel}
      />
    </div>
  );
}
