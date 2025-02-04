document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('photoUpload');
    const uploadForm = document.getElementById('uploadForm');
    const resultSection = document.getElementById('result');
    const originalPhoto = document.getElementById('originalPhoto');
    const biometricPhoto = document.getElementById('biometricPhoto');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
    });

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFiles, false);

    // Click on drop area to trigger file input
    dropArea.addEventListener('click', () => fileInput.click());

    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFiles();
        }
    }

    function handleFiles() {
        const file = fileInput.files[0];
        if (file) {
            dropArea.innerHTML = `<p>File selected: <strong>${file.name}</strong></p>`;
        }
    }

    // Handle form submission
    uploadForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const file = fileInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('kernelSize', document.getElementById('kernelSize').value);

            // Send the file to the backend
            fetch('http://127.0.0.1:5000/generate-biometric-photo', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Display both original and processed images
                    originalPhoto.src = `http://127.0.0.1:5000${data.originalUrl}`;
                    biometricPhoto.src = `http://127.0.0.1:5000${data.photoUrl}`;
                    resultSection.style.display = 'block';
                } else {
                    alert('Error generating biometric photo. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            });
        } else {
            alert('Please select a photo to upload.');
        }
    });

    // Add kernel size slider functionality
    const kernelSlider = document.getElementById('kernelSize');
    const kernelValue = document.getElementById('kernelValue');
    
    kernelSlider.addEventListener('input', function() {
        kernelValue.textContent = this.value;
        // Optionally auto-update the image when slider changes
        if (fileInput.files[0]) {
            uploadForm.requestSubmit();
        }
    });
});