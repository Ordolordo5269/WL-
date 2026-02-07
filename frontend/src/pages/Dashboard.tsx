import React, { useState } from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import ProfileSection from '../../components/ProfileSection';
import FavoritesSection from '../../components/FavoritesSection';
import PredictiveAnalysisSection from '../../components/PredictiveAnalysisSection';

function Dashboard() {
  const [activeSection, setActiveSection] = useState<'profile' | 'favorites' | 'predictions'>('profile');

  return (
    <ProtectedRoute>
      <DashboardLayout
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        {activeSection === 'profile' ? (
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


