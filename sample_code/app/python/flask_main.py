from flask import Flask, send_file, abort, request, jsonify
import tiffslide
from io import BytesIO
from flask_cors import CORS
import logging
from scripts.tile_post_process import PostProcess
import os
from werkzeug.utils import secure_filename
import importlib.util
import os
from os.path import join
import time
import PIL
from PIL import Image, ImageOps
current_directory = os.path.dirname(os.path.abspath(__file__))

script_globals = {'ImageOps': ImageOps}  # Inject ImageOps into the globals
script_locals = {}

def load_script():
    global script_globals, script_locals
    script_locals.clear()  # Clear the local namespace before reloading the script
    script_path = join(current_directory, 'scripts', 'dynamic_scripts.py')
    if os.path.exists(script_path):
        with open(script_path, 'r') as script_file:
            script_content = script_file.read()
            try:
                print(f"Executing script:\n{script_content}")  # Log the script content
                exec(script_content, script_globals, script_locals)
                print("Script executed successfully")
            except Exception as e:
                print(f"Error executing script: {str(e)}")
                raise  # Re-raise the exception for more visibility
    else:
        print(f"Script file {script_path} does not exist")


app = Flask(__name__)
CORS(app)

log = logging.getLogger('werkzeug')
log.setLevel(logging.WARNING)

ALLOWED_EXTENSIONS = {'svs', 'tif', 'tiff'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

slide = None

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        try:
            # Read file into memory (as BytesIO)
            file_content = BytesIO(file.read())

            # Load the slide directly from the BytesIO object
            global slide
            slide = tiffslide.TiffSlide(file_content)

            # You can return information like dimensions, etc.
            return jsonify({
                'message': 'File uploaded and processed successfully',
                'filename': file.filename,
                'dimensions': slide.level_dimensions
            }), 200
        except Exception as e:
            return jsonify({'error': f'Error processing file: {str(e)}'}), 500
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/load/<filename>')
def load_slide(filename):
    global slide
    
    # Instead of using file_path, use the file object directly
    # Assuming `slide` has already been set in memory
    if slide is not None:
        try:
            return jsonify({'message': 'Slide loaded successfully', 'dimensions': slide.level_dimensions}), 200
        except Exception as e:
            return jsonify({'error': f'Error loading slide: {str(e)}'}), 500
    else:
        return jsonify({'error': 'No slide loaded'}), 404


@app.route('/slide/<int:level>/<int:col>_<int:row>.jpeg')
def get_tile(level, col, row):
    global slide
    if slide is None:
        abort(400, description="No slide loaded")
    
    try:
        size = 512
        max_svs_level = len(slide.level_dimensions)
        dzi_level = level
        svs_level = max_svs_level - dzi_level - 1
        
        if svs_level >= len(slide.level_dimensions):
            abort(404)
        elif svs_level < 0:
            level_overflow = abs(svs_level)
            adjust_ratio = 2**(dzi_level-level_overflow*2)
            svs_level = 0
        else:
            adjust_ratio = 2**dzi_level
        zoom_ratio = slide.level_dimensions[0][0] / slide.level_dimensions[svs_level][0]
        
        x = int(col * size * zoom_ratio * adjust_ratio)
        y = int(row * size * zoom_ratio * adjust_ratio)
        img = slide.read_region((x, y), svs_level, (size * adjust_ratio, size * adjust_ratio))
        img = img.resize((size, size))
        
        post_processor = PostProcess(img, svs_level, app)
        post_processor.run()
        img = post_processor.img

        try:
            load_script()  # Check for updates and load the script
            print(111111111111111)
            if 'process_tile' in script_locals:
                print(22222222222)
                print(script_locals)
                img = script_locals['process_tile'](img)
        except Exception as e:
            print("Error inside 'process_tile':", e)
            return jsonify({'error': f"Error inside 'process_tile': {str(e)}"}), 500


        img_io = BytesIO()
        img.convert('RGB').save(img_io, 'JPEG', quality=70)
        img_io.seek(0)

        return send_file(img_io, mimetype='image/jpeg')
    except Exception as e:
        return jsonify({'error': f'Error processing tile: {str(e)}'}), 500
    
@app.route('/update-script', methods=['POST'])
def update_script():
    script_content = request.json.get('script')
    if not script_content:
        return jsonify({'error': 'No script content provided'}), 400

    # Save the script content to a temporary file
    script_path = join(current_directory, 'scripts', 'dynamic_scripts.py')
    with open(script_path, 'w') as script_file:
        script_file.write(script_content)

    return jsonify({'message': 'Script updated successfully'}), 200



# Run preprocess
progress = 0

@app.route('/run-preprocess', methods=['POST'])
def run_preprocess():
    global progress
    progress = 0  # Reset progress for each new process
    params = request.json.get('params')
    # Run nuclei segmentation in background
    return jsonify({'message': 'Preprocess started'}), 200

@app.route('/get-progress', methods=['GET'])
def get_progress():
    global progress
    if progress < 100:
        progress += 10
        time.sleep(0.2)  # Simulate work being done
    return jsonify({'progress': progress}), 200

@app.route('/get-result', methods=['GET'])
def get_result():
    global progress
    if progress >= 100:
        return jsonify({'message': 'Run preprocess finished successfully', "number_of_nuclei": "50000"}), 200
    else:
        return jsonify({'message': 'Processing not complete yet'}), 202

if __name__ == '__main__':
    app.run(debug=True, port=5000)