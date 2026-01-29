export const COLOR_THEMES = [
  {
    id: 'light',
    label: 'Light',
    cssClass: 'theme-light',
    mapStyle: 'light',
    colorScheme: 'light',
    metaColor: '#ffffff'
  },
  {
    id: 'dark',
    label: 'Dark',
    cssClass: 'theme-dark',
    mapStyle: 'dark',
    colorScheme: 'dark',
    metaColor: '#050914'
  },
  {
    id: 'night',
    label: 'Night',
    cssClass: 'theme-night',
    mapStyle: 'night',
    colorScheme: 'dark',
    metaColor: '#041f1c'
  }
];

export const CINEMATIC_THEME = {
  id: 'story',
  label: 'Story',
  cssClass: 'theme-story',
  mapStyle: 'dark',
  colorScheme: 'dark',
  metaColor: '#170b1c',
  selectable: false
};

export const ALL_THEMES = [...COLOR_THEMES, CINEMATIC_THEME];

export const THEME_CLASS_PREFIX = 'theme-';

export const SELECTABLE_THEME_IDS = COLOR_THEMES.map(theme => theme.id);

export const ALL_THEME_IDS = ALL_THEMES.map(theme => theme.id);

export function getThemeDefinition(themeId) {
  return ALL_THEMES.find(theme => theme.id === themeId);
}

export function getMapStyleForTheme(themeId) {
  const definition = getThemeDefinition(themeId);
  return definition?.mapStyle || 'light';
}

export function getMetaColorForTheme(themeId) {
  const definition = getThemeDefinition(themeId);
  return definition?.metaColor;
}

export function getSelectableThemes() {
  return COLOR_THEMES.map(({ id, label }) => ({ id, label }));
}
