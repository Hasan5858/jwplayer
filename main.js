// Event listener for form submission
document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    uploadFiles();
});

// Helper function to create temporary input for clipboard fallback
function createTemporaryInput(text) {
    const input = document.createElement('input');
    input.style.position = 'fixed';
    input.style.opacity = 0;
    input.value = text;
    document.body.appendChild(input);
    return input;
}

// Clipboard fallback function
function fallbackCopyToClipboard(text, successMsg) {
    try {
        const input = createTemporaryInput(text);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        successMsg.style.display = 'inline';
        setTimeout(() => successMsg.style.display = 'none', 2000);
    } catch (err) {
        console.error('Fallback clipboard copy failed:', err);
        alert('Copy failed. Please copy the link manually.');
    }
}

// Enhanced copy to clipboard function
function copyToClipboard(text, successId) {
    const successMsg = document.getElementById(successId);
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => {
                successMsg.style.display = 'inline';
                setTimeout(() => successMsg.style.display = 'none', 2000);
            })
            .catch(err => {
                console.error('Clipboard API failed:', err);
                fallbackCopyToClipboard(text, successMsg);
            });
    } else {
        fallbackCopyToClipboard(text, successMsg);
    }
}

// Main upload function
async function uploadFiles() {
    const fileInput = document.getElementById('fileInput');
    const statusDiv = document.getElementById('uploadStatus');
    const progressBar = document.getElementById('progressBar');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressText');
    const files = fileInput.files;

    if (files.length === 0) {
        statusDiv.innerHTML = '<div class="error-message">Please select files to upload</div>';
        return;
    }

    // Validate file types
    for (let file of files) {
        if (!file.name.toLowerCase().endsWith('.mp4')) {
            statusDiv.innerHTML = '<div class="error-message">Only MP4 files are allowed</div>';
            return;
        }
    }

    const formData = new FormData();
    for (let file of files) {
        formData.append('files[]', file);
    }

    progressBar.style.display = 'block';
    progressText.textContent = 'Uploading...';
    statusDiv.innerHTML = '';

    try {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBarFill.style.width = percentComplete + '%';
                progressText.textContent = `Uploading: ${Math.round(percentComplete)}%`;
            }
        };

        const response = await new Promise((resolve, reject) => {
            xhr.onload = function() {
                if (xhr.status === 200) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error('Upload failed'));
                }
            };
            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.open('POST', '/upload', true);
            xhr.send(formData);
        });

        if (response.success) {
            let html = '<h3>Upload Complete!</h3>';
            response.files.forEach((file, index) => {
                if (file.url) {
                    const successId = `success-${index}`;
                    html += `
                        <div class="result-link">
                            <div><strong>File:</strong> ${file.name}</div>
                            <div class="pure-g">
                                <div class="pure-u-4-5">${file.url}</div>
                                <div class="pure-u-1-5">
                                    <button class="pure-button pure-button-primary copy-btn" 
                                            onclick="copyToClipboard('${file.url}', '${successId}')">
                                        Copy Link
                                    </button>
                                    <span id="${successId}" class="success-message">Copied!</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    html += `<div class="error-message">Error uploading ${file.name}: ${file.error}</div>`;
                }
            });
            statusDiv.innerHTML = html;
        } else {
            statusDiv.innerHTML = `<div class="error-message">Upload failed: ${response.error}</div>`;
        }
    } catch (error) {
        statusDiv.innerHTML = `<div class="error-message">Upload error: ${error.message}</div>`;
    } finally {
        progressBar.style.display = 'none';
        progressText.textContent = '';
        fileInput.value = '';
    }
}
