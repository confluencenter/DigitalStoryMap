/**
 * ProjectList.js - Filtered project cards list
 */

export function ProjectList({
  projects = [],
  selectedProjectId = null,
  onSelectProject = () => {},
  onClearFilters = () => {},
  projectTagsMap = new Map()
}) {
  return React.createElement('div', { className: 'panel-projects-list' },
    React.createElement('div', { className: 'panel-projects-scroll' },
      projects.length === 0
        ? React.createElement('div', { className: 'panel-projects-empty' },
            React.createElement('p', null, 'No projects match your search'),
            React.createElement('button', {
              className: 'filter-clear-btn',
              onClick: onClearFilters,
              type: 'button'
            }, 'Clear filters')
          )
        : projects.map((project, index) => {
            const tagKey = project.id !== undefined && project.id !== null ? String(project.id) : project;
            const tagInfo = projectTagsMap.get(tagKey) || { tags: [], themes: [] };
            const previewThemes = tagInfo.themes.slice(0, 3);
            const extraThemeCount = Math.max(0, (tagInfo.themes?.length || 0) - previewThemes.length);
            const isSelected = project.id === selectedProjectId;
            const projectName = project.ProjectName || `Project ${index + 1}`;

            const productLabel = (project.Product || '').trim();
            const yearLabel = project.Year ? `Year ${project.Year}` : 'Year TBD';
            const descriptionText = (project.Description || '').trim();
            const descriptionSnippet = descriptionText.length > 160
              ? `${descriptionText.slice(0, 157).trim()}…`
              : descriptionText;
            const locationLabel = (project.Location || 'Location forthcoming').trim();
            const metaItems = [];

            if (project.ProjectCategory) {
              metaItems.push(project.ProjectCategory);
            }

            if (productLabel) {
              metaItems.push(productLabel);
            }

            const imageUrl = project.ImageUrl || null;
            const cardIndexLabel = `#${String(index + 1).padStart(2, '0')}`;
            const primaryLead = Array.isArray(project.ProjectLeads) && project.ProjectLeads.length > 0
              ? project.ProjectLeads[0]
              : '';
            const avatarSource = (primaryLead || projectName).trim();
            const avatarLabel = avatarSource ? avatarSource.slice(0, 2).toUpperCase() : 'PR';
            const heroBadge = previewThemes[0] || productLabel || project.ProjectCategory || 'Featured';
            const hashtagValues = [...previewThemes, productLabel].filter(Boolean);
            const formatHashtag = (value = '') => {
              const cleaned = value.replace(/[^a-z0-9]+/gi, '').toLowerCase();
              return cleaned ? `#${cleaned}` : null;
            };
            const hashtags = hashtagValues
              .map(formatHashtag)
              .filter(Boolean)
              .slice(0, 4);

            return React.createElement('div', {
              key: project.id || index,
              className: `panel-project-card ${isSelected ? 'selected' : ''}`,
              'data-testid': 'project-card'
            },
              React.createElement('button', {
                className: 'project-card-inner',
                onClick: () => onSelectProject(project),
                type: 'button',
                'aria-label': `View ${projectName} details – ${locationLabel}`,
                'data-selected': isSelected ? 'true' : 'false'
              },
                React.createElement('div', { className: `project-card-media ${imageUrl ? '' : 'placeholder'}` },
                  imageUrl
                    ? React.createElement('img', {
                        src: imageUrl,
                        alt: projectName,
                        loading: 'lazy'
                      })
                    : React.createElement('div', { className: 'project-card-media-placeholder' },
                        React.createElement('span', null, productLabel || 'Project')
                      ),
                  React.createElement('div', { className: 'project-card-media-overlay' }),
                  React.createElement('div', { className: 'project-card-media-top' },
                    heroBadge && React.createElement('span', { className: 'project-card-media-chip project-card-media-chip--hero' }, heroBadge),
                    React.createElement('span', { className: 'project-card-index' }, cardIndexLabel)
                  ),
                  React.createElement('div', { className: 'project-card-media-bottom' },
                    React.createElement('span', { className: 'project-card-media-location' }, locationLabel),
                    React.createElement('span', { className: 'project-card-media-chip' }, yearLabel)
                  )
                ),
                React.createElement('div', { className: 'project-card-body' },
                  React.createElement('div', { className: 'project-card-author' },
                    React.createElement('div', { className: 'project-card-avatar', 'aria-hidden': 'true' }, avatarLabel),
                    React.createElement('div', { className: 'project-card-author-meta' },
                      React.createElement('span', { className: 'project-card-author-name' }, primaryLead || projectName),
                      React.createElement('span', { className: 'project-card-author-product' },
                        productLabel || project.ProjectCategory || 'Borderlands Project'
                      )
                    )
                  ),
                  React.createElement('h3', { className: 'project-card-title' }, projectName),
                  descriptionSnippet && React.createElement('p', { className: 'project-card-description' }, descriptionSnippet),
                  (metaItems.length > 0 || extraThemeCount > 0) && React.createElement('div', { className: 'project-card-quick-meta' },
                    metaItems.slice(0, 2).map((item, metaIndex) =>
                      React.createElement('span', { key: metaIndex, className: 'project-card-quick-pill' }, item)
                    ),
                    extraThemeCount > 0 && React.createElement('span', { className: 'project-card-quick-pill muted' }, `+${extraThemeCount} themes`)
                  ),
                  hashtags.length > 0 && React.createElement('div', { className: 'project-card-hashtags' },
                    hashtags.map((tag, tagIndex) =>
                      React.createElement('span', { key: tagIndex, className: 'project-card-hashtag' }, tag)
                    )
                  )
                )
              )
            );
          })
    )
  );
}
