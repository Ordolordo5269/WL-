import { useState } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import DashboardLayout from '../features/dashboard/DashboardLayout';
import ProfileSection from '../features/dashboard/ProfileSection';
import FavoritesSection from '../features/dashboard/FavoritesSection';
import PredictiveAnalysisSection from '../features/dashboard/PredictiveAnalysisSection';
import DashboardStats from '../features/dashboard/DashboardStats';
import RecentConflicts from '../features/dashboard/RecentConflicts';

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
            <DashboardStats />
            <RecentConflicts />
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


