const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined' && typeof window.getComputedStyle === 'function';

function readCssCustomProperty(name) {
  if (!hasDom || typeof name !== 'string' || !name.trim()) return null;
  const root = document.documentElement;
  if (!root) return null;
  const value = window.getComputedStyle(root).getPropertyValue(name);
  if (!value) return null;
  return value.trim() || null;
}

/**
 * Read a CSS custom property value directly (e.g. '--primary').
 */
export function getThemeVariableValue(name, fallback = null) {
  if (typeof name !== 'string') return fallback;
  const cssValue = readCssCustomProperty(name);
  if (cssValue) return cssValue;
  return fallback;
}

/**
 * Resolve a color-like string into a usable color value.
 * Supports raw colors, CSS variable names, and `var(--name, fallback)` references.
 */
export function resolveThemeColor(value, fallback = null) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const trimmed = value.trim();

  const varMatch = trimmed.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\s*\)$/);
  if (varMatch) {
    const cssVar = varMatch[1];
    const cssFallback = varMatch[2]?.trim();
    const resolved = readCssCustomProperty(cssVar);
    if (resolved) return resolved;
    if (cssFallback) return cssFallback;
    return fallback;
  }

  if (trimmed.startsWith('--')) {
    const resolved = readCssCustomProperty(trimmed);
    if (resolved) return resolved;
  }

  return trimmed;
}
