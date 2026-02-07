import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import CountrySelector from './CountrySelector';
import type { Country } from './CountrySelector';

interface CompareCountriesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  countries: Country[];
  onSelectCountries: (country1: string | null, country2: string | null) => void;
}

export default function CompareCountriesPopup({
  isOpen,
  onClose,
  countries,
  onSelectCountries
}: CompareCountriesPopupProps) {
  const [selectedCountry1, setSelectedCountry1] = useState<string | null>(null);
  const [selectedCountry2, setSelectedCountry2] = useState<string | null>(null);

  const country1Data = useMemo(() => {
    return countries.find(c => c.iso3 === selectedCountry1);
  }, [countries, selectedCountry1]);

  const country2Data = useMemo(() => {
    return countries.find(c => c.iso3 === selectedCountry2);
  }, [countries, selectedCountry2]);

  const canCompare = selectedCountry1 && selectedCountry2 && selectedCountry1 !== selectedCountry2;

  const handleCompare = () => {
    if (canCompare) {
      onSelectCountries(selectedCountry1, selectedCountry2);
      // Reset selections
      setSelectedCountry1(null);
      setSelectedCountry2(null);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedCountry1(null);
    setSelectedCountry2(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="compare-countries-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={handleClose}
          />

          {/* Popup Modal */}
          <motion.div
            className="compare-countries-popup"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0.9, opacity: 0, x: '-50%', y: '-50%' }}
            animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
            exit={{ scale: 0.9, opacity: 0, x: '-50%', y: '-50%' }}
            transition={{ 
              type: 'spring',
              stiffness: 300,
              damping: 30,
              duration: 0.3
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="compare-countries-popup-header">
              <h2 className="compare-countries-popup-title">Compare Countries</h2>
              <button
                onClick={handleClose}
                className="compare-countries-popup-close-btn"
                aria-label="Close popup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="compare-countries-popup-content">
              <p className="compare-countries-popup-description">
                Select two countries to compare their statistics, trends, and performance indicators.
              </p>

              {/* Country Selectors */}
              <div className="compare-countries-selectors">
                {/* Country 1 */}
                <div className="compare-country-selector-wrapper">
                  <label className="compare-country-label">
                    Country 1
                    {country1Data && (
                      <span className="compare-country-selected">
                        <img 
                          src={country1Data.flagUrl} 
                          alt={country1Data.name}
                          className="compare-country-flag-small"
                        />
                        {country1Data.name}
                      </span>
                    )}
                  </label>
                  <CountrySelector
                    countries={countries}
                    onSelectCountry={(iso3) => {
                      if (iso3 !== selectedCountry2) {
                        setSelectedCountry1(iso3);
                      }
                    }}
                    placeholder="Search and select first country..."
                  />
                </div>

                {/* VS Divider */}
                <div className="compare-countries-vs">
                  <span>VS</span>
                </div>

                {/* Country 2 */}
                <div className="compare-country-selector-wrapper">
                  <label className="compare-country-label">
                    Country 2
                    {country2Data && (
                      <span className="compare-country-selected">
                        <img 
                          src={country2Data.flagUrl} 
                          alt={country2Data.name}
                          className="compare-country-flag-small"
                        />
                        {country2Data.name}
                      </span>
                    )}
                  </label>
                  <CountrySelector
                    countries={countries}
                    onSelectCountry={(iso3) => {
                      if (iso3 !== selectedCountry1) {
                        setSelectedCountry2(iso3);
                      }
                    }}
                    placeholder="Search and select second country..."
                  />
                </div>
              </div>

              {/* Compare Button */}
              <div className="compare-countries-popup-actions">
                <button
                  onClick={handleCompare}
                  disabled={!canCompare}
                  className={`compare-countries-btn ${canCompare ? 'enabled' : 'disabled'}`}
                >
                  <Check className="h-5 w-5" />
                  Compare Countries
                </button>
                {selectedCountry1 && selectedCountry2 && selectedCountry1 === selectedCountry2 && (
                  <p className="compare-countries-error">
                    Please select two different countries
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

