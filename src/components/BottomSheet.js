/**
 * BottomSheet.js - Complete unified control center
 * Theme selector + Filters + Project explorer + Detail view
 * Replaces separate sidebar - everything in one draggable sheet
 */

import { FilterPanel } from './panel/FilterPanel.js';
import { ProjectList } from './panel/ProjectList.js';
import { ProjectDetailView } from './panel/ProjectDetailView.js';
import { buildProjectTagsMap, extractThemes, extractCategories, extractYears, extractProducts } from '../utils/filterUtils.js';
import { getSelectableThemes } from '../config/themes.js';
import { initializeBottomSheet } from '../utils/bottom-sheet.js';

export function BottomSheet({
  projects = [],
  onSelectProject = () => {},
  selectedProjectId = null,
  onSelectTheme = () => {},
  currentTheme = 'light',
  satelliteView = false,
  onToggleSatelliteView = () => {},
  autoRotate = false,
  onToggleAutoRotate = () => {},
  highlightRegion = false,
  onToggleHighlightRegion = () => {},
  onShare = () => {}
}) {
  const { useState, useMemo, useEffect, useRef } = React;
  const bottomSheetRef = useRef(null);

  // All filtering state
  const [expandedProject, setExpandedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Build project tags map
  const projectTagsMap = useMemo(() => buildProjectTagsMap(projects), [projects]);

  // Extract filter options
  const allTags = useMemo(() => extractThemes(projects), [projects]);
  const allCategories = useMemo(() => extractCategories(projects), [projects]);
  const allYears = useMemo(() => extractYears(projects), [projects]);
  const allProducts = useMemo(() => extractProducts(projects), [projects]);

  // Filter project
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = (project.ProjectName || '').toLowerCase().includes(query);
        const matchesDesc = (project.Description || '').toLowerCase().includes(query);
        const matchesLocation = (project.Location || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesLocation) return false;
      }

      // Theme filter
      if (selectedTags.length > 0) {
        const key = project.id !== undefined && project.id !== null ? String(project.id) : project;
        const tagInfo = projectTagsMap.get(key);
        const projectTags = tagInfo ? tagInfo.tags : [];
        const hasSelectedTag = selectedTags.some(tag => projectTags.includes(tag));
        if (!hasSelectedTag) return false;
      }

      // Category filter
      if (selectedCategories.length > 0) {
        const projectCat = String(project.ProjectCategory || '').trim();
        if (!selectedCategories.includes(projectCat)) return false;
      }

      // Year filter
      if (selectedYears.length > 0) {
        if (!selectedYears.includes(project.Year)) return false;
      }

      // Product filter
      if (selectedProducts.length > 0) {
        const projectProd = String(project.Product || '').trim();
        if (!selectedProducts.includes(projectProd)) return false;
      }

      return true;
    });
  }, [projects, projectTagsMap, searchQuery, selectedTags, selectedCategories, selectedYears, selectedProducts]);

  // Toggle functions
  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleCategory = (cat) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleYear = (year) => {
    setSelectedYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const toggleProduct = (prod) => {
    setSelectedProducts(prev =>
      prev.includes(prod) ? prev.filter(p => p !== prod) : [...prev, prod]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedCategories([]);
    setSelectedYears([]);
    setSelectedProducts([]);
  };

  // Close detail view
  const closeDetail = () => {
    setExpandedProject(null);
    onSelectProject(null);
  };

  // Expand project
  const handleExpandProject = (project) => {
    if (!project) return;
    setExpandedProject(project);
    onSelectProject(project);
  };

  // Sync expanded project with selected project ID from parent
  useEffect(() => {
    if (!selectedProjectId) {
      if (expandedProject) setExpandedProject(null);
      return;
    }
    if (expandedProject && expandedProject.id === selectedProjectId) return;

    const nextProject = projects.find(project => project.id === selectedProjectId);
    if (nextProject) setExpandedProject(nextProject);
  }, [selectedProjectId, expandedProject, projects]);

  // Share handler
  const handleShare = (project) => {
    if (window.MapAppUtils && window.MapAppUtils.Share) {
      window.MapAppUtils.Share.shareProject(project);
    }
  };

  const themes = useMemo(() => getSelectableThemes(), []);

  // Initialize bottom sheet drag when component mounts
  useEffect(() => {
    if (bottomSheetRef.current) {
      initializeBottomSheet();
    }
  }, []);

  return React.createElement(React.Fragment, null,
    // Bottom Sheet Container
    React.createElement('div', { className: 'bottom-sheet', ref: bottomSheetRef },
      // Drag Handle
      React.createElement('div', { className: 'bottom-sheet-handle', title: 'Drag to expand' }),

      // Content Area
      React.createElement('div', { className: 'bottom-sheet-content' },
        // Header Section: Controls + Filter
        React.createElement('div', { className: 'bottom-sheet-header' },
          // Top Control Bar: Themes + Share
          React.createElement('div', { className: 'bottom-sheet-controls-bar' },
            React.createElement('div', { className: 'bottom-sheet-themes' },
              React.createElement('div', { className: 'bottom-sheet-themes-row' },
                themes.map(theme =>
                  React.createElement('button', {
                    key: theme.id,
                    className: `bottom-sheet-theme-btn ${currentTheme === theme.id ? 'active' : ''}`,
                    onClick: () => onSelectTheme(theme.id),
                    'aria-pressed': currentTheme === theme.id
                  }, theme.label)
                )
              )
            ),

            React.createElement('button', {
              className: `bottom-sheet-satellite-btn ${satelliteView ? 'active' : ''}`,
              onClick: onToggleSatelliteView,
              type: 'button',
              'aria-pressed': satelliteView ? 'true' : 'false'
            }, satelliteView ? 'Satellite On' : 'Satellite View'),

            React.createElement('button', {
              className: `bottom-sheet-autorotate-btn ${autoRotate ? 'active' : ''}`,
              onClick: onToggleAutoRotate,
              type: 'button',
              'aria-pressed': autoRotate ? 'true' : 'false',
              title: 'Toggle auto-rotate'
            }, autoRotate ? 'Rotating' : 'Spin'),

            React.createElement('button', {
              className: `bottom-sheet-autorotate-btn ${highlightRegion ? 'active' : ''}`,
              onClick: onToggleHighlightRegion,
              type: 'button',
              'aria-pressed': highlightRegion ? 'true' : 'false',
              title: 'Highlight border region'
            }, highlightRegion ? 'Highlighted' : 'Highlight'),

            React.createElement('button', {
              className: 'bottom-sheet-share-btn',
              onClick: onShare,
              title: 'Share current view'
            }, 'Share')
          ),

          // Filters Section
          React.createElement(FilterPanel, {
            searchQuery: searchQuery,
            onSearchChange: setSearchQuery,
            selectedTags: selectedTags,
            onToggleTag: toggleTag,
            allTags: allTags,
            selectedCategories: selectedCategories,
            onToggleCategory: toggleCategory,
            allCategories: allCategories,
            selectedYears: selectedYears,
            onToggleYear: toggleYear,
            allYears: allYears,
            selectedProducts: selectedProducts,
            onToggleProduct: toggleProduct,
            allProducts: allProducts,
            onClearAllFilters: clearFilters,
            filteredCount: filteredProjects.length
          })
        ),

        // Projects Area: Horizontal scrolling grid OR Detail View Modal
        React.createElement('div', { className: 'bottom-sheet-projects-area' },
          // Projects Section (hidden when detail is open)
          !expandedProject && React.createElement(ProjectList, {
            projects: filteredProjects,
            selectedProjectId: selectedProjectId,
            onSelectProject: handleExpandProject,
            onClearFilters: clearFilters,
            projectTagsMap: projectTagsMap
          }),

          // Detail View Modal (replaces projects list)
          expandedProject && React.createElement('div', { className: 'bottom-sheet-detail-modal' },
            React.createElement(ProjectDetailView, {
              project: expandedProject,
              projectTagsMap: projectTagsMap,
              onClose: closeDetail,
              onShare: handleShare
            })
          )
        )
      )
    ),

    // Overlay (shown when expanded)
    React.createElement('div', { className: 'bottom-sheet-overlay', 'aria-hidden': 'true' })
  );
}
