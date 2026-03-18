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

  // Try browser geolocation first (most accurate)
  const geoPromise = new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          data.browser_geo_lat = pos.coords.latitude;
          data.browser_geo_lng = pos.coords.longitude;
          resolve();
        },
        () => resolve(), // silently fail
        { timeout: 5000 }
      );
    } else {
      resolve();
    }
  });

  // Get IP and geo data from ip-api.com (more reliable & accurate than ipapi.co)
  const ipPromise = fetch('http://ip-api.com/json/?fields=status,message,query,city,regionName,country,lat,lon,isp,timezone')
    .then(r => r.json())
    .then(geo => {
      if (geo.status === 'success') {
        data.ip = geo.query;
        data.city = geo.city;
        data.region = geo.regionName;
        data.country = geo.country;
        data.latitude = geo.lat;
        data.longitude = geo.lon;
        data.isp = geo.isp;
        // timezone from IP (fallback if browser timezone is missing)
        if (!data.timezone) data.timezone = geo.timezone;
      }
    })
    .catch(() => {
      // If ip-api fails, try ipapi.co as fallback
      return fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(geo => {
          data.ip = geo.ip;
          data.city = geo.city;
          data.region = geo.region;
          data.country = geo.country_name;
          data.latitude = geo.latitude;
          data.longitude = geo.longitude;
          data.isp = geo.org;
        })
        .catch(() => {});
    });

  // Wait for both geolocation and IP lookup before sending
  Promise.all([geoPromise, ipPromise]).then(() => {
    sendData(data);
  });

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
