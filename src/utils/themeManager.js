/**
 * themeManager.js - Theme detection + DOM application helpers
 */

import {
  ALL_THEME_IDS,
  COLOR_THEMES,
  CINEMATIC_THEME,
  THEME_CLASS_PREFIX,
  getMetaColorForTheme,
  getThemeDefinition
} from '../config/themes.js';

const MATCH_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const THEME_CLASSES = ALL_THEME_IDS.map(id => `${THEME_CLASS_PREFIX}${id}`);
const FALLBACK_THEME_ID = COLOR_THEMES[0].id;

function getMediaQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  return window.matchMedia(MATCH_MEDIA_QUERY);
}

/**
 * Detect user's OS color scheme preference
 * @returns {'light' | 'dark'}
 */
export function detectOSPreference() {
  const mediaQuery = getMediaQuery();
  if (!mediaQuery) return 'light';
  return mediaQuery.matches ? 'dark' : 'light';
}

function updateMetaThemeColor(themeId) {
  if (typeof document === 'undefined') return;
  const metaTag = document.querySelector('meta[name="theme-color"]');
  if (!metaTag) return;
  const color = getMetaColorForTheme(themeId);
  if (color) {
    metaTag.setAttribute('content', color);
  }
}

/**
 * Apply theme to document
 * @param {'light' | 'dark' | 'night' | 'story'} themeId
 */
export function applyTheme(themeId) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const normalized = ALL_THEME_IDS.includes(themeId) ? themeId : FALLBACK_THEME_ID;

  THEME_CLASSES.forEach(cls => root.classList.remove(cls));
  root.classList.add(`${THEME_CLASS_PREFIX}${normalized}`);
  root.dataset.theme = normalized;

  const definition = getThemeDefinition(normalized);
  if (definition?.colorScheme) {
    root.style.colorScheme = definition.colorScheme;
  }

  updateMetaThemeColor(normalized);
}

/**
 * Get current theme
 * @returns {'light' | 'dark' | 'night' | 'story'}
 */
export function getCurrentTheme() {
  if (typeof document === 'undefined') return FALLBACK_THEME_ID;
  const root = document.documentElement;
  const active = THEME_CLASSES.find(cls => root.classList.contains(cls));
  if (active) {
    return active.replace(THEME_CLASS_PREFIX, '');
  }
  return FALLBACK_THEME_ID;
}

/**
 * Subscribe to OS preference changes (used when honoring system theme)
 * @param {(next:'light'|'dark') => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToOSPreferenceChange(callback) {
  const mediaQuery = getMediaQuery();
  if (!mediaQuery || typeof callback !== 'function') {
    return () => {};
  }

  const handler = (event) => {
    callback(event.matches ? 'dark' : 'light');
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }

  mediaQuery.addListener(handler);
  return () => mediaQuery.removeListener(handler);
}

window.MapAppTheme = {
  detectOSPreference,
  applyTheme,
  getCurrentTheme,
  subscribeToOSPreferenceChange,
  COLOR_THEMES,
  CINEMATIC_THEME
};
