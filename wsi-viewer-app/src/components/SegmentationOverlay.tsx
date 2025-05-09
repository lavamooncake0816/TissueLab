import React, { useEffect, RefObject } from 'react';

interface SegmentationOverlayProps {
  show: boolean;
  mode: 'centroids' | 'contours';
  viewportBounds: any;
  canvasRef: RefObject<HTMLCanvasElement>;
}

/**
 * Component for rendering segmentation overlay on top of the WSI viewer
 * 
 * This is a lightweight component that manages the canvas overlay for
 * displaying segmentation results (centroids or contours) based on the
 * current viewport bounds and zoom level.
 */
const SegmentationOverlay: React.FC<SegmentationOverlayProps> = ({
  show,
  mode,
  viewportBounds,
  canvasRef,
}) => {
  // Resize canvas when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      
      const parentElement = canvasRef.current.parentElement;
      if (!parentElement) return;
      
      // Adjust canvas size to match parent container
      canvasRef.current.width = parentElement.clientWidth;
      canvasRef.current.height = parentElement.clientHeight;
    };
    
    // Set initial size
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasRef]);

  // Display current mode and status with enhanced visualization
  return (
    <div className={`absolute top-4 right-4 p-3 bg-white rounded shadow-md text-sm ${show ? 'block' : 'hidden'}`}>
      <div className="flex items-center space-x-2">
        <div className={`w-4 h-4 rounded-full animate-pulse ${mode === 'centroids' ? 'bg-red-500' : 'bg-green-500'}`}></div>
        <span className="font-medium">
          {mode === 'centroids' ? 'Centroid Mode (Zoom in for contours)' : 'Contour Mode (Active)'}
        </span>
      </div>
      
      {viewportBounds && (
        <div className="text-gray-600 mt-2 text-xs">
          <div>Position: ({Math.round(viewportBounds.x)}, {Math.round(viewportBounds.y)})</div>
          <div>Size: {Math.round(viewportBounds.width)} × {Math.round(viewportBounds.height)}</div>
          <div>Zoom: {viewportBounds.zoom ? viewportBounds.zoom.toFixed(2) + 'x' : 'N/A'}</div>
        </div>
      )}
      
      {/* Instruction hint */}
      <div className="mt-2 text-xs italic text-blue-600 border-t pt-2">
        {mode === 'centroids' 
          ? 'Zoom in further to see detailed contours' 
          : 'Pan and zoom to explore contours'}
      </div>
    </div>
  );
};

export default SegmentationOverlay; 