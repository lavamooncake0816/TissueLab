import React, { useEffect, useRef } from 'react';
import Head from 'next/head';

// Import OpenSeadragon as a client-side only dependency
let OpenSeadragon: any;
if (typeof window !== 'undefined') {
  // Only import when in browser
  OpenSeadragon = require('openseadragon');
}

const OpenSeadragonTest: React.FC = () => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);

  useEffect(() => {
    if (!viewerRef.current || typeof window === 'undefined' || !OpenSeadragon) return;

    // Initialize the viewer with a simple example image
    if (!viewerInstance.current) {
      console.log('Creating OpenSeadragon viewer with test image');
      
      viewerInstance.current = OpenSeadragon({
        element: viewerRef.current,
        prefixUrl: '/openseadragon/images/',
        debugMode: true, // Enable debug mode for more detailed logging
        showNavigator: true,
        navigatorPosition: 'BOTTOM_RIGHT',
        tileSources: {
          type: 'legacy-image-pyramid',
          levels: [
            {
              url: 'https://openseadragon.github.io/example-images/highsmith/highsmith.jpg',
              width: 2000,
              height: 1500
            }
          ]
        }
      });

      // Log when the viewer is ready
      viewerInstance.current.addHandler('open', () => {
        console.log('OpenSeadragon test image loaded successfully');
      });

      // Log any errors
      viewerInstance.current.addHandler('open-failed', (event: any) => {
        console.error('OpenSeadragon failed to open:', event);
      });
    }

    // Cleanup on unmount
    return () => {
      if (viewerInstance.current) {
        console.log('Destroying OpenSeadragon viewer');
        viewerInstance.current.destroy();
        viewerInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Head>
        <title>OpenSeadragon Test</title>
      </Head>

      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">OpenSeadragon Test</h1>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Test Viewer</h2>
            <p className="mt-1 text-sm text-gray-500">
              This page tests if OpenSeadragon can load and display an image correctly.
            </p>
          </div>

          <div className="p-0">
            <div 
              ref={viewerRef} 
              className="w-full h-96 bg-gray-100"
              style={{ minHeight: '500px' }}
            ></div>
          </div>

          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <p className="text-sm text-gray-500">
              Check the browser console for debug information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenSeadragonTest; 