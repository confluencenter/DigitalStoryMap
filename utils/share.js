/**
 * Get shareable URL for a project
 * @param {Object} project - Project object
 * @returns {string} - Full URL with project hash
 */
function getProjectShareUrl(project) {
  if (!project || !project.id) {
    return window.location.origin + window.location.pathname;
  }
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#project/${project.id}`;
}

/**
 * Get share text for a project
 * @param {Object} project - Project object
 * @returns {string} - Share text
 */
function getProjectShareText(project) {
  if (!project) {
    return 'Check out the Arizona-Sonora Borderlands Research Map';
  }
  const name = project.ProjectName || 'this project';
  const location = project.Location ? ` in ${project.Location}` : '';
  return `Check out "${name}"${location} on the Arizona-Sonora Borderlands Research Map`;
}

/**
 * Share a project using native Web Share API or fallback
 * @param {Object} project - Project to share
 * @returns {Promise<boolean>} - True if shared successfully
 */
async function shareProject(project) {
  const url = getProjectShareUrl(project);
  const title = project?.ProjectName || 'Arizona-Sonora Borderlands';
  const text = getProjectShareText(project);

  // Try native Web Share API first (mobile-friendly)
  if (navigator.share) {
    try {
      await navigator.share({
        title: title,
        text: text,
        url: url
      });
      return true;
    } catch (error) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        // Fall back to clipboard
      }
    }
  }

  // Fallback: Copy to clipboard
  return copyToClipboard(url, text);
}

/**
 * Copy URL to clipboard
 * @param {string} url - URL to copy
 * @param {string} text - Optional text to show in notification
 * @returns {Promise<boolean>} - True if copied successfully
 */
async function copyToClipboard(url, text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (success) {
        alert('Link copied to clipboard!');
        return true;
      }
    }
  } catch (error) {
    alert('Failed to copy link. Please copy manually: ' + url);
  }
  return false;
}

// Share utilities
window.MapAppUtils = window.MapAppUtils || {};
window.MapAppUtils.Share = {
  shareProject,
  getProjectShareUrl,
  getProjectShareText
};
