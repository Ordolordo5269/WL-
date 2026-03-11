import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, GitCompare } from 'lucide-react';
import CountrySelector from '../../components/ui/CountrySelector';
import type { Country } from '../../components/ui/CountrySelector';

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

  const country1Data = useMemo(() => countries.find(c => c.iso3 === selectedCountry1), [countries, selectedCountry1]);
  const country2Data = useMemo(() => countries.find(c => c.iso3 === selectedCountry2), [countries, selectedCountry2]);
  const canCompare = selectedCountry1 && selectedCountry2 && selectedCountry1 !== selectedCountry2;

  const handleCompare = () => {
    if (canCompare) {
      onSelectCountries(selectedCountry1, selectedCountry2);
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
            style={{ position: 'fixed', top: '50%', left: '50%' }}
            initial={{ scale: 0.92, opacity: 0, x: '-50%', y: '-50%' }}
            animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
            exit={{ scale: 0.92, opacity: 0, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="ccp-header">
              <div className="ccp-header-left">
                <div className="ccp-header-icon">
                  <GitCompare className="h-4 w-4" />
                </div>
                <h2 className="ccp-title">Compare Countries</h2>
              </div>
              <button onClick={handleClose} className="ccp-close-btn" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="ccp-body">
              {/* Selectors Grid */}
              <div className="ccp-selectors-grid">

                {/* Country 1 */}
                <div className="ccp-slot ccp-slot-1">
                  <div className="ccp-slot-header">
                    <span className="ccp-slot-num ccp-slot-num-1">1</span>
                    <span className="ccp-slot-label">First Country</span>
                  </div>
                  {country1Data ? (
                    <div className="ccp-selected-chip ccp-selected-chip-1">
                      {country1Data.flagUrl && (
                        <img
                          src={country1Data.flagUrl}
                          alt={country1Data.name}
                          style={{ width: '20px', height: '14px', objectFit: 'cover', display: 'block', borderRadius: '2px', flexShrink: 0 }}
                        />
                      )}
                      <span className="ccp-selected-name">{country1Data.name}</span>
                      <button className="ccp-deselect-btn" onClick={() => setSelectedCountry1(null)} aria-label="Remove">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="ccp-empty-chip ccp-empty-chip-1">Country</div>
                  )}
                  <CountrySelector
                    countries={countries}
                    onSelectCountry={(iso3) => { if (iso3 !== selectedCountry2) setSelectedCountry1(iso3); }}
                    placeholder="Search country…"
                    variant="popup"
                  />
                </div>

                {/* VS Badge */}
                <div className="ccp-vs-col">
                  <div className="ccp-vs-badge">VS</div>
                </div>

                {/* Country 2 */}
                <div className="ccp-slot ccp-slot-2">
                  <div className="ccp-slot-header">
                    <span className="ccp-slot-num ccp-slot-num-2">2</span>
                    <span className="ccp-slot-label">Second Country</span>
                  </div>
                  {country2Data ? (
                    <div className="ccp-selected-chip ccp-selected-chip-2">
                      {country2Data.flagUrl && (
                        <img
                          src={country2Data.flagUrl}
                          alt={country2Data.name}
                          style={{ width: '20px', height: '14px', objectFit: 'cover', display: 'block', borderRadius: '2px', flexShrink: 0 }}
                        />
                      )}
                      <span className="ccp-selected-name">{country2Data.name}</span>
                      <button className="ccp-deselect-btn" onClick={() => setSelectedCountry2(null)} aria-label="Remove">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="ccp-empty-chip ccp-empty-chip-2">Country</div>
                  )}
                  <CountrySelector
                    countries={countries}
                    onSelectCountry={(iso3) => { if (iso3 !== selectedCountry1) setSelectedCountry2(iso3); }}
                    placeholder="Search country…"
                    variant="popup"
                  />
                </div>

              </div>

              {/* Footer */}
              <div className="ccp-footer">
                {selectedCountry1 && selectedCountry2 && selectedCountry1 === selectedCountry2 && (
                  <p className="ccp-error">Please select two different countries.</p>
                )}
                <button
                  onClick={handleCompare}
                  disabled={!canCompare}
                  className={`ccp-compare-btn ${canCompare ? 'enabled' : 'disabled'}`}
                >
                  <Check className="h-4 w-4" />
                  Compare Countries
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
