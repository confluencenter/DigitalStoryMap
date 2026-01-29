/**
 * bottom-sheet.js - Draggable bottom sheet controller
 * Handles drag/swipe gestures to expand/collapse bottom control panel
 */

export function initializeBottomSheet() {
  const sheet = document.querySelector('.bottom-sheet');
  const handle = document.querySelector('.bottom-sheet-handle');
  const overlay = document.querySelector('.bottom-sheet-overlay');

  if (!sheet || !handle) {
    console.warn('Bottom sheet elements not found, will retry...');
    // Retry after a short delay if elements don't exist yet
    requestAnimationFrame(() => {
      initializeBottomSheet();
    });
    return;
  }
  if (sheet.dataset.bottomSheetReady === 'true') return;

  sheet.dataset.bottomSheetReady = 'true';

  const MIN_VISIBLE_HEIGHT = 32; // matches handle height
  const EXPANDED_THRESHOLD = 0.25; // overlay once 25% open

  let collapsedOffset = 0;
  let currentOffset = 0;
  let startOffset = 0;
  let startY = 0;
  let isDragging = false;
  let ignoreClick = false;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const getExpansionRatio = () => {
    if (collapsedOffset === 0) return 0;
    return 1 - (currentOffset / collapsedOffset);
  };

  const updateOverlayState = () => {
    const shouldShowOverlay = getExpansionRatio() > EXPANDED_THRESHOLD;
    sheet.classList.toggle('expanded', shouldShowOverlay);
  };

  const setOffset = (nextValue) => {
    const clamped = clamp(nextValue, 0, collapsedOffset);
    currentOffset = clamped;
    sheet.style.setProperty('--bottom-sheet-translate', `${clamped}px`);
    updateOverlayState();
  };

  const recalcBounds = ({ preservePosition = true } = {}) => {
    const rect = sheet.getBoundingClientRect();
    const sheetHeight = rect.height;
    
    // If height is still 0, something's wrong - wait a bit more
    if (sheetHeight === 0) {
      console.warn('Sheet height is 0, retrying...');
      requestAnimationFrame(() => recalcBounds({ preservePosition }));
      return;
    }

    const nextCollapsed = Math.max(0, sheetHeight - MIN_VISIBLE_HEIGHT);
    let openness = 0;

    if (preservePosition && collapsedOffset > 0) {
      openness = getExpansionRatio();
    }

    collapsedOffset = nextCollapsed;
    const targetOffset = preservePosition ? collapsedOffset * (1 - openness) : collapsedOffset;
    
    // Force transition to be removed during initial setup
    sheet.style.transition = 'none';
    setOffset(targetOffset);
    
    // Re-enable transitions after setup
    setTimeout(() => {
      sheet.style.transition = 'transform 300ms ease';
    }, 0);
  };

  const beginDrag = (clientY) => {
    isDragging = true;
    startY = clientY;
    startOffset = currentOffset;
    ignoreClick = false;
    sheet.style.transition = 'none';
  };

  const dragTo = (clientY) => {
    if (!isDragging) return;
    const delta = clientY - startY;

    if (!ignoreClick && Math.abs(delta) > 4) {
      ignoreClick = true;
    }

    setOffset(startOffset + delta);
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    sheet.style.transition = 'transform 300ms ease';
  };

  const handleTouchStart = (event) => {
    if (event.touches.length !== 1) return;
    beginDrag(event.touches[0].clientY);
  };

  const handleMouseDown = (event) => {
    if (event.button !== 0) return;
    beginDrag(event.clientY);
    event.preventDefault();
  };

  const handleTouchMove = (event) => {
    if (!isDragging) return;
    dragTo(event.touches[0].clientY);
    event.preventDefault();
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;
    dragTo(event.clientY);
    event.preventDefault();
  };

  const stopTouchDrag = () => endDrag();
  const stopMouseDrag = () => endDrag();

  const toggleSheet = () => {
    sheet.style.transition = 'transform 300ms ease';
    const ratio = getExpansionRatio();

    if (ratio > 0.5) {
      setOffset(collapsedOffset);
    } else {
      setOffset(0);
    }
  };

  handle.addEventListener('touchstart', handleTouchStart, { passive: true });
  handle.addEventListener('mousedown', handleMouseDown);

  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('mousemove', handleMouseMove);

  window.addEventListener('touchend', stopTouchDrag);
  window.addEventListener('touchcancel', stopTouchDrag);
  window.addEventListener('mouseup', stopMouseDrag);

  handle.addEventListener('click', () => {
    if (ignoreClick) {
      ignoreClick = false;
      return;
    }
    toggleSheet();
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      ignoreClick = false;
      sheet.style.transition = 'transform 300ms ease';
      setOffset(collapsedOffset);
    });
  }

  window.addEventListener('resize', () => recalcBounds());

  // Initial calculation
  recalcBounds({ preservePosition: false });
}
