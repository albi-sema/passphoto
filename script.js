$(document).ready(function() {
    console.log('Script loaded and DOM fully loaded'); // Initial log to confirm script execution

    const dropArea = $('#dropArea');
    const fileInput = $('#photoUpload');
    const uploadForm = $('#uploadForm');
    const resultSection = $('#result');
    const originalPhoto = $('#originalPhoto');
    const biometricPhoto = $('#biometricPhoto');
    const kernelSlider = $('#kernelSize');
    const kernelValue = $('#kernelValue');
    const browseLink = $('#browseLink');

    // Set initial kernel value display
    kernelValue.text(kernelSlider.val());

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.on(eventName, preventDefaults);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.on(eventName, () => dropArea.addClass('dragover'));
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.on(eventName, () => dropArea.removeClass('dragover'));
    });

    // Handle dropped files
    dropArea.on('drop', handleDrop);
    fileInput.on('change', handleFiles);

    // Click on drop area or browse link to trigger file input
    dropArea.on('click', () => fileInput.click());
    browseLink.on('click', (e) => {
        e.preventDefault(); // Prevent default link behavior
        fileInput.click();
    });

    function handleDrop(e) {
        const files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            fileInput[0].files = files;
            handleFiles();
        }
    }

    function handleFiles() {
        const file = fileInput[0].files[0];
        if (file) {
            dropArea.html(`<p>File selected: <strong>${file.name}</strong></p>`);
        }
    }

    // Handle form submission
    uploadForm.on('submit', function (e) {
        e.preventDefault();

        const file = fileInput[0].files[0];
        if (file) {
            const kernelSize = kernelSlider.val();
            console.log('Submitting with Kernel Size:', kernelSize); // Debugging log

            const formData = new FormData();
            formData.append('photo', file);
            formData.append('kernelSize', kernelSize);

            // Send the file to the backend using Axios
            axios.post('http://127.0.0.1:5000/generate-biometric-photo', formData)
                .then(response => {
                    const data = response.data;
                    console.log('Response received:', data); // Debugging log
                    if (data.success) {
                        // Append a timestamp to the URLs to prevent caching
                        const timestamp = new Date().getTime();
                        
                        // Log the URLs to verify correctness
                        console.log('Original Photo URL:', `http://127.0.0.1:5000${data.originalUrl}?t=${timestamp}`);
                        console.log('Biometric Photo URL:', `http://127.0.0.1:5000${data.photoUrl}?t=${timestamp}`);
                        
                        // Force reload by setting src to a dummy URL before new URL
                        originalPhoto.attr('src', '');
                        biometricPhoto.attr('src', '');
                        
                        // Small delay to ensure the browser clears the old images
                        setTimeout(() => {
                            originalPhoto.attr('src', `http://127.0.0.1:5000${data.originalUrl}?t=${timestamp}`);
                            biometricPhoto.attr('src', `http://127.0.0.1:5000${data.photoUrl}?t=${timestamp}`);
                            resultSection.show();
                        }, 100);
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
    kernelSlider.on('input', function() {
        kernelValue.text(this.value);
        // Auto-update the image when slider changes
        if (fileInput[0].files[0]) {
            console.log('Slider changed, submitting form'); // Debugging log
            uploadForm.submit();
        }
    });
});