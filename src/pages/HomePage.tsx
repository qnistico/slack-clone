import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Plus, Building2, LogOut } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const subscribeToUserWorkspaces = useWorkspaceStore((state) => state.subscribeToUserWorkspaces);
  const createNewWorkspace = useWorkspaceStore((state) => state.createNewWorkspace);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const unsubscribe = subscribeToUserWorkspaces(currentUser.id);
      return () => unsubscribe();
    }
  }, [currentUser, subscribeToUserWorkspaces]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim() || !currentUser) return;

    setCreating(true);
    try {
      await createNewWorkspace(workspaceName.trim(), currentUser.id, '🏢');
      setWorkspaceName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Slack Clone</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentUser?.name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Your Workspaces
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Select a workspace to get started
          </p>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              to={`/workspace/${workspace.id}`}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">{workspace.icon || '🏢'}</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {workspace.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Click to open
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {/* Create Workspace Card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 transition flex items-center justify-center gap-3"
          >
            <Plus size={24} className="text-purple-600 dark:text-purple-400" />
            <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
              Create Workspace
            </span>
          </button>
        </div>

        {workspaces.length === 0 && !showCreateModal && (
          <div className="text-center py-12">
            <Building2 size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No workspaces yet. Create one to get started!
            </p>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Create Workspace
            </h3>
            <form onSubmit={handleCreateWorkspace}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="My Awesome Team"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
