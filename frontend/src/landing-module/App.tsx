import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './components/Home'
import MobilityAI from './components/MobilityAI'
import InvestmentAI from './components/InvestmentAI'
import PrivacyPolicy from './components/PrivacyPolicy'
import TermsOfService from './components/TermsOfService'
import About from './pages/About'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [pathname])
  return null
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="" element={<Home />} />
        <Route path="mobility-ai" element={<MobilityAI />} />
        <Route path="investment-ai" element={<InvestmentAI />} />
        <Route path="about" element={<About />} />
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="terms-of-service" element={<TermsOfService />} />
      </Routes>
    </>
  )
}

export default App
