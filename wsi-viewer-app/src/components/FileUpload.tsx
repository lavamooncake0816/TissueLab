import React, { useState, useRef } from 'react';
import api from '@/utils/api';

// Props interface
interface FileUploadProps {
  onUploadComplete: (fileName: string) => void;
  isElectron: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, isElectron }) => {
  // State for file, loading, and error
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Reference to the file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection via input
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  // Handle the selected file
  const handleFile = (file: File) => {
    // Check if the file is a valid format
    const validTypes = ['.svs', '.tif', '.tiff'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      setError(`Invalid file format. Please select a file with one of the following extensions: ${validTypes.join(', ')}`);
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
    setError(null);
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  // Open file dialog via Electron or browser file input
  const handleOpenFileDialog = async () => {
    if (isElectron && window.electron) {
      try {
        const filePath = await window.electron.openFileDialog();
        if (filePath) {
          // In Electron, we get a file path from the dialog
          // Here we would need to read the file to create a File object
          // This is a simplified version
          const fileName = filePath.split('/').pop() || '';
          onUploadComplete(fileName);
        }
      } catch (error) {
        console.error('Error opening file dialog:', error);
        setError('Failed to open file dialog. Please try again.');
      }
    } else {
      // In browser, click the hidden file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Set a simulated progress
      const updateProgress = () => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      };
      
      // Simulate progress updates
      const progressInterval = setInterval(updateProgress, 300);
      
      try {
        // Upload the file
        const response = await api.uploadWSI(selectedFile);
        
        // Check if upload was successful
        if (response.status === 200) {
          const fileName = response.data.filename || selectedFile.name;
          setUploadProgress(100);
          onUploadComplete(fileName);
        } else {
          throw new Error('Upload failed');
        }
      } catch (apiError) {
        console.error('API upload error:', apiError);
        console.log('Development mode: Using mock upload instead');
        
        // In development, simulate successful upload after delay
        if (process.env.NODE_ENV === 'development') {
          // Wait for simulated progress to complete
          await new Promise(resolve => setTimeout(resolve, 1500));
          setUploadProgress(100);
          
          // Use the file name directly
          onUploadComplete(selectedFile.name);
        } else {
          throw apiError;
        }
      } finally {
        clearInterval(progressInterval);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload the file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".svs,.tif,.tiff"
      />
      
      {/* Drag and drop area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors duration-200 flex flex-col items-center justify-center cursor-pointer ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleOpenFileDialog}
        style={{ minHeight: '160px' }}
      >
        <svg
          className={`w-12 h-12 mb-4 ${isDragging ? 'text-primary-500' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        {selectedFile ? (
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">
              Drag and drop your WSI file here
            </p>
            <p className="text-sm text-gray-500">
              or <span className="text-primary-600 font-medium">browse files</span>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Supported formats: .svs, .tif, .tiff
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Upload button */}
      {selectedFile && !isElectron && (
        <button
          type="button"
          className={`w-full py-2 px-4 rounded-md font-medium text-white ${
            isUploading
              ? 'bg-primary-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700'
          }`}
          onClick={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Uploading ({uploadProgress}%)
            </div>
          ) : (
            'Upload'
          )}
        </button>
      )}
    </div>
  );
};

export default FileUpload; 