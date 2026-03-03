import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import HomeListPage from './pages/HomeListPage';
import HomeDetailPage from './pages/HomeDetailPage';
import RoomDetailPage from './pages/RoomDetailPage';
import ProjectListPage from './pages/ProjectListPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import HomeContractorsPage from './pages/HomeContractorsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeListPage />} />
          <Route path="/homes/:homeId" element={<HomeDetailPage />} />
          <Route path="/homes/:homeId/rooms/:roomId" element={<RoomDetailPage />} />
          <Route path="/homes/:homeId/projects" element={<ProjectListPage />} />
          <Route path="/homes/:homeId/contractors" element={<HomeContractorsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
