import { lazy, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from './Hero'
import Navbar from './Navbar'
import LazySection from './LazySection'

// Lazy load heavy components
const AboutSection = lazy(() => import('./AboutSection'));
const EducationalSection = lazy(() => import('./EducationalSection'));
const InvestmentHeroSection = lazy(() => import('./InvestmentHeroSection'));
const MobilityHeroSection = lazy(() => import('./MobilityHeroSection'));
const PlatformExperiencesSection = lazy(() => import('./PlatformExperiencesSection'));
const Footer = lazy(() => import('./Footer'));

function Home() {
  const location = useLocation()

  useEffect(() => {
    // Handle hash navigation after component mounts
    if (location.hash) {
      const elementId = location.hash.substring(1) // Remove the '#'
      const timer = setTimeout(() => {
        const element = document.getElementById(elementId)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 1000) // Wait for lazy components to load
      
      return () => clearTimeout(timer)
    }
  }, [location.hash])

  return (
    <div className="w-full flex flex-col items-center">
      {/* Navbar */}
      <Navbar />
      
      {/* Hero Section - Ocupa toda la pantalla */}
      <Hero />
      
      {/* About Section */}
      <LazySection>
        <AboutSection />
      </LazySection>
      
      {/* Educational Section */}
      <LazySection>
        <EducationalSection />
      </LazySection>
      
      {/* Investment Hero Section */}
      <LazySection>
        <InvestmentHeroSection />
      </LazySection>
      
      {/* Mobility Hero Section */}
      <LazySection>
        <MobilityHeroSection />
      </LazySection>
      
      {/* Platform Experiences Section */}
      <div id="platform-experiences" className="w-full">
        <LazySection>
          <PlatformExperiencesSection />
        </LazySection>
      </div>
      
      {/* Footer */}
      <LazySection>
        <Suspense fallback={<div className="h-32 bg-gray-900 animate-pulse" />}>
          <Footer />
        </Suspense>
      </LazySection>
    </div>
  )
}

export default Home