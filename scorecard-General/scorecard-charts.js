/**
 * Gráficas Chart.js — carga diferida junto a chart.umd.min.js (defer).
 */
(function () {
  'use strict';

  if (typeof Chart === 'undefined') return;

  var months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
  var revenue = [5.1, 5.4, 5.8, 5.6, 6.0, 6.2].map(function (v) {
    return v * 1e6;
  });
  var margin = [41.2, 41.8, 42.5, 42.9, 43.1, 43.4];
  var revenueChart = null;
  var marginChart = null;

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function hexToRgba(hex, a) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return 'rgba(61,139,253,' + a + ')';
    return (
      'rgba(' +
      parseInt(m[1], 16) +
      ',' +
      parseInt(m[2], 16) +
      ',' +
      parseInt(m[3], 16) +
      ',' +
      a +
      ')'
    );
  }

  function renderCharts() {
    var accent = cssVar('--accent', '#3d8bfd');
    var tick = cssVar('--text-muted', '#8b97a8');
    var grid = document.body.classList.contains('light')
      ? 'rgba(15,23,42,0.08)'
      : 'rgba(255,255,255,0.06)';

    var commonOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: grid },
          ticks: { color: tick, font: { family: 'IBM Plex Mono', size: 10 } },
        },
        y: {
          grid: { color: grid },
          ticks: {
            color: tick,
            font: { family: 'IBM Plex Mono', size: 10 },
            callback: function (v) {
              if (this.chart.canvas.id === 'ch-revenue') return '$' + (v / 1e6).toFixed(1) + 'M';
              return v + '%';
            },
          },
        },
      },
    };

    var elR = document.getElementById('ch-revenue');
    var elM = document.getElementById('ch-margin');
    if (!elR || !elM) return;

    if (revenueChart) revenueChart.destroy();
    if (marginChart) marginChart.destroy();

    revenueChart = new Chart(elR, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Ingreso',
            data: revenue,
            borderColor: accent,
            backgroundColor: hexToRgba(accent, 0.12),
            fill: true,
            tension: 0.35,
            borderWidth: 2,
          },
        ],
      },
      options: commonOpts,
    });

    marginChart = new Chart(elM, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Margen %',
            data: margin,
            backgroundColor: margin.map(function (m) {
              return m >= 43 ? 'rgba(52, 211, 153, 0.45)' : 'rgba(167, 139, 250, 0.35)';
            }),
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        ...commonOpts,
        scales: {
          ...commonOpts.scales,
          y: { ...commonOpts.scales.y, min: 38, max: 46 },
        },
      },
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderCharts();
    document.addEventListener('scorecard:themechange', renderCharts);
    document.addEventListener('scorecard:dailydatasync', function () {
      renderCharts();
    });
  });
})();
