import { useState, useRef, useEffect } from 'react';
import EmojiPickerReact, { Theme, SkinTones } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  buttonClassName?: string;
}

// Get saved skin tone from localStorage or default to NEUTRAL
const getSavedSkinTone = (): SkinTones => {
  const saved = localStorage.getItem('emoji-skin-tone');
  return saved ? (parseInt(saved) as unknown as SkinTones) : SkinTones.NEUTRAL;
};

export default function EmojiPicker({ onEmojiSelect, buttonClassName }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [skinTone, setSkinTone] = useState<SkinTones>(getSavedSkinTone);
  const pickerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  // Handle skin tone change separately
  const handleSkinToneChange = (newSkinTone: SkinTones) => {
    setSkinTone(newSkinTone);
    localStorage.setItem('emoji-skin-tone', newSkinTone.toString());
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClassName || 'p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition'}
        title="Add emoji"
      >
        <Smile size={20} className="text-gray-600 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 z-50">
          <EmojiPickerReact
            onEmojiClick={handleEmojiClick}
            onSkinToneChange={handleSkinToneChange}
            theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
            skinTonesDisabled={false}
            defaultSkinTone={skinTone}
            searchDisabled={false}
            width={350}
            height={400}
          />
        </div>
      )}
    </div>
  );
}
