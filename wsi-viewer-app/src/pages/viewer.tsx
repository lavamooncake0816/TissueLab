import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getSlideInfo, getSlideTile, getSegmentationCentroids, getSegmentationContours, updateAnnotationColor } from '@/utils/api';
import { debounce } from 'lodash';
import AnnotationTools from '@/components/AnnotationTools';
import SegmentationOverlay from '@/components/SegmentationOverlay';

// Import OpenSeadragon as a client-side only dependency
let OpenSeadragon: any;
if (typeof window !== 'undefined') {
  // Only import when in browser
  OpenSeadragon = require('openseadragon');
}

interface ViewerProps {
  isElectron: boolean;
}

const Viewer: React.FC<ViewerProps> = ({ isElectron }) => {
  const router = useRouter();
  const { slide } = router.query;
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const selectionRef = useRef<any>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [slideInfo, setSlideInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewportBounds, setViewportBounds] = useState<any>(null);
  const [segmentationMode, setSegmentationMode] = useState<'centroids' | 'contours'>('centroids');
  const [showSegmentation, setShowSegmentation] = useState(true);
  const [isRegionSelection, setIsRegionSelection] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [annotationColor, setAnnotationColor] = useState('#FF0000');

  // Reference to track if selection plugin is loaded
  const selectionPluginLoaded = useRef<boolean>(false);

  // Add a state to track mouse coordinates
  const [mousePosition, setMousePosition] = useState<{
    viewport: { x: string; y: string };
    image: { x: string; y: string };
    zoom: string;
    imageZoom: string;
  } | null>(null);

  // Initialize viewer when slide name is available
  useEffect(() => {
    if (!slide || typeof window === 'undefined') return;

    console.log('Starting viewer initialization for slide:', slide);
    console.log('OpenSeadragon available:', !!OpenSeadragon);

    const initViewer = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Clean up any existing viewer
        if (viewerInstance.current) {
          console.log('Destroying existing viewer instance');
          viewerInstance.current.destroy();
          viewerInstance.current = null;
        }

        // Make sure OpenSeadragon is available
        if (!OpenSeadragon) {
          console.error('OpenSeadragon not available');
          setError('OpenSeadragon library not loaded');
          setLoading(false);
          return;
        }

        // Make sure viewer div is available
        if (!viewerRef.current) {
          console.error('Viewer div reference not available');
          setError('Viewer element not found');
          setLoading(false);
          return;
        }

        console.log('Viewer div ID:', viewerRef.current.id);
        console.log('Viewer div in DOM:', !!document.getElementById(viewerRef.current.id));
        
        // Get slide info from the API
        try {
          const isDevelopment = process.env.NODE_ENV === 'development';
          const useRealBackend = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';
          console.log('Environment:', process.env.NODE_ENV, 'Using real backend:', useRealBackend);
          
          if (isDevelopment && !useRealBackend) {
            // Use mock image for development without a backend
            console.log('Using mock image in development mode');
            const viewer = OpenSeadragon({
              id: viewerRef.current.id,
              prefixUrl: '/openseadragon/images/',
              debugMode: true,
              showNavigator: true,
              tileSources: {
                type: 'legacy-image-pyramid',
                levels: [{
                  url: 'https://openseadragon.github.io/example-images/highsmith/highsmith.jpg',
                  height: 3000,
                  width: 2400
                }]
              }
            });
            
            viewerInstance.current = viewer;
            console.log('Viewer created with mock image');
            setLoading(false);
          } else {
            // Try to get real slide info from the backend
            console.log('Fetching slide info from API for:', slide);
            const slideResponse = await getSlideInfo(slide as string);
            console.log('Slide info response:', slideResponse);
            
            if (slideResponse && slideResponse.data) {
              setSlideInfo(slideResponse.data);
              
              // Configure tile source using the API endpoint
              const tileSource = {
                height: slideResponse.data.dimensions.height,
                width: slideResponse.data.dimensions.width,
                tileSize: slideResponse.data.tileSize || 254,
                minLevel: 0,
                maxLevel: slideResponse.data.levels - 1,
                getTileUrl: function(level: number, x: number, y: number) {
                  // Ensure the level is within bounds (0 to max available level)
                  const maxLevel = slideResponse.data.levels - 1;
                  const mappedLevel = Math.min(maxLevel, Math.max(0, level));
                  
                  // Round coordinates to integers to avoid any floating-point issues
                  const safeX = Math.floor(x);
                  const safeY = Math.floor(y);
                  
                  // Simple tile URL with cache busting
                  const cacheBuster = Date.now();
                  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'}/slides/${slide}/tile/${mappedLevel}/${safeX}/${safeY}?t=${cacheBuster}`;
                },
              };
              
              // Create viewer with basic reliable settings
              const viewer = OpenSeadragon({
                id: viewerRef.current.id,
                prefixUrl: '/openseadragon/images/',
                tileSources: tileSource,
                showNavigator: true,
                navigatorPosition: 'BOTTOM_RIGHT',
                visibilityRatio: 0.5,
                constrainDuringPan: true,
                debugMode: false,
                defaultZoomLevel: 0.5,
                animationTime: 0.3,
                blendTime: 0.1,
                minZoomImageRatio: 0.1,
                maxZoomPixelRatio: 3,
                immediateRender: false,
                wrapHorizontal: false,
                wrapVertical: false,
                useCanvas: true,
                crossOriginPolicy: "Anonymous",
                loadTilesWithAjax: true,
                ajaxHeaders: {
                  'Accept': 'image/jpeg'
                },
                placeholderFillStyle: '#F8F8F8',
                imageLoaderLimit: 5,
                timeout: 60000,
                springStiffness: 5.0,
                pixelDensityRatio: 1,
                autoResize: true,
                preserveViewport: true,
              });
              
              viewerInstance.current = viewer;
              console.log('Viewer created with real tile source');
              
              // Add handlers
              viewer.addHandler('viewport-change', handleViewportChange);

              // Add handlers for tracking tile load events
              viewer.addHandler('tile-loaded', function(event: any) {
                console.log(`Tile loaded: level=${event.tile.level}, x=${event.tile.x}, y=${event.tile.y}`);
              });

              viewer.addHandler('tile-load-failed', function(event: any) {
                console.error(`Tile load failed: level=${event.tile?.level}, x=${event.tile?.x}, y=${event.tile?.y}`, event.message || 'Unknown error');
              });

              viewer.addHandler('open', () => {
                console.log('Image opened successfully');
                adjustOverlayCanvas();
              });

              viewer.addHandler('open-failed', (event: any) => {
                console.error('Failed to open image:', event);
                setError('Failed to load slide. Check console for details.');
              });

              // Additional debug handlers
              viewer.addHandler('canvas-click', (event: any) => {
                console.log('Canvas clicked at:', event.position);
                const viewportPoint = viewer.viewport.pointFromPixel(event.position);
                const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);
                console.log('Image coordinates:', imagePoint);
              });
              
              setLoading(false);
            } else {
              throw new Error('Invalid slide info response');
            }
          }
        } catch (apiError) {
          console.error('API error loading slide:', apiError);
          setError('Failed to load the slide. Make sure the Python backend is running.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in initViewer:', error);
        setError('Failed to initialize the viewer: ' + (error as Error).message);
        setLoading(false);
      }
    };

    // Initialize the viewer
    initViewer();

    // Cleanup on unmount
    return () => {
      if (viewerInstance.current) {
        console.log('Cleaning up viewer on unmount');
        if (viewerInstance.current.removeHandler) {
          viewerInstance.current.removeHandler('viewport-change', handleViewportChange);
        }
        viewerInstance.current.destroy();
        viewerInstance.current = null;
      }
    };
  }, [slide]);

  // Load the selection plugin script when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && !selectionPluginLoaded.current) {
      // Make sure OpenSeadragon is available globally for the plugin
      window.OpenSeadragon = OpenSeadragon;
      
      // Dynamically add the selection plugin script
      const script = document.createElement('script');
      script.src = '/openseadragon-selection.js';
      script.async = true;
      script.onload = () => {
        console.log('OpenSeadragon selection plugin loaded');
        selectionPluginLoaded.current = true;
      };
      script.onerror = () => {
        console.error('Failed to load OpenSeadragon selection plugin');
        setError('Failed to load selection plugin. Some features may not work.');
      };
      document.body.appendChild(script);
      
      // No need to remove the script on unmount as it will be cached for future use
    }
  }, []);

  // Handle viewport changes and update segmentation overlay
  const handleViewportChange = debounce(() => {
    if (!viewerInstance.current) return;

    const viewport = viewerInstance.current.viewport;
    const bounds = viewport.getBounds();
    
    // Convert bounds to image coordinates (including 16x magnification factor)
    const imageBounds = {
      x: Math.floor(bounds.x),
      y: Math.floor(bounds.y),
      width: Math.ceil(bounds.width),
      height: Math.ceil(bounds.height),
      zoom: viewport.getZoom()
    };
    
    setViewportBounds(imageBounds);
    
    // Update segmentation overlay
    updateSegmentationOverlay(imageBounds);
  }, 100);

  // Update segmentation overlay based on viewport
  const updateSegmentationOverlay = async (bounds: any) => {
    if (!showSegmentation || !overlayRef.current || !viewerInstance.current || !slide) return;

    try {
      // Calculate zoom level to determine whether to show centroids or contours
      const zoomLevel = viewerInstance.current.viewport.getZoom();
      
      // Lower the threshold for showing contours to 0.5 instead of 1.0
      const showDetailedContours = zoomLevel > 0.5; 
      
      console.log(`Current zoom level: ${zoomLevel}, showing ${showDetailedContours ? 'contours' : 'centroids'}`);
      
      // Set segmentation mode based on zoom level
      setSegmentationMode(showDetailedContours ? 'contours' : 'centroids');
      
      // Fetch segmentation data based on mode
      const fetchSegmentationData = async () => {
        const endpoint = showDetailedContours ? 'contours' : 'centroids';
        console.log(`Fetching segmentation ${endpoint} for bounds:`, bounds);
        
        if (showDetailedContours) {
          return await getSegmentationContours(slide as string, bounds);
        } else {
          return await getSegmentationCentroids(slide as string, bounds);
        }
      };
      
      const response = await fetchSegmentationData();
      console.log('Segmentation data response:', response); // Debug log
      
      // Get the data from the response
      const segmentationData = response.data?.data || [];
      console.log('Parsed segmentation data length:', segmentationData.length);
      
      // Draw segmentation data on overlay canvas
      if (overlayRef.current && segmentationData && Array.isArray(segmentationData)) {
        const ctx = overlayRef.current.getContext('2d');
        if (!ctx) return;
        
        // Adjust canvas dimensions to match viewer
        const viewerElement = viewerInstance.current.element;
        overlayRef.current.width = viewerElement.clientWidth;
        overlayRef.current.height = viewerElement.clientHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
        
        // Draw segmentation data
        if (showDetailedContours) {
          // Draw contours with enhanced visibility
          segmentationData.forEach((contour: any) => {
            if (!contour.points || contour.points.length === 0) return;
            
            // Get OpenSeadragon viewport to convert coordinates
            const viewport = viewerInstance.current.viewport;
            
            ctx.beginPath();
            ctx.strokeStyle = contour.color || '#00FF00';
            ctx.lineWidth = 2;
            ctx.fillStyle = contour.color ? `${contour.color}33` : 'rgba(0, 255, 0, 0.2)'; // Semi-transparent fill
            
            // Map coordinates from image space to viewport
            let firstPixel = null;
            
            for (let i = 0; i < contour.points.length; i++) {
              const point = contour.points[i];
              
              // Convert image coordinates to viewport coordinates
              const viewportPoint = viewport.imageToViewportCoordinates(point.x, point.y);
              
              // Convert viewport coordinates to pixel coordinates
              const pixelPoint = viewport.viewportToViewerElementCoordinates(viewportPoint);
              
              if (i === 0) {
                ctx.moveTo(pixelPoint.x, pixelPoint.y);
                firstPixel = pixelPoint;
              } else {
                ctx.lineTo(pixelPoint.x, pixelPoint.y);
              }
            }
            
            // Close the path if we have points
            if (firstPixel) {
              ctx.lineTo(firstPixel.x, firstPixel.y);
            }
            
            ctx.closePath();
            ctx.fill();  // Fill with semi-transparent color
            ctx.stroke(); // Outline
          });
          
          // Log drawn contours
          console.log(`Drew ${segmentationData.length} contours on canvas`);
        } else {
          // Draw centroids as dots
          segmentationData.forEach((centroid: any) => {
            // Get OpenSeadragon viewport to convert coordinates
            const viewport = viewerInstance.current.viewport;
            
            // Convert image coordinates to viewport coordinates
            const viewportPoint = viewport.imageToViewportCoordinates(centroid.x, centroid.y);
            
            // Convert viewport coordinates to pixel coordinates
            const pixelPoint = viewport.viewportToViewerElementCoordinates(viewportPoint);
            
            ctx.beginPath();
            ctx.fillStyle = centroid.color || '#FF0000';
            ctx.arc(pixelPoint.x, pixelPoint.y, 5, 0, 2 * Math.PI);
            ctx.fill();
          });
          
          console.log(`Drew ${segmentationData.length} centroids on canvas`);
        }
      } else {
        console.warn('Invalid segmentation data format or empty data');
      }
    } catch (error) {
      console.error('Error updating segmentation overlay:', error);
    }
  };

  // Toggle segmentation overlay visibility
  const toggleSegmentationOverlay = () => {
    setShowSegmentation(!showSegmentation);
    
    if (!showSegmentation && viewportBounds) {
      // If enabling, update the overlay immediately
      updateSegmentationOverlay(viewportBounds);
    } else if (overlayRef.current) {
      // If disabling, clear the canvas
      const ctx = overlayRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  };

  // Handle region selection functionality
  const handleRegionSelection = () => {
    try {
      if (!viewerInstance.current) {
        console.error('Viewer not initialized');
        return;
      }
      
      // Toggle selection mode
      setIsRegionSelection(!isRegionSelection);
      
      if (!isRegionSelection) {
        // Enabling selection mode
        console.log('Enabling selection mode');
        
        // Make sure OpenSeadragon is available globally for the plugin
        if (!window.OpenSeadragon) {
          window.OpenSeadragon = OpenSeadragon;
        }
        
        // Check if Selection plugin is loaded
        if (!window.OpenSeadragon.Selection) {
          console.warn('Selection plugin not available. Loading plugin...');
          
          // Load the selection plugin if not already loaded
          if (!selectionPluginLoaded.current) {
            const script = document.createElement('script');
            script.src = '/openseadragon-selection.js';
            script.async = true;
            script.onload = () => {
              console.log('Selection plugin loaded successfully');
              selectionPluginLoaded.current = true;
              initializeSelection();
            };
            script.onerror = (e) => {
              console.error('Failed to load selection plugin', e);
              setError('Failed to load selection plugin');
            };
            document.body.appendChild(script);
          }
        } else {
          // Plugin is already loaded, initialize selection
          initializeSelection();
        }
      } else {
        // Disabling selection mode
        console.log('Disabling selection mode');
        disableSelection();
      }
    } catch (error) {
      console.error('Error in handleRegionSelection:', error);
      setError('Failed to initialize selection tool');
    }
  };
  
  // Initialize selection object
  const initializeSelection = () => {
    if (!viewerInstance.current || !window.OpenSeadragon?.Selection) {
      console.error('Cannot initialize selection: viewer or plugin not available');
      return;
    }
    
    console.log('Initializing selection object');
    
    // Create or reset selection object
    if (selectionRef.current) {
      try {
        selectionRef.current.disable();
      } catch (e) {
        console.warn('Error disabling existing selection:', e);
      }
    }
    
    // Create new selection instance
    selectionRef.current = new window.OpenSeadragon.Selection({
      element: viewerRef.current,
      viewer: viewerInstance.current,
      showSelectionControl: false,
      restrictToImage: true,
      onSelection: (rect: any) => {
        console.log('Selection made:', rect);
        if (rect) {
          // Convert viewport rect to image coordinates
          const imageRect = viewerInstance.current.viewport.viewportToImageRectangle(rect);
          console.log('Selection in image coordinates:', imageRect);
          setSelectedRegion({
            x: parseFloat(imageRect.x.toFixed(2)),
            y: parseFloat(imageRect.y.toFixed(2)),
            width: parseFloat(imageRect.width.toFixed(2)),
            height: parseFloat(imageRect.height.toFixed(2))
          });
        }
      }
    });
    
    // Enable selection
    selectionRef.current.enable();
    
    // Disable mouse navigation in the viewer
    viewerInstance.current.setMouseNavEnabled(false);
  };
  
  // Disable selection
  const disableSelection = () => {
    if (selectionRef.current) {
      try {
        selectionRef.current.disable();
      } catch (e) {
        console.warn('Error disabling selection:', e);
      }
    }
    
    // Reset selected region
    setSelectedRegion(null);
    
    // Re-enable mouse navigation in the viewer
    if (viewerInstance.current) {
      viewerInstance.current.setMouseNavEnabled(true);
    }
  };

  // Apply color change to selected region
  const applyColorToRegion = async () => {
    if (!selectedRegion || !slide) {
      console.error('Missing selected region or slide for color application');
      setError('No region selected or slide not loaded');
      return;
    }
    
    try {
      console.log('Applying color to region:', selectedRegion, 'Color:', annotationColor);
      
      // If we're in development mode, add a visual representation of the selection
      if (process.env.NODE_ENV === 'development') {
        // Create a temporary overlay to show the selection with the chosen color
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.border = `3px solid ${annotationColor}`;
        overlay.style.backgroundColor = `${annotationColor}33`; // Add transparency
        overlay.style.pointerEvents = 'none'; // Make it non-interactive
        
        // Convert image coordinates to viewport coordinates
        const viewport = viewerInstance.current.viewport;
        const viewportRect = viewport.imageToViewportRectangle(
          selectedRegion.x,
          selectedRegion.y,
          selectedRegion.width,
          selectedRegion.height
        );
        
        // Convert viewport coordinates to viewer element coordinates
        const topLeft = viewport.viewportToViewerElementCoordinates(
          new OpenSeadragon.Point(viewportRect.x, viewportRect.y)
        );
        const bottomRight = viewport.viewportToViewerElementCoordinates(
          new OpenSeadragon.Point(viewportRect.x + viewportRect.width, viewportRect.y + viewportRect.height)
        );
        
        // Position and size the overlay
        overlay.style.left = `${topLeft.x}px`;
        overlay.style.top = `${topLeft.y}px`;
        overlay.style.width = `${bottomRight.x - topLeft.x}px`;
        overlay.style.height = `${bottomRight.y - topLeft.y}px`;
        
        // Add to the viewer container
        if (viewerRef.current) {
          viewerRef.current.appendChild(overlay);
          
          // Remove it after a few seconds to keep the view clean
          setTimeout(() => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
          }, 3000);
        }
      }
      
      // Call the API to save the annotation
      await updateAnnotationColor(slide as string, selectedRegion, annotationColor);
      
      // Update segmentation overlay to show new color
      if (viewportBounds) {
        updateSegmentationOverlay(viewportBounds);
      }
      
      // Reset selection
      setSelectedRegion(null);
      setIsRegionSelection(false);
      
      // Disable selection mode
      disableSelection();
      
    } catch (error) {
      console.error('Error applying color to region:', error);
      setError('Failed to apply color to the selected region.');
    }
  };

  // Function to adjust the overlay canvas to match viewer size and position
  const adjustOverlayCanvas = () => {
    if (!overlayRef.current || !viewerInstance.current) return;
    
    const viewerElement = viewerInstance.current.element;
    const containerWidth = viewerElement.clientWidth;
    const containerHeight = viewerElement.clientHeight;
    
    // Set canvas dimensions to match container
    overlayRef.current.width = containerWidth;
    overlayRef.current.height = containerHeight;
    
    // Position the canvas over the viewer
    overlayRef.current.style.top = '0px';
    overlayRef.current.style.left = '0px';
    overlayRef.current.style.width = `${containerWidth}px`;
    overlayRef.current.style.height = `${containerHeight}px`;
  };

  // Add handler for mouse move to track coordinates
  useEffect(() => {
    if (!viewerInstance.current) return;
    
    const updateMousePosition = (event: any) => {
      if (!viewerInstance.current) return;
      
      const webPoint = event.position;
      const viewportPoint = viewerInstance.current.viewport.pointFromPixel(webPoint);
      const imagePoint = viewerInstance.current.viewport.viewportToImageCoordinates(viewportPoint);
      const zoom = viewerInstance.current.viewport.getZoom();
      let imageZoom = 1;
      
      // Calculate image zoom if slide info is available
      if (slideInfo && slideInfo.levelDownsamples && slideInfo.levelDownsamples.length > 0) {
        const baseDownsample = slideInfo.levelDownsamples[0];
        imageZoom = baseDownsample / zoom;
      }
      
      setMousePosition({
        viewport: {
          x: viewportPoint.x.toFixed(2),
          y: viewportPoint.y.toFixed(2)
        },
        image: {
          x: imagePoint.x.toFixed(0),
          y: imagePoint.y.toFixed(0)
        },
        zoom: zoom.toFixed(2),
        imageZoom: imageZoom.toFixed(2)
      });
    };
    
    // Add mouse tracking handlers
    viewerInstance.current.addHandler('mouse-move', updateMousePosition);
    
    return () => {
      if (viewerInstance.current) {
        viewerInstance.current.removeHandler('mouse-move', updateMousePosition);
      }
    };
  }, [viewerInstance, slideInfo]);

  return (
    <div className="relative h-full flex flex-col">
      <Head>
        <title>WSI Viewer - {slide || 'Slide Viewer'}</title>
      </Head>
      
      {/* Toolbar */}
      <div className="p-4 bg-white shadow-sm border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-gray-900">{slide || 'Slide Viewer'}</h1>
            {loading && (
              <div className="ml-3">
                <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleSegmentationOverlay}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                showSegmentation ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {showSegmentation ? 'Hide Segmentation' : 'Show Segmentation'}
            </button>
            
            <button 
              onClick={handleRegionSelection} 
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                isRegionSelection ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {isRegionSelection ? 'Cancel Selection' : 'Select Region'}
            </button>
          </div>
        </div>
        
        {/* Coordinates Display */}
        {mousePosition && (
          <div className="mt-2 text-sm text-gray-600 flex items-center space-x-4">
            <div className="flex items-center">
              <span className="font-medium mr-1">Viewport:</span>
              <span>{mousePosition.viewport.x},{mousePosition.viewport.y}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Image:</span>
              <span>{mousePosition.image.x},{mousePosition.image.y}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Zoom:</span>
              <span>{mousePosition.zoom}x</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Image Zoom:</span>
              <span>{mousePosition.imageZoom}x</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 border-b border-red-200">
          {error}
        </div>
      )}
      
      {/* Viewer container */}
      <div className="relative flex-1 flex">
        {/* Sidebar for annotation tools */}
        <div className="w-64 bg-white border-r p-4">
          <AnnotationTools 
            isSelectionActive={isRegionSelection}
            selectedRegion={selectedRegion}
            annotationColor={annotationColor}
            setAnnotationColor={setAnnotationColor}
            onApplyColor={applyColorToRegion}
            onSelectRegion={handleRegionSelection}
          />
        </div>
        
        {/* Main viewer */}
        <div className="flex-1 relative">
          <div 
            id="openseadragon-viewer" 
            ref={viewerRef} 
            className="absolute inset-0 bg-gray-100"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Viewer will be initialized here */}
          </div>
          
          {/* Canvas overlay for segmentation visualization */}
          <canvas 
            ref={overlayRef} 
            className={`absolute inset-0 pointer-events-none ${
              showSegmentation ? 'opacity-100' : 'opacity-0'
            }`}
            width={1200}
            height={800}
          />
          
          {/* Segmentation overlay component */}
          <SegmentationOverlay 
            show={showSegmentation}
            mode={segmentationMode}
            viewportBounds={viewportBounds}
            canvasRef={overlayRef}
          />
        </div>
      </div>
    </div>
  );
};

export default Viewer; 