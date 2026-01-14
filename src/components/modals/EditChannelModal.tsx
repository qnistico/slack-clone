import { useState, useEffect } from 'react';
import { X, Hash, Lock, Settings } from 'lucide-react';
import type { Channel } from '../../types';

interface EditChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; isPrivate: boolean }) => void;
  channel: Channel | null;
}

export default function EditChannelModal({
  isOpen,
  onClose,
  onSubmit,
  channel,
}: EditChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  // Update form when channel changes
  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setDescription(channel.description || '');
      setIsPrivate(channel.isPrivate);
    }
  }, [channel]);

  if (!isOpen || !channel) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        description,
        isPrivate,
      });
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const hasChanges =
    name !== channel.name ||
    description !== (channel.description || '') ||
    isPrivate !== channel.isPrivate;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Settings size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit channel</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {channel.isPrivate ? '🔒' : '#'} {channel.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Channel Name */}
          <div>
            <label htmlFor="channel-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Channel name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                {isPrivate ? (
                  <Lock size={16} className="text-gray-400" />
                ) : (
                  <Hash size={16} className="text-gray-400" />
                )}
              </div>
              <input
                id="channel-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. project-ideas"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition"
                required
                autoFocus
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Channel names must be lowercase, without spaces or periods, and can't be longer than 80 characters.
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="channel-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition resize-none"
            />
          </div>

          {/* Private Channel Toggle */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="private-channel"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <div className="flex-1">
              <label htmlFor="private-channel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Make private
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                When a channel is set to private, it can only be viewed or joined by invitation.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name.trim() || !hasChanges}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
