import { useState, useRef, useEffect, useCallback } from 'react';
import EmojiPickerReact, { Theme, SkinTones } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

type PickerPosition = 'above' | 'below';
type PickerAlign = 'left' | 'right';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  buttonClassName?: string;
  customButton?: React.ReactNode;
  position?: PickerPosition;
  align?: PickerAlign;
  onOpenChange?: (isOpen: boolean) => void;
}

// Valid skin tone values
const VALID_SKIN_TONES = ['neutral', '1f3fb', '1f3fc', '1f3fd', '1f3fe', '1f3ff'];

// Get saved skin tone from localStorage or default to NEUTRAL (gold/yellow)
const getSavedSkinTone = (): SkinTones => {
  const saved = localStorage.getItem('emoji-skin-tone');
  // Validate that the saved value is a valid skin tone
  if (saved && VALID_SKIN_TONES.includes(saved)) {
    return saved as SkinTones;
  }
  return SkinTones.NEUTRAL;
};

export default function EmojiPicker({
  onEmojiSelect,
  buttonClassName,
  customButton,
  position = 'above',
  align = 'left',
  onOpenChange
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [skinTone, setSkinTone] = useState<SkinTones>(getSavedSkinTone);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [computedPosition, setComputedPosition] = useState<PickerPosition>(position);
  const { theme } = useTheme();
  // Ref to store onOpenChange to avoid stale closures
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  // Sync skin tone from localStorage when picker opens (in case another picker changed it)
  useEffect(() => {
    if (isOpen) {
      const savedTone = getSavedSkinTone();
      if (savedTone !== skinTone) {
        setSkinTone(savedTone);
      }
    }
  }, [isOpen]);

  // Calculate position based on viewport when opening
  const calculatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // If button is in upper half of viewport, show picker below
      // If button is in lower half, show picker above
      const isInUpperHalf = rect.top < viewportHeight / 2;
      setComputedPosition(isInUpperHalf ? 'below' : 'above');
    }
  }, []);

  // Stable function to update open state
  const updateOpenState = useCallback((newIsOpen: boolean) => {
    setIsOpen(newIsOpen);
    onOpenChangeRef.current?.(newIsOpen);
  }, []);

  const handleToggle = useCallback(() => {
    const newIsOpen = !isOpen;
    if (newIsOpen) {
      calculatePosition();
    }
    updateOpenState(newIsOpen);
  }, [isOpen, calculatePosition, updateOpenState]);

  const handleClose = useCallback(() => {
    updateOpenState(false);
  }, [updateOpenState]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // Ref to prevent double-triggering of emoji selection
  const isProcessingRef = useRef(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    // Prevent double-triggering (which would toggle the reaction off)
    if (isProcessingRef.current) {
      return;
    }
    isProcessingRef.current = true;

    // Call onEmojiSelect
    onEmojiSelect(emojiData.emoji);

    // Close the picker and reset processing flag after a short delay
    setTimeout(() => {
      handleClose();
      // Reset the flag after the picker closes
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    }, 50);
  };

  // Handle skin tone change - saves to localStorage so all pickers sync
  const handleSkinToneChange = (newSkinTone: SkinTones) => {
    setSkinTone(newSkinTone);
    // SkinTones values are strings like "neutral", "1f3fb", etc.
    localStorage.setItem('emoji-skin-tone', newSkinTone as string);
  };

  const positionStyles = computedPosition === 'above'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  // align='right' means picker opens to the right (left-0), align='left' means picker opens to the left (right-0)
  const alignStyles = align === 'right' ? 'left-0' : 'right-0';

  return (
    <div className="relative" ref={pickerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={buttonClassName || 'p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition'}
        title="Add emoji"
      >
        {customButton || <Smile size={20} className="text-gray-600 dark:text-gray-400" />}
      </button>

      {isOpen && (
        <div className={`absolute ${positionStyles} ${alignStyles} z-50`} style={{ zIndex: 9999 }}>
          <div style={{ position: 'relative', zIndex: 9999 }}>
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
        </div>
      )}
    </div>
  );
}
