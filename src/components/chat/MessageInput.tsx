import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, AtSign, Bold, Italic, Code, AlertCircle } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import { setUserTyping, removeUserTyping } from '../../services/presenceService';
import { rateLimitService } from '../../services/rateLimitService';

interface MessageInputProps {
  channelId: string;
  channelName: string;
  userId: string;
  userName: string;
  onSendMessage: (content: string) => void;
  placeholder?: string;
  workspaceMembers?: Array<{ id: string; name: string }>;
}

export default function MessageInput({
  channelId,
  channelName,
  userId,
  userName,
  onSendMessage,
  placeholder,
  workspaceMembers = [],
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Check for @ mention - match @ followed by any characters until end of string
    // This allows names with spaces like "Quinton Nistico"
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    // Find the last @ that starts a potential mention (not preceded by a non-space character)
    const atMatch = textBeforeCursor.match(/(?:^|[\s])@([^@]*)$/);

    if (atMatch) {
      // Extract the search text after @
      const searchText = atMatch[1];
      setMentionSearch(searchText);
      setShowMentions(true);
      setSelectedMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionSearch('');
    }

    // Set typing indicator
    if (value.trim()) {
      setUserTyping(channelId, userId, userName);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Remove typing indicator after 3 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        removeUserTyping(channelId, userId);
      }, 3000);
    } else {
      removeUserTyping(channelId, userId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentions) {
      const filteredMembers = getFilteredMembers();

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredMembers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMembers[selectedMentionIndex]) {
          insertMention(filteredMembers[selectedMentionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    }
  };

  const getFilteredMembers = () => {
    if (!mentionSearch) return workspaceMembers;
    return workspaceMembers.filter(member =>
      member.name.toLowerCase().includes(mentionSearch.toLowerCase())
    );
  };

  const insertMention = (member: { id: string; name: string }) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = message.substring(0, cursorPosition);
    const textAfterCursor = message.substring(cursorPosition);

    // Find the @ that started this mention
    const atIndex = textBeforeCursor.lastIndexOf('@');
    // Replace everything from @ to cursor with the full mention
    const newMessage =
      message.substring(0, atIndex) +
      `@${member.name} ` +
      textAfterCursor;

    setMessage(newMessage);
    setShowMentions(false);
    setMentionSearch('');

    // Set cursor position after the mention
    const newCursorPos = atIndex + member.name.length + 2; // @ + name + space
    setTimeout(() => {
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      inputRef.current?.focus();
    }, 0);
  };

  const insertFormatting = (before: string, after: string = before) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const selectedText = message.substring(start, end);

    const newMessage =
      message.substring(0, start) +
      before +
      selectedText +
      after +
      message.substring(end);

    setMessage(newMessage);

    // Set cursor position after formatting
    setTimeout(() => {
      const newCursorPos = selectedText
        ? start + before.length + selectedText.length + after.length
        : start + before.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.focus();
    }, 0);
  };

  const handleBold = () => insertFormatting('*');
  const handleItalic = () => insertFormatting('_');
  const handleCode = () => insertFormatting('`');
  const handleMention = () => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const newMessage =
      message.substring(0, cursorPosition) +
      '@' +
      message.substring(cursorPosition);
    setMessage(newMessage);
    setShowMentions(true);
    setMentionSearch('');

    setTimeout(() => {
      inputRef.current?.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
      inputRef.current?.focus();
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      // Check rate limit
      const rateLimitResult = rateLimitService.checkLimit(userId, 'message');

      if (!rateLimitResult.allowed) {
        setRateLimitError(rateLimitResult.message || 'Rate limit exceeded');

        // Clear error after the retry time
        if (rateLimitTimeoutRef.current) {
          clearTimeout(rateLimitTimeoutRef.current);
        }
        rateLimitTimeoutRef.current = setTimeout(() => {
          setRateLimitError(null);
        }, rateLimitResult.retryAfterMs || 5000);

        return;
      }

      // Clear any existing rate limit error
      setRateLimitError(null);

      onSendMessage(message.trim());
      setMessage('');
      removeUserTyping(channelId, userId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      removeUserTyping(channelId, userId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
    };
  }, [channelId, userId]);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      {/* Rate Limit Error */}
      {rateLimitError && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{rateLimitError}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || `Message #${channelName}`}
            className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition"
          >
            <Send size={16} />
          </button>

          {/* Mentions Dropdown */}
          {showMentions && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
              {getFilteredMembers().length > 0 ? (
                getFilteredMembers().map((member, index) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => insertMention(member)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                      index === selectedMentionIndex
                        ? 'bg-purple-50 dark:bg-purple-900/20'
                        : ''
                    }`}
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No members found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleBold}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
            title="Bold (wrap with *)"
          >
            <Bold size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            type="button"
            onClick={handleItalic}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
            title="Italic (wrap with _)"
          >
            <Italic size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            type="button"
            onClick={handleCode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
            title="Code (wrap with `)"
          >
            <Code size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
            title="Attach file"
            disabled
          >
            <Paperclip size={18} className="text-gray-400 dark:text-gray-600" />
          </button>
          <button
            type="button"
            onClick={handleMention}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
            title="Mention someone"
          >
            <AtSign size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        </div>
      </form>
    </div>
  );
}
