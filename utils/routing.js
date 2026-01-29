/**
 * URL Router for hash-based navigation
 *
 * ROUTES:
 * - /                    -> Home (no selection)
 * - /#project/ID         -> Project selected
 * - /#search?q=water     -> Search results (future)
 */

/**
 * Parse current URL hash
 * @returns {Object} { route: 'project'|'search'|'home', projectId: string|null, query: Object }
 */
function parseHash() {
  const hash = window.location.hash.slice(1); // Remove '#'

  // Project route: #project/abc-123
  const projectMatch = hash.match(/^project\/(.+)$/);
  if (projectMatch) {
    return {
      route: 'project',
      projectId: projectMatch[1],
      query: {}
    };
  }

  // Search route: #search?q=water
  const searchMatch = hash.match(/^search\?(.+)$/);
  if (searchMatch) {
    const params = new URLSearchParams(searchMatch[1]);
    return {
      route: 'search',
      projectId: null,
      query: Object.fromEntries(params)
    };
  }

  // Home route (no hash or unrecognized)
  return {
    route: 'home',
    projectId: null,
    query: {}
  };
}

/**
 * Navigate to a project
 * @param {string} projectId - Project ID to navigate to
 */
function navigateToProject(projectId) {
  window.location.hash = `#project/${projectId}`;
}

/**
 * Navigate to home (clear selection)
 */
function navigateHome() {
  window.history.pushState(null, '', window.location.pathname);
}

/**
 * Listen for hash changes
 * @param {Function} callback - Called with parseHash() result
 * @returns {Function} Cleanup function to remove listener
 */
function onHashChange(callback) {
  function handler() {
    callback(parseHash());
  }

  window.addEventListener('hashchange', handler);

  // Call immediately with current hash
  handler();

  // Return cleanup function
  return () => window.removeEventListener('hashchange', handler);
}

// Router utilities
window.Router = {
  parseHash,
  navigateToProject,
  navigateHome,
  onHashChange
};
