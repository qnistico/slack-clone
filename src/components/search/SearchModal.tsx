import { useState, useEffect, useRef } from 'react';
import { Search, X, Hash, MessageSquare } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { searchMessages } from '../../services/searchService';
import type { SearchResult } from '../../services/searchService';
import { getUserAvatar } from '../../utils/avatar';
import type { User as UserType } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceMembers: UserType[];
  currentUserId?: string;
}

export default function SearchModal({ isOpen, onClose, workspaceMembers, currentUserId }: SearchModalProps) {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'all' | 'messages' | 'channels'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchResults = await searchMessages(query, workspaceId || '', workspaceMembers, currentUserId);

        // Filter by type if needed
        let filteredResults = searchResults;
        if (searchType === 'messages') {
          filteredResults = searchResults.filter(r => r.type === 'message');
        } else if (searchType === 'channels') {
          filteredResults = searchResults.filter(r => r.type === 'channel');
        }

        setResults(filteredResults);
      } catch (error) {
        // Silent error handling
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, workspaceId, workspaceMembers, searchType, currentUserId]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'channel') {
      navigate(`/workspace/${workspaceId}/channel/${result.channelId}`);
    } else if (result.type === 'message') {
      if (result.isDM) {
        navigate(`/workspace/${workspaceId}/dm/${result.channelId}`);
      } else {
        navigate(`/workspace/${workspaceId}/channel/${result.channelId}`);
      }
    }
    onClose();
    setQuery('');
    setResults([]);
  };

  const getUserById = (userId: string) => {
    return workspaceMembers.find(u => u.id === userId);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50">
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="relative border-b border-gray-200 dark:border-gray-700">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, channels..."
            className="w-full pl-12 pr-12 py-4 text-lg bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X size={18} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 p-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSearchType('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              searchType === 'all'
                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSearchType('messages')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              searchType === 'messages'
                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <MessageSquare size={14} className="inline mr-1" />
            Messages
          </button>
          <button
            onClick={() => setSearchType('channels')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              searchType === 'channels'
                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Hash size={14} className="inline mr-1" />
            Channels
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isSearching ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-500 dark:text-gray-400">Searching...</p>
            </div>
          ) : query.length < 2 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Search size={48} className="mx-auto mb-3 opacity-30" />
              <p>Type at least 2 characters to search</p>
              <p className="text-sm mt-2">
                Tip: Use <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Cmd+K</kbd> to quickly open search
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-2">Try different keywords or check spelling</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {results.map((result) => {
                const user = result.userId ? getUserById(result.userId) : null;

                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition"
                  >
                    {result.type === 'channel' ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <Hash size={20} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            # {highlightMatch(result.channelName || '', query)}
                          </p>
                          {result.content && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                              {result.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <img
                          src={getUserAvatar(user?.name || 'Unknown', user?.avatar)}
                          alt={user?.name}
                          className="w-10 h-10 rounded-lg flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {user?.name || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              in {result.isDM ? 'DM' : `#${result.channelName}`}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {result.createdAt && formatTime(result.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                            {highlightMatch(result.content, query)}
                          </p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <span>
            {results.length > 0 && `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </span>
          <button
            onClick={onClose}
            className="hover:text-gray-700 dark:hover:text-gray-300 transition"
          >
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd> to close
          </button>
        </div>
      </div>

      {/* Backdrop click to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}
