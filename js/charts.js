import { countryData, obesityTrends, topObeseCountries, getObesityForYear, trendYears, populationData, PAL_TEE_UPF_HDI_Data_Elsa } from './data.js';

// Create a single global tooltip for all charts
const globalTooltip = d3.select('body').append('div')
  .attr('class', 'chart-tooltip')
  .style('position', 'absolute');

function addTooltipIcon(parent, x, y, tooltipText, rotation = 0) {
  const iconGroup = parent.append('g')
    .attr('transform', `translate(${x}, ${y})${rotation ? ` rotate(${rotation})` : ''}`)
    .style('cursor', 'pointer');

  iconGroup.append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 7)
    .attr('fill', '#6b7280')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5);

  iconGroup.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', '10px')
    .attr('font-weight', '700')
    .attr('fill', '#fff')
    .text('?');

  iconGroup
    .on('mouseover', function(event) {
      globalTooltip.html(tooltipText)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('visible', true);
    })
    .on('mouseout', function() {
      globalTooltip.classed('visible', false);
    });

  return iconGroup;
}

let currentFilters = {
  xVar: 'upf',
  yVar: 'bodyFat',
  economies: ['highHDI', 'AGP', 'midHDI', 'HG', 'lowHDI', 'HORT'],
  sexes: ['M', 'F']
};

export function createWorldMap(containerId, highlightCountry = null, year = 2022) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const width = container.clientWidth || 800;
  const height = 500;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Add title
  svg.append('text')
    .attr('x', 0)
    .attr('y', 30)
    .attr('text-anchor', 'start')
    .attr('font-size', '20px')
    .attr('font-weight', '700')
    .attr('fill', '#5c2e1e')
    .text(`Global Obesity Rates (${year})`);

  const projection = d3.geoNaturalEarth1()
    .scale(width / 5.5)
    .translate([width / 2, height / 1.9]);

  const path = d3.geoPath().projection(projection);

  const countryCodeMap = {};
  countryData.forEach(d => {
    countryCodeMap[d.code] = d.obesity;
  });

  const colorScale = d3.scaleThreshold()
    .domain([5, 10, 15, 20, 25, 30, 35])
    .range(['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#f97316', '#dc2626', '#991b1b']);

  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
    const countries = topojson.feature(world, world.objects.countries);

    svg.append('g')
      .selectAll('path')
      .data(countries.features)
      .join('path')
      .attr('d', path)
      .attr('fill', d => {
        const countryName = d.properties.name;
        const countryEntry = countryData.find(c => c.country === countryName);
        if (countryEntry) {
          const obesityRate = getObesityForYear(countryEntry.country, year);
          return colorScale(obesityRate);
        }
        return '#e5e7eb';
      })
      .attr('stroke', d => {
        const countryName = d.properties.name;
        return countryName === highlightCountry ? '#5c2e1e' : '#fff';
      })
      .attr('stroke-width', d => {
        const countryName = d.properties.name;
        return countryName === highlightCountry ? 2.5 : 0.5;
      })
      .append('title')
      .text(d => {
        const countryName = d.properties.name;
        const countryEntry = countryData.find(c => c.country === countryName);
        if (countryEntry) {
          const obesityRate = getObesityForYear(countryEntry.country, year);
          return `${countryEntry.country}: ${obesityRate.toFixed(1)}% (${year})`;
        }
        return countryName;
      });

    const legendWidth = 200;
    const legendHeight = 15;
    const legendX = width - legendWidth - 20;
    const legendY = height - 60;

    const legend = svg.append('g')
      .attr('transform', `translate(${legendX}, ${legendY})`);

    const legendScale = d3.scaleLinear()
      .domain([0, 40])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .tickValues([0, 5, 10, 15, 20, 25, 30, 35, 40])
      .tickFormat(d => d + '%')
      .tickSize(legendHeight);

    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    const stops = [
      { offset: '0%', color: '#fef3c7' },
      { offset: '12.5%', color: '#fde68a' },
      { offset: '25%', color: '#fcd34d' },
      { offset: '37.5%', color: '#fbbf24' },
      { offset: '50%', color: '#f59e0b' },
      { offset: '62.5%', color: '#f97316' },
      { offset: '75%', color: '#dc2626' },
      { offset: '100%', color: '#991b1b' }
    ];

    stops.forEach(stop => {
      gradient.append('stop')
        .attr('offset', stop.offset)
        .attr('stop-color', stop.color);
    });

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)');

    legend.append('g')
      .attr('class', 'legend-axis')
      .call(legendAxis)
      .select('.domain').remove();

    legend.selectAll('.tick line')
      .attr('stroke', '#5c2e1e')
      .attr('stroke-width', 1);

    legend.selectAll('.tick text')
      .attr('fill', '#2d1810')
      .attr('font-size', '10px')
      .attr('font-weight', '600');

    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('fill', '#2d1810')
      .text('Obesity Rate');
  });
}

export function createTrendChart(containerId, highlightRange = null) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(obesityTrends, d => d.year))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, 40])
    .range([height, 0]);

  if (highlightRange) {
    svg.append('rect')
      .attr('x', x(highlightRange[0]))
      .attr('y', 0)
      .attr('width', x(highlightRange[1]) - x(highlightRange[0]))
      .attr('height', height)
      .attr('fill', '#fef3c7')
      .attr('opacity', 0.5);
  }

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value));

  svg.append('path')
    .datum(obesityTrends)
    .attr('fill', 'none')
    .attr('stroke', '#dc2626')
    .attr('stroke-width', 3)
    .attr('d', line);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')));

  svg.append('g')
    .call(d3.axisLeft(y).tickFormat(d => d + '%'));

  svg.selectAll('circle')
    .data(obesityTrends)
    .join('circle')
    .attr('cx', d => x(d.year))
    .attr('cy', d => y(d.value))
    .attr('r', 4)
    .attr('fill', '#dc2626');
}


// Not relevant but when I remove it hides my maps

export function createInactivityChart(containerId, userGuess = null, highlightCountry = null) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const sortedData = [...countryData].sort((a, b) => b.inactivity - a.inactivity);

  const margin = { top: 40, right: 30, bottom: 40, left: 150 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand()
    .domain(sortedData.map(d => d.country))
    .range([0, height])
    .padding(0.2);

  const x = d3.scaleLinear()
    .domain([0, 60])
    .range([0, width]);

  if (userGuess !== null) {
    svg.append('line')
      .attr('x1', x(userGuess))
      .attr('x2', x(userGuess))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '8,4')
      .attr('opacity', 0.8);

    svg.append('text')
      .attr('x', x(userGuess))
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#3b82f6')
      .text(`Your guess: ${userGuess}%`);
  }

  svg.selectAll('rect')
    .data(sortedData)
    .join('rect')
    .attr('y', d => y(d.country))
    .attr('x', 0)
    .attr('height', y.bandwidth())
    .attr('width', d => x(d.inactivity))
    .attr('fill', d => d.country === highlightCountry ? '#dc2626' : '#f87171')
    .attr('stroke', d => d.country === highlightCountry ? '#991b1b' : 'none')
    .attr('stroke-width', 2);

  svg.append('g')
    .call(d3.axisLeft(y));

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d => d + '%'));

  svg.selectAll('text.value')
    .data(sortedData)
    .join('text')
    .attr('class', 'value')
    .attr('x', d => x(d.inactivity) + 5)
    .attr('y', d => y(d.country) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('font-size', '12px')
    .attr('fill', '#374151')
    .text(d => d.inactivity + '%');
}
export function createScatterPlot(containerId, userGuess = null, showTrendLine = false, highlightCountry = null) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([3000, 7000])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, 40])
    .range([height, 0]);

  if (userGuess) {
    svg.append('line')
      .attr('x1', x(userGuess))
      .attr('x2', x(userGuess))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4');

    svg.append('text')
      .attr('x', x(userGuess))
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280')
      .text('Your guess');
  }

  if (showTrendLine) {
    const xMean = d3.mean(countryData, d => d.activity);
    const yMean = d3.mean(countryData, d => d.obesity);

    let num = 0, den = 0;
    countryData.forEach(d => {
      num += (d.activity - xMean) * (d.obesity - yMean);
      den += (d.activity - xMean) ** 2;
    });
    const slope = num / den;
    const intercept = yMean - slope * xMean;

    const x1 = 3000, x2 = 7000;
    const y1 = slope * x1 + intercept;
    const y2 = slope * x2 + intercept;

    svg.append('line')
      .attr('x1', x(x1))
      .attr('x2', x(x2))
      .attr('y1', y(y1))
      .attr('y2', y(y2))
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.6);
  }

  svg.selectAll('circle')
    .data(countryData)
    .join('circle')
    .attr('cx', d => x(d.activity))
    .attr('cy', d => y(d.obesity))
    .attr('r', d => d.country === highlightCountry ? 8 : 5)
    .attr('fill', d => d.country === highlightCountry ? '#dc2626' : '#60a5fa')
    .attr('stroke', d => d.country === highlightCountry ? '#991b1b' : '#fff')
    .attr('stroke-width', d => d.country === highlightCountry ? 3 : 1)
    .attr('opacity', 0.7)
    .append('title')
    .text(d => `${d.country}\nSteps: ${d.activity}\nObesity: ${d.obesity}%`);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', '#374151')
    .text('Daily Steps');

  svg.append('g')
    .call(d3.axisLeft(y).tickFormat(d => d + '%'));

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', '#374151')
    .text('Obesity Rate');
}
export function createInactivityScatterPlot(containerId, highlightCountry = null) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([10, 60])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, 40])
    .range([height, 0]);

  const xMean = d3.mean(countryData, d => d.inactivity);
  const yMean = d3.mean(countryData, d => d.obesity);

  let num = 0, den = 0;
  countryData.forEach(d => {
    num += (d.inactivity - xMean) * (d.obesity - yMean);
    den += (d.inactivity - xMean) ** 2;
  });
  const slope = num / den;
  const intercept = yMean - slope * xMean;

  const x1 = 10, x2 = 60;
  const y1 = slope * x1 + intercept;
  const y2 = slope * x2 + intercept;

  svg.append('line')
    .attr('x1', x(x1))
    .attr('x2', x(x2))
    .attr('y1', y(y1))
    .attr('y2', y(y2))
    .attr('stroke', '#3b82f6')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,5')
    .attr('opacity', 0.6);

  const ssTotal = countryData.reduce((sum, d) => sum + Math.pow(d.obesity - yMean, 2), 0);
  const ssResidual = countryData.reduce((sum, d) => {
    const predicted = slope * d.inactivity + intercept;
    return sum + Math.pow(d.obesity - predicted, 2);
  }, 0);
  const rSquared = 1 - (ssResidual / ssTotal);

  svg.append('text')
    .attr('x', width - 10)
    .attr('y', 20)
    .attr('text-anchor', 'end')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#3b82f6')
    .text(`R² = ${rSquared.toFixed(3)}`);

  svg.selectAll('circle')
    .data(countryData)
    .join('circle')
    .attr('cx', d => x(d.inactivity))
    .attr('cy', d => y(d.obesity))
    .attr('r', d => d.country === highlightCountry ? 8 : 5)
    .attr('fill', d => d.country === highlightCountry ? '#dc2626' : '#60a5fa')
    .attr('stroke', d => d.country === highlightCountry ? '#991b1b' : '#fff')
    .attr('stroke-width', d => d.country === highlightCountry ? 3 : 1)
    .attr('opacity', 0.7)
    .append('title')
    .text(d => `${d.country}\nInactivity: ${d.inactivity}%\nObesity: ${d.obesity}%`);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d => d + '%'));

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', '#374151')
    .text('Insufficient Physical Activity');

  svg.append('g')
    .call(d3.axisLeft(y).tickFormat(d => d + '%'));

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', '#374151')
    .text('Obesity Rate');
}
export function createUPFChart(containerId, showTrendLine = false, highlightCountry = null) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([15, 65])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, 40])
    .range([height, 0]);

  if (showTrendLine) {
    const xMean = d3.mean(countryData, d => d.upf);
    const yMean = d3.mean(countryData, d => d.obesity);

    let num = 0, den = 0;
    countryData.forEach(d => {
      num += (d.upf - xMean) * (d.obesity - yMean);
      den += (d.upf - xMean) ** 2;
    });
    const slope = num / den;
    const intercept = yMean - slope * xMean;

    const x1 = 15, x2 = 65;
    const y1 = slope * x1 + intercept;
    const y2 = slope * x2 + intercept;

    svg.append('line')
      .attr('x1', x(x1))
      .attr('x2', x(x2))
      .attr('y1', y(y1))
      .attr('y2', y(y2))
      .attr('stroke', '#dc2626')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8);
  }

  svg.selectAll('circle')
    .data(countryData)
    .join('circle')
    .attr('cx', d => x(d.upf))
    .attr('cy', d => y(d.obesity))
    .attr('r', d => d.country === highlightCountry ? 8 : 5)
    .attr('fill', d => d.country === highlightCountry ? '#dc2626' : '#fbbf24')
    .attr('stroke', d => d.country === highlightCountry ? '#991b1b' : '#fff')
    .attr('stroke-width', d => d.country === highlightCountry ? 3 : 1)
    .attr('opacity', 0.7)
    .append('title')
    .text(d => `${d.country}\nUPF: ${d.upf}%\nObesity: ${d.obesity}%`);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', '#374151')
    .text('Ultra-Processed Food (% of calories)');

  svg.append('g')
    .call(d3.axisLeft(y).tickFormat(d => d + '%'));

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', '#374151')
    .text('Obesity Rate');
}

// end of not relevant code

const economyColors = {
  'highHDI': '#3b82f6',
  'midHDI': '#14b8a6',
  'lowHDI': '#84cc16',
  'AGP': '#f97316',  
  'HORT': '#fbbf24',
  'HG': '#dc2626',
};

const economyOrder = [
  'highHDI',
  'midHDI',
  'lowHDI',
  'HORT',
  'AGP',
  'HG'
];

const economyLabels = {
  'highHDI': 'high HDI',
  'midHDI': 'mid HDI',
  'lowHDI': 'low HDI',
  'HG': 'hunter-gatherer',
  'HORT': 'horticulturalist',
  'AGP': 'agropastoralist'
};

// Tooltip
const tooltip = d3.select('body').append('div')
.attr('class', 'map-tooltip')
.style('position', 'absolute')
.style('visibility', 'hidden')
.style('background-color', 'rgba(0, 0, 0, 0.85)')
.style('color', '#fff')
.style('padding', '8px 12px')
.style('border-radius', '6px')
.style('font-size', '13px')
.style('pointer-events', 'none')
.style('z-index', '1000')
.style('box-shadow', '0 2px 8px rgba(0,0,0,0.2)');

// ------------------------------------------------------------
export function createDataCollectionMap(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const width = container.clientWidth || 800;
  const height = 500;
  const legendWidth = 180;
  const mapWidth = width - legendWidth - 40;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const projection = d3.geoNaturalEarth1()
    .scale(mapWidth / 5.5)
    .translate([mapWidth / 2, height / 1.9]);

  const path = d3.geoPath().projection(projection);

  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
    const countries = topojson.feature(world, world.objects.countries);

    const mapGroup = svg.append('g');

    // Draw world map
    mapGroup.append('g')
      .selectAll('path')
      .data(countries.features)
      .join('path')
      .attr('d', path)
      .attr('fill', '#2d3748')
      .attr('stroke', '#4a5568')
      .attr('stroke-width', 0.5);

    // Radius scale based on sample size N_M + N_F
    const maxN = d3.max(PAL_TEE_UPF_HDI_Data_Elsa, d => 
      (Number(d.N_M) || 0) + (Number(d.N_F) || 0)
    );

    const radiusScale = d3.scaleSqrt()
      .domain([0, maxN])
      .range([4, 14]);

    // Plot each population directly
    PAL_TEE_UPF_HDI_Data_Elsa.forEach(pop => {
      const lat = Number(pop.lat);
      const lon = Number(pop.lon);
      if (isNaN(lat) || isNaN(lon)) return;

      const totalN = (Number(pop.N_M) || 0) + (Number(pop.N_F) || 0);

      const [x, y] = projection([lon, lat]);

      mapGroup.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', radiusScale(totalN))
        .attr('fill', economyColors[pop.Economy])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseover', function(event) {
          d3.select(this)
            .attr('opacity', 1)
            .attr('stroke-width', 2.5);

          tooltip
            .html(`<strong>${pop.Population}</strong><br/>N = ${totalN}<br/> Economy: ${pop.Economy}` )
            .style('visibility', 'visible');
        })
        .on('mousemove', function(event) {
          tooltip
            .style('top', (event.pageY - 10) + 'px')
            .style('left', (event.pageX + 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('opacity', 0.85)
            .attr('stroke-width', 1.5);

          tooltip.style('visibility', 'hidden');
        });
    });

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${mapWidth + 20}, 80)`);

    legend.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('font-size', '16px')
      .attr('font-weight', '700')
      .attr('fill', '#2d1810')
      .text('Economy');

    economyOrder.forEach((type, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${25 + i * 28})`);

      legendRow.append('circle')
        .attr('cx', 8)
        .attr('cy', 0)
        .attr('r', 6)
        .attr('fill', economyColors[type])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      legendRow.append('text')
        .attr('x', 22)
        .attr('y', 5)
        .attr('font-size', '13px')
        .attr('fill', '#2d1810')
        .text(economyLabels[type]);
    });
  });
}


export function createMetricBoxPlot(containerId, metric = 'pal', showRawData = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 60, right: 180, bottom: 60, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const economyOrder = ['highHDI', 'AGP', 'midHDI', 'lowHDI', 'HG', 'HORT'];

  const groupedData = d3.group(populationData, d => d.economy);

  const boxPlotData = economyOrder.map(economy => {
    const values = (groupedData.get(economy) || []).map(d => d[metric]).sort(d3.ascending);
    if (values.length === 0) return null;

    const q1 = d3.quantile(values, 0.25);
    const median = d3.quantile(values, 0.5);
    const q3 = d3.quantile(values, 0.75);
    const iqr = q3 - q1;
    const min = Math.max(d3.min(values), q1 - 1.5 * iqr);
    const max = Math.min(d3.max(values), q3 + 1.5 * iqr);

    return { economy, q1, median, q3, min, max, values };
  }).filter(d => d !== null);

  const x = d3.scaleBand()
    .domain(economyOrder)
    .range([0, width])
    .padding(0.3);

  const yDomain = metric === 'tee' ? [1500, 4000] : [1.2, 2.6];
  const y = d3.scaleLinear()
    .domain(yDomain)
    .range([height, 0]);

  boxPlotData.forEach(box => {
    const center = x(box.economy) + x.bandwidth() / 2;
    const boxWidth = x.bandwidth();

    svg.append('line')
      .attr('x1', center)
      .attr('x2', center)
      .attr('y1', y(box.min))
      .attr('y2', y(box.q1))
      .attr('stroke', '#374151')
      .attr('stroke-width', 1.5);

    svg.append('line')
      .attr('x1', center)
      .attr('x2', center)
      .attr('y1', y(box.q3))
      .attr('y2', y(box.max))
      .attr('stroke', '#374151')
      .attr('stroke-width', 1.5);

    svg.append('line')
      .attr('x1', center - boxWidth / 4)
      .attr('x2', center + boxWidth / 4)
      .attr('y1', y(box.min))
      .attr('y2', y(box.min))
      .attr('stroke', '#374151')
      .attr('stroke-width', 2);

    svg.append('line')
      .attr('x1', center - boxWidth / 4)
      .attr('x2', center + boxWidth / 4)
      .attr('y1', y(box.max))
      .attr('y2', y(box.max))
      .attr('stroke', '#374151')
      .attr('stroke-width', 2);

    svg.append('rect')
      .attr('x', center - boxWidth / 2)
      .attr('y', y(box.q3))
      .attr('width', boxWidth)
      .attr('height', y(box.q1) - y(box.q3))
      .attr('fill', economyColors[box.economy])
      .attr('stroke', '#374151')
      .attr('stroke-width', 1.5);

    svg.append('line')
      .attr('x1', center - boxWidth / 2)
      .attr('x2', center + boxWidth / 2)
      .attr('y1', y(box.median))
      .attr('y2', y(box.median))
      .attr('stroke', '#374151')
      .attr('stroke-width', 2.5);
  });

  if (showRawData) {
    const tooltip = d3.select('body').append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', '#fef3c7')
      .style('border', '2px solid #5c2e1e')
      .style('border-radius', '8px')
      .style('padding', '10px')
      .style('font-family', 'Fredoka, sans-serif')
      .style('font-size', '14px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    boxPlotData.forEach(box => {
      const center = x(box.economy) + x.bandwidth() / 2;
      const dataPoints = (groupedData.get(box.economy) || []);

      dataPoints.forEach(d => {
        const shapeX = center + (Math.random() - 0.5) * x.bandwidth() * 0.3;
        const shapeY = y(d[metric]);
        const size = 6;

        if (d.sex === 'M') {
          svg.append('circle')
            .attr('class', `raw-point-${box.economy}`)
            .attr('cx', shapeX)
            .attr('cy', shapeY)
            .attr('r', size)
            .attr('fill', economyColors[box.economy])
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8)
            .on('mouseover', function(event) {
              d3.select(this)
                .attr('r', size + 2)
                .attr('opacity', 1);
              tooltip.style('visibility', 'visible')
                .html(`<strong>${d.population}</strong><br/>Population: ${d.name}<br/>Sex: ${d.sex === 'M' ? 'Male' : 'Female'}<br/>${metric.toUpperCase()}: ${d[metric].toFixed(2)}`);
            })
            .on('mousemove', function(event) {
              tooltip.style('top', (event.pageY - 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
            })
            .on('mouseout', function() {
              d3.select(this)
                .attr('r', size)
                .attr('opacity', 0.8);
              tooltip.style('visibility', 'hidden');
            });
        } else {
          const triangleSize = 80;
          svg.append('path')
            .attr('class', `raw-point-${box.economy}`)
            .attr('d', d3.symbol().type(d3.symbolTriangle).size(triangleSize))
            .attr('transform', `translate(${shapeX},${shapeY})`)
            .attr('fill', economyColors[box.economy])
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8)
            .on('mouseover', function(event) {
              d3.select(this)
                .attr('d', d3.symbol().type(d3.symbolTriangle).size(120))
                .attr('opacity', 1);
              tooltip.style('visibility', 'visible')
                .html(`<strong>${d.population}</strong><br/>Population: ${d.name}<br/>Sex: ${d.sex === 'M' ? 'Male' : 'Female'}<br/>${metric.toUpperCase()}: ${d[metric].toFixed(2)}`);
            })
            .on('mousemove', function(event) {
              tooltip.style('top', (event.pageY - 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
            })
            .on('mouseout', function() {
              d3.select(this)
                .attr('d', d3.symbol().type(d3.symbolTriangle).size(triangleSize))
                .attr('opacity', 0.8);
              tooltip.style('visibility', 'hidden');
            });
        }
      });
    });
  }

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  // X-axis label with tooltip
  const xAxisLabelGroup = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height + 45})`);

  xAxisLabelGroup.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Economy');

  addTooltipIcon(xAxisLabelGroup, 50, -5, 'Economy type classification based on HDI (Human Development Index), AGP (Agriculture-Pastoralism), HG (Hunter-Gatherer), and HORT (Horticulturalist)');

  svg.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  // Y-axis label with tooltip
  const yAxisLabelGroup = svg.append('g')
    .attr('transform', `rotate(-90) translate(${-height / 2}, -45)`);

  yAxisLabelGroup.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text(metric === 'tee' ? 'TEE (kcal/day)' : 'PAL');

  addTooltipIcon(yAxisLabelGroup, 80, -5,
    metric === 'tee'
      ? 'TEE (Total Energy Expenditure): The total amount of energy (calories) burned per day, measured in kilocalories per day'
      : 'PAL (Physical Activity Level): A ratio of total energy expenditure to basal metabolic rate, indicating overall activity level');

  const legendGroup = svg.append('g')
    .attr('transform', `translate(${width + 20}, -40)`);

  legendGroup.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', '16px')
    .attr('font-weight', '700')
    .attr('fill', '#000')
    .text('Economy');

  const economyLabels = [
    { key: 'highHDI', label: 'highHDI' },
    { key: 'AGP', label: 'AGP' },
    { key: 'midHDI', label: 'midHDI' },
    { key: 'lowHDI', label: 'lowHDI' },
    { key: 'HG', label: 'HG' },
    { key: 'HORT', label: 'HORT' }
  ];

  economyLabels.forEach((item, i) => {
    const legendItem = legendGroup.append('g')
      .attr('transform', `translate(0, ${25 + i * 25})`);

    legendItem.append('circle')
      .attr('cx', 8)
      .attr('cy', 0)
      .attr('r', 6)
      .attr('fill', economyColors[item.key])
      .attr('stroke', 'none');

    legendItem.append('text')
      .attr('x', 22)
      .attr('y', 5)
      .attr('font-size', '14px')
      .attr('fill', '#000')
      .text(item.label);
  });

  const sexLegendGroup = svg.append('g')
    .attr('transform', `translate(${width + 20}, ${180})`);

  sexLegendGroup.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', '16px')
    .attr('font-weight', '700')
    .attr('fill', '#000')
    .text('Sex');

  const maleLegend = sexLegendGroup.append('g')
    .attr('transform', 'translate(0, 25)');

  maleLegend.append('circle')
    .attr('cx', 8)
    .attr('cy', 0)
    .attr('r', 6)
    .attr('fill', '#6b7280')
    .attr('stroke', 'none');

  maleLegend.append('text')
    .attr('x', 22)
    .attr('y', 5)
    .attr('font-size', '14px')
    .attr('fill', '#000')
    .text('Male');

  const femaleLegend = sexLegendGroup.append('g')
    .attr('transform', 'translate(0, 50)');

  femaleLegend.append('path')
    .attr('d', d3.symbol().type(d3.symbolTriangle).size(50))
    .attr('transform', 'translate(8, 0)')
    .attr('fill', '#6b7280')
    .attr('stroke', 'none');

  femaleLegend.append('text')
    .attr('x', 22)
    .attr('y', 5)
    .attr('font-size', '14px')
    .attr('fill', '#000')
    .text('Female');
}

export function createMetricScatterPlot(containerId, metric = 'pal') {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 60, right: 180, bottom: 60, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background-color', 'rgba(255, 255, 255, 0.95)')
    .style('padding', '12px')
    .style('border', '1px solid #ccc')
    .style('border-radius', '6px')
    .style('font-size', '13px')
    .style('box-shadow', '0 4px 6px rgba(0,0,0,0.1)')
    .style('pointer-events', 'none')
    .style('z-index', '1000');

  // const economyColors = {
  //   'highHDI': '#3b82f6',
  //   'AGP': '#f97316',
  //   'midHDI': '#dc2626',
  //   'lowHDI': '#14b8a6',
  //   'HG': '#84cc16',
  //   'HORT': '#fbbf24'
  // };

  const x = d3.scaleLinear()
    .domain([0, 230])
    .range([0, width]);

  const yDomain = metric === 'tee' ? [1500, 4000] : [1.2, 2.6];
  const y = d3.scaleLinear()
    .domain(yDomain)
    .range([height, 0]);

  const economyGroups = d3.group(populationData, d => d.economy);

  economyGroups.forEach((values, economy) => {
    const males = values.filter(d => d.sex === 'M');
    const females = values.filter(d => d.sex === 'F');

    if (males.length > 0) {
      const xMean = d3.mean(males, d => d.hdi_rank);
      const yMean = d3.mean(males, d => d[metric]);
      let num = 0, den = 0;
      males.forEach(d => {
        num += (d.hdi_rank - xMean) * (d[metric] - yMean);
        den += (d.hdi_rank - xMean) ** 2;
      });
      if (den !== 0) {
        const slope = num / den;
        const intercept = yMean - slope * xMean;
        const x1 = d3.min(males, d => d.hdi_rank);
        const x2 = d3.max(males, d => d.hdi_rank);
        const y1 = slope * x1 + intercept;
        const y2 = slope * x2 + intercept;

        svg.append('line')
          .attr('x1', x(x1))
          .attr('x2', x(x2))
          .attr('y1', y(y1))
          .attr('y2', y(y2))
          .attr('stroke', economyColors[economy])
          .attr('stroke-width', 2)
          .attr('opacity', 0.4);
      }
    }

    if (females.length > 0) {
      const xMean = d3.mean(females, d => d.hdi_rank);
      const yMean = d3.mean(females, d => d[metric]);
      let num = 0, den = 0;
      females.forEach(d => {
        num += (d.hdi_rank - xMean) * (d[metric] - yMean);
        den += (d.hdi_rank - xMean) ** 2;
      });
      if (den !== 0) {
        const slope = num / den;
        const intercept = yMean - slope * xMean;
        const x1 = d3.min(females, d => d.hdi_rank);
        const x2 = d3.max(females, d => d.hdi_rank);
        const y1 = slope * x1 + intercept;
        const y2 = slope * x2 + intercept;

        svg.append('line')
          .attr('x1', x(x1))
          .attr('x2', x(x2))
          .attr('y1', y(y1))
          .attr('y2', y(y2))
          .attr('stroke', economyColors[economy])
          .attr('stroke-width', 2)
          .attr('opacity', 0.4);
      }
    }
  });

  populationData.forEach(d => {
    const shape = d.sex === 'M' ? 'circle' : 'triangle';

    if (shape === 'circle') {
      svg.append('circle')
        .attr('cx', x(d.hdi_rank))
        .attr('cy', y(d[metric]))
        .attr('r', 6)
        .attr('fill', economyColors[d.economy])
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('opacity', 0.8)
        .on('mouseover', function(event) {
          d3.select(this)
            .attr('r', 8)
            .attr('opacity', 1);
          tooltip.style('visibility', 'visible')
            .html(`<strong>${d.population}</strong><br/>Name: ${d.name}<br/>Sex: ${d.sex === 'M' ? 'Male' : 'Female'}<br/>N: ${d.n}<br/>${metric.toUpperCase()}: ${d[metric].toFixed(2)}`);
        })
        .on('mousemove', function(event) {
          tooltip.style('top', (event.pageY - 10) + 'px')
            .style('left', (event.pageX + 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('r', 6)
            .attr('opacity', 0.8);
          tooltip.style('visibility', 'hidden');
        });
    } else {
      const symbolGenerator = d3.symbol().type(d3.symbolTriangle).size(80);
      svg.append('path')
        .attr('d', symbolGenerator)
        .attr('transform', `translate(${x(d.hdi_rank)},${y(d[metric])})`)
        .attr('fill', economyColors[d.economy])
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('opacity', 0.8)
        .on('mouseover', function(event) {
          d3.select(this)
            .attr('d', d3.symbol().type(d3.symbolTriangle).size(120))
            .attr('opacity', 1);
          tooltip.style('visibility', 'visible')
            .html(`<strong>${d.population}</strong><br/>Name: ${d.name}<br/>Sex: ${d.sex === 'M' ? 'Male' : 'Female'}<br/>N: ${d.n}<br/>${metric.toUpperCase()}: ${d[metric].toFixed(2)}`);
        })
        .on('mousemove', function(event) {
          tooltip.style('top', (event.pageY - 10) + 'px')
            .style('left', (event.pageX + 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('d', symbolGenerator)
            .attr('opacity', 0.8);
          tooltip.style('visibility', 'hidden');
        });
    }
  });

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  // X-axis label with tooltip
  const xAxisLabelGroup2 = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height + 45})`);

  xAxisLabelGroup2.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('HDI_rank');

  addTooltipIcon(xAxisLabelGroup2, 55, -5, 'HDI Rank: Human Development Index ranking based on life expectancy, education, and per capita income');

  svg.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  // Y-axis label with tooltip
  const yAxisLabelGroup2 = svg.append('g')
    .attr('transform', `rotate(-90) translate(${-height / 2}, -45)`);

  yAxisLabelGroup2.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text(metric === 'tee' ? 'TEE (kcal/day)' : 'PAL');

  addTooltipIcon(yAxisLabelGroup2, 80, -5,
    metric === 'tee'
      ? 'TEE (Total Energy Expenditure): The total amount of energy (calories) burned per day, measured in kilocalories per day'
      : 'PAL (Physical Activity Level): A ratio of total energy expenditure to basal metabolic rate, indicating overall activity level');

  const legend = svg.append('g')
    .attr('transform', `translate(${width + 20}, 0)`);

  legend.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Economy');

  const economyTypes = ['highHDI', 'AGP', 'midHDI', 'lowHDI', 'HG', 'HORT'];
  economyTypes.forEach((type, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${20 + i * 20})`);

    legendRow.append('circle')
      .attr('cx', 6)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', economyColors[type]);

    legendRow.append('text')
      .attr('x', 18)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#2d1810')
      .text(type);
  });

  legend.append('text')
    .attr('x', 0)
    .attr('y', 160)
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Sex');

  const sexLegend = legend.append('g')
    .attr('transform', `translate(0, 180)`);

  sexLegend.append('circle')
    .attr('cx', 6)
    .attr('cy', 0)
    .attr('r', 5)
    .attr('fill', '#666')
    .attr('stroke', '#374151')
    .attr('stroke-width', 1);

  sexLegend.append('text')
    .attr('x', 18)
    .attr('y', 4)
    .attr('font-size', '11px')
    .attr('fill', '#2d1810')
    .text('Male');

  const femaleLegend = legend.append('g')
    .attr('transform', `translate(0, 200)`);

  const symbolGenerator = d3.symbol().type(d3.symbolTriangle).size(60);
  femaleLegend.append('path')
    .attr('d', symbolGenerator)
    .attr('transform', `translate(6, 0)`)
    .attr('fill', '#666')
    .attr('stroke', '#374151')
    .attr('stroke-width', 1);

  femaleLegend.append('text')
    .attr('x', 18)
    .attr('y', 4)
    .attr('font-size', '11px')
    .attr('fill', '#2d1810')
    .text('Female');
}

export function createUPFScatterPlot(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 60, right: 180, bottom: 60, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // const economyColors = {
  //   'highHDI': '#3b82f6',
  //   'AGP': '#f97316',
  //   'midHDI': '#dc2626',
  //   'lowHDI': '#14b8a6',
  //   'HG': '#84cc16',
  //   'HORT': '#fbbf24'
  // };

  const dataWithUPF = populationData.filter(d => d.upf !== null);

  const x = d3.scaleLinear()
    .domain([0, 230])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, 60])
    .range([height, 0]);

  const economyGroups = d3.group(dataWithUPF, d => d.economy);

  economyGroups.forEach((values, economy) => {
    if (values.length > 1) {
      const xMean = d3.mean(values, d => d.hdi_rank);
      const yMean = d3.mean(values, d => d.upf);
      let num = 0, den = 0;
      values.forEach(d => {
        num += (d.hdi_rank - xMean) * (d.upf - yMean);
        den += (d.hdi_rank - xMean) ** 2;
      });
      if (den !== 0) {
        const slope = num / den;
        const intercept = yMean - slope * xMean;
        const x1 = d3.min(values, d => d.hdi_rank);
        const x2 = d3.max(values, d => d.hdi_rank);
        const y1 = slope * x1 + intercept;
        const y2 = slope * x2 + intercept;

        svg.append('line')
          .attr('x1', x(x1))
          .attr('x2', x(x2))
          .attr('y1', y(y1))
          .attr('y2', y(y2))
          .attr('stroke', economyColors[economy])
          .attr('stroke-width', 2.5)
          .attr('opacity', 0.5);
      }
    }
  });

  dataWithUPF.forEach(d => {
    const shape = d.sex === 'M' ? 'circle' : 'triangle';

    if (shape === 'circle') {
      svg.append('circle')
        .attr('cx', x(d.hdi_rank))
        .attr('cy', y(d.upf))
        .attr('r', 7)
        .attr('fill', economyColors[d.economy])
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)
        .append('title')
        .text(`${d.name}\nEconomy: ${d.economy}\nUPF: ${d.upf}%\nSex: ${d.sex}`);
    } else {
      const symbolGenerator = d3.symbol().type(d3.symbolTriangle).size(100);
      svg.append('path')
        .attr('d', symbolGenerator)
        .attr('transform', `translate(${x(d.hdi_rank)},${y(d.upf)})`)
        .attr('fill', economyColors[d.economy])
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)
        .append('title')
        .text(`${d.name}\nEconomy: ${d.economy}\nUPF: ${d.upf}%\nSex: ${d.sex}`);
    }
  });

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('HDI_rank');

  svg.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('PercUPF');

  const legend = svg.append('g')
    .attr('transform', `translate(${width + 20}, 0)`);

  legend.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Economy');

  const economyTypes = ['highHDI', 'AGP', 'midHDI', 'lowHDI', 'HG', 'HORT'];
  economyTypes.forEach((type, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${20 + i * 20})`);

    legendRow.append('circle')
      .attr('cx', 6)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', economyColors[type]);

    legendRow.append('text')
      .attr('x', 18)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#2d1810')
      .text(type);
  });

  legend.append('text')
    .attr('x', 0)
    .attr('y', 160)
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Sex');

  const sexLegend = legend.append('g')
    .attr('transform', `translate(0, 180)`);

  sexLegend.append('circle')
    .attr('cx', 6)
    .attr('cy', 0)
    .attr('r', 5)
    .attr('fill', '#666')
    .attr('stroke', '#374151')
    .attr('stroke-width', 1);

  sexLegend.append('text')
    .attr('x', 18)
    .attr('y', 4)
    .attr('font-size', '11px')
    .attr('fill', '#2d1810')
    .text('Male');

  const femaleLegend = legend.append('g')
    .attr('transform', `translate(0, 200)`);

  const symbolGenerator = d3.symbol().type(d3.symbolTriangle).size(60);
  femaleLegend.append('path')
    .attr('d', symbolGenerator)
    .attr('transform', `translate(6, 0)`)
    .attr('fill', '#666')
    .attr('stroke', '#374151')
    .attr('stroke-width', 1);

  femaleLegend.append('text')
    .attr('x', 18)
    .attr('y', 4)
    .attr('font-size', '11px')
    .attr('fill', '#2d1810')
    .text('Female');
}

export function createUPFBodyFatScatterPlot(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 60, right: 180, bottom: 60, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const economyColors = {
    'highHDI': '#3b82f6',
    'AGP': '#f97316',
    'midHDI': '#dc2626',
    'lowHDI': '#14b8a6',
    'HG': '#84cc16',
    'HORT': '#fbbf24'
  };

  const dataWithUPF = populationData.filter(d => d.upf !== null);

  const x = d3.scaleLinear()
    .domain([0, 60])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([5, 45])
    .range([height, 0]);

  const economyGroups = d3.group(dataWithUPF, d => d.economy);

  economyGroups.forEach((values, economy) => {
    if (values.length > 1) {
      const xMean = d3.mean(values, d => d.upf);
      const yMean = d3.mean(values, d => d.bodyFat);
      let num = 0, den = 0;
      values.forEach(d => {
        num += (d.upf - xMean) * (d.bodyFat - yMean);
        den += (d.upf - xMean) ** 2;
      });
      if (den !== 0) {
        const slope = num / den;
        const intercept = yMean - slope * xMean;
        const x1 = d3.min(values, d => d.upf);
        const x2 = d3.max(values, d => d.upf);
        const y1 = slope * x1 + intercept;
        const y2 = slope * x2 + intercept;

        svg.append('line')
          .attr('x1', x(x1))
          .attr('x2', x(x2))
          .attr('y1', y(y1))
          .attr('y2', y(y2))
          .attr('stroke', economyColors[economy])
          .attr('stroke-width', 2.5)
          .attr('opacity', 0.5);
      }
    }
  });

  dataWithUPF.forEach(d => {
    const shape = d.sex === 'M' ? 'circle' : 'triangle';

    if (shape === 'circle') {
      svg.append('circle')
        .attr('cx', x(d.upf))
        .attr('cy', y(d.bodyFat))
        .attr('r', 7)
        .attr('fill', economyColors[d.economy])
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)
        .append('title')
        .text(`${d.name}\nEconomy: ${d.economy}\nUPF: ${d.upf}%\nBody Fat: ${d.bodyFat}%\nSex: ${d.sex}`);
    } else {
      const symbolGenerator = d3.symbol().type(d3.symbolTriangle).size(100);
      svg.append('path')
        .attr('d', symbolGenerator)
        .attr('transform', `translate(${x(d.upf)},${y(d.bodyFat)})`)
        .attr('fill', economyColors[d.economy])
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)
        .append('title')
        .text(`${d.name}\nEconomy: ${d.economy}\nUPF: ${d.upf}%\nBody Fat: ${d.bodyFat}%\nSex: ${d.sex}`);
    }
  });

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('PercUPF');

  svg.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Fat');

  const legend = svg.append('g')
    .attr('transform', `translate(${width + 20}, 0)`);

  legend.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Economy');

  const economyTypes = ['highHDI', 'AGP', 'midHDI', 'lowHDI', 'HG', 'HORT'];
  economyTypes.forEach((type, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${20 + i * 20})`);

    legendRow.append('circle')
      .attr('cx', 6)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', economyColors[type]);

    legendRow.append('text')
      .attr('x', 18)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#2d1810')
      .text(type);
  });

  legend.append('text')
    .attr('x', 0)
    .attr('y', 160)
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Sex');

  const sexLegend = legend.append('g')
    .attr('transform', `translate(0, 180)`);

  sexLegend.append('circle')
    .attr('cx', 6)
    .attr('cy', 0)
    .attr('r', 5)
    .attr('fill', '#666')
    .attr('stroke', '#374151')
    .attr('stroke-width', 1);

  sexLegend.append('text')
    .attr('x', 18)
    .attr('y', 4)
    .attr('font-size', '11px')
    .attr('fill', '#2d1810')
    .text('Male');

  const femaleLegend = legend.append('g')
    .attr('transform', `translate(0, 200)`);

  const symbolGenerator = d3.symbol().type(d3.symbolTriangle).size(60);
  femaleLegend.append('path')
    .attr('d', symbolGenerator)
    .attr('transform', `translate(6, 0)`)
    .attr('fill', '#666')
    .attr('stroke', '#374151')
    .attr('stroke-width', 1);

  femaleLegend.append('text')
    .attr('x', 18)
    .attr('y', 4)
    .attr('font-size', '11px')
    .attr('fill', '#2d1810')
    .text('Female');
}

export function createPALBoxPlot(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 60, right: 30, bottom: 60, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const economyColors = {
    'highHDI': '#7c9cc4',
    'AGP': '#e8b897',
    'midHDI': '#d9a5a5',
    'lowHDI': '#a8c5b8',
    'HG': '#b8c9a8',
    'HORT': '#e8d89b'
  };

  const economyOrder = ['highHDI', 'AGP', 'midHDI', 'lowHDI', 'HG', 'HORT'];

  const groupedData = d3.group(populationData, d => d.economy);

  const boxPlotData = economyOrder.map(economy => {
    const values = (groupedData.get(economy) || []).map(d => d.pal).sort(d3.ascending);
    if (values.length === 0) return null;

    const q1 = d3.quantile(values, 0.25);
    const median = d3.quantile(values, 0.5);
    const q3 = d3.quantile(values, 0.75);
    const iqr = q3 - q1;
    const min = Math.max(d3.min(values), q1 - 1.5 * iqr);
    const max = Math.min(d3.max(values), q3 + 1.5 * iqr);

    return { economy, q1, median, q3, min, max, values };
  }).filter(d => d !== null);

  const x = d3.scaleBand()
    .domain(economyOrder)
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([1.2, 2.6])
    .range([height, 0]);

  boxPlotData.forEach(box => {
    const center = x(box.economy) + x.bandwidth() / 2;
    const boxWidth = x.bandwidth();

    svg.append('line')
      .attr('x1', center)
      .attr('x2', center)
      .attr('y1', y(box.min))
      .attr('y2', y(box.q1))
      .attr('stroke', '#374151')
      .attr('stroke-width', 1.5);

    svg.append('line')
      .attr('x1', center)
      .attr('x2', center)
      .attr('y1', y(box.q3))
      .attr('y2', y(box.max))
      .attr('stroke', '#374151')
      .attr('stroke-width', 1.5);

    svg.append('line')
      .attr('x1', center - boxWidth / 4)
      .attr('x2', center + boxWidth / 4)
      .attr('y1', y(box.min))
      .attr('y2', y(box.min))
      .attr('stroke', '#374151')
      .attr('stroke-width', 2);

    svg.append('line')
      .attr('x1', center - boxWidth / 4)
      .attr('x2', center + boxWidth / 4)
      .attr('y1', y(box.max))
      .attr('y2', y(box.max))
      .attr('stroke', '#374151')
      .attr('stroke-width', 2);

    svg.append('rect')
      .attr('x', center - boxWidth / 2)
      .attr('y', y(box.q3))
      .attr('width', boxWidth)
      .attr('height', y(box.q1) - y(box.q3))
      .attr('fill', economyColors[box.economy])
      .attr('stroke', '#374151')
      .attr('stroke-width', 1.5);

    svg.append('line')
      .attr('x1', center - boxWidth / 2)
      .attr('x2', center + boxWidth / 2)
      .attr('y1', y(box.median))
      .attr('y2', y(box.median))
      .attr('stroke', '#374151')
      .attr('stroke-width', 2.5);
  });

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  // X-axis label with tooltip
  const xAxisLabelGroup3 = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height + 45})`);

  xAxisLabelGroup3.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Economy');

  addTooltipIcon(xAxisLabelGroup3, 50, -5, 'Economy type classification based on HDI (Human Development Index), AGP (Agriculture-Pastoralism), HG (Hunter-Gatherer), and HORT (Horticulturalist)');

  svg.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  // Y-axis label with tooltip
  const yAxisLabelGroup3 = svg.append('g')
    .attr('transform', `rotate(-90) translate(${-height / 2}, -45)`);

  yAxisLabelGroup3.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('PAL');

  addTooltipIcon(yAxisLabelGroup3, 30, -5, 'PAL (Physical Activity Level): A ratio of total energy expenditure to basal metabolic rate, indicating overall activity level');
}

export function createPALScatterPlot(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 60, right: 180, bottom: 60, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const economyColors = {
    'highHDI': '#3b82f6',
    'AGP': '#f97316',
    'midHDI': '#dc2626',
    'lowHDI': '#14b8a6',
    'HG': '#84cc16',
    'HORT': '#fbbf24'
  };

  const x = d3.scaleLinear()
    .domain([0, 230])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([1.2, 2.6])
    .range([height, 0]);

  const economyGroups = d3.group(populationData, d => d.economy);

  economyGroups.forEach((values, economy) => {
    const males = values.filter(d => d.sex === 'M');
    const females = values.filter(d => d.sex === 'F');

    if (males.length > 0) {
      const xMean = d3.mean(males, d => d.hdi_rank);
      const yMean = d3.mean(males, d => d.pal);
      let num = 0, den = 0;
      males.forEach(d => {
        num += (d.hdi_rank - xMean) * (d.pal - yMean);
        den += (d.hdi_rank - xMean) ** 2;
      });
      if (den !== 0) {
        const slope = num / den;
        const intercept = yMean - slope * xMean;
        const x1 = d3.min(males, d => d.hdi_rank);
        const x2 = d3.max(males, d => d.hdi_rank);
        const y1 = slope * x1 + intercept;
        const y2 = slope * x2 + intercept;

        svg.append('line')
          .attr('x1', x(x1))
          .attr('x2', x(x2))
          .attr('y1', y(y1))
          .attr('y2', y(y2))
          .attr('stroke', economyColors[economy])
          .attr('stroke-width', 2)
          .attr('opacity', 0.4);
      }
    }

    if (females.length > 0) {
      const xMean = d3.mean(females, d => d.hdi_rank);
      const yMean = d3.mean(females, d => d.pal);
      let num = 0, den = 0;
      females.forEach(d => {
        num += (d.hdi_rank - xMean) * (d.pal - yMean);
        den += (d.hdi_rank - xMean) ** 2;
      });
      if (den !== 0) {
        const slope = num / den;
        const intercept = yMean - slope * xMean;
        const x1 = d3.min(females, d => d.hdi_rank);
        const x2 = d3.max(females, d => d.hdi_rank);
        const y1 = slope * x1 + intercept;
        const y2 = slope * x2 + intercept;

        svg.append('line')
          .attr('x1', x(x1))
          .attr('x2', x(x2))
          .attr('y1', y(y1))
          .attr('y2', y(y2))
          .attr('stroke', economyColors[economy])
          .attr('stroke-width', 2)
          .attr('opacity', 0.4);
      }
    }
  });

  populationData.forEach(d => {
    const shape = d.sex === 'M' ? 'circle' : 'triangle';

    if (shape === 'circle') {
      svg.append('circle')
        .attr('cx', x(d.hdi_rank))
        .attr('cy', y(d.pal))
        .attr('r', 6)
        .attr('fill', economyColors[d.economy])
        .attr('stroke', '#374151')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .append('title')
        .text(`${d.name}\nEconomy: ${d.economy}\nPAL: ${d.pal}\nSex: ${d.sex}`);
    } else {
      const symbolGenerator = d3.symbol().type(d3.symbolTriangle).size(80);
      svg.append('path')
        .attr('d', symbolGenerator)
        .attr('transform', `translate(${x(d.hdi_rank)},${y(d.pal)})`)
        .attr('fill', economyColors[d.economy])
        .attr('stroke', '#374151')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .append('title')
        .text(`${d.name}\nEconomy: ${d.economy}\nPAL: ${d.pal}\nSex: ${d.sex}`);
    }
  });

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  // X-axis label with tooltip
  const xAxisLabelGroup4 = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height + 45})`);

  xAxisLabelGroup4.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('HDI_rank');

  addTooltipIcon(xAxisLabelGroup4, 55, -5, 'HDI Rank: Human Development Index ranking based on life expectancy, education, and per capita income');

  svg.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  // Y-axis label with tooltip
  const yAxisLabelGroup4 = svg.append('g')
    .attr('transform', `rotate(-90) translate(${-height / 2}, -45)`);

  yAxisLabelGroup4.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('PAL');

  addTooltipIcon(yAxisLabelGroup4, 30, -5, 'PAL (Physical Activity Level): A ratio of total energy expenditure to basal metabolic rate, indicating overall activity level');

  const legend = svg.append('g')
    .attr('transform', `translate(${width + 20}, 0)`);

  legend.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Economy');

  const economyTypes = ['highHDI', 'AGP', 'midHDI', 'lowHDI', 'HG', 'HORT'];
  economyTypes.forEach((type, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${20 + i * 20})`);

    legendRow.append('circle')
      .attr('cx', 6)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', economyColors[type]);

    legendRow.append('text')
      .attr('x', 18)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#2d1810')
      .text(type);
  });

  legend.append('text')
    .attr('x', 0)
    .attr('y', 160)
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Sex');

  const sexLegend = legend.append('g')
    .attr('transform', `translate(0, 180)`);

  sexLegend.append('circle')
    .attr('cx', 6)
    .attr('cy', 0)
    .attr('r', 5)
    .attr('fill', '#666')
    .attr('stroke', '#374151')
    .attr('stroke-width', 1);

  sexLegend.append('text')
    .attr('x', 18)
    .attr('y', 4)
    .attr('font-size', '11px')
    .attr('fill', '#2d1810')
    .text('Male');

  const femaleLegend = legend.append('g')
    .attr('transform', `translate(0, 200)`);

  const symbolGenerator = d3.symbol().type(d3.symbolTriangle).size(60);
  femaleLegend.append('path')
    .attr('d', symbolGenerator)
    .attr('transform', `translate(6, 0)`)
    .attr('fill', '#666')
    .attr('stroke', '#374151')
    .attr('stroke-width', 1);

  femaleLegend.append('text')
    .attr('x', 18)
    .attr('y', 4)
    .attr('font-size', '11px')
    .attr('fill', '#2d1810')
    .text('Female');
}

export function createMultiCountryTrend(containerId, selectedCountries = ['United States'], ageGroup = 'adults', yearStart = 1975, yearEnd = 2022, currentYear = null) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 40, right: 120, bottom: 50, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 350 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Add title
  svg.append('text')
    .attr('x', 0)
    .attr('y', -20)
    .attr('text-anchor', 'start')
    .attr('font-size', '16px')
    .attr('font-weight', '700')
    .attr('fill', '#5c2e1e')
    .text(`Obesity Trends: ${ageGroup.charAt(0).toUpperCase() + ageGroup.slice(1)} (${yearStart}–${yearEnd})`);

  const filteredYears = trendYears.filter(y => y >= yearStart && y <= yearEnd);

  const lineData = selectedCountries.map(country => {
    return {
      country: country,
      values: filteredYears.map(year => ({
        year: year,
        obesity: getObesityForYear(country, year, ageGroup)
      }))
    };
  });

  const x = d3.scaleLinear()
    .domain([yearStart, yearEnd])
    .range([0, width]);

  const maxObesity = d3.max(lineData, d => d3.max(d.values, v => v.obesity));
  const y = d3.scaleLinear()
    .domain([0, Math.ceil(maxObesity / 5) * 5])
    .range([height, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(selectedCountries)
    .range(['#dc2626', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']);

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.obesity))
    .curve(d3.curveMonotoneX);

  lineData.forEach((countryLine, index) => {
    const isUSA = countryLine.country === 'United States';

    svg.append('path')
      .datum(countryLine.values)
      .attr('fill', 'none')
      .attr('stroke', colorScale(countryLine.country))
      .attr('stroke-width', isUSA ? 4 : 2)
      .attr('stroke-opacity', isUSA ? 1 : 0.8)
      .attr('d', line);

    svg.selectAll(`.dot-${index}`)
      .data(countryLine.values)
      .join('circle')
      .attr('class', `dot-${index}`)
      .attr('cx', d => x(d.year))
      .attr('cy', d => y(d.obesity))
      .attr('r', isUSA ? 5 : 3)
      .attr('fill', colorScale(countryLine.country))
      .attr('stroke', '#fff')
      .attr('stroke-width', isUSA ? 2 : 1)
      .append('title')
      .text(d => `${countryLine.country}\n${d.year}: ${d.obesity.toFixed(1)}%`);
  });

  // Add current year indicator line if provided
  if (currentYear !== null && currentYear >= yearStart && currentYear <= yearEnd) {
    const lineGroup = svg.append('g')
      .attr('class', 'year-indicator');

    lineGroup.append('line')
      .attr('x1', x(currentYear))
      .attr('x2', x(currentYear))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#5c2e1e')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '8,4')
      .attr('opacity', 0.7);

    lineGroup.append('text')
      .attr('x', x(currentYear))
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('fill', '#5c2e1e')
      .text(currentYear);
  }

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')))
    .selectAll('text')
    .attr('font-family', 'Fredoka')
    .attr('font-weight', '600');

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 40)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Fredoka')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#5c2e1e')
    .text('Year');

  svg.append('g')
    .call(d3.axisLeft(y).tickFormat(d => d + '%'))
    .selectAll('text')
    .attr('font-family', 'Fredoka')
    .attr('font-weight', '600');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Fredoka')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#5c2e1e')
    .text('Obesity Rate');

  const legend = svg.append('g')
    .attr('transform', `translate(${width + 20}, 0)`);

  lineData.forEach((countryLine, i) => {
    const isUSA = countryLine.country === 'United States';
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${i * 25})`);

    legendRow.append('line')
      .attr('x1', 0)
      .attr('x2', 20)
      .attr('y1', 10)
      .attr('y2', 10)
      .attr('stroke', colorScale(countryLine.country))
      .attr('stroke-width', isUSA ? 4 : 2);

    legendRow.append('text')
      .attr('x', 25)
      .attr('y', 14)
      .attr('font-family', 'Fredoka')
      .attr('font-size', '12px')
      .attr('font-weight', isUSA ? '700' : '500')
      .attr('fill', '#5c2e1e')
      .text(countryLine.country);
  });
}

export function updateFilters(filters) {
  currentFilters = { ...currentFilters, ...filters };
}

export function createInteractiveScatterPlot(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const margin = { top: 60, right: 180, bottom: 60, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const economyColors = {
    'highHDI': '#3b82f6',
    'AGP': '#f97316',
    'midHDI': '#dc2626',
    'lowHDI': '#14b8a6',
    'HG': '#84cc16',
    'HORT': '#fbbf24'
  };

  const filteredData = populationData.filter(d => {
    if (currentFilters.xVar === 'upf' && d.upf === null) return false;
    if (currentFilters.yVar === 'upf' && d.upf === null) return false;
    return currentFilters.economies.includes(d.economy) &&
           currentFilters.sexes.includes(d.sex);
  });

  const getVarLabel = (varName) => {
    const labels = {
      'bodyFat': 'Fat',
      'upf': 'PercUPF',
      'tee': 'TEE',
      'pal': 'PAL',
      'hdi_rank': 'HDI_rank'
    };
    return labels[varName] || varName;
  };

  const getVarDomain = (varName, data) => {
    const values = data.map(d => d[varName]).filter(v => v !== null);
    const min = d3.min(values);
    const max = d3.max(values);
    const padding = (max - min) * 0.1;
    return [Math.max(0, min - padding), max + padding];
  };

  const xDomain = getVarDomain(currentFilters.xVar, filteredData);
  const yDomain = getVarDomain(currentFilters.yVar, filteredData);

  const x = d3.scaleLinear()
    .domain(xDomain)
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain(yDomain)
    .range([height, 0]);

  const economyGroups = d3.group(filteredData, d => d.economy);

  economyGroups.forEach((values, economy) => {
    if (values.length > 1) {
      const xMean = d3.mean(values, d => d[currentFilters.xVar]);
      const yMean = d3.mean(values, d => d[currentFilters.yVar]);
      let num = 0, den = 0;
      values.forEach(d => {
        const xVal = d[currentFilters.xVar];
        const yVal = d[currentFilters.yVar];
        if (xVal !== null && yVal !== null) {
          num += (xVal - xMean) * (yVal - yMean);
          den += (xVal - xMean) ** 2;
        }
      });
      if (den !== 0) {
        const slope = num / den;
        const intercept = yMean - slope * xMean;
        const x1 = d3.min(values, d => d[currentFilters.xVar]);
        const x2 = d3.max(values, d => d[currentFilters.xVar]);
        const y1 = slope * x1 + intercept;
        const y2 = slope * x2 + intercept;

        svg.append('line')
          .attr('x1', x(x1))
          .attr('x2', x(x2))
          .attr('y1', y(y1))
          .attr('y2', y(y2))
          .attr('stroke', economyColors[economy])
          .attr('stroke-width', 2.5)
          .attr('opacity', 0.5);
      }
    }
  });

  filteredData.forEach(d => {
    const shape = d.sex === 'M' ? 'circle' : 'triangle';
    const xVal = d[currentFilters.xVar];
    const yVal = d[currentFilters.yVar];

    if (xVal === null || yVal === null) return;

    if (shape === 'circle') {
      svg.append('circle')
        .attr('cx', x(xVal))
        .attr('cy', y(yVal))
        .attr('r', 7)
        .attr('fill', economyColors[d.economy])
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)
        .append('title')
        .text(`${d.name}\nEconomy: ${d.economy}\n${getVarLabel(currentFilters.xVar)}: ${xVal}\n${getVarLabel(currentFilters.yVar)}: ${yVal}\nSex: ${d.sex}`);
    } else {
      const symbolGenerator = d3.symbol().type(d3.symbolTriangle).size(100);
      svg.append('path')
        .attr('d', symbolGenerator)
        .attr('transform', `translate(${x(xVal)},${y(yVal)})`)
        .attr('fill', economyColors[d.economy])
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)
        .append('title')
        .text(`${d.name}\nEconomy: ${d.economy}\n${getVarLabel(currentFilters.xVar)}: ${xVal}\n${getVarLabel(currentFilters.yVar)}: ${yVal}\nSex: ${d.sex}`);
    }
  });

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(8))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text(getVarLabel(currentFilters.xVar));

  svg.append('g')
    .call(d3.axisLeft(y).ticks(8))
    .selectAll('text')
    .attr('font-size', '12px')
    .attr('font-weight', '600');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text(getVarLabel(currentFilters.yVar));

  const legend = svg.append('g')
    .attr('transform', `translate(${width + 20}, 0)`);

  legend.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Economy');

  const economyTypes = ['highHDI', 'AGP', 'midHDI', 'lowHDI', 'HG', 'HORT'];
  economyTypes.forEach((type, i) => {
    if (!currentFilters.economies.includes(type)) return;

    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${20 + i * 20})`);

    legendRow.append('circle')
      .attr('cx', 6)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', economyColors[type]);

    legendRow.append('text')
      .attr('x', 18)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#2d1810')
      .text(type);
  });

  legend.append('text')
    .attr('x', 0)
    .attr('y', 160)
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#2d1810')
    .text('Sex');

  let legendY = 180;
  if (currentFilters.sexes.includes('M')) {
    const sexLegend = legend.append('g')
      .attr('transform', `translate(0, ${legendY})`);

    sexLegend.append('circle')
      .attr('cx', 6)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', '#666')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1);

    sexLegend.append('text')
      .attr('x', 18)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#2d1810')
      .text('Male');

    legendY += 20;
  }

  if (currentFilters.sexes.includes('F')) {
    const femaleLegend = legend.append('g')
      .attr('transform', `translate(0, ${legendY})`);

    const symbolGenerator = d3.symbol().type(d3.symbolTriangle).size(60);
    femaleLegend.append('path')
      .attr('d', symbolGenerator)
      .attr('transform', `translate(6, 0)`)
      .attr('fill', '#666')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1);

    femaleLegend.append('text')
      .attr('x', 18)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#2d1810')
      .text('Female');
  }
}

