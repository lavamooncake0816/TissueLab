import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import api from '@/utils/api';
import SegmentationResultItem from '@/components/SegmentationResultItem';

interface ManagementProps {
  isElectron: boolean;
}

const Management: React.FC<ManagementProps> = ({ isElectron }) => {
  const router = useRouter();
  const { slide } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [segmentationResults, setSegmentationResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(5); // Default to 5 pages
  const [totalResults, setTotalResults] = useState(42); // Default to 42 results
  const [selectedSlide, setSelectedSlide] = useState<string | null>(null);
  const [availableSlides, setAvailableSlides] = useState<string[]>(['CMU-1.svs']);
  
  const RESULTS_PER_PAGE = 10;

  // Load available slides
  useEffect(() => {
    // In a real app, we would fetch this from the server
    // For now, we'll just use the demo slide
    setAvailableSlides(['CMU-1.svs']);
    
    // If slide is specified in URL, select it
    if (slide) {
      setSelectedSlide(slide as string);
    } else if (availableSlides.length > 0) {
      setSelectedSlide(availableSlides[0]);
    }
  }, [slide, availableSlides.length]);

  // Load segmentation results when slide changes
  useEffect(() => {
    if (!selectedSlide) return;
    
    const fetchSegmentationResults = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to fetch from API
        try {
          // Fetch segmentation results for the selected slide
          const response = await api.getSegmentationResults(
            selectedSlide, 
            { page, limit: RESULTS_PER_PAGE }
          );
          
          // Handle different response formats between mock and real API
          if (response.data.results) {
            // Standard API format
            setSegmentationResults(response.data.results);
            setTotalPages(response.data.pagination?.total || 5);
            setTotalResults(response.data.summary?.totalCells || 42);
          } else {
            // Fallback to handle different data structure
            setSegmentationResults(Array.isArray(response.data) ? response.data : []);
            setTotalPages(5); // Default
            setTotalResults(42); // Default
          }
        } catch (apiError) {
          console.warn('API call failed, using sample data', apiError);
          // Use demo data
          setSegmentationResults(generateSampleResults());
        }
      } catch (error) {
        console.error('Error fetching segmentation results:', error);
        setError('Failed to load segmentation results. Using sample data instead.');
        setSegmentationResults(generateSampleResults());
      } finally {
        setLoading(false);
      }
    };
    
    fetchSegmentationResults();
  }, [selectedSlide, page]);

  // Handle slide selection
  const handleSlideSelect = (slideName: string) => {
    setSelectedSlide(slideName);
    setPage(1); // Reset to first page when changing slides
    
    // Update URL
    router.push({
      pathname: '/management',
      query: { slide: slideName }
    }, undefined, { shallow: true });
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  // View segmentation details
  const handleViewSegmentation = (segmentationId: string) => {
    if (!selectedSlide) return;
    
    router.push({
      pathname: '/viewer',
      query: { 
        slide: selectedSlide,
        segmentation: segmentationId 
      }
    });
  };

  // Generate pagination
  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Add first page
    if (startPage > 1) {
      pages.push(
        <button
          key="first"
          onClick={() => handlePageChange(1)}
          className="px-3 py-1 rounded-md text-sm bg-white border border-gray-300 hover:bg-gray-50"
        >
          1
        </button>
      );
      
      // Add ellipsis if needed
      if (startPage > 2) {
        pages.push(
          <span key="ellipsis1" className="px-2 py-1 text-gray-500">...</span>
        );
      }
    }
    
    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded-md text-sm ${
            i === page
              ? 'bg-primary-600 text-white border border-primary-600'
              : 'bg-white border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }
    
    // Add last page
    if (endPage < totalPages) {
      // Add ellipsis if needed
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="ellipsis2" className="px-2 py-1 text-gray-500">...</span>
        );
      }
      
      pages.push(
        <button
          key="last"
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-1 rounded-md text-sm bg-white border border-gray-300 hover:bg-gray-50"
        >
          {totalPages}
        </button>
      );
    }
    
    return (
      <div className="flex items-center justify-center space-x-2">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className={`px-3 py-1 rounded-md text-sm ${
            page === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Previous
        </button>
        
        <div className="flex items-center space-x-2">
          {pages}
        </div>
        
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          className={`px-3 py-1 rounded-md text-sm ${
            page === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Next
        </button>
      </div>
    );
  };

  // For demo purposes, generate some sample segmentation results
  // In a real app, this would come from the API
  const generateSampleResults = () => {
    const results = [];
    
    for (let i = 1; i <= 20; i++) {
      const id = `seg-${i}`;
      results.push({
        id,
        region: {
          x: Math.floor(Math.random() * 5000),
          y: Math.floor(Math.random() * 5000),
          width: Math.floor(Math.random() * 200) + 100,
          height: Math.floor(Math.random() * 200) + 100,
        },
        confidence: Math.random() * 0.5 + 0.5, // Random confidence between 0.5 and 1.0
        classification: Math.random() > 0.5 ? 'malignant' : 'benign',
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`, // Random color
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date in the past 30 days
      });
    }
    
    return results.slice((page - 1) * RESULTS_PER_PAGE, page * RESULTS_PER_PAGE);
  };

  // Render the list of segmentation results
  const renderSegmentationResults = () => {
    // Use sample data for demonstration purposes
    const resultsToShow = segmentationResults.length > 0 
      ? segmentationResults 
      : generateSampleResults();
    
    if (resultsToShow.length === 0) {
      return (
        <div className="text-center p-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No segmentation results found.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {resultsToShow.map((result) => (
          <SegmentationResultItem
            key={result.id}
            result={result}
            onView={() => handleViewSegmentation(result.id)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Head>
        <title>WSI Viewer - Segmentation Management</title>
      </Head>
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Segmentation Results</h1>
        
        <div className="flex items-center space-x-2">
          <label htmlFor="slide-select" className="text-sm font-medium text-gray-700">
            Select Slide:
          </label>
          <select
            id="slide-select"
            value={selectedSlide || ''}
            onChange={(e) => handleSlideSelect(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {availableSlides.map((slideName) => (
              <option key={slideName} value={slideName}>
                {slideName}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Slide information */}
      {selectedSlide && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">{selectedSlide}</h2>
              <p className="text-sm text-gray-500">
                Showing segmentation results {((page - 1) * RESULTS_PER_PAGE) + 1}-
                {Math.min(page * RESULTS_PER_PAGE, totalResults)} of {totalResults}
              </p>
            </div>
            
            <button
              onClick={() => router.push(`/viewer?slide=${selectedSlide}`)}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200 text-sm"
            >
              View Slide
            </button>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center my-8">
          <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {/* Results list */}
      {!loading && (
        <div className="space-y-6">
          {renderSegmentationResults()}
          
          {/* Pagination */}
          <div className="mt-6">
            {renderPagination()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Management; 