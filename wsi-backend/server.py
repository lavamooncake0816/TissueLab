from flask import Flask, send_file, abort, request, jsonify
import os
import sys
from io import BytesIO
from flask_cors import CORS
import logging
import numpy as np
import json
import time
from scripts.tile_post_process import PostProcess
from PIL import Image
import h5py
import cv2
from scipy import ndimage

# Try to import openslide first (more widely used), fall back to tiffslide
try:
    import openslide
    from openslide import OpenSlide as WSISlide
    print("Using OpenSlide for WSI handling")
except ImportError:
    try:
        import tiffslide
        from tiffslide import TiffSlide as WSISlide
        print("Using TiffSlide for WSI handling")
    except ImportError:
        print("ERROR: Neither OpenSlide nor TiffSlide is installed. Please install one of them.")
        print("You can install OpenSlide with: pip install openslide-python")
        print("Or TiffSlide with: pip install tiffslide")
        sys.exit(1)

# Create Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

log = logging.getLogger('werkzeug')
log.setLevel(logging.INFO)

# Configuration
SLIDE_DIR = os.path.dirname(os.path.abspath(__file__))
ALLOWED_EXTENSIONS = {'svs', 'tif', 'tiff', 'ndpi', 'mrxs'}
PORT = 5050  # Different from the default 5000 used by the other sample

# Global slide cache
slides = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

@app.route('/api/slides', methods=['GET'])
def list_slides():
    slide_files = []
    for file in os.listdir(SLIDE_DIR):
        if allowed_file(file):
            slide_files.append(file)
    return jsonify({'slides': slide_files}), 200

@app.route('/api/slides/upload', methods=['POST'])
def upload_slide():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        try:
            # Save file to disk
            filename = file.filename
            file_path = os.path.join(SLIDE_DIR, filename)
            file.save(file_path)
            
            # Load slide to verify it works
            slide = WSISlide(file_path)
            dimensions = slide.dimensions
            
            return jsonify({
                'message': 'File uploaded successfully',
                'filename': filename,
                'dimensions': {
                    'width': dimensions[0],
                    'height': dimensions[1]
                }
            }), 200
        except Exception as e:
            return jsonify({'error': f'Error processing file: {str(e)}'}), 500
            
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/slides/<slide_name>', methods=['GET'])
def get_slide_info(slide_name):
    try:
        # Check if slide exists on disk
        file_path = os.path.join(SLIDE_DIR, slide_name)
        if not os.path.exists(file_path) or not allowed_file(slide_name):
            return jsonify({'error': 'Slide not found'}), 404
        
        # Load slide if not in cache
        if slide_name not in slides:
            try:
                slides[slide_name] = WSISlide(file_path)
            except Exception as e:
                return jsonify({'error': f'Error loading slide: {str(e)}'}), 500
        
        slide = slides[slide_name]
        
        # Get slide information
        dimensions = slide.dimensions
        level_count = len(slide.level_dimensions)
        level_dimensions = slide.level_dimensions
        level_downsamples = slide.level_downsamples
        
        # Get slide properties
        try:
            properties = dict(slide.properties)
        except:
            properties = {}
        
        # Return slide info as JSON
        return jsonify({
            'name': slide_name,
            'dimensions': {
                'width': dimensions[0],
                'height': dimensions[1]
            },
            'tileSize': 254,  # Default tile size
            'levels': level_count,
            'levelDimensions': [
                {'level': i, 'width': dim[0], 'height': dim[1]} 
                for i, dim in enumerate(level_dimensions)
            ],
            'levelDownsamples': [float(ds) for ds in level_downsamples],
            'properties': properties
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error getting slide info: {str(e)}'}), 500

@app.route('/api/slides/<slide_name>/tile/<int:level>/<int:x>/<int:y>', methods=['GET'])
def get_tile(slide_name, level, x, y):
    try:
        # Check if slide exists on disk
        file_path = os.path.join(SLIDE_DIR, slide_name)
        if not os.path.exists(file_path) or not allowed_file(slide_name):
            return jsonify({'error': 'Slide not found'}), 404
        
        # Load slide if not in cache
        if slide_name not in slides:
            try:
                slides[slide_name] = WSISlide(file_path)
                print(f"Loaded slide: {slide_name}")
            except Exception as e:
                print(f"Error loading slide: {e}")
                return jsonify({'error': f'Error loading slide: {str(e)}'}), 500
        
        slide = slides[slide_name]
        
        # Validate level
        level_count = len(slide.level_dimensions)
        if level >= level_count or level < 0:
            # Return a transparent tile instead of error
            print(f"Invalid level requested: {level}, max level is {level_count - 1}")
            return create_placeholder_tile(254, (0, 0, 0, 0)), 200
        
        # Get tile dimensions
        tile_size = 254
        
        # Get slide dimensions at this level
        level_width, level_height = slide.level_dimensions[level]
        downsample = slide.level_downsamples[level]
        
        print(f"Reading tile at level={level}, x={x}, y={y}, dimensions={level_width}x{level_height}, downsample={downsample}")
        
        # Calculate base coordinates in level 0
        x_base = int(x * tile_size * downsample)
        y_base = int(y * tile_size * downsample)
        
        # Check if we're requesting beyond the edge of the slide
        max_x = level_width // tile_size
        max_y = level_height // tile_size
        
        if x > max_x or y > max_y:
            # Return a transparent tile for out-of-bounds requests
            print(f"Out of bounds tile requested: level={level}, x={x}, y={y}, max_x={max_x}, max_y={max_y}")
            return create_placeholder_tile(tile_size, (0, 0, 0, 0)), 200
        
        # Read the region and handle any errors
        try:
            # Read the actual image data - simple and direct approach
            tile = slide.read_region((x_base, y_base), level, (tile_size, tile_size))
            
            # Convert to RGB for consistent output
            tile = tile.convert('RGB')
            
            # Return the image with good quality
            output = BytesIO()
            tile.save(output, format='JPEG', quality=90)
            output.seek(0)
            
            # Set proper content type and caching headers
            response = send_file(output, mimetype='image/jpeg')
            response.headers['Content-Type'] = 'image/jpeg'
            response.headers['Cache-Control'] = 'public, max-age=86400'  # Cache for 24 hours
            return response
            
        except Exception as e:
            print(f"Error reading tile at level={level}, x={x}, y={y}: {e}")
            return create_placeholder_tile(tile_size, (255, 0, 0, 128)), 200
            
    except Exception as e:
        print(f"Error processing tile request: {e}")
        return jsonify({'error': f'Error processing tile request: {str(e)}'}), 500

# Helper function to create placeholder tile images
def create_placeholder_tile(size, color):
    """Create a placeholder tile with the given size and color."""
    img = Image.new('RGBA', (size, size), color)
    output = BytesIO()
    img.save(output, format='PNG')
    output.seek(0)
    return send_file(output, mimetype='image/png')

@app.route('/api/slides/<slide_name>/segmentation/centroids', methods=['GET'])
def get_segmentation_centroids(slide_name):
    """Return mock segmentation centroids for demo purposes"""
    try:
        # Parse viewport bounds from request
        x = float(request.args.get('x', 0))
        y = float(request.args.get('y', 0))
        width = float(request.args.get('width', 1000))
        height = float(request.args.get('height', 1000))
        
        # Generate random centroids within the viewport
        num_centroids = 50
        centroids = []
        
        for _ in range(num_centroids):
            centroid_x = x + np.random.random() * width
            centroid_y = y + np.random.random() * height
            centroids.append({
                'x': centroid_x, 
                'y': centroid_y,
                'color': f'#{np.random.randint(0, 256):02x}{np.random.randint(0, 256):02x}{np.random.randint(0, 256):02x}'
            })
        
        return jsonify({'data': centroids}), 200
    except Exception as e:
        return jsonify({'error': f'Error getting segmentation centroids: {str(e)}'}), 500

@app.route('/api/slides/<slide_name>/segmentation/contours', methods=['GET'])
def get_segmentation_contours(slide_name):
    """Return segmentation contours from H5 file"""
    try:
        # Parse viewport bounds from request
        x = float(request.args.get('x', 0))
        y = float(request.args.get('y', 0))
        width = float(request.args.get('width', 1000))
        height = float(request.args.get('height', 1000))
        
        print(f"Segmentation contours requested for: {slide_name}, bounds: {x},{y},{width},{height}")
        
        # If we're just requesting a small view for the UI overview, return empty or minimal data
        if width < 10 and height < 10:
            # Use random data for small viewport requests (like the initial view)
            num_contours = 5
            contours = []
            
            for _ in range(num_contours):
                center_x = x + np.random.random() * width
                center_y = y + np.random.random() * height
                
                # Generate a simple polygon around the center
                num_points = np.random.randint(5, 10)
                radius = np.random.randint(10, 30)
                points = []
                
                for i in range(num_points):
                    angle = 2 * np.pi * i / num_points
                    point_x = center_x + radius * np.cos(angle)
                    point_y = center_y + radius * np.sin(angle)
                    points.append({'x': point_x, 'y': point_y})
                
                contours.append({
                    'points': points,
                    'color': f'#{np.random.randint(0, 256):02x}{np.random.randint(0, 256):02x}{np.random.randint(0, 256):02x}'
                })
            
            return jsonify({'data': contours}), 200
            
        # Check for H5 segmentation file
        h5_filename = f"{slide_name}.seg.h5"
        
        # Check both in the SLIDE_DIR and one level up
        h5_paths = [
            os.path.join(SLIDE_DIR, h5_filename),  # In slide dir
            os.path.join(os.path.dirname(SLIDE_DIR), h5_filename),  # One level up
            os.path.join(SLIDE_DIR, "..", h5_filename),  # Alternate syntax for one level up
        ]
        
        h5_path = None
        for path in h5_paths:
            if os.path.exists(path):
                h5_path = path
                print(f"Found H5 file at {h5_path}")
                break
                
        if not h5_path:
            print(f"H5 segmentation file not found. Searched paths:")
            for path in h5_paths:
                print(f"  - {path}")
            return generate_mock_contours(x, y, width, height)
            
        # Get slide info to determine scaling
        slide_info = get_slide_info_dict(slide_name)
        if not slide_info:
            print(f"Failed to get slide info for {slide_name}")
            return jsonify({'error': 'Failed to get slide info'}), 500
            
        slide_width = slide_info['dimensions']['width']
        slide_height = slide_info['dimensions']['height']
        
        print(f"Slide dimensions: {slide_width}x{slide_height}")
        
        # Read segmentation from H5 file
        try:
            with h5py.File(h5_path, 'r') as f:
                print(f"H5 file opened successfully. Keys: {list(f.keys())}")
                
                # Extract segmentation data - structure depends on the H5 file format
                # Commonly used keys might be 'masks', 'segmentation', 'data', etc.
                seg_data = None
                possible_keys = ['masks', 'segmentation', 'data', 'label', 'labels', 'prediction', 'predictions']
                
                # First try to find direct datasets
                for key in possible_keys:
                    if key in f:
                        print(f"Found key '{key}' in H5 file")
                        seg_data = f[key][:]
                        break
                        
                # If not found, try to find datasets in nested groups
                if seg_data is None:
                    for key in f.keys():
                        if isinstance(f[key], h5py.Group):
                            print(f"Examining group '{key}'")
                            for subkey in possible_keys:
                                if subkey in f[key]:
                                    print(f"Found dataset '{subkey}' in group '{key}'")
                                    seg_data = f[key][subkey][:]
                                    break
                            if seg_data is not None:
                                break
                
                # If we still can't find standard keys, try to find any dataset
                if seg_data is None:
                    print("Looking for any dataset...")
                    for key in f.keys():
                        try:
                            if isinstance(f[key], h5py.Dataset):
                                print(f"Using dataset '{key}' from H5 file")
                                seg_data = f[key][:]
                                break
                            elif isinstance(f[key], h5py.Group):
                                # Look in the first level of groups
                                for subkey in f[key].keys():
                                    if isinstance(f[key][subkey], h5py.Dataset):
                                        print(f"Using dataset '{key}/{subkey}' from H5 file")
                                        seg_data = f[key][subkey][:]
                                        break
                        except Exception as e:
                            print(f"Error examining key {key}: {e}")
                        
                        if seg_data is not None:
                            break
                
                if seg_data is None:
                    print("Could not find any usable dataset in H5 file")
                    return generate_mock_contours(x, y, width, height)
                
                print(f"Segmentation data shape: {seg_data.shape}")
                
                # Handle different dimensionality
                if len(seg_data.shape) > 2:
                    print(f"Reducing dimensions from {len(seg_data.shape)} to 2")
                    # Try to reduce to 2D - depends on data organization
                    if len(seg_data.shape) == 3 and seg_data.shape[0] == 1:
                        seg_data = seg_data[0]  # First channel/slice
                    elif len(seg_data.shape) == 3 and seg_data.shape[2] == 1:
                        seg_data = seg_data[:,:,0]  # First channel
                    elif len(seg_data.shape) == 3:
                        # Use maximum value across channels or first channel
                        seg_data = np.max(seg_data, axis=2)
                    elif len(seg_data.shape) == 4 and seg_data.shape[0] == 1:
                        # Batch of 1, use first image and max across channels
                        seg_data = np.max(seg_data[0], axis=2)
                
                print(f"Final segmentation data shape: {seg_data.shape}")
                
                # Determine scale factor between segmentation and slide
                seg_height, seg_width = seg_data.shape
                scale_x = slide_width / seg_width
                scale_y = slide_height / seg_height
                
                print(f"Scale factors: x={scale_x}, y={scale_y}")
                
                # Convert viewport coordinates to segmentation coordinates
                seg_x = int(max(0, x / scale_x))
                seg_y = int(max(0, y / scale_y))
                seg_width = int(min(seg_width - seg_x, width / scale_x))
                seg_height = int(min(seg_height - seg_y, height / scale_y))
                
                # Sanity check
                if seg_width <= 0 or seg_height <= 0:
                    print("Invalid segmentation region requested")
                    return generate_mock_contours(x, y, width, height)
                
                # Extract region of interest from segmentation
                print(f"Extracting region: ({seg_x}, {seg_y}, {seg_width}, {seg_height})")
                region = seg_data[seg_y:seg_y+seg_height, seg_x:seg_x+seg_width]
                
                # Find contours
                contours = []
                
                # Get unique labels (excluding background 0)
                unique_labels = np.unique(region)
                unique_labels = unique_labels[unique_labels > 0]
                
                print(f"Found {len(unique_labels)} unique labels in region")
                
                # For each label, find its contours
                for label in unique_labels:
                    # Create binary mask for this label
                    mask = (region == label).astype(np.uint8) * 255
                    
                    # Find contours using OpenCV
                    opencv_contours, _ = cv2.findContours(
                        mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
                    )
                    
                    # Generate vibrant color based on label (consistent coloring)
                    # Use HSV to ensure vibrant colors, then convert to RGB
                    hue = (label * 137.5) % 360  # Use golden ratio to spread colors
                    saturation = 0.75 + (label % 25) / 100  # High saturation with small variations
                    value = 0.9 + (label % 10) / 100  # High brightness with small variations
                    
                    # Convert to RGB
                    h = hue / 60
                    i = int(h)
                    f = h - i
                    p = value * (1 - saturation)
                    q = value * (1 - saturation * f)
                    t = value * (1 - saturation * (1 - f))
                    
                    if i == 0:
                        r, g, b = value, t, p
                    elif i == 1:
                        r, g, b = q, value, p
                    elif i == 2:
                        r, g, b = p, value, t
                    elif i == 3:
                        r, g, b = p, q, value
                    elif i == 4:
                        r, g, b = t, p, value
                    else:
                        r, g, b = value, p, q
                    
                    r = int(r * 255)
                    g = int(g * 255)
                    b = int(b * 255)
                    color = f"#{r:02x}{g:02x}{b:02x}"
                    
                    for contour in opencv_contours:
                        if cv2.contourArea(contour) < 10:  # Skip tiny regions
                            continue
                        
                        # Simplify contour to reduce point count for performance
                        epsilon = 0.002 * cv2.arcLength(contour, True)
                        approx_contour = cv2.approxPolyDP(contour, epsilon, True)
                        
                        # Convert contour to list of points and scale to slide coordinates
                        points = []
                        for point in approx_contour.reshape(-1, 2):
                            # Map back to slide coordinates
                            slide_x = (point[0] + seg_x) * scale_x
                            slide_y = (point[1] + seg_y) * scale_y
                            points.append({"x": float(slide_x), "y": float(slide_y)})
                        
                        contours.append({
                            "points": points,
                            "color": color,
                            "label": int(label)
                        })
                
                print(f"Returning {len(contours)} contours")
                return jsonify({'data': contours}), 200
        
        except Exception as e:
            print(f"Error processing H5 file: {str(e)}")
            import traceback
            traceback.print_exc()
            return generate_mock_contours(x, y, width, height)
            
    except Exception as e:
        print(f"Error getting segmentation contours: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error getting segmentation contours: {str(e)}'}), 500

# Helper function to generate mock contours
def generate_mock_contours(x, y, width, height):
    """Generate random contours for testing or when H5 file not available"""
    print("Generating mock contours")
    # Generate random contours within the viewport
    num_contours = 20
    contours = []
    
    for _ in range(num_contours):
        center_x = x + np.random.random() * width
        center_y = y + np.random.random() * height
        
        # Generate a simple polygon around the center
        num_points = np.random.randint(5, 10)
        radius = np.random.randint(10, 30)
        points = []
        
        for i in range(num_points):
            angle = 2 * np.pi * i / num_points
            point_x = center_x + radius * np.cos(angle)
            point_y = center_y + radius * np.sin(angle)
            points.append({'x': point_x, 'y': point_y})
        
        contours.append({
            'points': points,
            'color': f'#{np.random.randint(0, 256):02x}{np.random.randint(0, 256):02x}{np.random.randint(0, 256):02x}'
        })
    
    return jsonify({'data': contours}), 200

# Helper function to get slide info as dict
def get_slide_info_dict(slide_name):
    """Get slide info as a dictionary"""
    try:
        file_path = os.path.join(SLIDE_DIR, slide_name)
        if not os.path.exists(file_path) or not allowed_file(slide_name):
            return None
            
        if slide_name not in slides:
            try:
                slides[slide_name] = WSISlide(file_path)
            except Exception as e:
                print(f"Error loading slide: {e}")
                return None
                
        slide = slides[slide_name]
        dimensions = slide.dimensions
        level_count = len(slide.level_dimensions)
        level_dimensions = slide.level_dimensions
        level_downsamples = slide.level_downsamples
        
        return {
            'name': slide_name,
            'dimensions': {
                'width': dimensions[0],
                'height': dimensions[1]
            },
            'tileSize': 254,
            'levels': level_count,
            'levelDimensions': [
                {'level': i, 'width': dim[0], 'height': dim[1]} 
                for i, dim in enumerate(level_dimensions)
            ],
            'levelDownsamples': [float(ds) for ds in level_downsamples],
        }
    except Exception as e:
        print(f"Error getting slide info: {e}")
        return None

@app.route('/api/slides/<slide_name>/segmentation/results', methods=['GET'])
def get_segmentation_results(slide_name):
    """Return mock segmentation results for demo purposes"""
    try:
        results = []
        
        # Generate random segmentation regions
        for i in range(10):
            region = {
                'id': i,
                'class': np.random.choice(['tumor', 'stroma', 'necrosis', 'lymphocyte']),
                'area': np.random.randint(100, 5000),
                'color': f'#{np.random.randint(0, 256):02x}{np.random.randint(0, 256):02x}{np.random.randint(0, 256):02x}',
                'center': {
                    'x': np.random.randint(0, 1000),
                    'y': np.random.randint(0, 1000)
                }
            }
            results.append(region)
        
        return jsonify({'data': results}), 200
    except Exception as e:
        return jsonify({'error': f'Error getting segmentation results: {str(e)}'}), 500

@app.route('/api/slides/<slide_name>/annotation/color', methods=['POST'])
def update_annotation_color(slide_name):
    """Update color for a specific region (mock implementation)"""
    try:
        # Parse request body
        data = request.json
        region = data.get('region')
        color = data.get('color')
        
        if not region or not color:
            return jsonify({'error': 'Missing region or color in request'}), 400
        
        # In a real implementation, we would update a database with this information
        # For now, just return success
        return jsonify({
            'message': 'Color updated successfully',
            'region': region,
            'color': color
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error updating annotation color: {str(e)}'}), 500

@app.route('/api/segmentation/<slide_name>/h5', methods=['GET'])
def get_segmentation_h5(slide_name):
    """Return the H5 segmentation file if it exists"""
    try:
        # Check if H5 file exists
        h5_filename = f"{slide_name}.seg.h5"
        file_path = os.path.join(SLIDE_DIR, h5_filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'Segmentation file not found'}), 404
        
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': f'Error getting segmentation file: {str(e)}'}), 500

# Main function to run the server
if __name__ == '__main__':
    print(f"WSI Backend Server starting on port {PORT}")
    print(f"Looking for slides in: {SLIDE_DIR}")
    
    # List all slide files in the directory
    slide_files = [f for f in os.listdir(SLIDE_DIR) if allowed_file(f)]
    print(f"Found {len(slide_files)} slide files:")
    for slide_file in slide_files:
        print(f" - {slide_file}")
    
    # Add CORS headers to all responses
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        # Add cache control for images
        if response.mimetype.startswith('image/'):
            response.headers['Cache-Control'] = 'public, max-age=86400'  # 24 hours
        return response
        
    # Start the server
    app.run(host='0.0.0.0', port=PORT, debug=True) 