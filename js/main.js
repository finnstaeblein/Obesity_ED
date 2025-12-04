import { setupNavigation } from './scroll.js';
import { setupInteractions } from './interactions.js';
import { setupTimeline } from './timeline.js';
import { setupTrendFilters } from './trendFilters.js';

function init() {
  setupNavigation();
  setupInteractions();
  setupTimeline();
  setupTrendFilters();
  setupExploreButton();
}

function setupExploreButton() {
  const exploreBtn = document.getElementById('explore-now-btn');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', () => {
      const globalPatternsSection = document.getElementById('global-patterns-section');
      if (globalPatternsSection) {
        globalPatternsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
