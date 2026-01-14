import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import ProtectedRoute from './components/common/ProtectedRoute';
import { useTheme } from './hooks/useTheme';
import { useAuthStore } from './store/authStore';
import { PageSkeleton } from './components/common/Skeleton';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const ChannelPage = lazy(() => import('./pages/ChannelPage'));
const DMPage = lazy(() => import('./pages/DMPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageSkeleton />
    </div>
  );
}

// Auth page loading fallback
function AuthLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full"></div>
    </div>
  );
}

function App() {
  useTheme();
  const initialize = useAuthStore((state) => state.initialize);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<AuthLoader />}>
                  <LoginPage />
                </Suspense>
              )
            }
          />
          <Route
            path="/signup"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<AuthLoader />}>
                  <SignupPage />
                </Suspense>
              )
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/:workspaceId"
            element={
              <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/:workspaceId/channel/:channelId"
            element={
              <ProtectedRoute>
                <ChannelPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/:workspaceId/dm/:dmId"
            element={
              <ProtectedRoute>
                <DMPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
