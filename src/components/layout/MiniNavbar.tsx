import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, MessageSquare, Bell, FolderOpen, MoreHorizontal, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface MiniNavbarProps {
  activeItem?: string;
}

export default function MiniNavbar({ activeItem = 'home' }: MiniNavbarProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'dms', icon: MessageSquare, label: 'DMs' },
    { id: 'activity', icon: Bell, label: 'Activity' },
    { id: 'files', icon: FolderOpen, label: 'Files' },
    { id: 'more', icon: MoreHorizontal, label: 'More' },
  ];

  return (
    <div className="w-20 bg-gradient-to-b from-purple-950 to-purple-900 flex flex-col items-center py-4 border-r border-purple-800">
      {/* Main Navigation Items */}
      <div className="flex-1 flex flex-col gap-2 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition ${
                isActive
                  ? 'bg-purple-700 text-white'
                  : 'text-purple-300 hover:bg-purple-800 hover:text-white'
              }`}
              title={item.label}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-12 h-px bg-purple-700 my-2" />

      {/* User Profile with Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-purple-300 hover:bg-purple-800 hover:text-white transition"
          title={currentUser?.name || 'Profile'}
        >
          <User size={20} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>

        {/* Dropdown Menu */}
        {showProfileMenu && (
          <div className="absolute bottom-full left-20 mb-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="font-semibold text-gray-900 dark:text-white">{currentUser?.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.email}</p>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <LogOut size={18} />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
