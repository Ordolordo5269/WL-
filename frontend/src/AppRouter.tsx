import { Routes, Route, Navigate } from 'react-router-dom';
import WorldMapView from './App';
import Dashboard from './pages/Dashboard';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import LandingPage from './pages/LandingPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<WorldMapView />} />
      <Route path="/landing/*" element={<LandingPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}





