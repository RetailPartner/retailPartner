// Multi-step verification form logic
document.addEventListener('DOMContentLoaded', async function() {
  // Elements
  const choiceScreen = document.getElementById('verifyChoice');
  const videoScreen = document.getElementById('verifyVideo');
  const formScreen = document.getElementById('verifyForm');
  const successScreen = document.getElementById('verifySuccess');

  const choiceVideo = document.getElementById('choiceVideo');
  const choiceForm = document.getElementById('choiceForm');
  const videoBackBtn = document.getElementById('videoBackBtn');
  const videoSubmitBtn = document.getElementById('videoSubmitBtn');

  let appId = null;
  let capturedPhoto = null;
  let idProofUploaded = false;
  let faceDetected = false;

  // --- Choice screen ---
  choiceVideo.addEventListener('click', () => {
    choiceScreen.classList.add('hidden');
    videoScreen.classList.remove('hidden');
    window.scrollTo(0, 0);
  });

  choiceForm.addEventListener('click', async () => {
    choiceScreen.classList.add('hidden');
    formScreen.classList.remove('hidden');
    window.scrollTo(0, 0);

    // Start application
    const visitorId = sessionStorage.getItem('visitorId');
    try {
      const res = await fetch('/api/application/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId })
      });
      const data = await res.json();
      appId = data.appId;
      sessionStorage.setItem('appId', appId);
    } catch (e) {
      console.error('Failed to start application');
    }
  });

  videoBackBtn.addEventListener('click', () => {
    videoScreen.classList.add('hidden');
    choiceScreen.classList.remove('hidden');
    window.scrollTo(0, 0);
  });

  videoSubmitBtn.addEventListener('click', () => {
    const phone = document.getElementById('videoPhone').value.trim();
    if (!phone || phone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    videoScreen.classList.add('hidden');
    successScreen.classList.remove('hidden');
    window.scrollTo(0, 0);
  });

  // --- Multi-step form ---
  const steps = [1, 2, 3, 4];
  let currentStep = 1;

  function showStep(step) {
    steps.forEach(s => {
      document.getElementById(`step${s}`).classList.toggle('active', s === step);
    });

    // Update progress
    document.getElementById('progressFill').style.width = `${(step / 4) * 100}%`;
    document.querySelectorAll('.progress-step').forEach(el => {
      const s = parseInt(el.dataset.step);
      el.classList.toggle('active', s === step);
      el.classList.toggle('done', s < step);
    });

    currentStep = step;
    window.scrollTo(0, 0);
  }

  function showError(inputId, msg) {
    const input = document.getElementById(inputId);
    input.classList.add('error');
    // Remove existing error msg
    const existing = input.parentElement.querySelector('.error-msg');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'error-msg';
    el.textContent = msg;
    input.parentElement.appendChild(el);
  }

  function clearErrors() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-msg').forEach(el => el.remove());
  }

  async function saveStep(step, data) {
    if (!appId) return;
    try {
      await fetch(`/api/application/${appId}/step/${step}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.error('Failed to save step', step);
    }
  }

  // Step 1 → 2
  document.getElementById('step1Next').addEventListener('click', async () => {
    clearErrors();
    const name = document.getElementById('fullName').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    let valid = true;

    if (!name) { showError('fullName', 'Please enter your name'); valid = false; }
    if (!mobile || mobile.length !== 10 || !/^\d{10}$/.test(mobile)) {
      showError('mobile', 'Please enter a valid 10-digit number');
      valid = false;
    }

    if (!valid) return;
    await saveStep(1, { full_name: name, mobile });
    showStep(2);
  });

  document.getElementById('step1Back').addEventListener('click', () => {
    formScreen.classList.add('hidden');
    choiceScreen.classList.remove('hidden');
    window.scrollTo(0, 0);
  });

  // Step 2 → 3
  document.getElementById('step2Next').addEventListener('click', async () => {
    clearErrors();
    const addr = document.getElementById('homeAddress').value.trim();
    const age = document.getElementById('age').value.trim();
    let valid = true;

    if (!addr) { showError('homeAddress', 'Please enter your address'); valid = false; }
    if (!age || parseInt(age) < 18) { showError('age', 'You must be at least 18 years old'); valid = false; }

    if (!valid) return;
    await saveStep(2, { home_address: addr, age: parseInt(age) });
    showStep(3);
  });

  document.getElementById('step2Back').addEventListener('click', () => showStep(1));

  // Step 3 → 4
  const sellingFromHomeCheckbox = document.getElementById('sellingFromHome');
  const shopAddressGroup = document.getElementById('shopAddressGroup');

  sellingFromHomeCheckbox.addEventListener('change', () => {
    if (sellingFromHomeCheckbox.checked) {
      shopAddressGroup.style.opacity = '0.4';
      shopAddressGroup.querySelector('textarea').disabled = true;
    } else {
      shopAddressGroup.style.opacity = '1';
      shopAddressGroup.querySelector('textarea').disabled = false;
    }
  });

  document.getElementById('step3Next').addEventListener('click', async () => {
    clearErrors();
    const shopName = document.getElementById('shopName').value.trim();
    const shopAddr = document.getElementById('shopAddress').value.trim();
    const fromHome = sellingFromHomeCheckbox.checked;
    let valid = true;

    if (!shopName && !fromHome) { showError('shopName', 'Please enter shop name or check "sell from home"'); valid = false; }
    if (!shopAddr && !fromHome) { showError('shopAddress', 'Please enter shop address'); valid = false; }

    if (!valid) return;
    await saveStep(3, {
      shop_name: shopName || (fromHome ? 'Home Seller' : ''),
      shop_address: fromHome ? 'Home' : shopAddr,
      selling_from_home: fromHome
    });

    // Init camera on step 4
    await Camera.init();
    Camera.startCamera();
    Camera.onFaceDetected = (detected) => { faceDetected = detected; };
    showStep(4);
  });

  document.getElementById('step3Back').addEventListener('click', () => showStep(2));

  // Step 4 - camera
  document.getElementById('captureBtn').addEventListener('click', () => {
    capturedPhoto = Camera.capture();
    if (capturedPhoto) {
      document.getElementById('captureBtn').classList.add('hidden');
      document.getElementById('retakeBtn').classList.remove('hidden');

      // Upload photo
      if (appId) {
        const blob = Camera.dataURLtoBlob(capturedPhoto);
        const formData = new FormData();
        formData.append('file', blob, 'photo.jpg');
        fetch(`/api/upload/photo/${appId}`, { method: 'POST', body: formData })
          .catch(() => {});
      }
    }
  });

  document.getElementById('retakeBtn').addEventListener('click', () => {
    capturedPhoto = null;
    document.getElementById('captureBtn').classList.remove('hidden');
    document.getElementById('retakeBtn').classList.add('hidden');
    Camera.startCamera();
  });

  // Step 4 - ID proof upload
  const idProofInput = document.getElementById('idProofInput');
  const uploadArea = document.getElementById('uploadArea');
  const placeholder = document.getElementById('uploadPlaceholder');
  const preview = document.getElementById('uploadPreview');
  const uploadStatus = document.getElementById('uploadStatus');

  // Update ID type label
  document.querySelectorAll('input[name="idType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const name = radio.value === 'aadhaar' ? 'Aadhaar Card' : 'PAN Card';
      document.getElementById('idTypeName').textContent = name;

      if (appId) {
        fetch(`/api/application/${appId}/id-proof-type`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: radio.value })
        }).catch(() => {});
      }
    });
  });

  uploadArea.addEventListener('click', (e) => {
    if (e.target.id === 'changeIdBtn' || e.target.closest('#changeIdBtn')) {
      // handled below
    } else if (!idProofUploaded) {
      idProofInput.click();
    }
  });

  document.getElementById('changeIdBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    idProofUploaded = false;
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    uploadArea.classList.remove('uploaded');
    idProofInput.value = '';
    idProofInput.click();
  });

  idProofInput.addEventListener('change', async () => {
    const file = idProofInput.files[0];
    if (!file) return;

    // Show uploading status
    placeholder.classList.add('hidden');
    uploadStatus.classList.remove('hidden');

    // Upload immediately
    if (appId) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        await fetch(`/api/upload/id-proof/${appId}`, { method: 'POST', body: formData });

        const idType = document.querySelector('input[name="idType"]:checked').value;
        await fetch(`/api/application/${appId}/id-proof-type`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: idType })
        });
      } catch (e) {
        console.error('Upload failed');
      }
    }

    // Show preview
    uploadStatus.classList.add('hidden');
    preview.classList.remove('hidden');
    document.getElementById('uploadedImg').src = URL.createObjectURL(file);
    uploadArea.classList.add('uploaded');
    idProofUploaded = true;
  });

  // Submit
  document.getElementById('submitBtn').addEventListener('click', async () => {
    clearErrors();
    const tcAccepted = document.getElementById('tcAccepted').checked;

    if (!capturedPhoto) {
      alert('Please take your photo before submitting.');
      return;
    }
    if (!idProofUploaded) {
      alert('Please upload your ID proof before submitting.');
      return;
    }
    if (!tcAccepted) {
      alert('Please accept the Terms & Conditions to continue.');
      return;
    }

    await saveStep(4, { tc_accepted: true });
    Camera.stopCamera();

    formScreen.classList.add('hidden');
    successScreen.classList.remove('hidden');
    window.scrollTo(0, 0);
  });

  document.getElementById('step4Back').addEventListener('click', () => {
    Camera.stopCamera();
    showStep(3);
  });
});
