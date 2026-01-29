/**
 * ProjectDetailView.js - Detailed view of a selected project
 */

export function ProjectDetailView({
  project = null,
  projectTagsMap = new Map(),
  onClose = () => {},
  onShare = () => {}
}) {
  if (!project) {
    return null;
  }

  const projectName = project.ProjectName || 'Untitled Project';
  const description = project.DescriptionLong || project.DescriptionShort || project.Description || '';
  const descriptionTrimmed = description ? description.trim().replace(/\s+/g, ' ') : '';
  const heroSubtitle = descriptionTrimmed;

  const tagKey = project.id !== undefined && project.id !== null ? String(project.id) : project;
  const tagInfo = projectTagsMap.get(tagKey) || { tags: [], themes: [] };
  const themeTokens = tagInfo.themes || [];

  const leads = Array.isArray(project.ProjectLeads) ? project.ProjectLeads.filter(Boolean) : [];
  const locationLabel = (project.Location || 'Location forthcoming').trim();
  const productLabel = (project.Product || '').trim();

  const metaGrid = [
    { label: 'Location', value: locationLabel, key: 'meta-location' },
    { label: 'Year', value: project.Year || 'Year TBD', key: 'meta-year' },
    { label: 'Category', value: project.ProjectCategory || 'Uncategorized', key: 'meta-category' },
    productLabel && { label: 'Primary Output', value: productLabel, key: 'meta-product' }
  ].filter(Boolean);

  const contentFlags = [
    { label: 'Art', active: Boolean(project.HasArtwork) },
    { label: 'Music', active: Boolean(project.HasMusic) },
    { label: 'Research', active: Boolean(project.HasResearch) },
    { label: 'Poetry', active: Boolean(project.HasPoems) }
  ];

  return React.createElement('div', {
    className: 'project-detail',
    role: 'dialog',
    'aria-label': `${projectName} details`
  },
    React.createElement('header', { className: 'project-detail-header' },
      React.createElement('button', {
        className: 'project-detail-back-button',
        onClick: onClose,
        type: 'button',
        'aria-label': 'Return to project list'
      }, '← Back')
    ),

    React.createElement('section', { className: 'project-detail-hero' },
      React.createElement('div', {
        className: `project-detail-media ${project.ImageUrl ? 'has-image' : 'placeholder'}`
      },
        project.ImageUrl
          ? React.createElement('img', {
              src: project.ImageUrl,
              alt: projectName,
              loading: 'lazy'
            })
          : React.createElement('div', { className: 'project-detail-media-placeholder', 'aria-hidden': 'true' },
              'Imagery coming soon'
            ),
        React.createElement('div', { className: 'project-detail-media-fade', 'aria-hidden': 'true' })
      ),

      React.createElement('div', { className: 'project-detail-hero-content' },
        React.createElement('div', { className: 'project-detail-hero-text' },
          React.createElement('p', { className: 'project-detail-eyebrow' },
            project.ProjectCategory || 'Project highlight'
          ),
          React.createElement('h2', { className: 'project-detail-title' }, projectName),
          heroSubtitle && React.createElement('p', { className: 'project-detail-subtitle' }, heroSubtitle),
          React.createElement('div', { className: 'project-detail-hero-pills' },
            React.createElement('span', { className: 'project-detail-pill' },
              project.Year ? `Year ${project.Year}` : 'Year TBD'
            ),
            React.createElement('span', { className: 'project-detail-pill' }, locationLabel),
            productLabel && React.createElement('span', { className: 'project-detail-pill' }, productLabel)
          ),
          React.createElement('div', { className: 'project-detail-hero-actions' },
            React.createElement('button', {
              className: 'project-detail-action primary',
              onClick: () => onShare(project),
              type: 'button'
            }, 'Share project'),
            React.createElement('button', {
              className: 'project-detail-action ghost',
              onClick: onClose,
              type: 'button'
            }, 'Keep browsing')
          )
        )
      )
    ),

    React.createElement('div', { className: 'project-detail-body' },
      React.createElement('div', { className: 'project-detail-main' },
        descriptionTrimmed && React.createElement('div', { className: 'detail-section' },
          React.createElement('h3', null, 'About this work'),
          React.createElement('p', null, descriptionTrimmed)
        ),

        leads.length > 0 && React.createElement('div', { className: 'detail-section' },
          React.createElement('h3', null, 'Project leads'),
          React.createElement('ul', null,
            leads.map((lead, idx) =>
              React.createElement('li', { key: idx }, lead)
            )
          )
        ),

        themeTokens.length > 0 && React.createElement('div', { className: 'detail-section' },
          React.createElement('h3', null, 'Themes explored'),
          React.createElement('div', { className: 'detail-badges' },
            themeTokens.map((theme, idx) =>
              React.createElement('span', { key: theme + idx, className: 'detail-badge' }, theme)
            )
          )
        )
      ),

      React.createElement('aside', { className: 'project-detail-aside' },
        metaGrid.length > 0 && React.createElement('div', { className: 'detail-meta-grid' },
          metaGrid.map(meta =>
            React.createElement('div', { className: 'detail-meta-card', key: meta.key },
              React.createElement('span', { className: 'detail-meta-label' }, meta.label),
              React.createElement('span', { className: 'detail-meta-value' }, meta.value)
            )
          )
        ),

        React.createElement('div', { className: 'detail-section compact' },
          React.createElement('h3', null, 'Content palette'),
          React.createElement('div', { className: 'detail-flags' },
            contentFlags.map(flag =>
              React.createElement('span', {
                key: flag.label,
                className: `detail-flag ${flag.active ? 'active' : ''}`
              }, flag.label)
            )
          )
        ),

        themeTokens.length > 0 && React.createElement('div', { className: 'detail-section compact secondary' },
          React.createElement('h3', null, 'Featured tags'),
          React.createElement('div', { className: 'detail-badges wrap' },
            themeTokens.map((theme, idx) =>
              React.createElement('span', { key: `aside-theme-${idx}`, className: 'detail-badge subtle' }, theme)
            )
          )
        )
      )
    )
  );
}
