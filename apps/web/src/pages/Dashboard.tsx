import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Swords, TrendingUp, BarChart3 } from 'lucide-react';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import DashboardLayout from '../features/dashboard/DashboardLayout';
import ProfileSection from '../features/dashboard/ProfileSection';
import FavoritesSection from '../features/dashboard/FavoritesSection';
import PredictiveAnalysisSection from '../features/dashboard/PredictiveAnalysisSection';
import DashboardStats from '../features/dashboard/DashboardStats';
import GlobalFoodPriceIndex from '../features/dashboard/GlobalFoodPriceIndex';
import RecentConflicts from '../features/dashboard/RecentConflicts';
import WorldActivityFeed from '../features/dashboard/WorldActivityFeed';

const QUICK_ACTIONS = [
  { label: 'World Map', icon: Globe, path: '/', color: '#3b82f6' },
  { label: 'Conflicts', icon: Swords, path: '/conflicts', color: '#ef4444' },
  { label: 'Predictions', icon: TrendingUp, section: 'predictions' as const, color: '#8b5cf6' },
  { label: 'Compare', icon: BarChart3, path: '/?compare=true', color: '#06b6d4' },
];

function QuickActions({ onSectionChange }: { onSectionChange: (s: 'predictions') => void }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {QUICK_ACTIONS.map((action, i) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            onClick={() => {
              if ('section' in action && action.section) {
                onSectionChange(action.section);
              } else if (action.path) {
                navigate(action.path);
              }
            }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-lg transition-all text-left group hover:border-slate-600/50"
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(71, 85, 105, 0.3)',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${action.color}15` }}
            >
              <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: action.color }} />
            </div>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
              {action.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function Dashboard() {
  const [activeSection, setActiveSection] = useState<'overview' | 'profile' | 'favorites' | 'predictions'>('overview');

  return (
    <ProtectedRoute>
      <DashboardLayout
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        {activeSection === 'overview' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Global Overview</h2>
              <p className="text-sm text-slate-400">Real-time geopolitical intelligence</p>
            </div>
            <QuickActions onSectionChange={setActiveSection} />
            <DashboardStats />
            <GlobalFoodPriceIndex />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentConflicts />
              <WorldActivityFeed />
            </div>
          </div>
        ) : activeSection === 'profile' ? (
          <ProfileSection />
        ) : activeSection === 'favorites' ? (
          <FavoritesSection />
        ) : (
          <PredictiveAnalysisSection iso3={null} countryName={null} />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default Dashboard;


