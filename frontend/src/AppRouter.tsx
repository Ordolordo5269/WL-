import { Routes, Route, Navigate } from 'react-router-dom';
import WorldMapView from './App';
import Dashboard from './pages/Dashboard';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<WorldMapView />} />
      <Route path="/map" element={<WorldMapView />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}





