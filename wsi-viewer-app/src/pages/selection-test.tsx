import React, { useRef, useEffect, useState } from 'react';
import Head from 'next/head';

// Import OpenSeadragon only on client side
let OpenSeadragon: any;
if (typeof window !== 'undefined') {
  OpenSeadragon = require('openseadragon');
}

const SelectionTest: React.FC = () => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);
  const selectionRef = useRef<any>(null);
  
  const [selectionEnabled, setSelectionEnabled] = useState(false);
  const [selectionCoords, setSelectionCoords] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize OpenSeadragon viewer
  useEffect(() => {
    if (!viewerRef.current || typeof window === 'undefined') return;
    
    // Clear any existing viewer
    if (viewerInstance.current) {
      viewerInstance.current.destroy();
    }
    
    try {
      console.log('Initializing viewer with test image');
      
      // Create viewer with a simple test image
      const viewer = OpenSeadragon({
        id: viewerRef.current.id,
        prefixUrl: '/openseadragon/images/',
        debugMode: true,
        showNavigator: true,
        tileSources: {
          type: 'image',
          url: 'https://openseadragon.github.io/example-images/highsmith/highsmith.jpg',
        }
      });
      
      viewerInstance.current = viewer;
      
      // Load selection plugin
      if (typeof window !== 'undefined') {
        // Set OpenSeadragon on window for plugin access
        window.OpenSeadragon = OpenSeadragon;
        
        // Load selection plugin dynamically
        const script = document.createElement('script');
        script.src = '/openseadragon-selection.js';
        script.async = true;
        
        script.onload = () => {
          console.log('Selection plugin loaded successfully');
          initializeSelection();
        };
        
        script.onerror = () => {
          console.error('Failed to load selection plugin');
          setError('Failed to load selection plugin');
        };
        
        document.body.appendChild(script);
      }
    } catch (err) {
      console.error('Error initializing viewer:', err);
      setError(`Error initializing viewer: ${(err as Error).message}`);
    }
    
    return () => {
      if (viewerInstance.current) {
        viewerInstance.current.destroy();
      }
    };
  }, []);
  
  // Toggle selection functionality
  const toggleSelection = () => {
    if (!viewerInstance.current || !window.OpenSeadragon?.Selection) {
      setError('Selection plugin not loaded yet');
      return;
    }
    
    const newEnabled = !selectionEnabled;
    setSelectionEnabled(newEnabled);
    
    if (newEnabled) {
      // Enable selection
      if (!selectionRef.current) {
        initializeSelection();
      } else {
        selectionRef.current.enable();
      }
    } else {
      // Disable selection
      if (selectionRef.current) {
        selectionRef.current.disable();
      }
      
      // Reset selection coordinates
      setSelectionCoords(null);
    }
  };
  
  // Initialize selection object
  const initializeSelection = () => {
    if (!viewerInstance.current || !window.OpenSeadragon?.Selection) return;
    
    console.log('Initializing selection tool');
    
    // Create selection object
    selectionRef.current = new window.OpenSeadragon.Selection({
      element: viewerRef.current,
      viewer: viewerInstance.current,
      restrictToImage: true,
      showSelectionControl: false,
      startFixed: false,
      onSelection: (rect: any) => {
        console.log('Selection made:', rect);
        
        if (rect) {
          // Convert viewport rect to image coordinates
          const imageRect = viewerInstance.current.viewport.viewportToImageRectangle(rect);
          
          setSelectionCoords({
            viewport: {
              x: rect.x.toFixed(2),
              y: rect.y.toFixed(2),
              width: rect.width.toFixed(2),
              height: rect.height.toFixed(2)
            },
            image: {
              x: imageRect.x.toFixed(0),
              y: imageRect.y.toFixed(0),
              width: imageRect.width.toFixed(0),
              height: imageRect.height.toFixed(0)
            }
          });
        }
      }
    });
    
    if (selectionEnabled) {
      selectionRef.current.enable();
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <Head>
        <title>OpenSeadragon Selection Test</title>
      </Head>
      
      <h1 className="text-2xl font-bold mb-4">OpenSeadragon Selection Test</h1>
      
      {error && (
        <div className="bg-red-100 text-red-800 p-3 mb-4 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <button
          className={`px-4 py-2 rounded ${selectionEnabled ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
          onClick={toggleSelection}
        >
          {selectionEnabled ? 'Disable Selection' : 'Enable Selection'}
        </button>
      </div>
      
      {selectionCoords && (
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <h3 className="font-bold">Selection Coordinates:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">Viewport Coordinates:</h4>
              <pre className="bg-gray-200 p-2 rounded">
                {JSON.stringify(selectionCoords.viewport, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold">Image Coordinates:</h4>
              <pre className="bg-gray-200 p-2 rounded">
                {JSON.stringify(selectionCoords.image, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
      
      <div 
        id="openseadragon-viewer" 
        ref={viewerRef} 
        className="border border-gray-300 rounded" 
        style={{ width: '100%', height: '600px' }}
      />
      
      <div className="mt-4 bg-gray-100 p-3 rounded">
        <h3 className="font-bold">Instructions:</h3>
        <ol className="list-decimal pl-5">
          <li>Click the "Enable Selection" button</li>
          <li>Click and drag on the image to create a selection rectangle</li>
          <li>The coordinates of your selection will appear above the viewer</li>
        </ol>
      </div>
    </div>
  );
};

export default SelectionTest; 