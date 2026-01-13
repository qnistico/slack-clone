import { Home, MessageSquare, Bell, FolderOpen, MoreHorizontal, Settings } from 'lucide-react';

interface MiniNavbarProps {
  activeItem?: string;
}

export default function MiniNavbar({ activeItem = 'home' }: MiniNavbarProps) {
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

      {/* Settings */}
      <button
        className="flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-purple-300 hover:bg-purple-800 hover:text-white transition"
        title="Settings"
      >
        <Settings size={20} />
        <span className="text-[10px] font-medium">Settings</span>
      </button>
    </div>
  );
}
