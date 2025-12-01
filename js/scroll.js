import { createWorldMap, createDataCollectionMap, createUnifiedInteractiveChart, setUnifiedChartFilters, getUnifiedChartFilters, toggleHighlight } from './charts.js';
import { PAL_TEE_UPF_HDI_Data_Elsa } from './data.js';

// Get all unique population names for the selector
const allPopulations = [...new Set(PAL_TEE_UPF_HDI_Data_Elsa.map(d => d.Population))].sort();

// Currently selected populations for highlighting
let selectedPopulations = [];

// Global function to update chart from control values
function updateChartFromControls() {
  const ySelect = document.getElementById('unified-y-select');
  const xSelect = document.getElementById('unified-x-select');
  const maleCb = document.getElementById('unified-male-cb');
  const femaleCb = document.getElementById('unified-female-cb');
  const boxBtn = document.getElementById('box-view-btn');
  const scatterBtn = document.getElementById('scatter-view-btn');

  const sexes = [];
  if (maleCb && maleCb.checked) sexes.push('M');
  if (femaleCb && femaleCb.checked) sexes.push('F');

  const currentFilters = getUnifiedChartFilters();
  const xVar = xSelect ? xSelect.value : currentFilters.xVar;
  const yVar = ySelect ? ySelect.value : currentFilters.yVar;

  // Determine chart type
  let chartType = 'auto';
  if (xVar === 'Economy_Type') {
    if (boxBtn && boxBtn.classList.contains('active')) {
      chartType = 'box';
    } else if (scatterBtn && scatterBtn.classList.contains('active')) {
      chartType = 'scatter';
    }
  } else {
    chartType = 'scatter'; // Force scatter when X is not Economy_Type
  }

  setUnifiedChartFilters({
    xVar,
    yVar,
    sexes,
    chartType,
    highlightedPopulations: selectedPopulations
  });

  createUnifiedInteractiveChart('inactivity-chart');
}

const state = {
  'global-trends': { step: 0, totalSteps: 1 },
  map: { step: 0, totalSteps: 4, currentYear: 2022 },
  'exploring-data': { step: 0, totalSteps: 1 },
  'combined-question': { step: 0, totalSteps: 2 },
  bridge: { step: 0, totalSteps: 1 },
  inactivity: { step: 0, totalSteps: 5 }
};

// Preset configurations for each step of the unified chart
const chartPresets = {
  1: { xVar: 'HDI_rank', yVar: 'Fat', chartType: 'auto' },          // Body fat over HDI rank
  2: { xVar: 'PAL', yVar: 'Fat', chartType: 'auto' },               // Fat vs PAL
  3: { xVar: 'PercUPF', yVar: 'Fat', chartType: 'auto' },           // Fat vs UPF
  4: { xVar: 'PercUPF', yVar: 'Fat', chartType: 'auto' }            // Exploration (user controlled)
};

const sectionOrder = ['global-trends-section', 'map-section', 'exploring-data-section', 'combined-question-section', 'bridge-section', 'inactivity-section', 'conclusion-section'];

function updateSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const sectionKey = sectionId.replace('-section', '');
  const currentStep = state[sectionKey].step;
  const totalSteps = state[sectionKey].totalSteps;

  const cards = section.querySelectorAll('.content-card');
  cards.forEach((card, index) => {
    if (index === currentStep) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  const prevBtn = section.querySelector('.prev-btn');
  const nextBtn = section.querySelector('.next-btn');

  if (prevBtn) {
    const currentIndex = sectionOrder.indexOf(sectionId);
    // Disable prev button only if on first card of first section
    prevBtn.disabled = currentStep === 0 && currentIndex === 0;
  }

  if (nextBtn) {
    nextBtn.disabled = false;
    if (currentStep === totalSteps - 1) {
      const currentIndex = sectionOrder.indexOf(sectionId);
      if (currentIndex === sectionOrder.length - 1) {
        nextBtn.disabled = true;
      }
    }
  }

  updateChart(sectionKey, currentStep);
}

function updateChart(sectionKey, step) {
  switch (sectionKey) {
    case 'map':
      // Hide the map for all steps - show placeholder
      const mapContainer = document.getElementById('world-map');
      if (mapContainer) {
        mapContainer.innerHTML = '';
      }
      const trendContainer = document.getElementById('multi-country-trend');
      if (trendContainer) {
        trendContainer.innerHTML = '';
      }
      break;
    case 'inactivity':
      const chartTitle = document.getElementById('inactivity-chart-title');
      const controlsContainer = document.getElementById('unified-controls-container');
      const chartTypeControl = document.getElementById('chart-type-control');

      if (step === 0) {
        // Data collection map
        if (chartTitle) chartTitle.textContent = 'Data Collection Locations';
        if (controlsContainer) controlsContainer.style.display = 'none';

        // Remove missing data section when navigating to map
        const noDataSection = document.querySelector('.no-data-section');
        if (noDataSection) noDataSection.remove();

        createDataCollectionMap('inactivity-chart');
      } else if (step >= 1 && step <= 4) {
        // Steps 1-4 use the unified chart
        const preset = chartPresets[step];

        // Apply preset configuration (keep highlighted populations)
        setUnifiedChartFilters({
          xVar: preset.xVar,
          yVar: preset.yVar,
          chartType: preset.chartType,
          sexes: ['M', 'F'],
          highlightedPopulations: selectedPopulations
        });

        // Update chart title based on step
        const titles = {
          1: 'Body Fat % by HDI Rank',
          2: 'Body Fat % vs Physical Activity Level (PAL)',
          3: 'Body Fat % vs Ultra-Processed Food (UPF) %',
          4: 'Interactive Data Explorer'
        };
        if (chartTitle) chartTitle.textContent = titles[step];

        // Show controls for all unified chart steps
        if (controlsContainer) controlsContainer.style.display = 'flex';

        // Update UI controls to reflect preset
        updateUnifiedControls(preset);

        // Draw the chart
        createUnifiedInteractiveChart('inactivity-chart');

        // Setup control listeners for all chart steps (users can modify)
        setupUnifiedChartControls();
      }
      break;
  }
}

function navigateToNextSection(currentSectionId) {
  const currentIndex = sectionOrder.indexOf(currentSectionId);
  if (currentIndex < sectionOrder.length - 1) {
    const nextSectionId = sectionOrder[currentIndex + 1];
    const nextSection = document.getElementById(nextSectionId);
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function navigateToPrevSection(currentSectionId) {
  const currentIndex = sectionOrder.indexOf(currentSectionId);
  if (currentIndex > 0) {
    const prevSectionId = sectionOrder[currentIndex - 1];
    const prevSection = document.getElementById(prevSectionId);
    if (prevSection) {
      prevSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

export function setupNavigation() {
  document.querySelectorAll('.prev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.section;
      const sectionKey = sectionId.replace('-section', '');

      if (state[sectionKey].step > 0) {
        state[sectionKey].step--;
        updateSection(sectionId);

        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      } else {
        // On first card, navigate to previous section
        navigateToPrevSection(sectionId);
      }
    });
  });

  document.querySelectorAll('.next-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.section;
      const sectionKey = sectionId.replace('-section', '');

      if (state[sectionKey].step < state[sectionKey].totalSteps - 1) {
        state[sectionKey].step++;
        updateSection(sectionId);

        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      } else {
        // On last card, navigate to next section
        navigateToNextSection(sectionId);
      }
    });
  });

  // Handle skip link clicks
  document.querySelectorAll('.skip-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetStep = parseInt(link.dataset.targetStep);
      navigateToCard('inactivity-section', targetStep);

      const section = document.getElementById('inactivity-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  Object.keys(state).forEach(key => {
    updateSection(`${key}-section`);
  });
}

export function setUserActivityGuess(value) {
  state.inactivity.userGuess = value;
  updateChart('inactivity', state.inactivity.step);
}

export function updateMapYear(year) {
  state.map.currentYear = year;
  updateChart('map', state.map.step);
}

export function toggleView(view) {
  state.inactivity.viewMode = view;

  const rawDataControl = document.getElementById('raw-data-control');
  if (rawDataControl) {
    rawDataControl.style.display = view === 'box' ? 'flex' : 'none';
  }

  updateChartTitle();
  updateChart('inactivity', state.inactivity.step);
}

export function setMetric(metric) {
  state.inactivity.metric = metric;
  updateChartTitle();
  updateChart('inactivity', state.inactivity.step);
}

export function toggleRawData(show) {
  state.inactivity.showRawData = show;
  updateChart('inactivity', state.inactivity.step);
}

function updateChartTitle() {
  const titleEl = document.getElementById('inactivity-chart-title');
  if (!titleEl) return;
  const metricName = state.inactivity.metric.toUpperCase();
  titleEl.textContent = `${metricName} by Economy Type`;
}

export function getState() {
  return state;
}

export function navigateToCard(sectionId, step) {
  const sectionKey = sectionId.replace('-section', '');
  state[sectionKey].step = step;
  updateSection(sectionId);
}

// Update UI controls to reflect current preset
function updateUnifiedControls(preset) {
  const ySelect = document.getElementById('unified-y-select');
  const xSelect = document.getElementById('unified-x-select');
  const maleCb = document.getElementById('unified-male-cb');
  const femaleCb = document.getElementById('unified-female-cb');
  const boxBtn = document.getElementById('box-view-btn');
  const scatterBtn = document.getElementById('scatter-view-btn');
  const populationSelect = document.getElementById('population-select');
  const selectedPopulationsContainer = document.getElementById('selected-populations');

  if (ySelect) ySelect.value = preset.yVar;
  if (xSelect) xSelect.value = preset.xVar;
  if (maleCb) maleCb.checked = true;
  if (femaleCb) femaleCb.checked = true;
  if (populationSelect) populationSelect.value = '';
  // Keep population tags - they persist across card changes

  // Update chart type buttons
  if (boxBtn && scatterBtn) {
    if (preset.chartType === 'box') {
      boxBtn.classList.add('active');
      scatterBtn.classList.remove('active');
    } else if (preset.chartType === 'scatter') {
      scatterBtn.classList.add('active');
      boxBtn.classList.remove('active');
    } else {
      // For 'auto', determine based on X-axis variable
      if (preset.xVar === 'Economy_Type') {
        boxBtn.classList.add('active');
        scatterBtn.classList.remove('active');
      } else {
        scatterBtn.classList.add('active');
        boxBtn.classList.remove('active');
      }
    }
  }

}

// Setup event listeners for unified chart controls
function setupUnifiedChartControls() {
  const controlsContainer = document.getElementById('unified-controls-container');
  const ySelect = document.getElementById('unified-y-select');
  const xSelect = document.getElementById('unified-x-select');
  const maleCb = document.getElementById('unified-male-cb');
  const femaleCb = document.getElementById('unified-female-cb');
  const boxBtn = document.getElementById('box-view-btn');
  const scatterBtn = document.getElementById('scatter-view-btn');
  const populationSelect = document.getElementById('population-select');
  const selectedPopulationsContainer = document.getElementById('selected-populations');

  // Populate population dropdown
  if (populationSelect && populationSelect.options.length <= 1) {
    allPopulations.forEach(pop => {
      const option = document.createElement('option');
      option.value = pop;
      option.textContent = pop;
      populationSelect.appendChild(option);
    });
  }


  // Render selected population tags
  const renderPopulationTags = () => {
    if (!selectedPopulationsContainer) return;
    selectedPopulationsContainer.innerHTML = '';

    selectedPopulations.forEach(pop => {
      const tag = document.createElement('span');
      tag.className = 'population-tag';
      tag.innerHTML = `
        ${pop.length > 15 ? pop.substring(0, 13) + '...' : pop}
        <span class="population-tag-remove" data-pop="${pop}">×</span>
      `;
      selectedPopulationsContainer.appendChild(tag);
    });

    // Add click handlers for remove buttons
    selectedPopulationsContainer.querySelectorAll('.population-tag-remove').forEach(btn => {
      btn.onclick = (e) => {
        const popToRemove = e.target.dataset.pop;
        selectedPopulations = selectedPopulations.filter(p => p !== popToRemove);
        renderPopulationTags();
        updateChartFromControls();
      };
    });
  };

  // Check if listeners have already been attached using a data attribute
  if (!controlsContainer || controlsContainer.dataset.listenersAttached === 'true') {
    renderPopulationTags();
    return;
  }

  // Mark as initialized
  controlsContainer.dataset.listenersAttached = 'true';

  if (ySelect) {
    ySelect.addEventListener('change', updateChartFromControls);
  }
  if (xSelect) {
    xSelect.addEventListener('change', () => {
      // Automatically switch chart type based on X-axis
      const xVar = xSelect.value;
      if (xVar === 'Economy_Type') {
        // When X is Economy_Type, default to box plot
        if (boxBtn) boxBtn.classList.add('active');
        if (scatterBtn) scatterBtn.classList.remove('active');
      } else {
        // When X is not Economy_Type, use scatter plot
        if (scatterBtn) scatterBtn.classList.add('active');
        if (boxBtn) boxBtn.classList.remove('active');
      }
      updateChartFromControls();
    });
  }
  if (maleCb) {
    maleCb.addEventListener('change', updateChartFromControls);
  }
  if (femaleCb) {
    femaleCb.addEventListener('change', updateChartFromControls);
  }
  if (boxBtn) {
    boxBtn.addEventListener('click', () => {
      boxBtn.classList.add('active');
      if (scatterBtn) scatterBtn.classList.remove('active');
      updateChartFromControls();
    });
  }
  if (scatterBtn) {
    scatterBtn.addEventListener('click', () => {
      scatterBtn.classList.add('active');
      if (boxBtn) boxBtn.classList.remove('active');
      updateChartFromControls();
    });
  }
  if (populationSelect) {
    populationSelect.addEventListener('change', () => {
      const selected = populationSelect.value;
      if (selected && !selectedPopulations.includes(selected)) {
        selectedPopulations.push(selected);
        renderPopulationTags();
        updateChartFromControls();
      }
      populationSelect.value = ''; // Reset dropdown
    });
  }

  // Listen for highlight changes from clicking data points (only once per page)
  if (!document.body.dataset.highlightListenerAttached) {
    document.body.dataset.highlightListenerAttached = 'true';
    document.addEventListener('highlightChanged', (event) => {
      selectedPopulations = event.detail.highlightedPopulations;
      renderPopulationTags();
    });
  }

  // Always render tags
  renderPopulationTags();
}
