// cesium-config.js - Cesium viewer configuration
window.CesiumConfig = {
  // Camera initial position (Arizona-Sonora borderlands)
  camera: {
    center: {
      lat: 31.5,    // Latitude (degrees)
      lon: -110.5,  // Longitude (degrees)
      alt: 500000   // Altitude (meters above ground)
    },
    heading: 0,     // Compass direction (0 = north)
    pitch: -45,     // Tilt angle (degrees, negative = looking down)
    roll: 0         // Rotation (usually 0)
  },

  // Cesium Viewer widget options
  // See: https://cesium.com/learn/cesiumjs/ref-doc/Viewer.html
  viewerOptions: {
    animation: false,           // Bottom-left timeline animation widget
    timeline: false,            // Bottom timeline scrubber
    baseLayerPicker: false,     // Top-right imagery selector (disabled for simplicity)
    geocoder: false,            // Top-right search box
    homeButton: false,           // Top-right home button
    sceneModePicker: false,      // Allow users to switch 2D/3D
    navigationHelpButton: false,// Hide help button
    fullscreenButton: true,     // Enable fullscreen toggle
    vrButton: false,            // VR mode toggle

    // Imagery provider options:
    // Using Google Maps 2D Satellite (asset 3830182)
    imageryProvider: 'ION_ASSET',
    ionAssetId: 3830182,  // Google Maps 2D Satellite
    // Other options:
    // 3830183: Google Maps 2D Satellite with Labels
    // 3830184: Google Maps 2D Roadmap
    // 3812: Earth at Night (Black Marble)
    // 2: Bing Maps Aerial

    // Terrain (3D elevation)
    // SIMPLIFIED: Using flat terrain for debugging
    terrainProvider: null, // or 'CESIUM_WORLD_TERRAIN' for 3D terrain

    // Performance
    requestRenderMode: true,    // Only render when needed 
    maximumRenderTimeChange: Infinity // Disable FPS throttling
  },

  // Camera animation settings
  animation: {
    duration: 2.0,             // Seconds for flyTo animations
    easingFunction: 'QUADRATIC_IN_OUT' // Smooth acceleration/deceleration
  },

  // Accessibility
  accessibility: {
    reducedMotion: false      // Will be updated from prefers-reduced-motion
  }
};

// Detect user's motion preference
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.CesiumConfig.accessibility.reducedMotion = true;
  window.CesiumConfig.animation.duration = 0; // Instant transitions
}
