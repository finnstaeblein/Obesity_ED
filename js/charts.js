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

// Tooltip
const dataValueTooltip = d3.select('body').append('div')
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
          .attr('r', radiusScale(totalN) + 3)   // grow on hover
          .attr('opacity', 1);

          dataValueTooltip
          .html(`
            <strong>${pop.Population}</strong><br>
            Sample size: ${totalN}<br>
            Economy: ${pop.Economy}
          `)
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

// second graph I think -- yes being used
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

  // keep the NA
  function parseValue(v) {
    if (v === null || v === undefined) return null;
  
    if (typeof v === 'string') {
      const t = v.trim().toUpperCase();
      if (t === '' || t === 'NA' || t === 'NULL') return null;
    }
  
    const num = Number(v);
    return Number.isFinite(num) ? num : null;
  }

  const groupedData = d3.group(PAL_TEE_UPF_HDI_Data_Elsa, d => d.Economy);

  const boxPlotData = economyOrder.map(Economy => {
    const values = (groupedData.get(Economy))
      .flatMap(d => [
        parseValue(d[`${metric.toUpperCase()}_M`]),
        parseValue(d[`${metric.toUpperCase()}_F`])
      ])
      .filter(v => v !== null)
      .sort(d3.ascending);
  
    if (values.length === 0) return null;

    const q1 = d3.quantile(values, 0.25);
    const median = d3.quantile(values, 0.5);
    const q3 = d3.quantile(values, 0.75);
    const iqr = q3 - q1;
    const min = Math.max(d3.min(values), q1 - 1.5 * iqr);
    const max = Math.min(d3.max(values), q3 + 1.5 * iqr);

    return {Economy, q1, median, q3, min, max, values};
  }).filter(d => d !== null);

  const x = d3.scaleBand()
    .domain(economyOrder)
    .range([0, width])
    .padding(0.3);

  
  const allValues = boxPlotData.flatMap(d => d.values);
  const y = d3.scaleLinear()
    .domain(d3.extent(allValues))
    .nice()
    .range([height, 0]);

  boxPlotData.forEach(box => {
    const center = x(box.Economy) + x.bandwidth() / 2;
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
      .attr('fill', economyColors[box.Economy])
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
      boxPlotData.forEach(box => {
        const center = x(box.Economy) + x.bandwidth() / 2;
        const groupRows = groupedData.get(box.Economy) || [];
      
        const rawPoints = groupRows.flatMap(d => {
          const maleVal = +d[`${metric.toUpperCase()}_M`];
          const femaleVal = +d[`${metric.toUpperCase()}_F`];
          const arr = [];
      
          if (isFinite(maleVal)) {
            arr.push({
              Population: d.Population,
              sex: 'M',
              value: maleVal
            });
          }
      
          if (isFinite(femaleVal)) {
            arr.push({
              Population: d.Population,
              sex: 'F',
              value: femaleVal
            });
          }
          return arr;
        });
      
        rawPoints.forEach(p => {
          // Deterministic jitter based on population name and sex
          const seed = (p.Population + p.sex).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const deterministicRandom = (seed % 1000) / 1000; // Value between 0 and 1
          const shapeX = center + (deterministicRandom - 0.5) * x.bandwidth() * 0.3; // add jitter
          const shapeY = y(p.value);
          const size = 6;
      
          const html = `
            <strong>${p.Population}</strong><br>
            Sex: ${p.sex === 'M' ? 'Male' : 'Female'}<br>
            ${metric.toUpperCase()}: ${p.value.toFixed(2)}
          `;
      
          if (p.sex === 'M') {
            svg.append('circle')
              .attr('cx', shapeX)
              .attr('cy', shapeY)
              .attr('r', size)
              .attr('fill', economyColors[box.Economy])
              .attr('stroke', '#fff')
              .attr('stroke-width', 1.5)
              .attr('opacity', 0.85)
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
                d3.select(this).attr('r', size).attr('opacity', 0.85);
                dataValueTooltip.style('visibility', 'hidden');
              });
      
          } else {
            const triangleSize = 60;
            const triangleSizeHover = 140;

          svg.append('path')
            .attr('d', d3.symbol().type(d3.symbolTriangle).size(triangleSize))
            .attr('transform', `translate(${shapeX},${shapeY})`)
            .attr('fill', economyColors[box.Economy])
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.85)
            .style('cursor', 'pointer')
            .on('mouseover', function(event) {

              d3.select(this)
                .attr('d', d3.symbol().type(d3.symbolTriangle).size(triangleSizeHover))
                .attr('opacity', 1);

              dataValueTooltip
                .html(html)
                .style('visibility', 'visible');
            })
            .on('mousemove', function(event) {
              dataValueTooltip
                .style('top', (event.pageY - 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
            })
            .on('mouseout', function() {
              d3.select(this)
                .attr('d', d3.symbol().type(d3.symbolTriangle).size(triangleSize))
                .attr('opacity', 0.85);

              dataValueTooltip.style('visibility', 'hidden');
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
    .text(metric === 'tee' ? 'Total Energy Expenditure (MJ/day)' : 'Physical Activity Level (MJ/day)');

  addTooltipIcon(yAxisLabelGroup, 80, -5,
    metric.toUpperCase() === 'TEE'
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
    { key: 'highHDI', label: 'high HDI' },
    { key: 'midHDI', label: 'mid HDI' },
    { key: 'lowHDI', label: 'low HDI' },
    { key: 'HORT', label: 'horticulturalist' },
    { key: 'AGP', label: 'agropastoralist' },
    { key: 'HG', label: 'hunter-gatherer' },
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

export function createMetricScatterPlot(containerId, metric = "PAL") {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const margin = { top: 60, right: 180, bottom: 60, left: 60 };
  const width = (container.clientWidth || 600) - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // helper
  function parseValue(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "string") {
      const t = v.trim().toUpperCase();
      if (t === "" || t === "NA" || t === "NULL") return null;
    }
    const num = Number(v);
    return Number.isFinite(num) ? num : null;
  }

  // Expand dataset into M + F rows
  const expanded = PAL_TEE_UPF_HDI_Data_Elsa.flatMap(d => {
    const out = [];

    const m = parseValue(d[`${metric.toUpperCase()}_M`]);
    if (m !== null) {
      out.push({
        Population: d.Population,
        Economy: d.Economy,
        sex: "M",
        value: m,
        HDI_rank: +d.HDI_rank
      });
    }

    const f = parseValue(d[`${metric.toUpperCase()}_F`]);
    if (f !== null) {
      out.push({
        Population: d.Population,
        Economy: d.Economy,
        sex: "F",
        value: f,
        HDI_rank: +d.HDI_rank
      });
    }

    return out;
  });

  // x and y
  const x = d3.scaleLinear()
    .domain(d3.extent(expanded, d => d.HDI_rank))
    .nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain(d3.extent(expanded, d => d.value))
    .nice()
    .range([height, 0]);

    function addRegressionLine(data, color, isDotted) {
      if (data.length < 2) return null;
    
      const xMean = d3.mean(data, d => d.HDI_rank);
      const yMean = d3.mean(data, d => d.value);
    
      let num = 0, den = 0;
      data.forEach(d => {
        num += (d.HDI_rank - xMean) * (d.value - yMean);
        den += (d.HDI_rank - xMean) ** 2;
      });
      if (den === 0) return null;
    
      const slope = num / den;
      const intercept = yMean - slope * xMean;
    
      const xMin = d3.min(data, d => d.HDI_rank);
      const xMax = d3.max(data, d => d.HDI_rank);
    
      const line = svg.append("line")
        .attr("x1", x(xMin))
        .attr("x2", x(xMax))
        .attr("y1", y(slope * xMin + intercept))
        .attr("y2", y(slope * xMax + intercept))
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("opacity", 0.9);
    
      if (isDotted) {
        line.attr("stroke-dasharray", "5 4");
      }
    
      return slope;
    }

  // group by sex for regression
  const males = expanded.filter(d => d.sex === "M");
  const females = expanded.filter(d => d.sex === "F");

  // regression lines colored neutral
  addRegressionLine(males, "#4b5563", true);   // dotted
  addRegressionLine(females, "#4b5563", false); // solid

  // scatter points
  expanded.forEach(d => {
    const html = `
      <strong>${d.Population}</strong><br>
      Sex: ${d.sex === "M" ? "Male" : "Female"}<br>
      HDI Rank: ${d.HDI_rank}<br>
      ${metric.toUpperCase()}: ${d.value.toFixed(2)}
    `;

    if (d.sex === "M") {
      svg.append("circle")
        .attr("cx", x(d.HDI_rank))
        .attr("cy", y(d.value))
        .attr("r", 6)
        .attr("fill", economyColors[d.Economy])
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("opacity", 0.85)
        .on("mouseover", function (event) {
          d3.select(this).attr("r", 8).attr("opacity", 1);
          dataValueTooltip.html(html).style("visibility", "visible");
        })
        .on("mousemove", function (event) {
          dataValueTooltip
            .style("top", event.pageY - 10 + "px")
            .style("left", event.pageX + 10 + "px");
        })
        .on("mouseout", function () {
          d3.select(this).attr("r", 6).attr("opacity", 0.85);
          dataValueTooltip.style("visibility", "hidden");
        });

    } else {
      const tri = d3.symbol().type(d3.symbolTriangle).size(80);

      svg.append("path")
        .attr("d", tri)
        .attr("transform", `translate(${x(d.HDI_rank)},${y(d.value)})`)
        .attr("fill", economyColors[d.Economy])
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("opacity", 0.85)
        .on("mouseover", function (event) {
          d3.select(this)
            .attr("d", d3.symbol().type(d3.symbolTriangle).size(140))
            .attr("opacity", 1);

          dataValueTooltip.html(html).style("visibility", "visible");
        })
        .on("mousemove", function (event) {
          dataValueTooltip
            .style("top", event.pageY - 10 + "px")
            .style("left", event.pageX + 10 + "px");
        })
        .on("mouseout", function () {
          d3.select(this)
            .attr("d", tri)
            .attr("opacity", 0.85);

          dataValueTooltip.style("visibility", "hidden");
        });
    }
  });

  // axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g").call(d3.axisLeft(y));

// --- MATCH EXACT BOX-PLOT LEGEND STYLE ---
const legendGroup = svg.append('g')
  .attr('transform', `translate(${width + 20}, -40)`);

// Economy title
legendGroup.append('text')
  .attr('x', 0)
  .attr('y', 0)
  .attr('font-size', '16px')
  .attr('font-weight', '700')
  .attr('fill', '#000')
  .text('Economy');

// EXACT same labels as box plot:
const economyLabels = [
  { key: 'highHDI', label: 'high HDI' },
  { key: 'midHDI', label: 'mid HDI' },
  { key: 'lowHDI', label: 'low HDI' },
  { key: 'HORT', label: 'horticulturalist' },
  { key: 'AGP', label: 'agropastoralist' },
  { key: 'HG', label: 'hunter-gatherer' }
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

// Sex legend (same structure as box plot)
const sexLegendGroup = svg.append('g')
  .attr('transform', `translate(${width + 20}, ${180})`);

sexLegendGroup.append('text')
  .attr('x', 0)
  .attr('y', 0)
  .attr('font-size', '16px')
  .attr('font-weight', '700')
  .attr('fill', '#000')
  .text('Sex');

// Male
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

// Female
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
.text('HDI Rank');

addTooltipIcon(
xAxisLabelGroup,
55, -5,
'HDI Rank: Human Development Index ranking based on life expectancy, education, and per capita income'
);


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
  .text(metric.toUpperCase() === 'TEE'
    ? 'Total Energy Expenditure (MJ/day)'
    : 'Physical Activity Level');

addTooltipIcon(
  yAxisLabelGroup,
  80, -5,
  metric.toUpperCase() === 'TEE'
    ? 'TEE (Total Energy Expenditure): Total energy burned per day in kilocalories per day'
    : 'PAL (Physical Activity Level): Ratio of total energy expenditure to basal metabolic rate'
);
// Regression Legend (same column as Economy + Sex)
const regressionLegendGroup = svg.append('g')
  .attr('transform', `translate(${width + 20}, ${300})`);

// Title
regressionLegendGroup.append('text')
  .attr('x', 0)
  .attr('y', 0)
  .attr('font-size', '16px')
  .attr('font-weight', '700')
  .attr('fill', '#000')
  .text('Regression Lines');

// --- Male (dotted) ---
const maleReg = regressionLegendGroup.append('g')
  .attr('transform', 'translate(0, 25)');

maleReg.append('line')
  .attr('x1', 0)
  .attr('x2', 28)
  .attr('y1', 0)
  .attr('y2', 0)
  .attr('stroke', '#4b5563')
  .attr('stroke-width', 2)
  .attr('stroke-dasharray', '5 4');

maleReg.append('text')
  .attr('x', 40)
  .attr('y', 4)
  .attr('font-size', '14px')
  .attr('fill', '#000')
  .text("Male");

// --- Female (solid) ---
const femaleReg = regressionLegendGroup.append('g')
  .attr('transform', 'translate(0, 55)');

femaleReg.append('line')
  .attr('x1', 0)
  .attr('x2', 28)
  .attr('y1', 0)
  .attr('y2', 0)
  .attr('stroke', '#4b5563')
  .attr('stroke-width', 2);

femaleReg.append('text')
  .attr('x', 40)
  .attr('y', 4)
  .attr('font-size', '14px')
  .attr('fill', '#000')
  .text("Female");

}
//.text(`Female slope = ${femaleSlope !== null ? femaleSlope.toFixed(3) : "NA"}`);

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

// Yes being used
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

  const margin = { top: 60000, right: 30, bottom: 60, left: 60 };
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
//__________________________________________

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

// NOT relevant but if I delete plots don't show
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
      if (data.length < 2) return false;

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
      if (denX === 0) return false;

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

      // Add correlation label on the line
      const labelX = xMin + (xMax - xMin) * 0.7;
      const labelY = slope * labelX + intercept;

      // Background for label
      svg.append('rect')
        .attr('x', x(labelX) - 22)
        .attr('y', y(labelY) - 12)
        .attr('width', 44)
        .attr('height', 16)
        .attr('fill', 'white')
        .attr('opacity', 0.85)
        .attr('rx', 3);

      // Label text
      svg.append('text')
        .attr('x', x(labelX))
        .attr('y', y(labelY))
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', '#4b5563')
        .text(`r=${r.toFixed(2)}`);

      return true;
    }

    if (currentFilters.sexes.includes('M')) hasMaleRegression = addRegressionLine(males, true);
    if (currentFilters.sexes.includes('F')) hasFemaleRegression = addRegressionLine(females, false);

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
        .text('Male');

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
        .text('Female');
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


