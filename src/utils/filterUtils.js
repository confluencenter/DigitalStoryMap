/**
 * filterUtils.js - Filter state and data extraction utilities
 */

/**
 * Extract unique values from projects for a field
 */
export function extractUniqueValues(projects, fieldName, sort = true, sortFn) {
  const values = new Set();

  projects.forEach(project => {
    if (!project) return;
    const val = project[fieldName];
    if (!val) return;

    if (Array.isArray(val)) {
      val.forEach(v => {
        const trimmed = String(v).trim();
        if (trimmed) values.add(trimmed);
      });
    } else {
      const trimmed = String(val).trim();
      if (trimmed) values.add(trimmed);
    }
  });

  const result = Array.from(values);
  if (sort) {
    return sortFn ? result.sort(sortFn) : result.sort();
  }
  return result;
}

/**
 * Extract themes from projects (comma-separated)
 */
export function extractThemes(projects) {
  const themes = new Set();
  projects.forEach(project => {
    if (!project || !project.Theme) return;
    if (typeof project.Theme === 'string') {
      project.Theme.split(',').forEach(theme => {
        const trimmed = theme.trim();
        if (trimmed) themes.add(trimmed);
      });
    }
  });
  return Array.from(themes).sort();
}

/**
 * Extract categories from projects
 */
export function extractCategories(projects) {
  return extractUniqueValues(projects, 'ProjectCategory');
}

/**
 * Extract years from projects, sorted newest first
 */
export function extractYears(projects) {
  return extractUniqueValues(projects, 'Year', true, (a, b) => b - a);
}

/**
 * Extract products from projects
 */
export function extractProducts(projects) {
  return extractUniqueValues(projects, 'Product');
}

/**
 * Precompute tags for each project (themes + categories)
 */
export function buildProjectTagsMap(projects) {
  const map = new Map();

  projects.forEach(project => {
    if (!project) return;

    const key = project.id !== undefined && project.id !== null
      ? String(project.id)
      : project;

    const themeTokens = [];
    if (typeof project.Theme === 'string') {
      project.Theme.split(',').forEach(theme => {
        const trimmed = theme.trim();
        if (trimmed) themeTokens.push(trimmed);
      });
    }

    const uniqueThemes = Array.from(new Set(themeTokens));
    const tags = uniqueThemes.slice();

    const categoryRaw = project.ProjectCategory;
    if (categoryRaw) {
      const category = String(categoryRaw).trim();
      if (category) tags.push(category);
    }

    const uniqueTags = Array.from(new Set(tags));
    map.set(key, { tags: uniqueTags, themes: uniqueThemes });
  });

  return map;
}

