import { createWorldMap, createInactivityChart, createInactivityScatterPlot, createUPFChart, createDataCollectionMap, createMetricBoxPlot, createMetricScatterPlot, createUPFScatterPlot, createUPFBodyFatScatterPlot, createInteractiveScatterPlot, updateFilters, createUnifiedInteractiveChart, setUnifiedChartFilters, getUnifiedChartFilters, toggleHighlight } from './charts.js';
import { PAL_TEE_UPF_HDI_Data_Elsa } from './data.js';

// Get all unique population names for the selector
const allPopulations = [...new Set(PAL_TEE_UPF_HDI_Data_Elsa.map(d => d.Population))].sort();

// Currently selected populations for highlighting
let selectedPopulations = [];

const state = {
  map: { step: 0, totalSteps: 4, currentYear: 2022 },
  'combined-question': { step: 0, totalSteps: 2 },
  inactivity: { step: 0, totalSteps: 9, userGuess: null, viewMode: 'box', metric: 'tee', showRawData: true },
  upf: { step: 0, totalSteps: 2 },
  interactiveFilters: {
    xVar: 'upf',
    yVar: 'bodyFat',
    economies: ['highHDI', 'AGP', 'midHDI', 'HG', 'lowHDI', 'HORT'],
    sexes: ['M', 'F']
  }
};

// Preset configurations for each step of the unified chart
const chartPresets = {
  1: { xVar: 'Economy_Type', yVar: 'TEE', chartType: 'auto' },      // TEE over Economy
  2: { xVar: 'Economy_Type', yVar: 'PAL', chartType: 'auto' },      // PAL over Economy
  3: { xVar: 'Economy_Type', yVar: 'PercUPF', chartType: 'auto' },  // UPF over Economy
  4: { xVar: 'Economy_Type', yVar: 'Fat', chartType: 'auto' },      // Fat over Economy
  5: { xVar: 'TEE', yVar: 'Fat', chartType: 'auto' },        // Fat vs TEE
  6: { xVar: 'PAL', yVar: 'Fat', chartType: 'auto' },        // Fat vs PAL
  7: { xVar: 'PercUPF', yVar: 'Fat', chartType: 'auto' },    // Fat vs UPF
  8: { xVar: 'PercUPF', yVar: 'Fat', chartType: 'auto' }        // Exploration (user controlled)
};

const sectionOrder = ['map-section', 'combined-question-section', 'inactivity-section', 'conclusion-section'];

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
      createWorldMap('world-map', step === 2 ? 'United States' : null, state.map.currentYear);
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
      } else if (step >= 1 && step <= 8) {
        // Steps 1-8 use the unified chart
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
          1: 'Total Energy Expenditure (TEE) by Economy',
          2: 'Physical Activity Level (PAL) by Economy',
          3: 'Ultra-Processed Food (UPF) % by Economy',
          4: 'Body Fat % by Economy',
          5: 'Body Fat vs Total Energy Expenditure',
          6: 'Body Fat vs Physical Activity Level',
          7: 'Body Fat vs Ultra-Processed Food %',
          8: 'Interactive Data Explorer'
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
    case 'scatter':
      break;
    case 'upf':
      createUPFChart(
        'upf-chart',
        step >= 1,
        step >= 1 ? 'United States' : null
      );
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

function setupInteractiveFilters() {
  const ySelect = document.getElementById('y-variable-select');
  const xSelect = document.getElementById('x-variable-select');
  const economyCheckboxes = document.querySelectorAll('.economy-checkbox');
  const sexCheckboxes = document.querySelectorAll('.sex-checkbox');

  if (!ySelect || !xSelect) return;

  ySelect.value = state.interactiveFilters.yVar;
  xSelect.value = state.interactiveFilters.xVar;

  const updatePlot = () => {
    const selectedEconomies = Array.from(economyCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    const selectedSexes = Array.from(sexCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value === 'M' ? 'M' : 'F');

    state.interactiveFilters = {
      xVar: xSelect.value,
      yVar: ySelect.value,
      economies: selectedEconomies,
      sexes: selectedSexes
    };

    updateFilters(state.interactiveFilters);
    createInteractiveScatterPlot('inactivity-chart');
  };

  ySelect.addEventListener('change', updatePlot);
  xSelect.addEventListener('change', updatePlot);
  economyCheckboxes.forEach(cb => cb.addEventListener('change', updatePlot));
  sexCheckboxes.forEach(cb => cb.addEventListener('change', updatePlot));
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
        updateChart();
      };
    });
  };

  const updateChart = () => {
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
  };

  // Remove old listeners and add new ones
  if (ySelect) {
    ySelect.onchange = updateChart;
  }
  if (xSelect) {
    xSelect.onchange = () => {
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
      updateChart();
    };
  }
  if (maleCb) {
    maleCb.onchange = updateChart;
  }
  if (femaleCb) {
    femaleCb.onchange = updateChart;
  }
  if (boxBtn) {
    boxBtn.onclick = () => {
      boxBtn.classList.add('active');
      if (scatterBtn) scatterBtn.classList.remove('active');
      updateChart();
    };
  }
  if (scatterBtn) {
    scatterBtn.onclick = () => {
      scatterBtn.classList.add('active');
      if (boxBtn) boxBtn.classList.remove('active');
      updateChart();
    };
  }
  if (populationSelect) {
    populationSelect.onchange = () => {
      const selected = populationSelect.value;
      if (selected && !selectedPopulations.includes(selected)) {
        selectedPopulations.push(selected);
        renderPopulationTags();
        updateChart();
      }
      populationSelect.value = ''; // Reset dropdown
    };
  }

  // Initial render of tags
  renderPopulationTags();

  // Listen for highlight changes from clicking data points
  document.addEventListener('highlightChanged', (event) => {
    selectedPopulations = event.detail.highlightedPopulations;
    renderPopulationTags();
  });
}
