import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const loader = document.getElementById('loader');
const statusText = document.getElementById('status-text');
const previewGrid = document.getElementById('preview-grid');
const originalImg = document.getElementById('original-img');
const processedImg = document.getElementById('processed-img');
const processedWrapper = document.getElementById('processed-wrapper');
const bgControls = document.getElementById('bg-controls');
const bgColorPicker = document.getElementById('bg-color-picker');
const presetBtns = document.querySelectorAll('.preset-btn');
const formatSelect = document.getElementById('format-select');
const downloadBtn = document.getElementById('download-btn');

let rawProcessedBlob = null; // Stores original transparent result from @imgly
let activeColor = 'transparent';

// Drag & Drop event listeners
dropZone.addEventListener('click', () => fileInput.click());

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

  const originalUrl = URL.createObjectURL(file);
  originalImg.src = originalUrl;

  loader.style.display = 'block';
  previewGrid.style.display = 'none';
  bgControls.style.display = 'none';
  downloadBtn.style.display = 'none';
  statusText.innerText = 'Downloading model & processing image locally...';

  try {
    rawProcessedBlob = await removeBackground(file, {
      progress: (key, current, total) => {
        const percent = Math.round((current / total) * 100);
        if (!isNaN(percent)) {
          statusText.innerText = `Processing: ${percent}%`;
        }
      }
    });

    // Reset controls state
    activeColor = 'transparent';
    bgColorPicker.value = '#ffffff';
    formatSelect.value = 'image/png';

    updatePreview();

    previewGrid.style.display = 'grid';
    bgControls.style.display = 'flex';
    downloadBtn.style.display = 'inline-flex';
  } catch (error) {
    console.error('Background removal failed:', error);
    alert('Failed to remove background. See console for details.');
  } finally {
    loader.style.display = 'none';
  }
}

// Background color change handlers
bgColorPicker.addEventListener('input', (e) => {
  activeColor = e.target.value;
  updatePreview();
});

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    activeColor = btn.dataset.color;
    if (activeColor !== 'transparent') {
      bgColorPicker.value = activeColor;
    }
    updatePreview();
  });
});

// Update image element and wrapper styling for live feedback
function updatePreview() {
  if (!rawProcessedBlob) return;

  const url = URL.createObjectURL(rawProcessedBlob);
  processedImg.src = url;

  if (activeColor === 'transparent') {
    processedWrapper.style.backgroundColor = 'transparent';
    processedWrapper.style.backgroundImage = 'radial-gradient(#ccc 1px, transparent 1px)';
    processedWrapper.style.backgroundSize = '12px 12px';
  } else {
    processedWrapper.style.backgroundImage = 'none';
    processedWrapper.style.backgroundColor = activeColor;
  }
}

// Render composite canvas to generate output file
function generateCompositeCanvas() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = URL.createObjectURL(rawProcessedBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      // Fill solid background if a color is selected (or if JPEG is chosen)
      const selectedFormat = formatSelect.value;
      const isJpeg = selectedFormat === 'image/jpeg';

      if (activeColor !== 'transparent' || isJpeg) {
        ctx.fillStyle = activeColor === 'transparent' ? '#ffffff' : activeColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw transparent cutout on top
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
  });
}

// Export handler
downloadBtn.addEventListener('click', async () => {
  if (!rawProcessedBlob) return;

  const canvas = await generateCompositeCanvas();
  const format = formatSelect.value;
  const extension = format === 'image/jpeg' ? 'jpg' : 'png';

  canvas.toBlob((blob) => {
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `processed-image.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  }, format, 0.92);
});