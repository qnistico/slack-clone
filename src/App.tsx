import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WorkspacePage from './pages/WorkspacePage';
import ChannelPage from './pages/ChannelPage';
import { useMockData } from './hooks/useMockData';
import { useTheme } from './hooks/useTheme';

function App() {
  useMockData();
  useTheme(); // Initialize theme

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
        <Route path="/workspace/:workspaceId/channel/:channelId" element={<ChannelPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

