import React, { useState } from 'react';
import { useRouter } from 'next/router';
import FileUpload from '@/components/FileUpload';
import api from '@/utils/api';

interface HomeProps {
  isElectron: boolean;
}

const Home: React.FC<HomeProps> = ({ isElectron }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle file upload completion
  const handleUploadComplete = async (fileName: string) => {
    try {
      setLoading(true);
      // Navigate to the viewer page with the slide name
      router.push(`/viewer?slide=${fileName}`);
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while loading the slide. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-10">
        <header>
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            Welcome to WSI Viewer
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Upload a whole slide image (WSI) file to view and analyze segmentation results.
          </p>
        </header>

        <main className="mt-10">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">
                Upload a slide
              </h2>
              <div className="mt-5">
                <FileUpload 
                  onUploadComplete={handleUploadComplete} 
                  isElectron={isElectron} 
                />
              </div>
              {error && (
                <div className="mt-4 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">
                Sample Slides
              </h2>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>
                  You can also use one of our sample slides to explore the system.
                </p>
              </div>
              <div className="mt-5">
                <ul className="divide-y divide-gray-200">
                  <li className="py-4 flex">
                    <button
                      onClick={() => handleUploadComplete('CMU-1.svs')}
                      className="text-primary-600 hover:text-primary-900 font-medium"
                      disabled={loading}
                    >
                      CMU-1.svs
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home; 