(function() {
  window.MapAppData = window.MapAppData || {};

  window.MapAppData.borderWall = {
    name: 'Borderlands Wall',
    heightMeters: 2000,
    baseHeightMeters: 100,
    widthMeters: 8000,
    capWidth: 10,
    capHeightOffset: 50,
    material: {
      color: 'var(--border-wall-color, #f97316)',
      face: 'var(--border-wall-face, #ff6a3d)',
      top: 'var(--border-wall-top, #fef3c7)',
      glow: 'var(--border-wall-glow, #ffd166)',
      outline: 'var(--border-wall-outline, #7a3f00)'
    },
    positions: [
      { lat: 32.5343, lon: -117.1260 },
      { lat: 32.7186, lon: -114.7214 },
      { lat: 32.3550, lon: -113.3050 },
      { lat: 31.7830, lon: -112.2230 },
      { lat: 31.3340, lon: -111.0740 },
      { lat: 31.3340, lon: -109.0500 },
      { lat: 31.7830, lon: -108.2000 },
      { lat: 31.7500, lon: -106.5300 },
      { lat: 31.3200, lon: -105.0000 },
      { lat: 30.6500, lon: -104.4500 },
      { lat: 29.8000, lon: -103.1000 },
      { lat: 29.3000, lon: -102.0500 },
      { lat: 28.8000, lon: -100.3000 },
      { lat: 27.6000, lon: -99.0500 },
      { lat: 26.1000, lon: -97.1400 }
    ]
  };
})();
