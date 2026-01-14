import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, MessageSquare, Bell, FolderOpen, MoreHorizontal, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from './ThemeToggle';
import DMsPanel from '../panels/DMsPanel';
import ActivityPanel from '../panels/ActivityPanel';
import IncomingCallNotification from '../call/IncomingCallNotification';
import { subscribeToIncomingCalls, webrtcService, cleanupOldCalls } from '../../services/webrtcService';
import { subscribeToUnreadNotifications } from '../../services/notificationService';
import type { CallData } from '../../services/webrtcService';
import type { UnreadNotification } from '../../services/notificationService';

interface MiniNavbarProps {
  activeItem?: string;
}

export default function MiniNavbar({ activeItem = 'home' }: MiniNavbarProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDMsPanel, setShowDMsPanel] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ callId: string; callData: CallData } | null>(null);
  const [notifications, setNotifications] = useState<UnreadNotification[]>([]);
  const [processedCallIds, setProcessedCallIds] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  // Memoize unread count
  const unreadCount = notifications.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Subscribe to unread notifications
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToUnreadNotifications(currentUser.id, (notifs) => {
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Clean up old calls on mount (once per session)
  useEffect(() => {
    cleanupOldCalls().catch(console.error);
  }, []);

  // Subscribe to incoming calls globally
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToIncomingCalls(
      currentUser.id,
      // Handle incoming calls
      (callId, callData) => {
        // Prevent processing the same call multiple times
        if (processedCallIds.has(callId)) {
          return;
        }

        setProcessedCallIds(prev => new Set(prev).add(callId));
        setIncomingCall({ callId, callData });
      },
      // Handle call status changes (to dismiss notification when call ends)
      (callId, status) => {
        // If the call that's currently showing as incoming has ended/declined/accepted, dismiss it
        if (incomingCall?.callId === callId && status !== 'ringing') {
          setIncomingCall(null);
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser, processedCallIds, incomingCall?.callId]);

  const handleAnswerCall = async () => {
    if (incomingCall) {
      // Get workspace ID from current URL
      const match = window.location.pathname.match(/\/workspace\/([^/]+)/);
      const workspaceId = match ? match[1] : null;

      if (workspaceId) {
        try {
          // Create or get DM with the caller
          const { createOrGetDM } = await import('../../services/firestoreService');
          const dmId = await createOrGetDM(currentUser!.id, incomingCall.callData.callerId);

          // Store the incoming call info so DMPage can pick it up and show CallModal
          const pendingCallData = {
            callId: incomingCall.callId,
            callData: incomingCall.callData,
            alreadyAnswered: false, // Will be answered by DMPage/CallModal
          };
          sessionStorage.setItem('pendingCall', JSON.stringify(pendingCallData));

          // Dispatch a custom event so DMPage can react immediately (if already mounted)
          window.dispatchEvent(new CustomEvent('pendingCallUpdated', { detail: pendingCallData }));

          // Navigate to DM page - the call will be answered there
          navigate(`/workspace/${workspaceId}/dm/${dmId}`);
        } catch (error) {
          console.error('Error navigating to call:', error);
        }
      }
      setIncomingCall(null);
    }
  };

  const handleDeclineCall = async () => {
    if (incomingCall) {
      await webrtcService.declineCall(incomingCall.callId);
      setIncomingCall(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNavClick = async (itemId: string) => {
    switch (itemId) {
      case 'dms':
        setShowDMsPanel(true);
        setShowActivityPanel(false);
        break;
      case 'activity':
        setShowActivityPanel(true);
        setShowDMsPanel(false);
        // Don't clear notifications on open - let user clear them manually
        break;
      default:
        // Other items don't have actions yet
        break;
    }
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'dms', icon: MessageSquare, label: 'DMs' },
    { id: 'activity', icon: Bell, label: 'Activity' },
    { id: 'files', icon: FolderOpen, label: 'Files' },
    { id: 'more', icon: MoreHorizontal, label: 'More' },
  ];

  return (
    <>
      <div className="w-20 bg-gradient-to-b from-purple-950 to-purple-900 flex flex-col items-center py-4 border-r border-purple-800 h-screen">
        {/* Main Navigation Items */}
        <div className="flex flex-col gap-2 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            const showBadge = item.id === 'activity' && unreadCount > 0;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition ${
                  isActive
                    ? 'bg-purple-700 text-white'
                    : 'text-purple-300 hover:bg-purple-800 hover:text-white'
                }`}
                title={item.label}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {showBadge && (
                  <span className="absolute top-1 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* Theme Toggle - right below More */}
          <ThemeToggle variant="sidebar" />
        </div>

        {/* Spacer to push bottom items down */}
        <div className="flex-1" />

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-purple-300 hover:bg-purple-800 hover:text-white transition w-full"
          title="Sign out"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-medium">Sign out</span>
        </button>

        {/* User Profile with Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-purple-300 hover:bg-purple-800 hover:text-white transition"
            title={currentUser?.name || 'Profile'}
          >
            <User size={20} />
            <span className="text-[10px] font-medium">Profile</span>
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute bottom-full left-20 mb-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="font-semibold text-gray-900 dark:text-white">{currentUser?.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.email}</p>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                <LogOut size={18} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Panels */}
      <DMsPanel isOpen={showDMsPanel} onClose={() => setShowDMsPanel(false)} />
      <ActivityPanel isOpen={showActivityPanel} onClose={() => setShowActivityPanel(false)} />

      {/* Incoming Call Notification */}
      {incomingCall && (
        <IncomingCallNotification
          callData={incomingCall.callData}
          onAnswer={handleAnswerCall}
          onDecline={handleDeclineCall}
        />
      )}
    </>
  );
}
