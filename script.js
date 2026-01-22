/* ========================================
   COMIC MEDIA EDITOR - JavaScript Engine
   Complete Photo/Video Studio with Music
======================================== */

// ========================================
// DOM ELEMENTS
// ========================================

// Media Elements
const webcamEl = document.getElementById('webcam');
const uploadedVideoEl = document.getElementById('uploaded-video');
const uploadedImageEl = document.getElementById('uploaded-image');
const filterCanvas = document.getElementById('filter-canvas');
const captureCanvas = document.getElementById('capture-canvas');
const canvasWrapper = document.getElementById('canvas-wrapper');

// Hype Words
const hypeContainer = document.getElementById('hype-words-container');
const hypeInput = document.getElementById('hype-input');
const addTextBtn = document.getElementById('add-text-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

// Mode Controls
const liveModeBtn = document.getElementById('live-mode-btn');
const editorModeBtn = document.getElementById('editor-mode-btn');
const uploadSection = document.getElementById('upload-section');

// Media Upload
const uploadMediaBtn = document.getElementById('upload-media-btn');
const mediaInput = document.getElementById('media-input');
const uploadedFileInfo = document.getElementById('uploaded-file-info');
const uploadedFileName = document.getElementById('uploaded-file-name');
const removeMediaBtn = document.getElementById('remove-media-btn');

// Music Controls
const uploadMusicBtn = document.getElementById('upload-music-btn');
const musicInput = document.getElementById('music-input');
const musicPlayer = document.getElementById('music-player');
const musicName = document.getElementById('music-name');
const playPauseBtn = document.getElementById('play-pause-btn');
const removeMusicBtn = document.getElementById('remove-music-btn');

// Capture Controls
const photoBtn = document.getElementById('photo-btn');
const videoBtn = document.getElementById('video-btn');
const recordingIndicator = document.getElementById('recording-indicator');

// Popups
const welcomePopup = document.getElementById('welcome-popup');
const welcomeStartBtn = document.getElementById('welcome-start');
const successPopup = document.getElementById('success-popup');
const closePopupBtn = document.getElementById('close-popup');
const previewImage = document.getElementById('preview-image');
const previewVideo = document.getElementById('preview-video');
const processingOverlay = document.getElementById('processing-overlay');

// Share Buttons
const shareWhatsappBtn = document.getElementById('share-whatsapp');
const shareInstagramBtn = document.getElementById('share-instagram');
const downloadAgainBtn = document.getElementById('download-again');
const instagramHint = document.getElementById('instagram-hint');
const whatsappQuickBtn = document.getElementById('whatsapp-quick');

// Quick Effects
const effectBtns = document.querySelectorAll('.effect-btn');

// ========================================
// STATE
// ========================================
let currentMode = 'live'; // 'live' or 'editor'
let uploadedMedia = null;
let uploadedMediaType = null; // 'image' or 'video'
let audioElement = null;
let musicFile = null;
let currentBlob = null;
let currentBlobType = 'image'; // 'image' or 'video'
let stream = null;
let isRecording = false;
let mediaRecorder = null;

const websiteUrl = 'https://hypeman-studio.app';
const wordStyles = ['pow', 'boom', 'zap', 'bubble'];

// Font system
const fonts = ['Bangers', 'Impact', 'Bebas Neue'];
let currentFontIndex = 0;

// Filter system
const filters = {
    'default': 'contrast(1.4) saturate(0.3) brightness(1.1)',
    'indie-comic': 'grayscale(100%) contrast(1.4) brightness(1.1)',
    'pop-art': 'saturate(2) contrast(1.3) brightness(1.1)',
    'classic-noir': 'grayscale(100%) contrast(1.8) brightness(0.9)'
};
let currentFilter = 'default';

// ========================================
// INITIALIZATION
// ========================================
async function init() {
    console.log('🚀 Comic Media Editor initializing...');

    initEventListeners();
    checkFirstVisit();
    await initCamera();

    console.log('✅ Comic Media Editor ready!');
}

// ========================================
// WELCOME POPUP
// ========================================
function checkFirstVisit() {
    const hasVisited = localStorage.getItem('comic-editor-visited');
    if (!hasVisited) {
        showWelcomePopup();
    }
}

function showWelcomePopup() {
    welcomePopup.classList.remove('hidden');
}

function hideWelcomePopup() {
    welcomePopup.classList.add('hidden');
    localStorage.setItem('comic-editor-visited', 'true');
}

// ========================================
// CAMERA INITIALIZATION
// ========================================
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        webcamEl.srcObject = stream;

        // Wait for metadata to get accurate dimensions
        webcamEl.onloadedmetadata = () => {
            filterCanvas.width = webcamEl.videoWidth || 1920;
            filterCanvas.height = webcamEl.videoHeight || 1080;

            // Update canvas wrapper aspect ratio to match camera
            const aspectRatio = webcamEl.videoWidth / webcamEl.videoHeight;
            canvasWrapper.style.aspectRatio = `${aspectRatio}`;
        };

        await webcamEl.play();
        console.log('📸 Camera initialized successfully!');

    } catch (error) {
        console.error('Camera error:', error);
        showCameraError();
    }
}

function showCameraError() {
    canvasWrapper.innerHTML = `
        <div class="camera-error">
            <h2>📷 Camera Access Needed</h2>
            <p>Please allow camera access to use Live Mode.<br>
            Or switch to Editor Mode to upload your photos/videos!</p>
        </div>
    `;
}

function showWebcam() {
    webcamEl.classList.remove('hidden');
    uploadedVideoEl.classList.add('hidden');
    uploadedImageEl.classList.add('hidden');

    if (uploadedVideoEl.src) {
        uploadedVideoEl.pause();
    }
}

// ========================================
// MODE MANAGER
// ========================================
function setMode(mode) {
    currentMode = mode;

    // Update UI
    liveModeBtn.classList.toggle('active', mode === 'live');
    editorModeBtn.classList.toggle('active', mode === 'editor');

    // Toggle upload section
    uploadSection.classList.toggle('hidden', mode === 'live');

    // Switch media source
    if (mode === 'live') {
        showWebcam();
        stopLivePreviewAnimation();
    } else if (uploadedMedia) {
        showUploadedMedia();
    }
}

// ========================================
// MEDIA UPLOAD HANDLER
// ========================================
function handleMediaUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showProcessingOverlay();

    const url = URL.createObjectURL(file);
    uploadedMediaType = file.type.startsWith('video') ? 'video' : 'image';
    uploadedMedia = url;

    // Update file info display
    uploadedFileName.textContent = file.name;
    uploadedFileInfo.classList.remove('hidden');

    if (uploadedMediaType === 'video') {
        uploadedVideoEl.src = url;
        uploadedVideoEl.load();
        uploadedVideoEl.onloadeddata = () => {
            showUploadedMedia();
            hideProcessingOverlay();
        };
    } else {
        uploadedImageEl.src = url;
        uploadedImageEl.onload = () => {
            showUploadedMedia();
            hideProcessingOverlay();
            startLivePreviewAnimation();
        };
    }
}

function showUploadedMedia() {
    webcamEl.classList.add('hidden');

    if (uploadedMediaType === 'video') {
        uploadedVideoEl.classList.remove('hidden');
        uploadedImageEl.classList.add('hidden');
        uploadedVideoEl.play();
        stopLivePreviewAnimation();
    } else {
        uploadedImageEl.classList.remove('hidden');
        uploadedVideoEl.classList.add('hidden');
        startLivePreviewAnimation();
    }
}

function removeUploadedMedia() {
    if (uploadedMedia) {
        URL.revokeObjectURL(uploadedMedia);
    }
    uploadedMedia = null;
    uploadedMediaType = null;

    uploadedVideoEl.src = '';
    uploadedImageEl.src = '';
    uploadedFileInfo.classList.add('hidden');
    mediaInput.value = '';

    webcamEl.classList.remove('hidden');
    uploadedVideoEl.classList.add('hidden');
    uploadedImageEl.classList.add('hidden');

    stopLivePreviewAnimation();
}

// ========================================
// MUSIC MANAGER
// ========================================
function handleMusicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    musicFile = file;
    audioElement = new Audio(URL.createObjectURL(file));
    audioElement.loop = true;

    // Truncate long names
    const displayName = file.name.length > 20
        ? file.name.substring(0, 17) + '...'
        : file.name;
    musicName.textContent = displayName;
    musicPlayer.classList.remove('hidden');
}

function toggleMusicPlayback() {
    if (!audioElement) return;

    if (audioElement.paused) {
        audioElement.play();
        playPauseBtn.textContent = '⏸️';
    } else {
        audioElement.pause();
        playPauseBtn.textContent = '▶️';
    }
}

function removeMusic() {
    if (audioElement) {
        audioElement.pause();
        URL.revokeObjectURL(audioElement.src);
        audioElement = null;
    }
    musicFile = null;
    musicPlayer.classList.add('hidden');
    musicInput.value = '';
    playPauseBtn.textContent = '▶️';
}

// ========================================
// HYPE WORDS SYSTEM
// ========================================
function spawnHypeWord(text) {
    const word = document.createElement('div');
    word.className = 'hype-word';

    // Add random style
    const randomStyle = wordStyles[Math.floor(Math.random() * wordStyles.length)];
    word.classList.add(randomStyle);

    // Random position (avoiding edges)
    const x = 10 + Math.random() * 70;
    const y = 10 + Math.random() * 60;

    // Random rotation
    const rotation = -20 + Math.random() * 40;

    word.style.left = `${x}%`;
    word.style.top = `${y}%`;
    word.style.setProperty('--rotation', `${rotation}deg`);

    // Create text span with current font
    const textSpan = document.createElement('span');
    textSpan.className = 'hype-text';
    textSpan.textContent = text;
    textSpan.style.fontFamily = `'${getCurrentFont()}', cursive`;
    word.appendChild(textSpan);

    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-word-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove this word';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        word.classList.add('removing');
        setTimeout(() => word.remove(), 300);
    });
    word.appendChild(removeBtn);

    // Add starburst for special effects
    if (Math.random() > 0.5 && !word.classList.contains('bubble')) {
        const starburst = document.createElement('div');
        starburst.className = 'starburst';
        word.insertBefore(starburst, textSpan);
    }

    // Apply pulse effect for static images
    if (currentMode === 'editor' && uploadedMediaType === 'image') {
        word.classList.add('pulse-effect');
    }

    makeDraggable(word);
    hypeContainer.appendChild(word);
}

function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
        if (e.target.classList.contains('remove-word-btn')) return;

        isDragging = true;
        element.classList.add('dragging');

        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;

        const rect = element.getBoundingClientRect();
        const parentRect = hypeContainer.getBoundingClientRect();
        initialLeft = rect.left - parentRect.left;
        initialTop = rect.top - parentRect.top;

        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);

        e.preventDefault();
    }

    function drag(e) {
        if (!isDragging) return;

        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        const parentRect = hypeContainer.getBoundingClientRect();
        const newLeft = ((initialLeft + dx) / parentRect.width) * 100;
        const newTop = ((initialTop + dy) / parentRect.height) * 100;

        element.style.left = `${Math.max(0, Math.min(90, newLeft))}%`;
        element.style.top = `${Math.max(0, Math.min(80, newTop))}%`;

        e.preventDefault();
    }

    function stopDrag() {
        isDragging = false;
        element.classList.remove('dragging');
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);
    }
}

function handleHypeInput() {
    const text = hypeInput.value.trim();
    if (text) {
        spawnHypeWord(text);
        hypeInput.value = '';
    }
}

function clearAllHypeWords() {
    const words = hypeContainer.querySelectorAll('.hype-word');
    words.forEach((word, index) => {
        setTimeout(() => {
            word.classList.add('removing');
            setTimeout(() => word.remove(), 300);
        }, index * 50);
    });
}

// ========================================
// FILTER SYSTEM
// ========================================
function setFilter(filterName) {
    currentFilter = filterName;

    // Update filter buttons UI
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filterName);
    });

    // Apply filter class to media elements for live preview
    const mediaElements = [webcamEl, uploadedVideoEl, uploadedImageEl];
    const filterClasses = ['filter-default', 'filter-indie-comic', 'filter-pop-art', 'filter-classic-noir'];

    mediaElements.forEach(el => {
        filterClasses.forEach(cls => el.classList.remove(cls));
        el.classList.add(`filter-${filterName}`);
    });

    console.log(`🎨 Filter applied: ${filterName}`);
}

// ========================================
// FONT SYSTEM
// ========================================
function cycleFont() {
    currentFontIndex = (currentFontIndex + 1) % fonts.length;
    const newFont = fonts[currentFontIndex];

    // Update button display
    const fontNameEl = document.getElementById('current-font-name');
    const fontPreviewEl = document.querySelector('.font-preview');
    if (fontNameEl) {
        fontNameEl.textContent = newFont;
        fontNameEl.style.fontFamily = `'${newFont}', cursive`;
    }
    if (fontPreviewEl) {
        fontPreviewEl.style.fontFamily = `'${newFont}', cursive`;
    }

    // Update existing hype words
    const words = hypeContainer.querySelectorAll('.hype-word .hype-text');
    words.forEach(word => {
        word.style.fontFamily = `'${newFont}', cursive`;
    });

    console.log(`🔤 Font changed to: ${newFont}`);
}

function getCurrentFont() {
    return fonts[currentFontIndex];
}

// ========================================
// MOBILE INPUT HANDLING
// ========================================
function initMobileInputHandling() {
    if (hypeInput) {
        hypeInput.addEventListener('focus', () => {
            // Scroll input into view on mobile
            setTimeout(() => {
                hypeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });

        // Handle virtual keyboard on mobile
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                if (document.activeElement === hypeInput) {
                    hypeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }
    }
}

// ========================================
// LIVE PREVIEW ANIMATION
// ========================================
function startLivePreviewAnimation() {
    const words = hypeContainer.querySelectorAll('.hype-word');
    words.forEach(word => word.classList.add('pulse-effect'));
}

function stopLivePreviewAnimation() {
    const words = hypeContainer.querySelectorAll('.hype-word');
    words.forEach(word => word.classList.remove('pulse-effect'));
}

// ========================================
// PROCESSING OVERLAY
// ========================================
function showProcessingOverlay() {
    processingOverlay.classList.remove('hidden');
}

function hideProcessingOverlay() {
    processingOverlay.classList.add('hidden');
}

// ========================================
// PHOTO CAPTURE
// ========================================
async function capturePhoto() {
    photoBtn.disabled = true;
    photoBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Capturing...</span>';

    // Flash effect
    createFlashEffect();

    try {
        const blob = await renderToBlob();
        currentBlob = blob;
        currentBlobType = 'image';

        // Auto download
        downloadFile(blob, 'comic-photo.png');

        // Show success popup
        showSuccessPopup(blob, 'image');

    } catch (error) {
        console.error('Capture error:', error);
        alert('Failed to capture. Please try again!');
    }

    photoBtn.disabled = false;
    photoBtn.innerHTML = '<span class="btn-icon">📸</span><span class="btn-text">Take Photo</span>';
}

async function renderToBlob() {
    const ctx = captureCanvas.getContext('2d', { willReadFrequently: true });
    const containerRect = canvasWrapper.getBoundingClientRect();

    // Use device pixel ratio for HD quality (capped at 3x for performance)
    const scale = Math.min(window.devicePixelRatio || 1, 3);
    captureCanvas.width = containerRect.width * scale;
    captureCanvas.height = containerRect.height * scale;
    ctx.scale(scale, scale);

    // Get the active media element
    let mediaElement;
    if (currentMode === 'live') {
        mediaElement = webcamEl;
    } else if (uploadedMediaType === 'video') {
        mediaElement = uploadedVideoEl;
    } else {
        mediaElement = uploadedImageEl;
    }

    // Calculate dimensions to maintain aspect ratio (contain fit)
    const mediaWidth = mediaElement.videoWidth || mediaElement.naturalWidth || containerRect.width;
    const mediaHeight = mediaElement.videoHeight || mediaElement.naturalHeight || containerRect.height;
    const mediaAspect = mediaWidth / mediaHeight;
    const containerAspect = containerRect.width / containerRect.height;

    let drawWidth, drawHeight, drawX, drawY;
    if (mediaAspect > containerAspect) {
        // Media is wider - fit to width
        drawWidth = containerRect.width;
        drawHeight = containerRect.width / mediaAspect;
        drawX = 0;
        drawY = (containerRect.height - drawHeight) / 2;
    } else {
        // Media is taller - fit to height
        drawHeight = containerRect.height;
        drawWidth = containerRect.height * mediaAspect;
        drawX = (containerRect.width - drawWidth) / 2;
        drawY = 0;
    }

    // Fill background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, containerRect.width, containerRect.height);

    // Draw media (mirrored for webcam) with current filter
    ctx.save();
    if (currentMode === 'live') {
        ctx.translate(containerRect.width, 0);
        ctx.scale(-1, 1);
        drawX = containerRect.width - drawX - drawWidth;
    }
    ctx.filter = filters[currentFilter];
    ctx.drawImage(mediaElement, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();

    // Draw overlays
    drawHalftoneOverlay(ctx, containerRect.width, containerRect.height);
    drawVignette(ctx, containerRect.width, containerRect.height);
    await drawHypeWords(ctx, containerRect);

    return new Promise((resolve) => {
        captureCanvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/png', 1.0);
    });
}

function drawHalftoneOverlay(ctx, width, height) {
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#000';

    const dotSize = 2;
    const spacing = 4;

    for (let x = 0; x < width; x += spacing) {
        for (let y = 0; y < height; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

function drawVignette(ctx, width, height) {
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) / 1.5
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, 'transparent');
    gradient.addColorStop(1, 'rgba(0,0,0,0.6)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

async function drawHypeWords(ctx, containerRect) {
    const words = hypeContainer.querySelectorAll('.hype-word');

    words.forEach((word) => {
        const wordRect = word.getBoundingClientRect();
        const style = window.getComputedStyle(word);
        const textSpan = word.querySelector('.hype-text');
        const text = textSpan ? textSpan.textContent : word.textContent;

        const x = wordRect.left - containerRect.left + wordRect.width / 2;
        const y = wordRect.top - containerRect.top + wordRect.height / 2;

        const transform = style.transform;
        let rotation = 0;
        if (transform !== 'none') {
            const values = transform.match(/matrix\(([^)]+)\)/);
            if (values) {
                const parts = values[1].split(',').map(Number);
                rotation = Math.atan2(parts[1], parts[0]);
            }
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Use the current font for rendering
        const fontFamily = textSpan ? textSpan.style.fontFamily || `'${getCurrentFont()}', cursive` : `'${getCurrentFont()}', cursive`;
        ctx.font = `bold ${parseInt(style.fontSize)}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw stroke
        ctx.strokeStyle = '#0a0a0f';
        ctx.lineWidth = 4;
        ctx.strokeText(text, 0, 0);

        // Color based on class
        if (word.classList.contains('pow')) {
            ctx.fillStyle = '#f0f000';
        } else if (word.classList.contains('boom')) {
            ctx.fillStyle = '#00f0ff';
        } else if (word.classList.contains('zap')) {
            ctx.fillStyle = '#ff00aa';
        } else {
            ctx.fillStyle = '#ffffff';
        }

        ctx.fillText(text, 0, 0);
        ctx.restore();
    });
}

function createFlashEffect() {
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        inset: 0;
        background: white;
        z-index: 999;
        animation: flash 0.3s ease-out forwards;
    `;
    document.body.appendChild(flash);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes flash {
            0% { opacity: 0.8; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
        flash.remove();
        style.remove();
    }, 300);
}

// ========================================
// VIDEO RECORDING
// ========================================
async function createVideo() {
    if (isRecording) return;

    isRecording = true;
    videoBtn.disabled = true;
    videoBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Recording...</span><span class="btn-duration">5s</span>';
    recordingIndicator.classList.remove('hidden');

    const duration = 5000; // 5 seconds
    const fps = 30;
    const chunks = [];

    // Setup canvas stream
    const ctx = captureCanvas.getContext('2d');
    const containerRect = canvasWrapper.getBoundingClientRect();

    captureCanvas.width = containerRect.width;
    captureCanvas.height = containerRect.height;

    const canvasStream = captureCanvas.captureStream(fps);

    // Add audio if available
    if (audioElement) {
        try {
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaElementSource(audioElement);
            const dest = audioCtx.createMediaStreamDestination();
            source.connect(dest);
            source.connect(audioCtx.destination);

            canvasStream.addTrack(dest.stream.getAudioTracks()[0]);
            audioElement.currentTime = 0;
            audioElement.play();
        } catch (e) {
            console.log('Audio context issue:', e);
        }
    }

    // Setup recorder
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

    mediaRecorder = new MediaRecorder(canvasStream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunks.push(e.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        currentBlob = blob;
        currentBlobType = 'video';

        downloadFile(blob, 'comic-video.webm');
        showSuccessPopup(blob, 'video');

        if (audioElement) {
            audioElement.pause();
        }

        isRecording = false;
        videoBtn.disabled = false;
        videoBtn.innerHTML = '<span class="btn-icon">🎬</span><span class="btn-text">Create Video</span><span class="btn-duration">5s</span>';
        recordingIndicator.classList.add('hidden');
    };

    // Start recording
    mediaRecorder.start();

    // Render frames
    const startTime = performance.now();

    function renderFrame() {
        if (!isRecording) return;

        // Get the active media element
        let mediaElement;
        if (currentMode === 'live') {
            mediaElement = webcamEl;
        } else if (uploadedMediaType === 'video') {
            mediaElement = uploadedVideoEl;
        } else {
            mediaElement = uploadedImageEl;
        }

        // Clear and draw
        ctx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);

        ctx.save();
        if (currentMode === 'live') {
            ctx.translate(containerRect.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.filter = filters[currentFilter];
        ctx.drawImage(mediaElement, 0, 0, containerRect.width, containerRect.height);
        ctx.restore();

        // Draw overlays
        drawHalftoneOverlay(ctx, containerRect.width, containerRect.height);
        drawVignette(ctx, containerRect.width, containerRect.height);
        drawHypeWords(ctx, containerRect);

        // Check if we should continue
        if (performance.now() - startTime < duration) {
            requestAnimationFrame(renderFrame);
        } else {
            mediaRecorder.stop();
        }
    }

    renderFrame();
}

// ========================================
// SUCCESS POPUP
// ========================================
function showSuccessPopup(blob, type) {
    const url = URL.createObjectURL(blob);

    if (type === 'video') {
        previewImage.classList.add('hidden');
        previewVideo.classList.remove('hidden');
        previewVideo.src = url;
    } else {
        previewVideo.classList.add('hidden');
        previewImage.classList.remove('hidden');
        previewImage.src = url;
    }

    instagramHint.classList.add('hidden');
    successPopup.classList.remove('hidden');
}

function hideSuccessPopup() {
    successPopup.classList.add('hidden');
    instagramHint.classList.add('hidden');
}

// ========================================
// DOWNLOAD & SHARE
// ========================================
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function shareToWhatsApp() {
    if (navigator.share && currentBlob) {
        try {
            const extension = currentBlobType === 'video' ? 'webm' : 'png';
            const mimeType = currentBlobType === 'video' ? 'video/webm' : 'image/png';
            const file = new File([currentBlob], `comic-${currentBlobType}.${extension}`, { type: mimeType });

            await navigator.share({
                title: 'My Comic Masterpiece! 🔥',
                text: 'Check out my epic comic-book creation from Hype-Man Studio!',
                files: [file]
            });

            console.log('Shared successfully!');
        } catch (error) {
            if (error.name !== 'AbortError') {
                fallbackWhatsAppShare();
            }
        }
    } else {
        fallbackWhatsAppShare();
    }
}

function fallbackWhatsAppShare() {
    const message = encodeURIComponent(`Check out my Comic creation! 🔥💥 ${websiteUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
}

function handleInstagramShare() {
    if (currentBlob) {
        const extension = currentBlobType === 'video' ? 'webm' : 'png';
        downloadFile(currentBlob, `comic-${currentBlobType}.${extension}`);
    }

    // Copy link to clipboard
    navigator.clipboard.writeText(websiteUrl).then(() => {
        instagramHint.classList.remove('hidden');
    }).catch(() => {
        instagramHint.innerHTML = `✅ Saved! Add our link to your Instagram Story: <strong>${websiteUrl}</strong>`;
        instagramHint.classList.remove('hidden');
    });
}

function downloadAgain() {
    if (currentBlob) {
        const extension = currentBlobType === 'video' ? 'webm' : 'png';
        downloadFile(currentBlob, `comic-${currentBlobType}.${extension}`);
    }
}

// ========================================
// EVENT LISTENERS
// ========================================
function initEventListeners() {
    // Welcome popup
    if (welcomeStartBtn) {
        welcomeStartBtn.addEventListener('click', hideWelcomePopup);
    }

    // Mode toggle
    liveModeBtn.addEventListener('click', () => setMode('live'));
    editorModeBtn.addEventListener('click', () => setMode('editor'));

    // Media upload
    uploadMediaBtn.addEventListener('click', () => mediaInput.click());
    mediaInput.addEventListener('change', handleMediaUpload);
    if (removeMediaBtn) {
        removeMediaBtn.addEventListener('click', removeUploadedMedia);
    }

    // Music upload
    uploadMusicBtn.addEventListener('click', () => musicInput.click());
    musicInput.addEventListener('change', handleMusicUpload);
    playPauseBtn.addEventListener('click', toggleMusicPlayback);
    removeMusicBtn.addEventListener('click', removeMusic);

    // Hype text
    addTextBtn.addEventListener('click', handleHypeInput);
    hypeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleHypeInput();
        }
    });

    // Quick effects
    effectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.dataset.text;
            spawnHypeWord(text);
        });
    });

    // Clear all
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllHypeWords);
    }

    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filterName = btn.dataset.filter;
            setFilter(filterName);
        });
    });

    // Font cycle button
    const fontCycleBtn = document.getElementById('font-cycle-btn');
    if (fontCycleBtn) {
        fontCycleBtn.addEventListener('click', cycleFont);
    }

    // Initialize mobile input handling
    initMobileInputHandling();

    // Capture
    photoBtn.addEventListener('click', capturePhoto);
    videoBtn.addEventListener('click', createVideo);

    // Success popup
    closePopupBtn.addEventListener('click', hideSuccessPopup);
    successPopup.addEventListener('click', (e) => {
        if (e.target === successPopup) {
            hideSuccessPopup();
        }
    });

    // Share buttons
    shareWhatsappBtn.addEventListener('click', shareToWhatsApp);
    shareInstagramBtn.addEventListener('click', handleInstagramShare);
    downloadAgainBtn.addEventListener('click', downloadAgain);

    // Quick WhatsApp share
    if (whatsappQuickBtn) {
        whatsappQuickBtn.addEventListener('click', () => {
            const message = encodeURIComponent(`Check out Hype-Man Studio! 🔥💥 ${websiteUrl}`);
            window.open(`https://wa.me/?text=${message}`, '_blank');
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideSuccessPopup();
            hideWelcomePopup();
        }
        // Spacebar to capture (when not typing)
        if (e.key === ' ' && document.activeElement !== hypeInput &&
            welcomePopup.classList.contains('hidden') && !isRecording) {
            e.preventDefault();
            capturePhoto();
        }
    });
}

// ========================================
// START THE APP
// ========================================
init();
