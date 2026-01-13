import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center p-8">
      <div className="text-center text-white max-w-2xl">
        <h1 className="text-6xl font-bold mb-4">Slack Clone</h1>
        <p className="text-2xl mb-8 text-purple-200">Connect with your team</p>

        {/* Tailwind Test Section */}
        <div className="mb-8 p-4 bg-white/10 rounded-lg">
          <p className="text-sm mb-2">Tailwind Test:</p>
          <div className="flex gap-2 justify-center">
            <div className="w-12 h-12 bg-red-500 rounded"></div>
            <div className="w-12 h-12 bg-blue-500 rounded"></div>
            <div className="w-12 h-12 bg-green-500 rounded"></div>
            <div className="w-12 h-12 bg-yellow-500 rounded"></div>
          </div>
        </div>

        <div className="space-x-4">
          <Link
            to="/workspace/default"
            className="inline-block px-8 py-3 bg-white text-purple-900 rounded-lg font-semibold hover:bg-purple-50 transition"
          >
            Open Workspace
          </Link>
          <Link
            to="/workspace/default/channel/general"
            className="inline-block px-8 py-3 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800 transition"
          >
            Go to #general
          </Link>
        </div>
      </div>
    </div>
  );
}
