import React from 'react';

interface SegmentationResult {
  id: string;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  x?: number; // Alternative direct location properties
  y?: number;
  width?: number;
  height?: number;
  confidence: number;
  classification: string;
  color: string;
  created_at: string;
  cellType?: string; // For mock API data
}

interface SegmentationResultItemProps {
  result: SegmentationResult;
  onView: () => void;
}

/**
 * Component for displaying a single segmentation result item in the management view
 */
const SegmentationResultItem: React.FC<SegmentationResultItemProps> = ({
  result,
  onView,
}) => {
  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format confidence as percentage
  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Get location data from result, handling different data structures
  const getRegionDisplay = () => {
    // If we have a region object
    if (result.region) {
      return `(${result.region.x}, ${result.region.y}) - ${result.region.width}×${result.region.height}`;
    }
    
    // If we have direct x, y, width, height properties
    if (typeof result.x === 'number' && typeof result.y === 'number') {
      const width = result.width || 0;
      const height = result.height || 0;
      return `(${result.x}, ${result.y}) - ${width}×${height}`;
    }
    
    // Fallback if no region data
    return 'No region data';
  };

  // Get classification from result, handling different data structures
  const getClassification = () => {
    if (result.classification) {
      return result.classification;
    }
    if (result.cellType) {
      return result.cellType;
    }
    return 'unknown';
  };

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Color sample */}
            <div
              className="w-10 h-10 rounded-md border border-gray-300"
              style={{ backgroundColor: result.color }}
              aria-label={`Color: ${result.color}`}
            />
            
            {/* Segmentation details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {result.id}
              </h3>
              <p className="text-sm text-gray-500">
                Region: {getRegionDisplay()}
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div>
            <button
              onClick={onView}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200 text-sm"
            >
              View
            </button>
          </div>
        </div>
        
        {/* Additional information */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Classification:</span>{' '}
            <span className={`${
              getClassification().toLowerCase() === 'malignant' || getClassification().toLowerCase() === 'tumor'
                ? 'text-red-600' 
                : 'text-green-600'
            }`}>
              {getClassification().charAt(0).toUpperCase() + getClassification().slice(1)}
            </span>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Confidence:</span>{' '}
            <span>{formatConfidence(result.confidence)}</span>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Created:</span>{' '}
            <span>{result.created_at ? formatDate(result.created_at) : 'Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SegmentationResultItem; 