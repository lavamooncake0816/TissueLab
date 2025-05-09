# WSI Viewer with Segmentation Visualization

This project extends a whole slide image (WSI) viewer to visualize segmentation results, built with Electron, Next.js, TypeScript, and FastAPI.

## Features

- WSI viewing with support for zooming and panning
- Segmentation results overlay on the WSI
- Management sidebar for reviewing all segmentation results
- User annotation functionality (cropping regions and changing annotation colors)
- Modern UI with Tailwind CSS and React components

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd wsi-viewer
   ```

2. Install frontend dependencies:
   ```bash
   cd wsi-viewer-app
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd ../wsi-backend
   pip install -r requirements.txt
   ```

4. Download test data (if needed):
   ```bash
   wget https://openslide.cs.cmu.edu/download/openslide-testdata/Aperio/CMU-1.svs
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd wsi-backend
   python main.py
   ```

2. Start the frontend application:
   ```bash
   cd wsi-viewer-app
   npm run dev
   ```

3. The application should open automatically in Electron. If not, open it manually according to instructions in the terminal.

## Project Structure

- `wsi-backend/`: FastAPI backend for handling WSI data and segmentation
- `wsi-viewer-app/`: Electron + Next.js frontend application
- `sample_code/`: Reference implementation

## Implementation Details

This project addresses the requirements of visualizing segmentation results on whole slide images by:

1. Using Electron and Next.js for a responsive desktop application
2. Implementing an overlay system that shows:
   - Segmentation centroids as dots at low zoom levels
   - Detailed contours when zoomed in past a threshold
3. Providing a management interface for reviewing all segmentation results
4. Supporting user annotations within cropped regions

## Technologies Used

- **Frontend**: Electron, Next.js, TypeScript, OpenSeadragon, Tailwind CSS
- **Backend**: FastAPI, Python
- **Data Handling**: HDF5 for segmentation results

## Future Improvements

- Performance optimizations for large WSIs
- Additional annotation tools
- Support for multiple segmentation masks
- Collaborative viewing and annotation 