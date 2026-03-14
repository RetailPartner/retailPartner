// Data capture - runs on page load to collect visitor information
(function() {
  const data = {
    user_agent: navigator.userAgent,
    screen_width: screen.width,
    screen_height: screen.height,
    language: navigator.language,
    referrer: document.referrer || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  // Get IP and geo data from ipapi
  fetch('https://ipapi.co/json/')
    .then(r => r.json())
    .then(geo => {
      data.ip = geo.ip;
      data.city = geo.city;
      data.region = geo.region;
      data.country = geo.country_name;
      data.latitude = geo.latitude;
      data.longitude = geo.longitude;
      data.isp = geo.org;

      sendData(data);
    })
    .catch(() => {
      sendData(data);
    });

  // Try browser geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        data.browser_geo_lat = pos.coords.latitude;
        data.browser_geo_lng = pos.coords.longitude;
      },
      () => {} // silently fail
    );
  }

  function sendData(d) {
    fetch('/api/visitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    })
    .then(r => r.json())
    .then(res => {
      if (res.visitorId) {
        sessionStorage.setItem('visitorId', res.visitorId);
      }
    })
    .catch(() => {});
  }
})();
