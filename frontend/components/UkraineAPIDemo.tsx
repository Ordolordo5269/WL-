import React, { useState, useEffect } from 'react';

interface UkraineAPIDemoProps {
  onLoadData?: () => void;
  onError?: (error: string) => void;
}

/**
 * Demo component showcasing Ukraine API capabilities
 * This component demonstrates how to use the UkraineAPIService
 */
const UkraineAPIDemo: React.FC<UkraineAPIDemoProps> = ({ onLoadData, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const testUkraineAPI = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Dynamic import to avoid issues if the service isn't loaded
      const { UkraineAPIService } = await import('../services/ukraine-api');
      
      // Test fetching latest data
      const data = await UkraineAPIService.fetchLatestFrontlineData();
      setLastUpdate(data.datetime);
      
      // Test fetching available dates
      const dates = await UkraineAPIService.getAvailableDates();
      setAvailableDates(dates.slice(0, 5)); // Show first 5 dates
      
      console.log('✅ Ukraine API test successful:', data);
      onLoadData?.();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('❌ Ukraine API test failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getLayerConfigurations = async () => {
    try {
      const { UkraineAPIService } = await import('../services/ukraine-api');
      const configs = UkraineAPIService.getLayerConfigurations();
      console.log('🗺️ Layer configurations:', configs);
      return configs;
    } catch (err) {
      console.error('Failed to get layer configurations:', err);
      return [];
    }
  };

  useEffect(() => {
    // Auto-test on component mount
    testUkraineAPI();
    getLayerConfigurations();
  }, []);

  return (
    <div className="ukraine-api-demo p-4 bg-white rounded-lg shadow-md max-w-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        🇺🇦 Ukraine API Demo
      </h3>
      
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : error ? 'bg-red-500' : 'bg-green-500'}`}></div>
          <span className="text-sm font-medium">
            {isLoading ? 'Testing API...' : error ? 'Error' : 'Ready'}
          </span>
        </div>

        {/* Last Update */}
        {lastUpdate && (
          <div className="text-sm text-gray-600">
            <strong>Last Update:</strong> {new Date(lastUpdate).toLocaleString()}
          </div>
        )}

        {/* Available Dates */}
        {availableDates.length > 0 && (
          <div className="text-sm text-gray-600">
            <strong>Available Dates:</strong>
            <ul className="mt-1 space-y-1">
              {availableDates.map((date, index) => (
                <li key={index} className="text-xs">
                  {new Date(date).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Test Button */}
        <button
          onClick={testUkraineAPI}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isLoading ? 'Testing...' : 'Test API Again'}
        </button>

        {/* Capabilities List */}
        <div className="text-xs text-gray-500 space-y-1">
          <div><strong>Capabilities:</strong></div>
          <div>✅ Real-time frontline data</div>
          <div>✅ Interactive map layers</div>
          <div>✅ Historical data access</div>
          <div>✅ Auto-refresh (5 min)</div>
          <div>✅ Error handling</div>
          <div>✅ Status indicators</div>
        </div>
      </div>
    </div>
  );
};

export default UkraineAPIDemo; 