import React, { useState } from 'react';

interface AnnotationToolsProps {
  isSelectionActive: boolean;
  selectedRegion: any | null;
  annotationColor: string;
  setAnnotationColor: (color: string) => void;
  onApplyColor: () => void;
  onSelectRegion: () => void;
}

// Predefined color palette for easy selection
const colorPalette = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#008000', // Dark Green
  '#000080', // Navy
];

const AnnotationTools: React.FC<AnnotationToolsProps> = ({
  isSelectionActive,
  selectedRegion,
  annotationColor,
  setAnnotationColor,
  onApplyColor,
  onSelectRegion,
}) => {
  // Predefined colors for quick selection
  const colorOptions = [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FF8000', // Orange
    '#8000FF', // Purple
    '#008000', // Dark Green
    '#000080', // Navy Blue
  ];

  // Format region dimensions for display
  const formatRegionDimensions = () => {
    if (!selectedRegion) return 'No region selected';
    
    const { x, y, width, height } = selectedRegion;
    return `X: ${x.toFixed(0)}, Y: ${y.toFixed(0)}, Width: ${width.toFixed(0)}, Height: ${height.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Annotation Tools</h3>
        <p className="text-sm text-gray-500 mb-4">
          Select a region and change its color.
        </p>
        
        <button
          onClick={onSelectRegion}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            isSelectionActive
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {isSelectionActive ? 'Cancel Selection' : 'Select Region'}
        </button>
      </div>
      
      {selectedRegion && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Selected Region</h4>
          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded mb-4">
            {formatRegionDimensions()}
          </div>
        </div>
      )}
      
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Annotation Color</h4>
        
        <div className="mb-3">
          <input
            type="color"
            value={annotationColor}
            onChange={(e) => setAnnotationColor(e.target.value)}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>
        
        <div className="grid grid-cols-5 gap-2 mb-4">
          {colorOptions.map((color) => (
            <button
              key={color}
              onClick={() => setAnnotationColor(color)}
              className={`w-full h-8 rounded ${
                color === annotationColor ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
        
        <button
          onClick={onApplyColor}
          disabled={!selectedRegion}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            selectedRegion
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Apply Color
        </button>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Instructions</h4>
        <ol className="list-decimal list-inside text-xs text-gray-500 space-y-1">
          <li>Click "Select Region" to start selecting an area</li>
          <li>Click and drag on the slide to create a rectangle</li>
          <li>Choose a color from the palette or color picker</li>
          <li>Click "Apply Color" to change the annotations in that region</li>
        </ol>
      </div>
    </div>
  );
};

export default AnnotationTools; 