import { Routes, Route, Navigate } from 'react-router-dom';
import WorldMapView from './App';
import Dashboard from './pages/Dashboard';
import Country from './pages/Country';
import Conflicts from './pages/Conflicts';
import ConflictDetail from './pages/ConflictDetail';
import Insights from './pages/Insights';
import LoginForm from './features/auth/LoginForm';
import RegisterForm from './features/auth/RegisterForm';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<WorldMapView />} />
      <Route path="/map" element={<WorldMapView />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/countries/:iso3" element={<Country />} />
      <Route path="/conflicts" element={<Conflicts />} />
      <Route path="/conflicts/:slug" element={<ConflictDetail />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}





