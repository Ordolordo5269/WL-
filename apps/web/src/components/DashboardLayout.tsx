import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Star, LogOut, Globe, TrendingUp, LayoutDashboard, Swords, Lightbulb } from 'lucide-react';
import '../styles/dashboard.css';

interface DashboardLayoutProps {
  children: ReactNode;
  activeSection: 'overview' | 'profile' | 'favorites' | 'predictions';
  onSectionChange: (section: 'overview' | 'profile' | 'favorites' | 'predictions') => void;
}

export default function DashboardLayout({ children, activeSection, onSectionChange }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <div className="dashboard-header">
          <div className="dashboard-logo">
            <Globe className="w-6 h-6 text-blue-400" />
            <h1 className="dashboard-title">WorldLore</h1>
          </div>
          <div className="dashboard-user">
            <div className="dashboard-user-avatar">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="dashboard-user-info">
              <p className="dashboard-user-name">{user?.name || 'User'}</p>
              <p className="dashboard-user-email">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="dashboard-nav">
          <motion.button
            onClick={() => onSectionChange('overview')}
            className={`dashboard-nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Overview</span>
          </motion.button>

          <motion.button
            onClick={() => onSectionChange('profile')}
            className={`dashboard-nav-item ${activeSection === 'profile' ? 'active' : ''}`}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </motion.button>

          <motion.button
            onClick={() => onSectionChange('favorites')}
            className={`dashboard-nav-item ${activeSection === 'favorites' ? 'active' : ''}`}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Star className="w-5 h-5" />
            <span>Favorites</span>
          </motion.button>

          <motion.button
            onClick={() => onSectionChange('predictions')}
            className={`dashboard-nav-item ${activeSection === 'predictions' ? 'active' : ''}`}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Predictions</span>
          </motion.button>

          <motion.button
            onClick={() => navigate('/conflicts')}
            className="dashboard-nav-item"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Swords className="w-5 h-5" />
            <span>Conflicts</span>
          </motion.button>

          <motion.button
            onClick={() => navigate('/insights')}
            className="dashboard-nav-item"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Lightbulb className="w-5 h-5" />
            <span>Insights</span>
          </motion.button>
        </nav>

        <div className="dashboard-footer">
          <motion.button
            onClick={() => navigate('/')}
            className="dashboard-nav-item"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Globe className="w-5 h-5" />
            <span>Back to Map</span>
          </motion.button>

          <motion.button
            onClick={handleLogout}
            className="dashboard-nav-item logout"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </motion.button>
        </div>
      </div>

      <div className="dashboard-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="dashboard-content-inner"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}


