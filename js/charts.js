import { countryData, obesityTrends, topObeseCountries, getObesityForYear, trendYears, PAL_TEE_UPF_HDI_Data_Elsa, usObesityDiabetesData } from './data.js';

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
  sexes: ['M', 'F'],
  highlightedPopulations: [], // Array of population names to highlight
  chartType: 'auto' // 'auto', 'scatter', 'box'
};

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

const economyDescriptions = {
  'HG': 'Hunter-gatherer: living by hunting, fishing, and foraging rather than farming.',
  'AGP': 'Pastoralist / agropastoralist: herding livestock as the core of daily life.',
  'HORT': 'Horticulturalist: small-scale farming using manual tools.',
  'lowHDI': 'Small-scale agriculturalist: farming with limited mechanization.',
  'midHDI': 'Industrialized: living in modern economies with wage labor, markets, and high integration into national infrastructure.',
  'highHDI': 'Industrialized: living in modern economies with wage labor, markets, and high integration into national infrastructure.'
};

// Tooltip
const dataValueTooltip = d3.select('body').append('div')
.attr('class', 'map-tooltip')
.style('position', 'absolute')
.style('visibility', 'hidden')
.style('background-color', 'rgba(0, 0, 0, 0.9)')
.style('color', '#fff')
.style('padding', '10px 14px')
.style('border-radius', '6px')
.style('font-size', '13px')
.style('line-height', '1.5')
.style('pointer-events', 'none')
.style('z-index', '1000')
.style('box-shadow', '0 2px 8px rgba(0,0,0,0.3)')
.style('max-width', '320px');

// ------------------------------------------------------------
export function createDataCollectionMap(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const width = container.clientWidth || 800;
  const height = 500;
  const legendWidth = 230;
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
      .range([3, 16]);

    // Plot each population directly
    PAL_TEE_UPF_HDI_Data_Elsa.forEach(pop => {
      const lat = Number(pop.lat);
      const lon = Number(pop.lon);

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
          .transition()
          .duration(120)
          .attr('r', radiusScale(totalN) + 3)
          .attr('opacity', 1);

          // Build comprehensive tooltip
          let tooltipHTML = `<strong>${pop.Population}</strong><br>`;
          tooltipHTML += `<strong>Economy:</strong> ${economyLabels[pop.Economy]}<br>`;

          if (pop.HDI_score) {
            tooltipHTML += `<strong>HDI:</strong> ${pop.HDI_score} (rank ${pop.HDI_rank})<br>`;
          }

          tooltipHTML += `<br><strong>Sample Sizes:</strong><br>`;
          if (pop.N_M) {
            tooltipHTML += `Male: ${pop.N_M}<br>`;
          }
          if (pop.N_F) {
            tooltipHTML += `Female: ${pop.N_F}<br>`;
          }
          tooltipHTML += `Total: ${totalN}<br>`;

          // Add key measurements if available
          tooltipHTML += `<br><strong>Measurements:</strong><br>`;

          if (pop.Fat_M || pop.Fat_F) {
            tooltipHTML += `<strong>Body Fat %:</strong> `;
            if (pop.Fat_M && pop.Fat_F) {
              tooltipHTML += `M: ${Number(pop.Fat_M).toFixed(1)}%, F: ${Number(pop.Fat_F).toFixed(1)}%<br>`;
            } else if (pop.Fat_M) {
              tooltipHTML += `M: ${Number(pop.Fat_M).toFixed(1)}%<br>`;
            } else {
              tooltipHTML += `F: ${Number(pop.Fat_F).toFixed(1)}%<br>`;
            }
          }

          if (pop.PAL_M || pop.PAL_F) {
            tooltipHTML += `<strong>PAL:</strong> `;
            if (pop.PAL_M && pop.PAL_F) {
              tooltipHTML += `M: ${Number(pop.PAL_M).toFixed(2)}, F: ${Number(pop.PAL_F).toFixed(2)}<br>`;
            } else if (pop.PAL_M) {
              tooltipHTML += `M: ${Number(pop.PAL_M).toFixed(2)}<br>`;
            } else {
              tooltipHTML += `F: ${Number(pop.PAL_F).toFixed(2)}<br>`;
            }
          }

          if (pop.TEE_M || pop.TEE_F) {
            tooltipHTML += `<strong>TEE (MJ/day):</strong> `;
            if (pop.TEE_M && pop.TEE_F) {
              tooltipHTML += `M: ${Number(pop.TEE_M).toFixed(1)}, F: ${Number(pop.TEE_F).toFixed(1)}<br>`;
            } else if (pop.TEE_M) {
              tooltipHTML += `M: ${Number(pop.TEE_M).toFixed(1)}<br>`;
            } else {
              tooltipHTML += `F: ${Number(pop.TEE_F).toFixed(1)}<br>`;
            }
          }

          if (pop.PercUPF) {
            tooltipHTML += `<strong>UPF %:</strong> ${pop.PercUPF}%<br>`;
          }

          dataValueTooltip
          .html(tooltipHTML)
          .style('visibility', 'visible');
      })
      .on('mousemove', function(event) {
        dataValueTooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(120)
          .attr('r', radiusScale(totalN))
          .attr('opacity', 0.85);

          dataValueTooltip.style('visibility', 'hidden');
      });
    });

    // Economy Legend
    const economyLegend = svg.append('g')
      .attr('transform', `translate(${mapWidth + 20}, 20)`);

    economyLegend.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .attr('fill', '#2d1810')
      .text('Economy Type');

    economyOrder.forEach((type, i) => {
      const legendRow = economyLegend.append('g')
        .attr('transform', `translate(0, ${20 + i * 24})`);

      legendRow.append('circle')
        .attr('cx', 8)
        .attr('cy', 0)
        .attr('r', 6)
        .attr('fill', economyColors[type])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      const labelText = legendRow.append('text')
        .attr('x', 22)
        .attr('y', 4)
        .attr('font-size', '12px')
        .attr('fill', '#2d1810')
        .text(economyLabels[type]);

      // Add tooltip icon with description
      const textWidth = labelText.node().getComputedTextLength();
      addTooltipIcon(legendRow, 22 + textWidth + 8, 0, economyDescriptions[type]);
    });

    // Size Legend
    const sizeLegend = svg.append('g')
      .attr('transform', `translate(${mapWidth + 20}, ${20 + economyOrder.length * 24 + 40})`);

    sizeLegend.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .attr('fill', '#2d1810')
      .text('Sample Size');

    // Show example sizes
    const exampleSizes = [10, 50, 100, 500, 1000, 2000];
    const validExampleSizes = exampleSizes.filter(size => size <= maxN);

    validExampleSizes.forEach((size, i) => {
      const legendRow = sizeLegend.append('g')
        .attr('transform', `translate(0, ${20 + i * 24})`);

      const radius = radiusScale(size);

      legendRow.append('circle')
        .attr('cx', 8)
        .attr('cy', 0)
        .attr('r', radius)
        .attr('fill', '#9ca3af')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.7);

      legendRow.append('text')
        .attr('x', 22)
        .attr('y', 4)
        .attr('font-size', '12px')
        .attr('fill', '#2d1810')
        .text(`n = ${size}`);
    });
  });
}


export function updateFilters(filters) {
  currentFilters = { ...currentFilters, ...filters };
}

// PIPER -- I think these are the world maps for your section:
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

// Variable mapping for the unified chart
const varMapping = {
  'TEE': { male: 'TEE_M', female: 'TEE_F', label: 'TEE (MJ/day)', tooltip: 'Total Energy Expenditure in megajoules per day' },
  'PAL': { male: 'PAL_M', female: 'PAL_F', label: 'PAL', tooltip: 'Physical Activity Level ratio' },
  'PercUPF': { male: 'PercUPF', female: 'PercUPF', label: 'UPF (%)', tooltip: 'Percentage of energy from ultra-processed foods' },
  'Fat': { male: 'Fat_M', female: 'Fat_F', label: 'Body Fat (%)', tooltip: 'Body fat percentage' },
  'Economy_Type': { male: 'Economy', female: 'Economy', label: 'Economy Type', tooltip: 'Economy type classification based on HDI and subsistence strategy' },
  'HDI_rank': { male: 'HDI_rank', female: 'HDI_rank', label: 'HDI Rank', tooltip: 'Human Development Index ranking (lower is better)' }
};

export function createUnifiedInteractiveChart(containerId) {
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

  // Helper to parse values
  function parseValue(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') {
      const t = v.trim().toUpperCase();
      if (t === '' || t === 'NA' || t === 'NULL') return null;
    }
    const num = Number(v);
    return Number.isFinite(num) ? num : null;
  }

  // Get value for a variable based on sex
  function getVarValue(d, varName, sex) {
    const mapping = varMapping[varName];
    if (!mapping) return null;

    // For shared variables like PercUPF and Economy_Type
    if (mapping.male === mapping.female) {
      return parseValue(d[mapping.male]);
    }

    return sex === 'M' ? parseValue(d[mapping.male]) : parseValue(d[mapping.female]);
  }

  // Determine if we should show box plot (when X is Economy_Type or when chartType is explicitly 'box')
  const showBoxPlot = currentFilters.chartType === 'box' ||
    (currentFilters.chartType === 'auto' && currentFilters.xVar === 'Economy_Type');

  // Expand data into individual points for M and F
  const expandedData = [];

  // When X is Economy_Type, we only need yVal since we position by economy category
  const isXAxisEconomy = currentFilters.xVar === 'Economy_Type';

  PAL_TEE_UPF_HDI_Data_Elsa.forEach(d => {
    // Add male data point if selected
    if (currentFilters.sexes.includes('M')) {
      const xVal = getVarValue(d, currentFilters.xVar, 'M');
      const yVal = getVarValue(d, currentFilters.yVar, 'M');

      // When X is Economy_Type, only yVal needs to be non-null (xVal is the economy category)
      const shouldInclude = isXAxisEconomy ? yVal !== null : (xVal !== null && yVal !== null);

      if (shouldInclude) {
        expandedData.push({
          Population: d.Population,
          Economy: d.Economy,
          sex: 'M',
          xVal,
          yVal,
          HDI_rank: +d.HDI_rank,
          lat: d.lat,
          lon: d.lon
        });
      }
    }

    // Add female data point if selected
    if (currentFilters.sexes.includes('F')) {
      const xVal = getVarValue(d, currentFilters.xVar, 'F');
      const yVal = getVarValue(d, currentFilters.yVar, 'F');

      // When X is Economy_Type, only yVal needs to be non-null (xVal is the economy category)
      const shouldInclude = isXAxisEconomy ? yVal !== null : (xVal !== null && yVal !== null);

      if (shouldInclude) {
        expandedData.push({
          Population: d.Population,
          Economy: d.Economy,
          sex: 'F',
          xVal,
          yVal,
          HDI_rank: +d.HDI_rank,
          lat: d.lat,
          lon: d.lon
        });
      }
    }
  });

  // Filter by economy
  const filteredData = expandedData.filter(d =>
    currentFilters.economies.includes(d.Economy)
  );

  if (filteredData.length === 0) {
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('fill', '#666')
      .text('No data available for selected filters');
    return;
  }

  // Get highlighted populations from filters
  const highlightedPopulations = currentFilters.highlightedPopulations || [];

  // Track regression lines and populations without data
  let hasMaleRegression = false;
  let hasFemaleRegression = false;
  const populationsWithoutData = [];

  // Find populations that don't have data for current metrics
  PAL_TEE_UPF_HDI_Data_Elsa.forEach(d => {
    if (!currentFilters.economies.includes(d.Economy)) return;

    const hasMaleX = currentFilters.sexes.includes('M') &&
      getVarValue(d, currentFilters.xVar, 'M') !== null;
    const hasMaleY = currentFilters.sexes.includes('M') &&
      getVarValue(d, currentFilters.yVar, 'M') !== null;
    const hasFemaleX = currentFilters.sexes.includes('F') &&
      getVarValue(d, currentFilters.xVar, 'F') !== null;
    const hasFemaleY = currentFilters.sexes.includes('F') &&
      getVarValue(d, currentFilters.yVar, 'F') !== null;

    // When X is Economy_Type, only Y value is needed (X is the economy category)
    const maleHasData = isXAxisEconomy ? hasMaleY : (hasMaleX && hasMaleY);
    const femaleHasData = isXAxisEconomy ? hasFemaleY : (hasFemaleX && hasFemaleY);

    if (currentFilters.sexes.includes('M') && !maleHasData) {
      populationsWithoutData.push({ Population: d.Population, Economy: d.Economy, sex: 'M' });
    }
    if (currentFilters.sexes.includes('F') && !femaleHasData) {
      populationsWithoutData.push({ Population: d.Population, Economy: d.Economy, sex: 'F' });
    }
  });

  // Initialize regression r-values (will be set in scatter plot section)
  let maleRValue = 0;
  let femaleRValue = 0;

  if (showBoxPlot) {
    // Group data by economy for box plot
    const groupedData = d3.group(filteredData, d => d.Economy);

    const boxPlotData = economyOrder
      .filter(economy => currentFilters.economies.includes(economy))
      .map(economy => {
        const values = (groupedData.get(economy) || []).map(d => d.yVal).sort(d3.ascending);
        if (values.length === 0) return null;

        const q1 = d3.quantile(values, 0.25);
        const median = d3.quantile(values, 0.5);
        const q3 = d3.quantile(values, 0.75);
        const iqr = q3 - q1;
        const min = Math.max(d3.min(values), q1 - 1.5 * iqr);
        const max = Math.min(d3.max(values), q3 + 1.5 * iqr);

        return { economy, q1, median, q3, min, max, values, data: groupedData.get(economy) };
      }).filter(d => d !== null);

    const x = d3.scaleBand()
      .domain(boxPlotData.map(d => d.economy))
      .range([0, width])
      .padding(0.3);

    const allValues = boxPlotData.flatMap(d => d.values);
    const y = d3.scaleLinear()
      .domain(d3.extent(allValues))
      .nice()
      .range([height, 0]);

    // Draw box plots
    boxPlotData.forEach(box => {
      const center = x(box.economy) + x.bandwidth() / 2;
      const boxWidth = x.bandwidth();

      // Whiskers
      svg.append('line')
        .attr('x1', center).attr('x2', center)
        .attr('y1', y(box.min)).attr('y2', y(box.q1))
        .attr('stroke', '#374151').attr('stroke-width', 1.5);

      svg.append('line')
        .attr('x1', center).attr('x2', center)
        .attr('y1', y(box.q3)).attr('y2', y(box.max))
        .attr('stroke', '#374151').attr('stroke-width', 1.5);

      // Whisker caps
      svg.append('line')
        .attr('x1', center - boxWidth / 4).attr('x2', center + boxWidth / 4)
        .attr('y1', y(box.min)).attr('y2', y(box.min))
        .attr('stroke', '#374151').attr('stroke-width', 2);

      svg.append('line')
        .attr('x1', center - boxWidth / 4).attr('x2', center + boxWidth / 4)
        .attr('y1', y(box.max)).attr('y2', y(box.max))
        .attr('stroke', '#374151').attr('stroke-width', 2);

      // Box
      svg.append('rect')
        .attr('x', center - boxWidth / 2)
        .attr('y', y(box.q3))
        .attr('width', boxWidth)
        .attr('height', y(box.q1) - y(box.q3))
        .attr('fill', economyColors[box.economy])
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5);

      // Median line
      svg.append('line')
        .attr('x1', center - boxWidth / 2).attr('x2', center + boxWidth / 2)
        .attr('y1', y(box.median)).attr('y2', y(box.median))
        .attr('stroke', '#374151').attr('stroke-width', 2.5);

      // Draw raw data points with jitter
      box.data.forEach(d => {
        const isHighlighted = highlightedPopulations.includes(d.Population);
        // Deterministic jitter based on population name and sex
        const seed = (d.Population + d.sex).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const deterministicRandom = (seed % 1000) / 1000; // Value between 0 and 1
        const shapeX = center + (deterministicRandom - 0.5) * boxWidth * 0.3;
        const shapeY = y(d.yVal);
        const size = isHighlighted ? 8 : 6;
        const opacity = isHighlighted ? 1 : 0.85;
        const strokeWidth = isHighlighted ? 3 : 1.5;
        const strokeColor = isHighlighted ? '#000' : '#fff';

        const html = `
          <strong>${d.Population}</strong><br>
          Sex: ${d.sex === 'M' ? 'Male' : 'Female'}<br>
          ${varMapping[currentFilters.yVar].label}: ${d.yVal.toFixed(2)}
        `;

        if (d.sex === 'M') {
          svg.append('circle')
            .attr('cx', shapeX)
            .attr('cy', shapeY)
            .attr('r', size)
            .attr('fill', economyColors[d.Economy])
            .attr('stroke', strokeColor)
            .attr('stroke-width', strokeWidth)
            .attr('opacity', opacity)
            .style('cursor', 'pointer')
            .on('mouseover', function(event) {
              d3.select(this).attr('r', size + 2).attr('opacity', 1);
              dataValueTooltip.html(html).style('visibility', 'visible');
            })
            .on('mousemove', function(event) {
              dataValueTooltip
                .style('top', (event.pageY - 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
            })
            .on('mouseout', function() {
              d3.select(this).attr('r', size).attr('opacity', opacity);
              dataValueTooltip.style('visibility', 'hidden');
            })
            .on('click', function() {
              toggleHighlight(d.Population);
            });
        } else {
          const triangleSize = isHighlighted ? 100 : 60;
          svg.append('path')
            .attr('d', d3.symbol().type(d3.symbolTriangle).size(triangleSize))
            .attr('transform', `translate(${shapeX},${shapeY})`)
            .attr('fill', economyColors[d.Economy])
            .attr('stroke', strokeColor)
            .attr('stroke-width', strokeWidth)
            .attr('opacity', opacity)
            .style('cursor', 'pointer')
            .on('mouseover', function(event) {
              d3.select(this)
                .attr('d', d3.symbol().type(d3.symbolTriangle).size(triangleSize * 1.5))
                .attr('opacity', 1);
              dataValueTooltip.html(html).style('visibility', 'visible');
            })
            .on('mousemove', function(event) {
              dataValueTooltip
                .style('top', (event.pageY - 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
            })
            .on('mouseout', function() {
              d3.select(this)
                .attr('d', d3.symbol().type(d3.symbolTriangle).size(triangleSize))
                .attr('opacity', opacity);
              dataValueTooltip.style('visibility', 'hidden');
            })
            .on('click', function() {
              toggleHighlight(d.Population);
            });
        }
      });
    });

    // X-axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('font-size', '12px')
      .attr('font-weight', '600');

    // Y-axis
    svg.append('g')
      .call(d3.axisLeft(y))
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

    addTooltipIcon(xAxisLabelGroup, 50, -5, 'Economy type classification based on HDI and subsistence strategy');

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
      .text(varMapping[currentFilters.yVar].label);

    addTooltipIcon(yAxisLabelGroup, 80, -5, varMapping[currentFilters.yVar].tooltip);

  } else {
    // Scatter plot - always use numeric scales
    const xExtent = d3.extent(filteredData, d => d.xVal);
    const yExtent = d3.extent(filteredData, d => d.yVal);
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

    const x = d3.scaleLinear()
      .domain([Math.max(0, xExtent[0] - xPadding), xExtent[1] + xPadding])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([Math.max(0, yExtent[0] - yPadding), yExtent[1] + yPadding])
      .range([height, 0]);

    // Use xVal directly for positioning
    filteredData.forEach(d => {
      d.xPosition = x(d.xVal);
    });

    // Draw regression lines by sex
    const males = filteredData.filter(d => d.sex === 'M');
    const females = filteredData.filter(d => d.sex === 'F');

    function addRegressionLine(data, isDotted) {
      if (data.length < 2) return { hasLine: false, r: 0 };

      const xMean = d3.mean(data, d => d.xVal);
      const yMean = d3.mean(data, d => d.yVal);

      let num = 0, denX = 0, denY = 0;
      data.forEach(d => {
        const dx = d.xVal - xMean;
        const dy = d.yVal - yMean;
        num += dx * dy;
        denX += dx ** 2;
        denY += dy ** 2;
      });
      if (denX === 0) return { hasLine: false, r: 0 };

      const slope = num / denX;
      const intercept = yMean - slope * xMean;

      // Calculate correlation coefficient (r)
      const r = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;

      const xMin = d3.min(data, d => d.xVal);
      const xMax = d3.max(data, d => d.xVal);

      const line = svg.append('line')
        .attr('x1', x(xMin))
        .attr('x2', x(xMax))
        .attr('y1', y(slope * xMin + intercept))
        .attr('y2', y(slope * xMax + intercept))
        .attr('stroke', '#4b5563')
        .attr('stroke-width', 2)
        .attr('opacity', 0.9);

      if (isDotted) {
        line.attr('stroke-dasharray', '5 4');
      }

      return { hasLine: true, r: r };
    }

    if (currentFilters.sexes.includes('M')) {
      const result = addRegressionLine(males, true);
      hasMaleRegression = result.hasLine;
      maleRValue = result.r;
    }
    if (currentFilters.sexes.includes('F')) {
      const result = addRegressionLine(females, false);
      hasFemaleRegression = result.hasLine;
      femaleRValue = result.r;
    }

    // Draw scatter points
    filteredData.forEach(d => {
      const isHighlighted = highlightedPopulations.includes(d.Population);
      const size = isHighlighted ? 9 : 7;
      const opacity = isHighlighted ? 1 : 0.85;
      const strokeWidth = isHighlighted ? 3 : 1.5;
      const strokeColor = isHighlighted ? '#000' : '#fff';

      const html = `
        <strong>${d.Population}</strong><br>
        Sex: ${d.sex === 'M' ? 'Male' : 'Female'}<br>
        ${varMapping[currentFilters.xVar].label}: ${d.xVal.toFixed(2)}<br>
        ${varMapping[currentFilters.yVar].label}: ${d.yVal.toFixed(2)}
      `;

      if (d.sex === 'M') {
        svg.append('circle')
          .attr('cx', d.xPosition)
          .attr('cy', y(d.yVal))
          .attr('r', size)
          .attr('fill', economyColors[d.Economy])
          .attr('stroke', strokeColor)
          .attr('stroke-width', strokeWidth)
          .attr('opacity', opacity)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            d3.select(this).attr('r', size + 2).attr('opacity', 1);
            dataValueTooltip.html(html).style('visibility', 'visible');
          })
          .on('mousemove', function(event) {
            dataValueTooltip
              .style('top', (event.pageY - 10) + 'px')
              .style('left', (event.pageX + 10) + 'px');
          })
          .on('mouseout', function() {
            d3.select(this).attr('r', size).attr('opacity', opacity);
            dataValueTooltip.style('visibility', 'hidden');
          })
          .on('click', function() {
            toggleHighlight(d.Population);
          });
      } else {
        const triangleSize = isHighlighted ? 140 : 100;
        svg.append('path')
          .attr('d', d3.symbol().type(d3.symbolTriangle).size(triangleSize))
          .attr('transform', `translate(${d.xPosition},${y(d.yVal)})`)
          .attr('fill', economyColors[d.Economy])
          .attr('stroke', strokeColor)
          .attr('stroke-width', strokeWidth)
          .attr('opacity', opacity)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            d3.select(this)
              .attr('d', d3.symbol().type(d3.symbolTriangle).size(triangleSize * 1.4))
              .attr('opacity', 1);
            dataValueTooltip.html(html).style('visibility', 'visible');
          })
          .on('mousemove', function(event) {
            dataValueTooltip
              .style('top', (event.pageY - 10) + 'px')
              .style('left', (event.pageX + 10) + 'px');
          })
          .on('mouseout', function() {
            d3.select(this)
              .attr('d', d3.symbol().type(d3.symbolTriangle).size(triangleSize))
              .attr('opacity', opacity);
            dataValueTooltip.style('visibility', 'hidden');
          })
          .on('click', function() {
            toggleHighlight(d.Population);
          });
      }
    });

    // X-axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(8))
      .selectAll('text')
      .attr('font-size', '12px')
      .attr('font-weight', '600');

    // Y-axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(8))
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
      .text(varMapping[currentFilters.xVar].label);

    addTooltipIcon(xAxisLabelGroup, 60, -5, varMapping[currentFilters.xVar].tooltip);

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
      .text(varMapping[currentFilters.yVar].label);

    addTooltipIcon(yAxisLabelGroup, 80, -5, varMapping[currentFilters.yVar].tooltip);
  }

  // Legend
  const legend = svg.append('g')
    .attr('transform', `translate(${width + 20}, -40)`);

  legend.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', '16px')
    .attr('font-weight', '700')
    .attr('fill', '#000')
    .text('Economy');

  const economyLabelsList = [
    { key: 'highHDI', label: 'high HDI' },
    { key: 'midHDI', label: 'mid HDI' },
    { key: 'lowHDI', label: 'low HDI' },
    { key: 'HORT', label: 'horticulturalist' },
    { key: 'AGP', label: 'agropastoralist' },
    { key: 'HG', label: 'hunter-gatherer' }
  ];

  economyLabelsList.forEach((item, i) => {
    if (!currentFilters.economies.includes(item.key)) return;

    const legendItem = legend.append('g')
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

  // Sex legend
  const sexLegendGroup = svg.append('g')
    .attr('transform', `translate(${width + 20}, ${180})`);

  sexLegendGroup.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', '16px')
    .attr('font-weight', '700')
    .attr('fill', '#000')
    .text('Sex');

  let legendY = 25;
  if (currentFilters.sexes.includes('M')) {
    const maleLegend = sexLegendGroup.append('g')
      .attr('transform', `translate(0, ${legendY})`);

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

    legendY += 25;
  }

  if (currentFilters.sexes.includes('F')) {
    const femaleLegend = sexLegendGroup.append('g')
      .attr('transform', `translate(0, ${legendY})`);

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

    legendY += 25;
  }

  // Regression lines legend (only for scatter plots)
  if (!showBoxPlot && (hasMaleRegression || hasFemaleRegression)) {
    const regressionLegend = svg.append('g')
      .attr('transform', `translate(${width + 20}, ${180 + legendY + 10})`);

    regressionLegend.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('font-size', '16px')
      .attr('font-weight', '700')
      .attr('fill', '#000')
      .text('Regression');

    let regY = 25;

    if (hasMaleRegression) {
      const maleReg = regressionLegend.append('g')
        .attr('transform', `translate(0, ${regY})`);

      maleReg.append('line')
        .attr('x1', 0)
        .attr('x2', 28)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', '#4b5563')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5 4');

      maleReg.append('text')
        .attr('x', 36)
        .attr('y', 4)
        .attr('font-size', '14px')
        .attr('fill', '#000')
        .text(`Male (r=${maleRValue.toFixed(2)})`);

      regY += 25;
    }

    if (hasFemaleRegression) {
      const femaleReg = regressionLegend.append('g')
        .attr('transform', `translate(0, ${regY})`);

      femaleReg.append('line')
        .attr('x1', 0)
        .attr('x2', 28)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', '#4b5563')
        .attr('stroke-width', 2);

      femaleReg.append('text')
        .attr('x', 36)
        .attr('y', 4)
        .attr('font-size', '14px')
        .attr('fill', '#000')
        .text(`Female (r=${femaleRValue.toFixed(2)})`);
    }
  }

  // Add section for populations without data below controls
  // First remove any existing no-data section
  d3.select('.no-data-section').remove();

  if (populationsWithoutData.length > 0) {
    // Append to the chart-wrapper (parent of chart and controls)
    const chartWrapper = d3.select(`#${containerId}`).node().parentNode;
    const noDataGroup = d3.select(chartWrapper)
      .append('div')
      .attr('class', 'no-data-section')
      .style('margin-top', '10px')
      .style('padding', '10px 15px')
      .style('background', 'rgba(0, 0, 0, 0.05)')
      .style('border-radius', '6px')
      .style('font-size', '12px');

    noDataGroup.append('div')
      .style('font-weight', '600')
      .style('margin-bottom', '8px')
      .style('color', '#666')
      .text('Missing data for current metrics:');

    const itemsContainer = noDataGroup.append('div')
      .style('display', 'flex')
      .style('flex-wrap', 'wrap')
      .style('gap', '8px');

    populationsWithoutData.forEach(d => {
      const isHighlighted = highlightedPopulations.includes(d.Population);
      const item = itemsContainer.append('span')
        .style('display', 'inline-flex')
        .style('align-items', 'center')
        .style('gap', '4px')
        .style('padding', '2px 8px')
        .style('background', isHighlighted ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.8)')
        .style('border-radius', '4px')
        .style('cursor', 'pointer')
        .style('border', isHighlighted ? '2px solid #000' : '1px solid #ddd');

      // Add shape for sex
      if (d.sex === 'M') {
        item.append('span')
          .style('width', '8px')
          .style('height', '8px')
          .style('border-radius', '50%')
          .style('background', economyColors[d.Economy]);
      } else {
        item.append('span')
          .style('width', '0')
          .style('height', '0')
          .style('border-left', '4px solid transparent')
          .style('border-right', '4px solid transparent')
          .style('border-bottom', `8px solid ${economyColors[d.Economy]}`);
      }

      item.append('span')
        .style('font-size', '11px')
        .style('color', '#333')
        .text(d.Population.length > 15 ? d.Population.substring(0, 13) + '...' : d.Population);

      // Add tooltip on hover
      item.on('mouseover', function(event) {
        dataValueTooltip
          .html(`
            <strong>${d.Population}</strong><br>
            Sex: ${d.sex === 'M' ? 'Male' : 'Female'}<br>
            Economy: ${economyLabels[d.Economy] || d.Economy}<br>
            <em>No data for ${varMapping[currentFilters.xVar].label} or ${varMapping[currentFilters.yVar].label}</em>
          `)
          .style('visibility', 'visible');
      })
      .on('mousemove', function(event) {
        dataValueTooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        dataValueTooltip.style('visibility', 'hidden');
      });
    });
  }
}

// Helper function to set filters for preset configurations
export function setUnifiedChartFilters(config) {
  currentFilters = {
    ...currentFilters,
    ...config
  };
}

// Get current filters
export function getUnifiedChartFilters() {
  return { ...currentFilters };
}

// Toggle highlight for a population
export function toggleHighlight(population) {
  const index = currentFilters.highlightedPopulations.indexOf(population);
  if (index > -1) {
    currentFilters.highlightedPopulations.splice(index, 1);
  } else {
    currentFilters.highlightedPopulations.push(population);
  }

  // Dispatch custom event so scroll.js can sync its selectedPopulations
  const event = new CustomEvent('highlightChanged', {
    detail: { highlightedPopulations: [...currentFilters.highlightedPopulations] }
  });
  document.dispatchEvent(event);

  // Redraw chart
  createUnifiedInteractiveChart('inactivity-chart');
}

// Create obesity/diabetes decline chart
export function createObesityDeclineChart(containerId) {
  // Use data from data.js
  const obesityData = usObesityDiabetesData.obesity;
  const diabetesData = usObesityDiabetesData.diabetes;

  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  const margin = { top: 60, right: 120, bottom: 60, left: 60 };
  const width = 900 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Add chart title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -30)
    .attr('text-anchor', 'middle')
    .attr('font-size', '18px')
    .attr('font-weight', '600')
    .attr('fill', '#1f2937')
    .text('U.S. Obesity and Diabetes Rates (2008-2025)');

  // Scales
  const xScale = d3.scaleLinear()
    .domain([2008, 2025])
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, 45])
    .range([height, 0]);

  // Axes
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d3.format('d'))
    .ticks(9);

  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => d + '%');

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
    .selectAll('text')
    .style('font-size', '12px')
    .style('fill', '#64748b');

  svg.append('g')
    .call(yAxis)
    .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
    .selectAll('text')
    .style('font-size', '12px')
    .style('fill', '#64748b');

  // Grid lines
  svg.append('g')
    .attr('class', 'grid')
    .selectAll('line')
    .data(yScale.ticks(9))
    .join('line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', d => yScale(d))
    .attr('y2', d => yScale(d))
    .attr('stroke', '#e2e8f0')
    .attr('stroke-dasharray', '2,2');

  // Line generators
  const obesityLine = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  const diabetesLine = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  // Draw obesity line
  svg.append('path')
    .datum(obesityData)
    .attr('fill', 'none')
    .attr('stroke', '#f97316')
    .attr('stroke-width', 3)
    .attr('d', obesityLine);

  // Draw diabetes line
  svg.append('path')
    .datum(diabetesData)
    .attr('fill', 'none')
    .attr('stroke', '#3b82f6')
    .attr('stroke-width', 3)
    .attr('d', diabetesLine);

  // Add dots for obesity data
  svg.selectAll('.obesity-dot')
    .data(obesityData)
    .join('circle')
    .attr('class', 'obesity-dot')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => yScale(d.value))
    .attr('r', 4)
    .attr('fill', '#f97316')
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('r', 6);
      globalTooltip
        .html(`<strong>${d.year}</strong><br/>Obesity: ${d.value}%`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('visible', true);
    })
    .on('mouseout', function() {
      d3.select(this).attr('r', 4);
      globalTooltip.classed('visible', false);
    });

  // Add dots for diabetes data
  svg.selectAll('.diabetes-dot')
    .data(diabetesData)
    .join('circle')
    .attr('class', 'diabetes-dot')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => yScale(d.value))
    .attr('r', 4)
    .attr('fill', '#3b82f6')
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('r', 6);
      globalTooltip
        .html(`<strong>${d.year}</strong><br/>Diabetes: ${d.value}%`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('visible', true);
    })
    .on('mouseout', function() {
      d3.select(this).attr('r', 4);
      globalTooltip.classed('visible', false);
    });

  // Highlight the peak and decline for obesity
  const peakYear = 2022;
  const peakData = obesityData.find(d => d.year === peakYear);

  // Vertical line at peak
  svg.append('line')
    .attr('x1', xScale(peakYear))
    .attr('x2', xScale(peakYear))
    .attr('y1', yScale(peakData.value))
    .attr('y2', height)
    .attr('stroke', '#f97316')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,4')
    .attr('opacity', 0.5);

  // Peak annotation
  svg.append('text')
    .attr('x', xScale(peakYear))
    .attr('y', yScale(peakData.value) - 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .attr('fill', '#f97316')
    .text(`Peak: ${peakData.value}%`);

  // Legend
  const legend = svg.append('g')
    .attr('transform', `translate(${width + 10}, 20)`);

  legend.append('line')
    .attr('x1', 0)
    .attr('x2', 30)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', '#f97316')
    .attr('stroke-width', 3);

  legend.append('text')
    .attr('x', 35)
    .attr('y', 0)
    .attr('dominant-baseline', 'middle')
    .attr('font-size', '13px')
    .attr('fill', '#1f2937')
    .text('Obesity');

  legend.append('line')
    .attr('x1', 0)
    .attr('x2', 30)
    .attr('y1', 25)
    .attr('y2', 25)
    .attr('stroke', '#3b82f6')
    .attr('stroke-width', 3);

  legend.append('text')
    .attr('x', 35)
    .attr('y', 25)
    .attr('dominant-baseline', 'middle')
    .attr('font-size', '13px')
    .attr('fill', '#1f2937')
    .text('Diabetes');

  // Axis labels
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '13px')
    .attr('fill', '#64748b')
    .text('Year');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '13px')
    .attr('fill', '#64748b')
    .text('Percentage of U.S. Adults (%)');
}


