import { useState, useEffect } from 'react';
import { X, Search, MessageSquare } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, query, where, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useDMStore } from '../../store/dmStore';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { getUserById, createOrGetDM } from '../../services/firestoreService';
import { getUserAvatar } from '../../utils/avatar';
import type { User } from '../../types';

interface DMsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MessageSearchResult {
  id: string;
  content: string;
  dmId: string;
  userId: string;
  createdAt: Date;
  otherUser: User;
}

export default function DMsPanel({ isOpen, onClose }: DMsPanelProps) {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [dmUsers, setDmUsers] = useState<Record<string, User>>({});
  const [messageResults, setMessageResults] = useState<MessageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const currentUser = useAuthStore((state) => state.currentUser);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const dms = useDMStore((state) => state.dms);

  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);

  // Fetch workspace members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentWorkspace?.members) return;

      try {
        const membersPromises = currentWorkspace.members.map((memberId) =>
          getUserById(memberId)
        );
        const membersData = await Promise.all(membersPromises);
        const validMembers = membersData.filter((m): m is User => m !== null);
        setWorkspaceMembers(validMembers);
      } catch (error) {
        console.error('Failed to fetch workspace members:', error);
      }
    };

    if (isOpen) {
      fetchMembers();
    }
  }, [currentWorkspace, isOpen]);

  // Fetch DM users
  useEffect(() => {
    const fetchDmUsers = async () => {
      const userMap: Record<string, User> = {};
      for (const dm of dms) {
        const otherUserId = dm.participants.find((id) => id !== currentUser?.id);
        if (otherUserId && !userMap[otherUserId]) {
          const user = await getUserById(otherUserId);
          if (user) {
            userMap[otherUserId] = user as User;
          }
        }
      }
      setDmUsers(userMap);
    };

    if (isOpen && dms.length > 0) {
      fetchDmUsers();
    }
  }, [dms, currentUser, isOpen]);

  // Search messages in DMs when query changes
  useEffect(() => {
    const searchDMMessages = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2 || !currentUser || dms.length === 0) {
        setMessageResults([]);
        return;
      }

      setIsSearching(true);
      const lowerQuery = searchQuery.toLowerCase();
      const results: MessageSearchResult[] = [];

      try {
        // Get DM IDs
        const dmIds = dms.map(dm => dm.id);

        // Search messages in batches
        const batchSize = 10;
        for (let i = 0; i < dmIds.length; i += batchSize) {
          const batch = dmIds.slice(i, i + batchSize);

          // Query without orderBy to avoid needing composite index
          const messagesQuery = query(
            collection(db, 'messages'),
            where('channelId', 'in', batch),
            limit(200)
          );

          const snapshot = await getDocs(messagesQuery);

          for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.content && data.content.toLowerCase().includes(lowerQuery)) {
              // Find the DM and the other user
              const dm = dms.find(d => d.id === data.channelId);
              if (dm) {
                const otherUserId = dm.participants.find(id => id !== currentUser.id);
                const otherUser = otherUserId ? dmUsers[otherUserId] : null;

                if (otherUser) {
                  results.push({
                    id: doc.id,
                    content: data.content,
                    dmId: data.channelId,
                    userId: data.userId,
                    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                    otherUser,
                  });
                }
              }
            }
          }
        }

        setMessageResults(results.slice(0, 20));
      } catch (error) {
        console.error('Error searching DM messages:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchDMMessages, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, currentUser, dms, dmUsers]);

  const handleStartDM = async (userId: string) => {
    if (!currentUser || !workspaceId) return;

    try {
      const dmId = await createOrGetDM(currentUser.id, userId);
      navigate(`/workspace/${workspaceId}/dm/${dmId}`);
      onClose();
    } catch (error) {
      console.error('Failed to create DM:', error);
    }
  };

  const handleOpenDM = (dmId: string) => {
    navigate(`/workspace/${workspaceId}/dm/${dmId}`);
    onClose();
  };

  // Filter members based on search
  const filteredMembers = workspaceMembers.filter(
    (member) =>
      member.id !== currentUser?.id &&
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter existing DMs based on search
  const filteredDms = dms.filter((dm) => {
    const otherUserId = dm.participants.find((id) => id !== currentUser?.id);
    const otherUser = otherUserId ? dmUsers[otherUserId] : null;
    return (
      otherUser && otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-20 w-80 bg-white dark:bg-gray-900 h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={20} />
            Direct Messages
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a DM"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isSearching && (
            <div className="p-4 text-center">
              <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          )}

          {/* Message Search Results */}
          {!isSearching && searchQuery.length >= 2 && messageResults.length > 0 && (
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Messages
              </h3>
              <div className="space-y-1">
                {messageResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleOpenDM(result.dmId)}
                    className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
                  >
                    <img
                      src={getUserAvatar(result.otherUser.name, result.otherUser.avatar)}
                      alt={result.otherUser.name}
                      className="w-8 h-8 rounded-lg flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.otherUser.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {result.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {result.content}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent DMs */}
          {filteredDms.length > 0 && (
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                {searchQuery ? 'People' : 'Recent'}
              </h3>
              <div className="space-y-1">
                {filteredDms.map((dm) => {
                  const otherUserId = dm.participants.find(
                    (id) => id !== currentUser?.id
                  );
                  const otherUser = otherUserId ? dmUsers[otherUserId] : null;
                  if (!otherUser) return null;

                  return (
                    <button
                      key={dm.id}
                      onClick={() => handleOpenDM(dm.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={getUserAvatar(otherUser.name, otherUser.avatar)}
                          alt={otherUser.name}
                          className="w-8 h-8 rounded-lg"
                        />
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                            otherUser.status === 'online'
                              ? 'bg-green-500'
                              : otherUser.status === 'away'
                                ? 'bg-yellow-500'
                                : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {otherUser.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Members - only show when not searching or no message results */}
          {(!searchQuery || (searchQuery && filteredMembers.length > 0 && messageResults.length === 0)) && (
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                {searchQuery ? 'Members' : 'All Members'}
              </h3>
              {filteredMembers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  {searchQuery ? 'No members found' : 'No other members'}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleStartDM(member.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={getUserAvatar(member.name, member.avatar)}
                          alt={member.name}
                          className="w-8 h-8 rounded-lg"
                        />
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                            member.status === 'online'
                              ? 'bg-green-500'
                              : member.status === 'away'
                                ? 'bg-yellow-500'
                                : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No results message */}
          {searchQuery.length >= 2 && !isSearching && messageResults.length === 0 && filteredDms.length === 0 && filteredMembers.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <p>No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
