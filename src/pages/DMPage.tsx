import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, Users, Phone, Video } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useDMStore } from '../store/dmStore';
import { useMessageStore } from '../store/messageStore';
import MiniNavbar from '../components/layout/MiniNavbar';
import Sidebar from '../components/sidebar/Sidebar';
import MobileSidebarMenu from '../components/layout/MobileSidebarMenu';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import UserListPanel from '../components/sidebar/UserListPanel';
import UserProfileModal from '../components/modals/UserProfileModal';
import CallModal from '../components/call/CallModal';
import { getUserById, sendDMMessage, updateMessage, deleteMessage as deleteMessageFromDb } from '../services/firestoreService';
import { getUserAvatar } from '../utils/avatar';
import { MessageListSkeleton } from '../components/common/Skeleton';
import { DEMO_BOTS } from '../services/demoActivityService';
import type { CallData } from '../services/webrtcService';
import type { User, Channel } from '../types/index';

export default function DMPage() {
  const navigate = useNavigate();
  const { dmId, workspaceId } = useParams<{ dmId: string; workspaceId: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const subscribeToUserWorkspaces = useWorkspaceStore((state) => state.subscribeToUserWorkspaces);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const subscribeToDMMessages = useDMStore((state) => state.subscribeToDMMessages);
  const dmMessages = useDMStore((state) => state.dmMessages);
  const addReaction = useMessageStore((state) => state.addReaction);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // Call state
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [incomingCall, setIncomingCall] = useState<{ callId: string; callData: CallData } | null>(null);
  const [pendingCallProcessed, setPendingCallProcessed] = useState(false);

  // Subscribe to user workspaces
  useEffect(() => {
    if (currentUser) {
      const unsubscribe = subscribeToUserWorkspaces(currentUser.id);
      return () => unsubscribe();
    }
  }, [currentUser, subscribeToUserWorkspaces]);

  // Subscribe to DM messages
  useEffect(() => {
    if (dmId) {
      setIsLoadingMessages(true);
      const unsubscribe = subscribeToDMMessages(dmId);
      const timer = setTimeout(() => setIsLoadingMessages(false), 500);
      return () => {
        unsubscribe();
        clearTimeout(timer);
      };
    }
  }, [dmId, subscribeToDMMessages]);

  // Fetch the other user in the DM
  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!dmId || !currentUser) return;

      try {
        // Get DM document to find participants
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const dmRef = doc(db, 'directMessages', dmId);
        const dmDoc = await getDoc(dmRef);

        if (dmDoc.exists()) {
          const dmData = dmDoc.data();
          const participants = dmData.participants || [];
          const otherUserId = participants.find((id: string) => id !== currentUser.id);

          if (otherUserId) {
            // Check if it's a demo bot
            const demoBot = DEMO_BOTS.find(bot => bot.id === otherUserId);
            if (demoBot) {
              // Create a fake user object for the bot
              setOtherUser({
                id: demoBot.id,
                name: demoBot.name,
                email: `${demoBot.id}@demo.bot`,
                status: 'online',
              });
            } else {
              const user = await getUserById(otherUserId);
              if (user) {
                setOtherUser(user as User);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch DM participants:', error);
      }
    };

    fetchOtherUser();
  }, [dmId, currentUser]);

  // Fetch workspace members
  useEffect(() => {
    const fetchWorkspaceMembers = async () => {
      if (!workspaceId || workspaces.length === 0) return;

      const currentWorkspace = workspaces.find(w => w.id === workspaceId);
      if (!currentWorkspace?.members) return;

      try {
        const membersPromises = currentWorkspace.members.map(memberId => getUserById(memberId));
        const membersData = await Promise.all(membersPromises);
        const validMembers = membersData.filter((m): m is User => m !== null);

        if (currentUser && !validMembers.find(m => m.id === currentUser.id)) {
          validMembers.push(currentUser);
        }

        setWorkspaceMembers(validMembers);
      } catch (error) {
        console.error('Failed to fetch workspace members:', error);
      }
    };

    fetchWorkspaceMembers();
  }, [workspaceId, workspaces, currentUser]);

  // Note: Incoming calls are handled globally by MiniNavbar
  // DMPage only handles pending calls from sessionStorage when navigated here after answering

  // Check for pending call from sessionStorage (navigated from MiniNavbar answer)
  const [shouldAutoAnswer, setShouldAutoAnswer] = useState(false);

  // Helper function to process pending call data
  const processPendingCall = (data: { callId: string; callData: CallData }) => {
    const { callId, callData } = data;
    console.log('Processing pending call:', { callId, callData });

    // Clear the pending call from sessionStorage
    sessionStorage.removeItem('pendingCall');
    setPendingCallProcessed(true);

    // Set up the call modal - it will auto-answer because shouldAutoAnswer is true
    setIncomingCall({ callId, callData });
    setCallType(callData.type);
    setShouldAutoAnswer(true);
    setIsCallModalOpen(true);
    console.log('CallModal opened with autoAnswer=true');
  };

  // Check sessionStorage on mount and when pendingCallProcessed changes
  useEffect(() => {
    if (pendingCallProcessed || !currentUser) return;

    const pendingCallData = sessionStorage.getItem('pendingCall');
    if (pendingCallData) {
      try {
        processPendingCall(JSON.parse(pendingCallData));
      } catch (error) {
        console.error('Error processing pending call:', error);
        sessionStorage.removeItem('pendingCall');
      }
    }
  }, [currentUser, pendingCallProcessed]);

  // Listen for custom event when user answers call while already on DMPage
  useEffect(() => {
    if (!currentUser) return;

    const handlePendingCallEvent = (event: CustomEvent<{ callId: string; callData: CallData }>) => {
      console.log('Received pendingCallUpdated event:', event.detail);
      // Always process the call from the event - it's a new call
      processPendingCall(event.detail);
    };

    window.addEventListener('pendingCallUpdated', handlePendingCallEvent as EventListener);
    return () => {
      window.removeEventListener('pendingCallUpdated', handlePendingCallEvent as EventListener);
    };
  }, [currentUser]);

  const messages = dmId ? (dmMessages[dmId] || []) : [];

  const handleSendMessage = async (content: string) => {
    if (!currentUser || !dmId) return;

    try {
      await sendDMMessage(dmId, currentUser.id, content, currentUser.name);
    } catch (error) {
      console.error('Failed to send DM:', error);
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

  const handleUserClick = async (userId: string) => {
    try {
      const userData = await getUserById(userId);
      if (userData) {
        setSelectedUser(userData as User);
        setIsProfileModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
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

  // Call handlers
  const handleStartCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setIsCallModalOpen(true);
  };

  if (!otherUser) {
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
            <p className="text-gray-600 dark:text-gray-400">Loading conversation...</p>
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
        {/* DM Header */}
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

            {/* User avatar and name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img
                src={getUserAvatar(otherUser.name, otherUser.avatar)}
                alt={otherUser.name}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                  {otherUser.name}
                </h1>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      otherUser.status === 'online'
                        ? 'bg-green-500'
                        : otherUser.status === 'away'
                          ? 'bg-yellow-500'
                          : 'bg-gray-500'
                    }`}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {otherUser.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Voice call button */}
            <button
              onClick={() => handleStartCall('audio')}
              className="p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
              title="Start voice call"
            >
              <Phone size={18} className="sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
            </button>
            {/* Video call button */}
            <button
              onClick={() => handleStartCall('video')}
              className="p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
              title="Start video call"
            >
              <Video size={18} className="sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
            </button>
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
            messages={messages}
            users={otherUser ? [...workspaceMembers, otherUser] : workspaceMembers}
            onReactionClick={handleReactionClick}
            onUserClick={handleUserClick}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            currentUserId={currentUser?.id}
          />
        )}
        {currentUser && dmId && (
          <>
            <TypingIndicator channelId={dmId} currentUserId={currentUser.id} />
            <MessageInput
              channelId={dmId}
              channelName={otherUser.name}
              userId={currentUser.id}
              userName={currentUser.name}
              onSendMessage={handleSendMessage}
              workspaceMembers={workspaceMembers.map(m => ({ id: m.id, name: m.name }))}
              placeholder={`Message ${otherUser.name}...`}
            />
          </>
        )}
      </div>

      {/* User List Panel - Full screen on mobile, sidebar on desktop */}
      <UserListPanel
        channel={
          {
            id: dmId || '',
            workspaceId: workspaceId || '',
            name: otherUser?.name || 'Direct Message',
            isPrivate: true,
            createdAt: new Date(),
            createdBy: currentUser?.id || '',
            members: workspaceMembers.map(m => m.id),
          } as Channel
        }
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

      {/* Call Modal */}
      <CallModal
        isOpen={isCallModalOpen}
        onClose={() => {
          setIsCallModalOpen(false);
          setShouldAutoAnswer(false);
          setIncomingCall(null); // Clear incoming call state for next call
          setPendingCallProcessed(false); // Allow processing of future pending calls
        }}
        callType={callType}
        isIncoming={!!incomingCall}
        callId={incomingCall?.callId}
        callData={incomingCall?.callData}
        currentUserId={currentUser?.id}
        currentUserName={currentUser?.name}
        remoteUserId={otherUser?.id}
        remoteUserName={otherUser?.name}
        remoteUserAvatar={otherUser?.avatar}
        autoAnswer={shouldAutoAnswer}
      />

      {/* Incoming calls are handled globally by MiniNavbar */}
    </div>
  );
}
