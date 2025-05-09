// Mock API implementation for development without a backend
import { AxiosResponse } from 'axios';

// Helper function to create a mock Axios response
function createMockResponse<T>(data: T, status = 200): Promise<AxiosResponse<T>> {
  return Promise.resolve({
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {} as any,
  });
}

// Health check
export const checkHealth = () => {
  return createMockResponse({ status: 'ok' });
};

// Upload WSI file
export const uploadWSI = (file: File) => {
  return createMockResponse({
    message: 'File uploaded successfully',
    filename: file.name,
    dimensions: {
      width: 10000,
      height: 8000
    }
  });
};

// Get slide information
export const getSlideInfo = (slideName: string) => {
  return createMockResponse({
    name: slideName,
    dimensions: {
      width: 10000,
      height: 8000
    },
    tileSize: 254,
    levels: 4,
    levelDimensions: [
      {level: 0, width: 10000, height: 8000},
      {level: 1, width: 5000, height: 4000},
      {level: 2, width: 2500, height: 2000},
      {level: 3, width: 1250, height: 1000}
    ],
    levelDownsamples: [1, 2, 4, 8],
    properties: {
      'openslide.vendor': 'mock',
      'openslide.objective-power': '40'
    }
  });
};

// Get slide tile
export const getSlideTile = (slideName: string, level: number, x: number, y: number) => {
  // Return a placeholder image URL for mock slides
  return 'https://via.placeholder.com/254/ffffff/000000?text=Tile';
};

// Helper function to generate random centroids
function generateRandomCentroids(bounds: any, count = 20) {
  const centroids = [];
  for (let i = 0; i < count; i++) {
    centroids.push({
      x: bounds.x + Math.random() * bounds.width,
      y: bounds.y + Math.random() * bounds.height,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
    });
  }
  return centroids;
}

// Helper function to generate random contours
function generateRandomContour(centerX: number, centerY: number, radius = 30, pointCount = 8) {
  const points = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * 2 * Math.PI;
    const randomRadius = radius * (0.8 + Math.random() * 0.4); // Add some randomness
    points.push({
      x: centerX + randomRadius * Math.cos(angle),
      y: centerY + randomRadius * Math.sin(angle)
    });
  }
  return points;
}

// Get segmentation centroids
export const getSegmentationCentroids = (slideName: string, bounds: any) => {
  const centroids = generateRandomCentroids(bounds);
  return createMockResponse({ data: centroids });
};

// Get segmentation contours
export const getSegmentationContours = (slideName: string, bounds: any) => {
  const contours = [];
  // Generate a few random contours
  for (let i = 0; i < 10; i++) {
    const centerX = bounds.x + Math.random() * bounds.width;
    const centerY = bounds.y + Math.random() * bounds.height;
    const points = generateRandomContour(centerX, centerY);
    contours.push({
      points,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
    });
  }
  return createMockResponse({ data: contours });
};

// Get segmentation results
export const getSegmentationResults = (slideName: string) => {
  const results = [];
  const classes = ['tumor', 'stroma', 'normal', 'necrosis', 'lymphocyte'];
  
  // Generate 50 random segmentation results
  for (let i = 0; i < 50; i++) {
    results.push({
      id: i,
      class: classes[Math.floor(Math.random() * classes.length)],
      area: 100 + Math.floor(Math.random() * 5000),
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
      center: {
        x: Math.floor(Math.random() * 5000),
        y: Math.floor(Math.random() * 4000)
      }
    });
  }
  
  return createMockResponse({ data: results });
};

// Update annotation color
export const updateAnnotationColor = (slideName: string, region: any, color: string) => {
  return createMockResponse({
    message: 'Color updated successfully',
    region,
    color
  });
}; 