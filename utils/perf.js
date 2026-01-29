/**
 * Performance Detection & Quality Tier System
 * Detects device capabilities and network conditions to optimize rendering quality
 */

// User preferences
const prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Hardware detection
const hardwareThreads = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null;
const deviceMemory = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null;

// Device type detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTablet = /iPad|Android(?!.*mobile)/i.test(navigator.userAgent) || (isMobile && Math.min(window.screen.width, window.screen.height) >= 768);
const isTouchOnly = 'ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches;

// Screen resolution detection
const pixelRatio = window.devicePixelRatio || 1;
const screenWidth = window.screen.width * pixelRatio;
const screenHeight = window.screen.height * pixelRatio;
const isHighDPI = pixelRatio >= 2;
const isLowResolution = Math.max(screenWidth, screenHeight) < 1920;

// Network detection (if available)
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const effectiveType = connection ? connection.effectiveType : null; // 'slow-2g', '2g', '3g', '4g'
const saveData = connection ? connection.saveData : false;
const isSlowConnection = effectiveType && (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g');

// GPU detection (experimental)
let gpuTier = 'unknown';
try {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      // Simple GPU tier detection based on renderer string
      if (/Mali-4|Adreno [1-3]|PowerVR SGX/i.test(renderer)) {
        gpuTier = 'low';
      } else if (/Mali-[GT][67]|Adreno [45]|Intel HD [45]/i.test(renderer)) {
        gpuTier = 'medium';
      } else if (/RTX|GTX|Radeon RX|Mali-G[79]|Adreno [67]/i.test(renderer)) {
        gpuTier = 'high';
      }
    }
  }
} catch (e) {
  // GPU detection failed, continue with defaults
}

/**
 * Calculate overall quality tier: 'low', 'medium', or 'high'
 *
 * LOW tier: Mobile devices, low memory, slow connections, old GPUs
 * MEDIUM tier: Tablets, mid-range desktops, decent specs
 * HIGH tier: Desktop with good specs, fast connection, modern GPU
 */
function calculateQualityTier() {
  let score = 0;

  // Hardware scoring
  if (hardwareThreads && hardwareThreads >= 8) score += 2;
  else if (hardwareThreads && hardwareThreads >= 4) score += 1;

  if (deviceMemory && deviceMemory >= 8) score += 2;
  else if (deviceMemory && deviceMemory >= 4) score += 1;

  // GPU scoring
  if (gpuTier === 'high') score += 3;
  else if (gpuTier === 'medium') score += 1;
  else if (gpuTier === 'low') score -= 2;

  // Device type scoring
  if (isMobile && !isTablet) score -= 2;
  else if (isTablet) score += 0;
  else score += 1; // Desktop

  // Network scoring
  if (saveData) score -= 2;
  if (isSlowConnection) score -= 1;
  if (effectiveType === '4g') score += 1;

  // Screen scoring
  if (isHighDPI && !isLowResolution) score += 1;
  if (isLowResolution) score -= 1;

  // User preferences override
  if (prefersReducedMotion) score -= 2;

  // Determine tier from score
  if (score <= 0) return 'low';
  if (score <= 3) return 'medium';
  return 'high';
}

const qualityTier = calculateQualityTier();

/**
 * Quality presets for Cesium rendering
 */
const qualityPresets = {
  low: {
    resolutionScale: 0.75,
    maximumScreenSpaceError: 8,
    msaaSamples: 1,
    antialias: false,
    maximumAnisotropy: 1,
    tileCacheSize: 50,
    description: 'Optimized for performance on mobile and low-end devices'
  },
  medium: {
    resolutionScale: 0.9,
    maximumScreenSpaceError: 3,
    msaaSamples: 2,
    antialias: true,
    maximumAnisotropy: 8,
    tileCacheSize: 100,
    description: 'Balanced quality and performance for most devices'
  },
  high: {
    resolutionScale: 1.0,
    maximumScreenSpaceError: 2,
    msaaSamples: 4,
    antialias: true,
    maximumAnisotropy: 16,
    tileCacheSize: 150,
    description: 'Maximum quality for high-end devices'
  }
};

// Legacy compatibility
const isLowPower = qualityTier === 'low';

// Performance detection object
window.MapAppPerf = {
  // Device info
  prefersReducedMotion,
  hardwareThreads,
  deviceMemory,
  isMobile,
  isTablet,
  isTouchOnly,

  // Screen info
  pixelRatio,
  screenWidth,
  screenHeight,
  isHighDPI,
  isLowResolution,

  // Network info
  effectiveType,
  saveData,
  isSlowConnection,

  // GPU info
  gpuTier,

  // Quality tier
  qualityTier,
  qualityPresets,

  // Get current quality settings
  getQualitySettings() {
    // Check for user override in localStorage
    const userOverride = localStorage.getItem('mapapp-quality-override');
    if (userOverride && qualityPresets[userOverride]) {
      return qualityPresets[userOverride];
    }
    return qualityPresets[qualityTier];
  },

  // Allow user to override quality
  setQualityOverride(tier) {
    if (tier && qualityPresets[tier]) {
      localStorage.setItem('mapapp-quality-override', tier);
      return true;
    } else if (tier === null) {
      localStorage.removeItem('mapapp-quality-override');
      return true;
    }
    return false;
  },

  // Legacy compatibility
  isLowPower
};
