import MiniNavbar from '../components/layout/MiniNavbar';
import Sidebar from '../components/sidebar/Sidebar';

export default function WorkspacePage() {
  return (
    <div className="flex h-screen">
      <MiniNavbar activeItem="home" />
      <Sidebar />
      <div className="flex-1 bg-gray-100">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl text-gray-500 mb-2">👈</p>
            <p className="text-gray-600">Select a channel to start messaging</p>
          </div>
        </div>
      </div>
    </div>
  );
}
