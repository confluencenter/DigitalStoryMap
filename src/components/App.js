/**
 * App.js - Main application controller
 * ES module version
 */

import { GlobeContainer } from './GlobeContainer.js';
import { BottomSheet } from './BottomSheet.js';
import { detectOSPreference, applyTheme } from '../utils/themeManager.js';

/**
 * App Component
 *
 * RESPONSIBILITY:
 * - Global state management (projects, selection, narrative, theme)
 * - Component orchestration (Globe + Bottom Sheet)
 * - Unified layout: full-screen globe + draggable bottom control sheet
 *
 * STATE:
 * - projects: All project data loaded from JSON
 * - selectedProject: Currently focused project (or null)
 * - narrativeIndex: Which intro passage is active
 * - currentTheme: Active theme (light, dark, night, story)
 *
 * CHILDREN:
 * - GlobeContainer (main viewport)
 * - BottomSheet (unified control center with filters & projects)
 */
export function App() {
  const { useState, useEffect, useMemo, useRef } = React;

  // State
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState(() => detectOSPreference());
  const [satelliteView, setSatelliteView] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [highlightRegion, setHighlightRegion] = useState(false);

  // Router from global scope (loaded as plain script)
  const Router = window.MapAppUtils && window.MapAppUtils.Router;

  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach(project => {
      if (project && project.id) {
        map.set(project.id, project);
      }
    });
    return map;
  }, [projects]);

  const routeSubscriptionRef = useRef(null);

  // Load project data
  useEffect(() => {
    fetch('./data/projects.json')
      .then(response => response.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(error => {
        setProjects([]);
        setLoading(false);
      });
  }, []);

  // Keep selected project in sync with hash routing
  useEffect(() => {
    if (!Router || projects.length === 0) return;

    if (routeSubscriptionRef.current) {
      routeSubscriptionRef.current();
    }

    const cleanup = Router.onHashChange((route) => {
      if (route.route === 'project' && route.projectId && projectMap.has(route.projectId)) {
        setSelectedProject(projectMap.get(route.projectId));
      } else {
        setSelectedProject(null);
      }
    });

    routeSubscriptionRef.current = cleanup;

    return () => {
      if (cleanup) cleanup();
      routeSubscriptionRef.current = null;
    };
  }, [Router, projects.length, projectMap]);

  // Push selection updates to hash
  useEffect(() => {
    if (!Router) return;
    const currentRoute = Router.parseHash();
    if (selectedProject && selectedProject.id) {
      if (currentRoute.route !== 'project' || currentRoute.projectId !== selectedProject.id) {
        Router.navigateToProject(selectedProject.id);
      }
    } else if (currentRoute.route !== 'home') {
      Router.navigateHome();
    }
  }, [Router, selectedProject]);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Event Handlers
  function handleSelectProject(project) {
    if (!project) {
      setSelectedProject(null);
      return;
    }
    setSelectedProject(project);
  }

  function handleSelectTheme(themeId) {
    setCurrentTheme(themeId);
  }

  function handleToggleSatelliteView() {
    setSatelliteView(prev => !prev);
  }

  function handleToggleAutoRotate() {
    setAutoRotate(prev => !prev);
  }

  function handleToggleHighlightRegion() {
    setHighlightRegion(prev => !prev);
  }

  function handleShare() {
    if (window.MapAppUtils && window.MapAppUtils.Share) {
      window.MapAppUtils.Share.shareProject(selectedProject);
    }
  }

  // Loading state
  if (loading) {
    return React.createElement('main',
      { className: 'app-container' },
      React.createElement('p', null, 'Loading 3D Globe...')
    );
  }

  // Main render - Globe + Bottom control sheet
  return React.createElement('main',
    { className: 'app-container' },

    // Left: Globe
    React.createElement(GlobeContainer, {
      projects,
      selectedProject: selectedProject,
      onProjectClick: handleSelectProject,
      onGlobeReady: () => {},
      theme: currentTheme,
      satelliteView,
      autoRotate,
      highlightRegion
    }),

    // Bottom: Unified control center (themes, filters, projects, detail view)
    React.createElement(BottomSheet, {
      projects,
      onSelectProject: handleSelectProject,
      selectedProjectId: selectedProject ? selectedProject.id : null,
      onSelectTheme: handleSelectTheme,
      currentTheme: currentTheme,
      satelliteView,
      onToggleSatelliteView: handleToggleSatelliteView,
      autoRotate,
      onToggleAutoRotate: handleToggleAutoRotate,
      highlightRegion,
      onToggleHighlightRegion: handleToggleHighlightRegion,
      onShare: handleShare
    })
  );
}
