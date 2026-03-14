// Camera capture with face detection using face-api.js
const Camera = {
  video: null,
  canvas: null,
  stream: null,
  faceDetectionInterval: null,
  isModelLoaded: false,
  onFaceDetected: null,

  async init() {
    this.video = document.getElementById('cameraPreview');
    this.canvas = document.getElementById('cameraCanvas');

    // Load face detection model from CDN
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights');
      this.isModelLoaded = true;
    } catch (err) {
      console.warn('Face detection model failed to load:', err);
    }
  },

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } }
      });
      this.video.srcObject = this.stream;
      this.video.classList.remove('hidden');

      const capturedImg = document.getElementById('capturedImg');
      capturedImg.classList.add('hidden');

      // Start face detection loop
      if (this.isModelLoaded) {
        this.startFaceDetection();
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Could not access camera. Please allow camera permission and try again.');
    }
  },

  startFaceDetection() {
    const circle = document.getElementById('cameraCircle');
    const status = document.getElementById('faceStatus');

    this.faceDetectionInterval = setInterval(async () => {
      if (!this.video || this.video.paused || this.video.ended) return;

      try {
        const detections = await faceapi.detectAllFaces(
          this.video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
        );

        if (detections.length > 0) {
          circle.classList.add('face-detected');
          circle.classList.remove('no-face');
          status.textContent = 'Face detected ✓';
          if (this.onFaceDetected) this.onFaceDetected(true);
        } else {
          circle.classList.remove('face-detected');
          circle.classList.add('no-face');
          status.textContent = 'No face detected';
          if (this.onFaceDetected) this.onFaceDetected(false);
        }
      } catch (e) {
        // silently continue
      }
    }, 500);
  },

  capture() {
    if (!this.video || !this.stream) return null;

    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    const ctx = this.canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0);

    // Show captured image
    const capturedImg = document.getElementById('capturedImg');
    capturedImg.src = this.canvas.toDataURL('image/jpeg', 0.85);
    capturedImg.classList.remove('hidden');
    this.video.classList.add('hidden');

    // Stop detection & camera
    this.stopFaceDetection();

    const circle = document.getElementById('cameraCircle');
    circle.classList.remove('no-face');
    circle.classList.add('face-detected');
    document.getElementById('faceStatus').textContent = 'Photo captured ✓';

    return this.canvas.toDataURL('image/jpeg', 0.85);
  },

  stopFaceDetection() {
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
      this.faceDetectionInterval = null;
    }
  },

  stopCamera() {
    this.stopFaceDetection();
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  },

  dataURLtoBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bytes = atob(parts[1]);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
};
