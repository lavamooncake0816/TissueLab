# WSI Viewer App

A modern Whole Slide Image (WSI) viewer application for visualizing segmentation results. Built with Electron, Next.js, TypeScript, and Tailwind CSS.

## Features

- **WSI Viewing**: Upload and view whole slide images with smooth panning and zooming using OpenSeadragon
- **Segmentation Visualization**: Display segmentation results as centroids (dots) at low zoom levels and detailed contours at high zoom levels
- **Management Interface**: View and manage all segmentation results with pagination
- **Annotation Tools**: Select regions of interest and change the color of annotations within the selected region
- **Responsive Design**: Works on desktop and mobile devices
- **Electron Integration**: Native desktop application experience with file system access

## Tech Stack

- **Frontend**:
  - Next.js for React framework
  - TypeScript for type safety
  - Tailwind CSS for styling
  - OpenSeadragon for WSI viewing
  
- **Backend** (not included in this repo):
  - FastAPI for the REST API
  - Python for slide processing

- **Desktop**:
  - Electron for desktop application

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Python 3.8+ (for the backend)
- FastAPI backend running (see separate backend repo)

## Installation and Setup

### Frontend (Next.js + Electron)

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/wsi-viewer-app.git
   cd wsi-viewer-app
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   # Web version
   npm run dev
   # or
   yarn dev
   
   # Electron version
   npm run electron-dev
   # or
   yarn electron-dev
   ```

4. Build for production:
   ```bash
   # Web version
   npm run build
   # or
   yarn build
   
   # Electron version
   npm run electron-build
   # or
   yarn electron-build
   ```

### Configuration

The application connects to a FastAPI backend by default at `http://localhost:8000`. You can change this in the Settings page or by setting the `NEXT_PUBLIC_API_URL` environment variable.

## Using the Application

1. **Home Page**: Upload a WSI file or select a sample slide
2. **Viewer Page**: View the slide with segmentation results
   - Toggle between centroids and contours visualization
   - Select regions and change annotation colors
3. **Management Page**: View all segmentation results with pagination
4. **Settings Page**: Configure application settings

## Sample Data

A sample slide (CMU-1.svs) and segmentation results are included for demonstration. You can download additional sample slides from:
- [OpenSlide Test Data](https://openslide.cs.cmu.edu/download/openslide-testdata/)

## Development Notes

- The application uses a 16× magnification factor when displaying coordinates, as mentioned in the task requirements.
- Segmentation results visualization adapts based on zoom level for better performance and usability.
- Pagination is implemented in the Management page to handle large numbers of segmentation results.

## License

MIT 