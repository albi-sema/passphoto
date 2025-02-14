from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import numpy as np
import os
from werkzeug.utils import secure_filename
import mediapipe as mp

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load Haar Cascade for face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Initialize MediaPipe Selfie Segmentation
mp_selfie_segmentation = mp.solutions.selfie_segmentation
selfie_segmentation = mp_selfie_segmentation.SelfieSegmentation(model_selection=1)

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def crop_head_and_shoulders(image, face, target_ratio=(4, 5)):
    """
    Crop the head and shoulders region from the image in the required ratio.
    :param image: Input image.
    :param face: Detected face coordinates (x, y, w, h).
    :param target_ratio: Target aspect ratio (width:height).
    :return: Cropped image.
    """
    (x, y, w, h) = face

    # Calculate the expanded region to include head and shoulders
    head_top = max(0, y - int(h * 0.5))  # Extend upwards
    head_bottom = min(image.shape[0], y + h + int(h * 0.5))  # Extend downwards
    head_left = max(0, x - int(w * 0.3))  # Extend to the left
    head_right = min(image.shape[1], x + w + int(w * 0.3))  # Extend to the right

    # Calculate the current width and height of the head and shoulders region
    current_width = head_right - head_left
    current_height = head_bottom - head_top

    # Calculate the target width and height based on the required ratio
    target_width = current_width
    target_height = int(target_width * (target_ratio[1] / target_ratio[0]))

    # Adjust the region to match the target ratio
    if target_height > current_height:
        # Add padding to the top and bottom
        padding = (target_height - current_height) // 2
        head_top = max(0, head_top - padding)
        head_bottom = min(image.shape[0], head_bottom + padding)
    else:
        # Crop the height to match the target ratio
        excess_height = current_height - target_height
        head_top += excess_height // 2
        head_bottom -= excess_height // 2

    # Crop the image
    cropped_image = image[head_top:head_bottom, head_left:head_right]

    return cropped_image

def generate_biometric_photo_from_file(file_path, kernel_size, blur_kernel_size, photo_format="us", fade_distance=20):
    """
    Process an image file to generate a biometric photo.
    :param file_path: Path to the input image file.
    :param kernel_size: Size of the kernel for erosion and dilation.
    :param blur_kernel_size: Size of the kernel for Gaussian blur.
    :param fade_distance: Distance over which the fade effect is applied.
    :param photo_format: The desired photo format, e.g., 'us' or 'germany'.
    :return: Path to the processed biometric photo.
    """
    try:
        # Load the image using OpenCV
        print(f"Loading image from {file_path}...")
        image = cv2.imread(file_path)
        if image is None:
            raise ValueError("Invalid image file")

        # Convert the image to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Detect faces in the image
        print("Detecting faces...")
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        if len(faces) == 0:
            raise ValueError("No face detected in the image")

        # Get the first detected face (assuming only one face is needed)
        face = faces[0]

        # Crop the head and shoulders region in the required ratio
        print("Cropping head and shoulders...")
        cropped_image = crop_head_and_shoulders(image, face, target_ratio=(4, 5))

        # Load the super-resolution model
        print("Loading super-resolution model...")
        sr = cv2.dnn_superres.DnnSuperResImpl_create()
        sr.readModel("FSRCNN_x2.pb")  # Path to the FSRCNN model file
        sr.setModel("fsrcnn", 2)  # Use FSRCNN with a scale factor of 2

        # Apply super-resolution to the cropped image
        print("Applying super-resolution...")
        super_res_image = sr.upsample(cropped_image)

        # Convert the super-resolved image to RGB (MediaPipe requires RGB input)
        super_res_image_rgb = cv2.cvtColor(super_res_image, cv2.COLOR_BGR2RGB)

        # Process the super-resolved image with MediaPipe Selfie Segmentation
        print("Running MediaPipe Selfie Segmentation...")
        results = selfie_segmentation.process(super_res_image_rgb)

        # Get the segmentation mask
        mask = results.segmentation_mask

        # Create a binary mask (threshold at 0.5)
        binary_mask = (mask > 0.5).astype(np.uint8) * 255

        # Invert the mask and erode it (effectively dilating the foreground)
        inverted_mask = cv2.bitwise_not(binary_mask)
        kernel = np.ones((kernel_size, kernel_size), np.uint8)
        eroded_inverted = cv2.erode(inverted_mask, kernel, iterations=1)
        final_mask = cv2.bitwise_not(eroded_inverted)

        # Apply Gaussian blur to the mask for smooth edges
        if blur_kernel_size % 2 == 0:
            blur_kernel_size += 1  # Ensure the kernel size is odd
        final_mask = cv2.medianBlur(final_mask, blur_kernel_size)

        # Create a gradient mask for the fade effect using distance transform
        distance = cv2.distanceTransform(final_mask, cv2.DIST_L2, 5)
        distance = cv2.normalize(distance, None, 0, 1, cv2.NORM_MINMAX)

        # Scale the distance map by the fade_distance
        gradient_mask = np.clip(distance * fade_distance, 0, 1)

        # Apply Gaussian blur to the gradient mask for smoother transitions
        gradient_mask = cv2.medianBlur(gradient_mask, blur_kernel_size)

        # Convert the gradient mask to the range [0, 255]
        gradient_mask = (gradient_mask * 255).astype(np.uint8)

        # Apply the gradient mask to the final mask
        final_mask = cv2.multiply(final_mask.astype(np.float32), gradient_mask.astype(np.float32) / 255).astype(np.uint8)

        # Apply the final mask to the super-resolved image
        result = cv2.bitwise_and(super_res_image, super_res_image, mask=final_mask)

        # Create a white background
        white_background = np.ones_like(super_res_image) * 255

        # Invert the final mask for the background
        inverted_final_mask = cv2.bitwise_not(final_mask)

        # Apply the inverted mask to the white background
        background = cv2.bitwise_and(white_background, white_background, mask=inverted_final_mask)

        # Combine the foreground and background
        final_image = cv2.add(result, background)

        # Save the processed image
        processed_filename = f"processed_{os.path.basename(file_path)}"
        processed_file_path = os.path.join(app.config['UPLOAD_FOLDER'], processed_filename)
        print(f"Saving processed image to {processed_file_path}...")
        cv2.imwrite(processed_file_path, final_image)

        return processed_file_path

    except Exception as e:
        print(f"Error processing image: {str(e)}")
        raise

@app.route('/generate-biometric-photo', methods=['POST'])
def generate_biometric_photo():
    # Check if a file is included in the request
    if 'photo' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'}), 400

    file = request.files['photo']
    kernel_size = request.form.get('kernelSize', type=int)  # Get kernel size from form data
    blur_kernel_size = request.form.get('blurKernelSize', type=int, default=5)  # Provide a default value

    # Check if the file is valid
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        # Save the file to the upload folder
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        print(f"Saving uploaded file to {file_path}...")

        file.save(file_path)

        try:
            # Retrieve the photo format from the form data (default to 'us' if not specified)
            photo_format = request.form.get('photoFormat', default='us')
            # Generate the biometric photo using the kernel size and photo format settings
            processed_file_path = generate_biometric_photo_from_file(file_path, kernel_size, blur_kernel_size, photo_format)

            # Return the URL of the processed image
            processed_filename = os.path.basename(processed_file_path)
            processed_image_url = f"/uploads/{processed_filename}"
            original_image_url = f"/uploads/{filename}"  # Ensure this is correct
            return jsonify({'success': True, 'photoUrl': processed_image_url, 'originalUrl': original_image_url}), 200

        except Exception as e:
            print(f"Error generating biometric photo: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    else:
        return jsonify({'success': False, 'error': 'File type not allowed'}), 400

@app.route('/uploads/<filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True)