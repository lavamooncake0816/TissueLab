import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import api from '@/utils/api';

interface SettingsProps {
  isElectron: boolean;
}

const Settings: React.FC<SettingsProps> = ({ isElectron }) => {
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  const [segmentationThreshold, setSegmentationThreshold] = useState(0.5);
  const [showCentroids, setShowCentroids] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [zoomThreshold, setZoomThreshold] = useState(1.0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [saved, setSaved] = useState(false);

  // Check API connection on load
  useEffect(() => {
    checkApiConnection();
  }, [apiUrl]);

  // Function to check API connection
  const checkApiConnection = async () => {
    try {
      setIsCheckingApi(true);
      
      // In development mode, use the mock API
      const isDevelopment = process.env.NODE_ENV === 'development';
      console.log('Environment:', process.env.NODE_ENV);
      
      if (isElectron && window.electron) {
        // Use Electron's IPC to check API connection
        const result = await window.electron.checkApi(apiUrl);
        setIsApiConnected(result);
      } else if (isDevelopment) {
        // In development mode, use the mock API
        try {
          const response = await api.checkHealth();
          console.log('Mock API response:', response);
          setIsApiConnected(true);
        } catch (error) {
          console.error('Mock API check failed:', error);
          setIsApiConnected(false);
        }
      } else {
        // Use browser fetch for web version in production
        const response = await fetch(`${apiUrl}/health`);
        setIsApiConnected(response.ok);
      }
    } catch (error) {
      console.error('API check failed:', error);
      setIsApiConnected(false);
    } finally {
      setIsCheckingApi(false);
    }
  };

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('wsi-viewer-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.apiUrl) setApiUrl(settings.apiUrl);
        if (settings.segmentationThreshold !== undefined) setSegmentationThreshold(settings.segmentationThreshold);
        if (settings.showCentroids !== undefined) setShowCentroids(settings.showCentroids);
        if (settings.showContours !== undefined) setShowContours(settings.showContours);
        if (settings.zoomThreshold !== undefined) setZoomThreshold(settings.zoomThreshold);
        if (settings.autoRefresh !== undefined) setAutoRefresh(settings.autoRefresh);
        if (settings.refreshInterval !== undefined) setRefreshInterval(settings.refreshInterval);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Save settings
  const handleSaveSettings = () => {
    // In a production app, we would save these settings to localStorage or a backend API
    localStorage.setItem('wsi-viewer-settings', JSON.stringify({
      apiUrl,
      segmentationThreshold,
      showCentroids,
      showContours,
      zoomThreshold,
      autoRefresh,
      refreshInterval,
    }));
    
    // Show saved message
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Reset settings to defaults
  const handleResetSettings = () => {
    setApiUrl('http://localhost:8000');
    setSegmentationThreshold(0.5);
    setShowCentroids(true);
    setShowContours(true);
    setZoomThreshold(1.0);
    setAutoRefresh(true);
    setRefreshInterval(1000);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Head>
        <title>WSI Viewer - Settings</title>
      </Head>
      
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        
        {/* API Configuration */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">API Configuration</h2>
            <p className="mt-1 text-sm text-gray-500">Connect to the FastAPI backend for processing WSI files.</p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-6">
              <div>
                <label htmlFor="api-url" className="block text-sm font-medium text-gray-700">
                  API URL
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    id="api-url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="form-input flex-1 block w-full rounded-md sm:text-sm border-gray-300"
                    placeholder="http://localhost:8000"
                  />
                  <button
                    type="button"
                    onClick={checkApiConnection}
                    disabled={isCheckingApi}
                    className="ml-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    {isCheckingApi ? 'Checking...' : 'Check Connection'}
                  </button>
                </div>
                
                <div className="mt-2">
                  {isApiConnected ? (
                    <span className="text-sm text-green-600 flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Connected successfully
                    </span>
                  ) : (
                    <span className="text-sm text-red-600 flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Not connected
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Segmentation Settings */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Segmentation Settings</h2>
            <p className="mt-1 text-sm text-gray-500">Configure how segmentation results are displayed.</p>
          </div>
          
          <div className="px-4 py-5 sm:p-6 space-y-6">
            {/* Segmentation Threshold */}
            <div>
              <label htmlFor="segmentation-threshold" className="block text-sm font-medium text-gray-700">
                Segmentation Confidence Threshold
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="range"
                  id="segmentation-threshold"
                  min="0"
                  max="1"
                  step="0.05"
                  value={segmentationThreshold}
                  onChange={(e) => setSegmentationThreshold(parseFloat(e.target.value))}
                  className="form-range w-full"
                />
                <span className="ml-3 text-sm text-gray-600">{segmentationThreshold.toFixed(2)}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Only show segmentation results with confidence above this threshold.
              </p>
            </div>
            
            {/* Zoom Threshold */}
            <div>
              <label htmlFor="zoom-threshold" className="block text-sm font-medium text-gray-700">
                Zoom Threshold for Detailed Contours
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="range"
                  id="zoom-threshold"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={zoomThreshold}
                  onChange={(e) => setZoomThreshold(parseFloat(e.target.value))}
                  className="form-range w-full"
                />
                <span className="ml-3 text-sm text-gray-600">{zoomThreshold.toFixed(1)}x</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Switch from centroids to detailed contours at this zoom level.
              </p>
            </div>
            
            {/* Display Options */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Display Options</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="show-centroids"
                    type="checkbox"
                    checked={showCentroids}
                    onChange={(e) => setShowCentroids(e.target.checked)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="show-centroids" className="ml-2 block text-sm text-gray-700">
                    Show centroids at low zoom levels
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="show-contours"
                    type="checkbox"
                    checked={showContours}
                    onChange={(e) => setShowContours(e.target.checked)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="show-contours" className="ml-2 block text-sm text-gray-700">
                    Show contours at high zoom levels
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Refresh Settings */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Refresh Settings</h2>
            <p className="mt-1 text-sm text-gray-500">Configure how often the overlay refreshes.</p>
          </div>
          
          <div className="px-4 py-5 sm:p-6 space-y-6">
            <div className="flex items-center">
              <input
                id="auto-refresh"
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="auto-refresh" className="ml-2 block text-sm text-gray-700">
                Enable automatic refresh
              </label>
            </div>
            
            {autoRefresh && (
              <div>
                <label htmlFor="refresh-interval" className="block text-sm font-medium text-gray-700">
                  Refresh Interval (ms)
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    type="range"
                    id="refresh-interval"
                    min="100"
                    max="5000"
                    step="100"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                    className="form-range w-full"
                  />
                  <span className="ml-3 text-sm text-gray-600">{refreshInterval} ms</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Save/Reset Button Groups */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetSettings}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Reset to Defaults
          </button>
          
          <div className="flex items-center">
            {saved && (
              <span className="text-sm text-green-600 mr-3">
                Settings saved!
              </span>
            )}
            
            <button
              type="button"
              onClick={handleSaveSettings}
              className="btn-primary"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 