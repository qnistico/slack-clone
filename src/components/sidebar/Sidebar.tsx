import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Hash, Lock, Plus, ChevronDown, UserPlus, Search, Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChannelStore } from '../../store/channelStore';
import { useAuthStore } from '../../store/authStore';
import { useDMStore } from '../../store/dmStore';
import CreateChannelModal from '../modals/CreateChannelModal';
import InviteModal from '../modals/InviteModal';
import SearchModal from '../search/SearchModal';
import { createWorkspaceInvite, getUserByEmail, getUserById, createOrGetDM, addWorkspaceMember } from '../../services/firestoreService';
import { DEMO_WORKSPACE_ID } from '../../services/demoActivityService';
import { getUserAvatar } from '../../utils/avatar';
import type { User } from '../../types';

// Demo Tour display name
const DEMO_TOUR_NAME = 'Demo Tour';

export default function Sidebar() {
  const navigate = useNavigate();
  const { workspaceId, channelId, dmId } = useParams<{ workspaceId: string; channelId?: string; dmId?: string }>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [isChannelsOpen, setIsChannelsOpen] = useState(true);
  const [isPrivateChannelsOpen, setIsPrivateChannelsOpen] = useState(true);
  const [isDMsOpen, setIsDMsOpen] = useState(true);
  const [isTeammatesOpen, setIsTeammatesOpen] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentUser = useAuthStore((state) => state.currentUser);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const channels = useChannelStore((state) => state.channels);
  const createNewChannel = useChannelStore((state) => state.createNewChannel);
  const subscribeToDMs = useDMStore((state) => state.subscribeToDMs);
  const dms = useDMStore((state) => state.dms);

  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);
  const workspaceChannels = channels.filter((c) => c.workspaceId === workspaceId);
  const publicChannels = workspaceChannels.filter((c) => !c.isPrivate);
  const privateChannels = workspaceChannels.filter((c) => c.isPrivate);

  // Fetch workspace members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentWorkspace || !currentWorkspace.members) return;

      try {
        const membersPromises = currentWorkspace.members.map(memberId => getUserById(memberId));
        const membersData = await Promise.all(membersPromises);
        const validMembers = membersData.filter((m): m is User => m !== null);

        // Always include current user
        if (currentUser && !validMembers.find(m => m.id === currentUser.id)) {
          validMembers.push(currentUser);
        }

        setWorkspaceMembers(validMembers);
      } catch (error) {
        console.error('Failed to fetch workspace members:', error);
      }
    };

    fetchMembers();
  }, [currentWorkspace, currentUser]);

  const onlineMembers = workspaceMembers.filter(m => m.status === 'online');
  const awayMembers = workspaceMembers.filter(m => m.status === 'away');
  const offlineMembers = workspaceMembers.filter(m => m.status === 'offline');

  // Subscribe to DMs
  useEffect(() => {
    if (currentUser) {
      const unsubscribe = subscribeToDMs(currentUser.id);
      return () => unsubscribe();
    }
  }, [currentUser, subscribeToDMs]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWorkspaceDropdownOpen(false);
      }
    };

    if (isWorkspaceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isWorkspaceDropdownOpen]);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateChannel = async (data: { name: string; description: string; isPrivate: boolean }) => {
    if (!workspaceId || !currentUser) return;

    try {
      await createNewChannel(
        workspaceId,
        data.name,
        currentUser.id,
        data.description,
        data.isPrivate
      );
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const handleInvite = async (email: string) => {
    if (!workspaceId || !currentUser) {
      throw new Error('Missing workspace or user information');
    }

    // Check if user is already a member
    const existingUser = await getUserByEmail(email);
    if (existingUser && currentWorkspace?.members.includes(existingUser.id as string)) {
      throw new Error('This user is already a member of the workspace');
    }

    await createWorkspaceInvite(workspaceId, email, currentUser.id);
  };

  const handleStartDM = async (userId: string) => {
    if (!currentUser || !workspaceId) return;

    try {
      const dmId = await createOrGetDM(currentUser.id, userId);
      navigate(`/workspace/${workspaceId}/dm/${dmId}`);
    } catch (error) {
      console.error('Failed to create DM:', error);
    }
  };

  return (
    <div className="w-full lg:w-64 bg-purple-900 text-white flex flex-col h-screen">
      {/* Workspace Header */}
      <div ref={dropdownRef} className="p-4 border-b border-purple-800 relative">
        <button
          onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
          className="w-full flex items-center justify-between hover:bg-purple-800 rounded px-2 py-1 transition pr-12 lg:pr-2"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {workspaceId === DEMO_WORKSPACE_ID ? (
              <Sparkles size={24} className="flex-shrink-0 text-purple-300" />
            ) : (
              <span className="text-2xl flex-shrink-0">{currentWorkspace?.icon}</span>
            )}
            <span className="text-lg font-bold truncate">
              {workspaceId === DEMO_WORKSPACE_ID ? DEMO_TOUR_NAME : currentWorkspace?.name}
            </span>
          </div>
          <ChevronDown
            size={18}
            className={`flex-shrink-0 transition-transform ${isWorkspaceDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Workspace Dropdown */}
        {isWorkspaceDropdownOpen && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="py-1">
              {/* Demo Workspace - show if not in user's workspaces */}
              {!workspaces.find(w => w.id === DEMO_WORKSPACE_ID) && (
                <button
                  onClick={async () => {
                    if (currentUser) {
                      try {
                        await addWorkspaceMember(DEMO_WORKSPACE_ID, currentUser.id);
                      } catch (error) {
                        console.log('Already a member or error:', error);
                      }
                      navigate(`/workspace/${DEMO_WORKSPACE_ID}`);
                      setIsWorkspaceDropdownOpen(false);
                    }
                  }}
                  className="w-full px-4 py-2 text-left bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition flex items-center gap-2"
                >
                  <Sparkles size={20} className="text-white" />
                  <span className="font-medium text-white truncate">{DEMO_TOUR_NAME}</span>
                  <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded ml-auto">Try it!</span>
                </button>
              )}
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => {
                    navigate(`/workspace/${workspace.id}`);
                    setIsWorkspaceDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left transition flex items-center gap-2 ${
                    workspace.id === DEMO_WORKSPACE_ID
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600'
                      : workspace.id === workspaceId
                        ? 'bg-purple-50 dark:bg-purple-900/20 hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {workspace.id === DEMO_WORKSPACE_ID ? (
                    <>
                      <Sparkles size={20} className="text-white" />
                      <span className="font-medium text-white truncate">{DEMO_TOUR_NAME}</span>
                      <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded ml-auto">Live</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">{workspace.icon}</span>
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {workspace.name}
                      </span>
                    </>
                  )}
                </button>
              ))}
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              <button
                onClick={() => {
                  navigate('/');
                  setIsWorkspaceDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-900 dark:text-white font-medium"
              >
                All Workspaces
              </button>
            </div>
          </div>
        )}

        {/* Search Button */}
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="w-full mt-2 flex items-center gap-2 px-3 py-2 bg-purple-800/50 hover:bg-purple-700 rounded transition text-sm"
          title="Search (Cmd+K)"
        >
          <Search size={16} />
          <span className="flex-1 text-left text-purple-200">Search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs bg-purple-900 rounded">⌘K</kbd>
        </button>

        {/* Invite Button */}
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-purple-800 hover:bg-purple-700 rounded transition text-sm font-medium"
          title="Invite teammates"
        >
          <UserPlus size={16} />
          Invite Teammates
        </button>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Public Channels */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <button
              onClick={() => setIsChannelsOpen(!isChannelsOpen)}
              className="flex items-center gap-1 hover:bg-purple-800 rounded px-1 py-0.5 transition flex-1 text-left"
            >
              <ChevronDown
                size={14}
                className={`flex-shrink-0 transition-transform duration-200 ${!isChannelsOpen ? '-rotate-90' : ''}`}
              />
              <h3 className="text-sm font-semibold text-purple-300">Channels</h3>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="hover:bg-purple-800 rounded p-1 transition"
              title="Create channel"
            >
              <Plus size={16} />
            </button>
          </div>
          <div
            className={`space-y-1 overflow-hidden transition-all duration-200 ${
              isChannelsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {publicChannels.length === 0 ? (
              <p className="px-2 text-sm text-purple-300 italic">No channels yet</p>
            ) : (
              publicChannels.map((channel) => (
                <Link
                  key={`${channel.workspaceId}-${channel.id}`}
                  to={`/workspace/${workspaceId}/channel/${channel.id}`}
                  className={`flex items-center gap-2 px-2 py-1 rounded transition ${
                    channelId === channel.id
                      ? 'bg-purple-700 text-white font-semibold'
                      : 'hover:bg-purple-800 text-purple-100'
                  }`}
                >
                  <Hash size={16} className="flex-shrink-0" />
                  <span className="truncate">{channel.name}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <button
                onClick={() => setIsPrivateChannelsOpen(!isPrivateChannelsOpen)}
                className="flex items-center gap-1 hover:bg-purple-800 rounded px-1 py-0.5 transition flex-1 text-left"
              >
                <ChevronDown
                  size={14}
                  className={`flex-shrink-0 transition-transform duration-200 ${!isPrivateChannelsOpen ? '-rotate-90' : ''}`}
                />
                <h3 className="text-sm font-semibold text-purple-300">Private Channels</h3>
              </button>
            </div>
            <div
              className={`space-y-1 overflow-hidden transition-all duration-200 ${
                isPrivateChannelsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {privateChannels.map((channel) => (
                <Link
                  key={`${channel.workspaceId}-${channel.id}`}
                  to={`/workspace/${workspaceId}/channel/${channel.id}`}
                  className={`flex items-center gap-2 px-2 py-1 rounded transition ${
                    channelId === channel.id
                      ? 'bg-purple-700 text-white font-semibold'
                      : 'hover:bg-purple-800 text-purple-100'
                  }`}
                >
                  <Lock size={16} className="flex-shrink-0" />
                  <span className="truncate">{channel.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Direct Messages */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <button
              onClick={() => setIsDMsOpen(!isDMsOpen)}
              className="flex items-center gap-1 hover:bg-purple-800 rounded px-1 py-0.5 transition flex-1 text-left"
            >
              <ChevronDown
                size={14}
                className={`flex-shrink-0 transition-transform duration-200 ${!isDMsOpen ? '-rotate-90' : ''}`}
              />
              <h3 className="text-sm font-semibold text-purple-300">Direct Messages</h3>
            </button>
          </div>
          <div
            className={`overflow-hidden transition-all duration-200 ${
              isDMsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {dms.length === 0 ? (
              <div className="px-2">
                <p className="text-sm text-purple-300 italic">No direct messages yet</p>
                <p className="text-xs text-purple-400 mt-1">Click a teammate below to start</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {dms.map((dm) => {
                  const otherUserId = dm.participants.find(id => id !== currentUser?.id);
                  const otherUser = workspaceMembers.find(m => m.id === otherUserId);
                  if (!otherUser) return null;

                  return (
                    <Link
                      key={dm.id}
                      to={`/workspace/${workspaceId}/dm/${dm.id}`}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-purple-800 transition ${
                        dmId === dm.id ? 'bg-purple-700' : ''
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={getUserAvatar(otherUser.name, otherUser.avatar)}
                          alt={otherUser.name}
                          className="w-6 h-6 rounded"
                        />
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-purple-900 ${
                            otherUser.status === 'online'
                              ? 'bg-green-500'
                              : otherUser.status === 'away'
                                ? 'bg-yellow-500'
                                : 'bg-gray-500'
                          }`}
                        />
                      </div>
                      <span className="text-sm text-purple-100 truncate flex-1">{otherUser.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Teammates Section */}
        {workspaceMembers.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <button
                onClick={() => setIsTeammatesOpen(!isTeammatesOpen)}
                className="flex items-center gap-1 hover:bg-purple-800 rounded px-1 py-0.5 transition flex-1 text-left"
              >
                <ChevronDown
                  size={14}
                  className={`flex-shrink-0 transition-transform duration-200 ${!isTeammatesOpen ? '-rotate-90' : ''}`}
                />
                <h3 className="text-sm font-semibold text-purple-300">Teammates</h3>
              </button>
            </div>
            <div
              className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
                isTeammatesOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {/* Online Members */}
              {onlineMembers.filter(m => m.id !== currentUser?.id).map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleStartDM(member.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-purple-800 transition text-left"
                  title={`Send message to ${member.name}`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={getUserAvatar(member.name, member.avatar)}
                      alt={member.name}
                      className="w-6 h-6 rounded"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-purple-900" />
                  </div>
                  <span className="text-sm text-purple-100 truncate flex-1">{member.name}</span>
                </button>
              ))}

              {/* Away Members */}
              {awayMembers.filter(m => m.id !== currentUser?.id).map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleStartDM(member.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-purple-800 transition text-left"
                  title={`Send message to ${member.name}`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={getUserAvatar(member.name, member.avatar)}
                      alt={member.name}
                      className="w-6 h-6 rounded opacity-75"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-purple-900" />
                  </div>
                  <span className="text-sm text-purple-100 opacity-75 truncate flex-1">{member.name}</span>
                </button>
              ))}

              {/* Offline Members */}
              {offlineMembers.filter(m => m.id !== currentUser?.id).map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleStartDM(member.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-purple-800 transition text-left"
                  title={`Send message to ${member.name}`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={getUserAvatar(member.name, member.avatar)}
                      alt={member.name}
                      className="w-6 h-6 rounded opacity-50"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-gray-500 rounded-full border border-purple-900" />
                  </div>
                  <span className="text-sm text-purple-100 opacity-50 truncate flex-1">{member.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-purple-800">
        <div className="flex items-center gap-2">
          <img
            src={getUserAvatar(currentUser?.name || 'User', currentUser?.avatar)}
            alt={currentUser?.name}
            className="w-8 h-8 rounded-lg"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  currentUser?.status === 'online'
                    ? 'bg-green-500'
                    : currentUser?.status === 'away'
                      ? 'bg-yellow-500'
                      : 'bg-gray-500'
                }`}
              />
              <p className="text-xs text-purple-300">{currentUser?.status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateChannel}
        workspaceId={workspaceId || ''}
      />

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspaceId={workspaceId || ''}
        workspaceName={currentWorkspace?.name || 'Workspace'}
        onInvite={handleInvite}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        workspaceMembers={workspaceMembers}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}
