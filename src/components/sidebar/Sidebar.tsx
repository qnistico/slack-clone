import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Hash, Lock, Plus, ChevronDown, MessageSquare, UserPlus } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChannelStore } from '../../store/channelStore';
import { useAuthStore } from '../../store/authStore';
import CreateChannelModal from '../modals/CreateChannelModal';
import InviteModal from '../modals/InviteModal';
import { createWorkspaceInvite, getUserByEmail, getUserById } from '../../services/firestoreService';
import { getUserAvatar } from '../../utils/avatar';
import type { User } from '../../types';

export default function Sidebar() {
  const { workspaceId, channelId } = useParams<{ workspaceId: string; channelId?: string }>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);

  const currentUser = useAuthStore((state) => state.currentUser);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const channels = useChannelStore((state) => state.channels);
  const createNewChannel = useChannelStore((state) => state.createNewChannel);

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

  return (
    <div className="w-full lg:w-64 bg-purple-900 text-white flex flex-col h-screen">
      {/* Workspace Header */}
      <div className="p-4 border-b border-purple-800">
        <button className="w-full flex items-center justify-between hover:bg-purple-800 rounded px-2 py-1 transition pr-12 lg:pr-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-2xl flex-shrink-0">{currentWorkspace?.icon}</span>
            <span className="text-lg font-bold truncate">{currentWorkspace?.name}</span>
          </div>
          <ChevronDown size={18} className="flex-shrink-0" />
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
            <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-1">
              <ChevronDown size={14} />
              Channels
            </h3>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="hover:bg-purple-800 rounded p-1 transition"
              title="Create channel"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-1">
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
              <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-1">
                <ChevronDown size={14} />
                Private Channels
              </h3>
              <button className="hover:bg-purple-800 rounded p-1 transition">
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-1">
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
            <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-1">
              <ChevronDown size={14} />
              Direct Messages
            </h3>
            <button className="hover:bg-purple-800 rounded p-1 transition">
              <Plus size={16} />
            </button>
          </div>
          <div className="px-2">
            <button className="flex items-center gap-2 text-sm text-purple-300 hover:text-white transition">
              <MessageSquare size={16} />
              <span>Start a conversation</span>
            </button>
          </div>
        </div>

        {/* Teammates Section */}
        {workspaceMembers.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-1">
                <ChevronDown size={14} />
                Teammates
              </h3>
            </div>
            <div className="space-y-0.5">
              {/* Online Members */}
              {onlineMembers.map((member) => (
                <button
                  key={member.id}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-purple-800 transition text-left"
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
              {awayMembers.map((member) => (
                <button
                  key={member.id}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-purple-800 transition text-left"
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
              {offlineMembers.map((member) => (
                <button
                  key={member.id}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-purple-800 transition text-left"
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
    </div>
  );
}
