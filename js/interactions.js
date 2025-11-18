import { setUserActivityGuess, toggleView, setMetric, toggleRawData, navigateToCard } from './scroll.js';

export function setupInteractions() {
  const metricToggleBtns = document.querySelectorAll('.metric-toggle-btn');
  metricToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      metricToggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const metric = btn.dataset.metric;
      // Navigate to the correct card based on metric
      if (metric === 'tee') {
        navigateToCard('inactivity-section', 1);
      } else if (metric === 'pal') {
        navigateToCard('inactivity-section', 2);
      }
    });
  });

  const viewTabs = document.querySelectorAll('.view-tab');
  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      viewTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.dataset.view;

      const rawDataControl = document.getElementById('raw-data-control');
      if (rawDataControl) {
        rawDataControl.style.display = view === 'box' ? 'flex' : 'none';
      }

      toggleView(view);
    });
  });

  const showRawDataCheckbox = document.getElementById('show-raw-data-checkbox');
  if (showRawDataCheckbox) {
    showRawDataCheckbox.addEventListener('change', (e) => {
      toggleRawData(e.target.checked);
    });
  }
  // This was old code for reader to use a slider to make a guess
  // const activitySlider = document.getElementById('activity-slider');
  // const activityValue = document.getElementById('activity-value');
  // const activitySubmitBtn = document.getElementById('activity-submit-btn');
  // const activityResult = document.getElementById('activity-result');

  // if (activitySlider && activityValue) {
  //   const updateSliderBackground = (value) => {
  //     const percentage = value;
  //     activitySlider.style.background = `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
  //   };

  //   updateSliderBackground(activitySlider.value);

  //   activitySlider.addEventListener('input', (e) => {
  //     const value = parseInt(e.target.value);
  //     activityValue.textContent = value;
  //     updateSliderBackground(value);
  //   });
  // }

  // if (activitySubmitBtn) {
  //   activitySubmitBtn.addEventListener('click', () => {
  //     const guess = parseInt(activitySlider.value);

  //     setUserActivityGuess(guess);

  //     const inactivitySection = document.getElementById('inactivity-section');
  //     if (inactivitySection) {
  //       inactivitySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  //     }

  //     activitySubmitBtn.disabled = true;
  //     activitySubmitBtn.style.opacity = '0.5';
  //     activitySubmitBtn.style.cursor = 'not-allowed';
  //   });
  // }

  const optionButtons = document.querySelectorAll('.option-button');
  const beliefNextBtn = document.getElementById('belief-next-btn');
  let selectedOption = null;

  // This is the code for the survey results
  const surveyResults = [
    { key: 'exercise', label: 'Not getting enough exercise', veryImportant: 75, somewhatImportant: 20, notImportant: 2, dontKnow: 1 },
    { key: 'diet', label: 'Lack of willpower over eating',  veryImportant: 59, somewhatImportant: 31, notImportant: 5, dontKnow: 2 },
    { key: 'food', label: 'Kinds of foods marketed at restaurants and groceries', veryImportant: 35, somewhatImportant: 7, notImportant: 5, dontKnow: 2 },
    { key: 'genetics', label: 'Genetics and hereditary factors', veryImportant: 32, somewhatImportant: 48, notImportant: 11, dontKnow: 5 }
  ];

  optionButtons.forEach(button => {
    button.addEventListener('click', () => {
      selectedOption = button.dataset.option;

      optionButtons.forEach(btn => {
        btn.classList.remove('option-selected');
      });

      button.classList.add('option-selected');
    });
  });

  if (beliefNextBtn) {
    beliefNextBtn.addEventListener('click', () => {
      setTimeout(() => {
        const beliefResult = document.getElementById('belief-result');
        if (beliefResult) {
          beliefResult.className = '';
          beliefResult.innerHTML = `
            <div>
              <h4 class="card-title">Percent saying this is a very important reason many Americans are very overweight</h4>
              <div class="bar-chart" id="belief-bar-chart"></div>
            </div>
          `;
          beliefResult.style.display = 'block';
          createBeliefBarChart(selectedOption);
        }
      }, 300);
    });
  }

  function createBeliefBarChart(userGuess) {
    const chartContainer = document.getElementById('belief-bar-chart');
    if (!chartContainer) return;

    const maxValue = 100;

    surveyResults.forEach(item => {
      const barWrapper = document.createElement('div');
      barWrapper.className = 'bar-wrapper';

      const labelDiv = document.createElement('div');
      labelDiv.className = 'bar-label';
      labelDiv.textContent = item.label;

      if (userGuess && item.key === userGuess) {
        const guessTag = document.createElement('span');
        guessTag.className = 'your-guess-tag';
        guessTag.textContent = 'Your Guess';
        labelDiv.appendChild(guessTag);
      }

      const barContainer = document.createElement('div');
      barContainer.className = 'bar-container';

      const bar = document.createElement('div');
      bar.className = 'bar';
      if (item.key === 'exercise') {
        bar.classList.add('bar-highlighted');
      }
      bar.style.width = `${(item.veryImportant / maxValue) * 100}%`;

      const barValue = document.createElement('span');
      barValue.className = 'bar-value';
      barValue.textContent = `${item.veryImportant}%`;

      bar.appendChild(barValue);
      barContainer.appendChild(bar);

      barWrapper.appendChild(labelDiv);
      barWrapper.appendChild(barContainer);
      chartContainer.appendChild(barWrapper);
    });
  }
}
