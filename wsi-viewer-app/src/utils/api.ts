// API service to interact with the Flask backend
import axios, { AxiosInstance } from 'axios';
import * as mockApi from './mockApi';

// Check if we're in a Node.js environment (server-side rendering)
const isServer = typeof window === 'undefined';

// Base URL for API requests - use an environment variable or fall back to a default
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

// Determine if we should use the mock API based on environment
// We'll use mock API if:
// 1. We're in development mode AND 
// 2. The Python backend is not available
const USE_MOCK_API = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_USE_REAL_API;

// Define a custom interface that extends AxiosInstance
interface ExtendedApi extends AxiosInstance {
  checkHealth: () => Promise<any>;
  uploadWSI: (file: File) => Promise<any>;
  getSlideInfo: (slideName: string) => Promise<any>;
  getSlideTile: (slideName: string, level: number, x: number, y: number) => string;
  getSegmentationCentroids: (slideName: string, bounds: any) => Promise<any>;
  getSegmentationContours: (slideName: string, bounds: any) => Promise<any>;
  getSegmentationResults: (slideName: string) => Promise<any>;
  updateAnnotationColor: (slideName: string, region: any, color: string) => Promise<any>;
  getSegmentationH5: (slideName: string) => string;
}

// Initialize axios instance with timeout and retry config
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
}) as ExtendedApi;

// Add request interceptor to log requests (helpful for debugging)
api.interceptors.request.use(
  (config) => {
    console.log(`API Request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to log responses
api.interceptors.response.use(
  (response) => {
    console.log(`API Response from: ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    return Promise.reject(error);
  }
);

// Log which API mode we're using
console.log(`API Mode: ${USE_MOCK_API ? 'MOCK (Development)' : 'REAL'}`);

// Check if the backend API is available
export const checkHealth = async () => {
  try {
    if (USE_MOCK_API) {
      return mockApi.checkHealth();
    }
    return await api.get('/health');
  } catch (error) {
    console.error('Health check failed:', error);
    return { data: { status: 'error' } };
  }
};

// Upload a WSI file
export const uploadWSI = async (file: File) => {
  if (USE_MOCK_API) {
    return mockApi.uploadWSI(file);
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  return await api.post('/slides/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Get slide information
export const getSlideInfo = async (slideName: string) => {
  if (USE_MOCK_API) {
    return mockApi.getSlideInfo(slideName);
  }
  try {
    console.log(`Requesting slide info for: ${slideName}`);
    return await api.get(`/slides/${slideName}`);
  } catch (error) {
    console.error(`Error fetching slide info for ${slideName}:`, error);
    throw error;
  }
};

// Get slide tile
export const getSlideTile = (slideName: string, level: number, x: number, y: number) => {
  if (USE_MOCK_API) {
    return mockApi.getSlideTile(slideName, level, x, y);
  }
  
  // Ensure all parameters are valid integers
  const safeLevel = Math.max(0, Math.floor(level));
  const safeX = Math.max(0, Math.floor(x));
  const safeY = Math.max(0, Math.floor(y));
  
  // Create the URL with properly formatted parameters
  const url = `${API_URL}/slides/${encodeURIComponent(slideName)}/tile/${safeLevel}/${safeX}/${safeY}`;
  
  // Add cache-busting for development if needed
  if (process.env.NODE_ENV === 'development') {
    // Add timestamp to avoid caching issues during development
    return `${url}?t=${Date.now()}`;
  }
  
  return url;
};

// Get segmentation centroids
export const getSegmentationCentroids = async (slideName: string, bounds: any) => {
  if (USE_MOCK_API) {
    return mockApi.getSegmentationCentroids(slideName, bounds);
  }
  
  const params = new URLSearchParams({
    x: bounds.x.toString(),
    y: bounds.y.toString(),
    width: bounds.width.toString(),
    height: bounds.height.toString(),
  });
  
  return await api.get(`/slides/${slideName}/segmentation/centroids?${params}`);
};

// Get segmentation contours
export const getSegmentationContours = async (slideName: string, bounds: any) => {
  if (USE_MOCK_API) {
    return mockApi.getSegmentationContours(slideName, bounds);
  }
  
  const params = new URLSearchParams({
    x: bounds.x.toString(),
    y: bounds.y.toString(),
    width: bounds.width.toString(),
    height: bounds.height.toString(),
  });
  
  return await api.get(`/slides/${slideName}/segmentation/contours?${params}`);
};

// Get segmentation results
export const getSegmentationResults = async (slideName: string) => {
  if (USE_MOCK_API) {
    return mockApi.getSegmentationResults(slideName);
  }
  return await api.get(`/slides/${slideName}/segmentation/results`);
};

// Update annotation color
export const updateAnnotationColor = async (slideName: string, region: any, color: string) => {
  if (USE_MOCK_API) {
    return mockApi.updateAnnotationColor(slideName, region, color);
  }
  
  return await api.post(`/slides/${slideName}/annotation/color`, {
    region,
    color,
  });
};

// Get segmentation H5 file
export const getSegmentationH5 = (slideName: string) => {
  if (USE_MOCK_API) {
    console.warn('Mock API does not support H5 file download');
    return '';
  }
  return `${API_URL}/segmentation/${slideName}/h5`;
};

// Attach all exported functions to the api object for default export
api.checkHealth = checkHealth;
api.uploadWSI = uploadWSI;
api.getSlideInfo = getSlideInfo;
api.getSlideTile = getSlideTile;
api.getSegmentationCentroids = getSegmentationCentroids;
api.getSegmentationContours = getSegmentationContours;
api.getSegmentationResults = getSegmentationResults;
api.updateAnnotationColor = updateAnnotationColor;
api.getSegmentationH5 = getSegmentationH5;

export default api; 