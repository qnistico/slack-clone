import { X } from 'lucide-react';
import MiniNavbar from './MiniNavbar';
import Sidebar from '../sidebar/Sidebar';

interface MobileSidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem?: string;
}

export default function MobileSidebarMenu({ isOpen, onClose, activeItem }: MobileSidebarMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Mobile Menu */}
      <div className="fixed inset-y-0 left-0 z-50 lg:hidden flex w-full">
        {/* MiniNavbar */}
        <div className="flex-shrink-0">
          <MiniNavbar activeItem={activeItem} />
        </div>

        {/* Sidebar with X button - takes remaining width */}
        <div className="relative bg-purple-900 flex-1 flex flex-col">
          {/* Close button - positioned to not overlap with workspace dropdown */}
          <div className="absolute top-0 right-0 z-10 p-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-purple-800 rounded transition text-white"
              title="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sidebar - make it fill the space */}
          <div className="flex-1 overflow-hidden">
            <Sidebar />
          </div>
        </div>
      </div>
    </>
  );
}
