/**
 * FilterPanel.js - Filter controls with unified dropdown behaviour
 */

function FilterDropdown({
  id,
  label,
  items = [],
  selectedItems = [],
  isOpen = false,
  onToggle = () => {},
  onClose = () => {},
  onToggleItem = () => {}
}) {
  const buttonRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  React.useEffect(() => {
    if (isOpen && menuRef.current) {
      menuRef.current.focus({ preventScroll: true });
      if (items.length > 0) {
        setHighlightedIndex(0);
      }
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, items.length]);

  React.useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const menuEl = menuRef.current;
    if (!menuEl) return;
    const optionEl = menuEl.querySelector(`[data-filter-item="${id}-${highlightedIndex}"]`);
    if (optionEl && optionEl.scrollIntoView) {
      optionEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen, id]);

  const focusMenu = () => {
    if (menuRef.current) {
      menuRef.current.focus({ preventScroll: true });
    }
  };

  const handleButtonKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        onToggle();
      } else {
        focusMenu();
        setHighlightedIndex(prev => {
          if (items.length === 0) return -1;
          if (prev === -1) return e.key === 'ArrowDown' ? 0 : items.length - 1;
          return prev;
        });
      }
      return;
    }

    if (!isOpen && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onToggle();
      return;
    }

    if (isOpen && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClose();
      return;
    }

    if (isOpen && e.key === 'Escape') {
      e.preventDefault();
      onClose();
      if (buttonRef.current) buttonRef.current.focus();
    }
  };

  const handleMenuKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      if (buttonRef.current) buttonRef.current.focus();
      return;
    }

    if (e.key === 'Tab') {
      onClose();
      return;
    }

    if (!items.length) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        if (prev === -1) return 0;
        const next = e.key === 'ArrowDown'
          ? (prev + 1) % items.length
          : (prev - 1 + items.length) % items.length;
        return next;
      });
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      setHighlightedIndex(0);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      setHighlightedIndex(items.length - 1);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      if (highlightedIndex >= 0 && highlightedIndex < items.length) {
        e.preventDefault();
        onToggleItem(items[highlightedIndex]);
      }
    }
  };

  const countLabel = selectedItems.length > 0 ? ` (${selectedItems.length})` : '';

  return React.createElement('div', {
    className: `filter-category ${isOpen ? 'open' : ''}`
  },
    React.createElement('button', {
      className: 'filter-category-toggle',
      onClick: onToggle,
      ref: buttonRef,
      onKeyDown: handleButtonKeyDown,
      type: 'button',
      'aria-expanded': isOpen,
      'aria-controls': `${id}-filter-list`,
      'aria-haspopup': 'listbox',
      'data-open': isOpen ? 'true' : 'false'
    },
      React.createElement('span', { className: 'filter-toggle-caret', 'aria-hidden': 'true' }, '▾'),
      React.createElement('span', null, `${label}${countLabel}`)
    ),
    React.createElement('div', {
      className: 'filter-items',
      id: `${id}-filter-list`,
      role: 'listbox',
      'aria-multiselectable': 'true',
      tabIndex: isOpen ? 0 : -1,
      'aria-hidden': !isOpen,
      ref: menuRef,
      onKeyDown: handleMenuKeyDown
    },
      items.map((item, index) => {
        const isActive = selectedItems.includes(item);
        const isFocused = highlightedIndex === index;
        return React.createElement('button', {
          key: `${id}-${item}`,
          className: `filter-item ${isActive ? 'active' : ''} ${isFocused ? 'focused' : ''}`,
          onClick: () => onToggleItem(item),
          type: 'button',
          'aria-pressed': isActive,
          'data-filter-item': `${id}-${index}`,
          onMouseEnter: () => setHighlightedIndex(index)
        }, item);
      })
    )
  );
}

export function FilterPanel({
  searchQuery = '',
  onSearchChange = () => {},
  selectedTags = [],
  onToggleTag = () => {},
  allTags = [],
  selectedCategories = [],
  onToggleCategory = () => {},
  allCategories = [],
  selectedYears = [],
  onToggleYear = () => {},
  allYears = [],
  selectedProducts = [],
  onToggleProduct = () => {},
  allProducts = [],
  onClearAllFilters = () => {},
  filteredCount = 0
}) {
  const [openFilterId, setOpenFilterId] = React.useState(null);
  const panelRef = React.useRef(null);

  const closeDropdowns = React.useCallback(() => {
    setOpenFilterId(null);
  }, []);

  const handleToggleFilter = React.useCallback((id) => {
    setOpenFilterId(prev => (prev === id ? null : id));
  }, []);

  const handleClickOutside = React.useCallback((e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      closeDropdowns();
    }
  }, [closeDropdowns]);

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const hasActiveFilters = selectedTags.length > 0 || selectedCategories.length > 0 ||
                           selectedYears.length > 0 || selectedProducts.length > 0;

  const filters = [
    {
      id: 'themes',
      label: 'Themes',
      items: allTags,
      selectedItems: selectedTags,
      onToggleItem: onToggleTag
    },
    {
      id: 'categories',
      label: 'Type',
      items: allCategories,
      selectedItems: selectedCategories,
      onToggleItem: onToggleCategory
    },
    {
      id: 'years',
      label: 'Year',
      items: allYears,
      selectedItems: selectedYears,
      onToggleItem: onToggleYear
    },
    {
      id: 'products',
      label: 'Medium',
      items: allProducts,
      selectedItems: selectedProducts,
      onToggleItem: onToggleProduct
    }
  ].filter(filter => filter.items.length > 0);

  return React.createElement('div', { className: 'panel-filters', ref: panelRef },
    // Search input with project count
    React.createElement('div', { className: 'filter-search-section' },
      React.createElement('div', { className: 'filter-search' },
        React.createElement('input', {
          type: 'text',
          className: 'search-input',
          placeholder: 'Search projects...',
          value: searchQuery,
          onChange: (e) => onSearchChange(e.target.value),
          'aria-label': 'Search projects'
        }),
        searchQuery && React.createElement('button', {
          className: 'search-clear',
          onClick: () => onSearchChange(''),
          'aria-label': 'Clear search',
          type: 'button'
        }, '✕')
      ),
      React.createElement('div', { className: 'filter-count-badge' },
        `${filteredCount} Projects`
      )
    ),

    // Collapsible filter categories in a row
    React.createElement('div', { className: 'filter-categories-row' },
      filters.map(filter =>
        React.createElement(FilterDropdown, {
          key: filter.id,
          id: filter.id,
          label: filter.label,
          items: filter.items,
          selectedItems: filter.selectedItems,
          isOpen: openFilterId === filter.id,
          onToggle: () => handleToggleFilter(filter.id),
          onClose: closeDropdowns,
          onToggleItem: filter.onToggleItem
        })
      )
    ),

    // Clear all button if any filters are active
    hasActiveFilters && React.createElement('button', {
      className: 'filter-clear-all-btn',
      onClick: onClearAllFilters,
      type: 'button'
    }, '✕ Clear all filters')
  );
}
