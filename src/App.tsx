import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WorkspacePage from './pages/WorkspacePage';
import ChannelPage from './pages/ChannelPage';
import { useMockData } from './hooks/useMockData';

function App() {
  useMockData();

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

