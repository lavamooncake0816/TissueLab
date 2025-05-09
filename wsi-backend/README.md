# WSI Viewer Backend

This is a Flask-based backend server for the WSI (Whole Slide Image) Viewer application. It provides endpoints for displaying and interacting with digital pathology slide images.

## Features

- Serve whole slide image (WSI) files in various formats (SVS, TIFF, etc.)
- Generate image tiles for OpenSeadragon viewer
- Mock segmentation data endpoints
- H5 segmentation file serving

## Requirements

- Python 3.7+
- OpenSlide or TiffSlide library
- Flask and other dependencies listed in `requirements.txt`

## Installation

1. Create a virtual environment and activate it:

```bash
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

2. Install the required packages:

```bash
pip install -r requirements.txt
```

3. Place your WSI files (e.g., .svs, .tiff) in this directory.

## Usage

1. Start the server:

```bash
python server.py
```

2. The server will run on http://localhost:5050 by default

3. Configure the frontend to use this backend by setting the appropriate API endpoint URLs

## API Endpoints

### Health Check
- `GET /api/health` - Check if the server is running

### Slide Operations
- `GET /api/slides` - List all available slides
- `POST /api/slides/upload` - Upload a new slide
- `GET /api/slides/<slide_name>` - Get information about a specific slide
- `GET /api/slides/<slide_name>/tile/<level>/<x>/<y>` - Get a specific tile from the slide

### Segmentation
- `GET /api/slides/<slide_name>/segmentation/centroids` - Get segmentation centroids
- `GET /api/slides/<slide_name>/segmentation/contours` - Get segmentation contours
- `GET /api/slides/<slide_name>/segmentation/results` - Get segmentation results
- `GET /api/segmentation/<slide_name>/h5` - Get the H5 segmentation file

### Annotation
- `POST /api/slides/<slide_name>/annotation/color` - Update annotation color

## Notes

- The backend is configured to look for slide files in the same directory as the server.py file.
- For production use, you should configure proper authentication and security measures.
- The segmentation endpoints currently return mock data for demonstration purposes.

## Troubleshooting

- If you get an error about OpenSlide or TiffSlide not being installed, make sure you have the correct library installed for your WSI files.
- For OpenSlide, additional system dependencies may be required. See the OpenSlide documentation for details. 