import { useState } from 'react';
import { Send, Paperclip, AtSign, Bold, Italic, Code } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

interface MessageInputProps {
  channelName: string;
  onSendMessage: (content: string) => void;
}

export default function MessageInput({
  channelName,
  onSendMessage,
}: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Message #${channelName}`}
            className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition"
          >
            <Send size={16} />
          </button>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
            title="Bold"
          >
            <Bold size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
            title="Italic"
          >
            <Italic size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
            title="Code"
          >
            <Code size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
            title="Attach file"
          >
            <Paperclip size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            type="button"
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
