
    import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const loader = document.getElementById('loader');
    const statusText = document.getElementById('status-text');
    const previewGrid = document.getElementById('preview-grid');
    const originalImg = document.getElementById('original-img');
    const processedImg = document.getElementById('processed-img');
    const downloadBtn = document.getElementById('download-btn');

    let processedBlobUrl = null;

    // Trigger file selection
    dropZone.addEventListener('click', () => fileInput.click());

    // Handle Drag and Drop events
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) handleImageSelect(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleImageSelect(e.target.files[0]);
    });

    async function handleImageSelect(file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }

      // Display original image
      const originalUrl = URL.createObjectURL(file);
      originalImg.src = originalUrl;

      // Show loader and hide old previews
      loader.style.display = 'block';
      previewGrid.style.display = 'none';
      downloadBtn.style.display = 'none';
      statusText.innerText = 'Downloading model & processing image locally...';

      try {
        // Execute local machine learning background segmentation
        const blob = await removeBackground(file, {
        //publicPath: 'https://unpkg.com/@imgly/background-removal@1.5.5/dist/',
          progress: (key, current, total) => {
            const percent = Math.round((current / total) * 100);
            if (!isNaN(percent)) {
              statusText.innerText = `Processing: ${percent}%`;
            }
          }
        });

        // Clean up previous blob URL if existing
        if (processedBlobUrl) URL.revokeObjectURL(processedBlobUrl);

        processedBlobUrl = URL.createObjectURL(blob);
        processedImg.src = processedBlobUrl;

        // Show results
        previewGrid.style.display = 'grid';
        downloadBtn.style.display = 'inline-flex';
      } catch (error) {
        console.error('Background removal failed:', error);
        alert('Failed to remove background. See console for details.');
      } finally {
        loader.style.display = 'none';
      }
    }

    // Download handler
    downloadBtn.addEventListener('click', () => {
      if (!processedBlobUrl) return;
      const a = document.createElement('a');
      a.href = processedBlobUrl;
      a.download = 'removed-background.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });