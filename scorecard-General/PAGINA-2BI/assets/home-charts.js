(function () {
  "use strict";
  // Chart.js puede tardar en estar listo (red lenta / cache). No abortar: reintentar.
  var MAX_WAIT_MS = 3500;
  var START = Date.now();

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CHART_IDS = ["chartVentas", "chartMix", "chartBarras", "chartKpiFunnel", "chartKpiChannels"];
  var charts = {};

  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.body).getPropertyValue(name);
      v = (v || "").trim();
      return v || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function isDark() {
    return document.body && document.body.classList && document.body.classList.contains("p2bi-dark");
  }

  function palette() {
    var dark = isDark();
    if (!dark) {
      return {
        tick: "#4d6b88",
        grid: "rgba(10, 74, 124, 0.08)",
        tooltipBg: "rgba(4, 18, 33, 0.92)",
        border: "#ffffff",
        a: "#0a4a7c",
        b: "#1d8ef0",
        c: "#5eb8ff",
        d: "#c5ddf5",
        e: "#062a4a",
      };
    }
    // Luna: morado/indigo como template, azul 2BI como acento (armonizado).
    return {
      tick: cssVar("--muted", "rgba(165, 183, 224, 0.92)"),
      grid: "rgba(166, 132, 255, 0.14)",
      tooltipBg: "rgba(10, 10, 24, 0.92)",
      border: "rgba(255, 255, 255, 0.12)",
      a: cssVar("--luna-violet", "#a78bfa"),
      b: cssVar("--luna-fuchsia", "#d946ef"),
      c: cssVar("--blue-glow", "#8ad0ff"),
      d: "rgba(241, 245, 255, 0.22)",
      e: cssVar("--blue-bright", "#49a7ff"),
    };
  }

  function applyScaleColors(opts, pal) {
    if (!opts || !opts.scales) return;
    var s = opts.scales;
    if (s.x && s.x.ticks) s.x.ticks.color = pal.tick;
    if (s.y && s.y.ticks) s.y.ticks.color = pal.tick;
    if (s.x && s.x.grid) s.x.grid.color = pal.grid;
    if (s.y && s.y.grid) s.y.grid.color = pal.grid;
  }

  function applyLegendColors(opts, pal) {
    try {
      if (opts.plugins && opts.plugins.legend && opts.plugins.legend.labels) {
        opts.plugins.legend.labels.color = pal.tick;
      }
    } catch (_) {}
  }

  function applyTooltipColors(opts, pal) {
    try {
      if (opts.plugins && opts.plugins.tooltip) {
        opts.plugins.tooltip.backgroundColor = pal.tooltipBg;
      }
    } catch (_) {}
  }

  function updateExistingCharts() {
    if (typeof Chart === "undefined") return;
    var pal = palette();
    Object.keys(charts).forEach(function (k) {
      var c = charts[k];
      if (!c) return;
      try {
        applyScaleColors(c.options, pal);
        applyLegendColors(c.options, pal);
        applyTooltipColors(c.options, pal);
        // Ajusta borde de doughnuts
        if (c.data && c.data.datasets && c.data.datasets[0]) {
          if (c.config && (c.config.type === "doughnut" || c.config.type === "pie")) {
            c.data.datasets[0].borderColor = pal.border;
          }
        }
        c.update();
      } catch (_) {}
    });
  }

  function allRendered() {
    for (var i = 0; i < CHART_IDS.length; i++) {
      var el = document.getElementById(CHART_IDS[i]);
      if (el && !el.dataset.rendered) return false;
    }
    return true;
  }

  function makeCharts() {
    if (typeof Chart === "undefined") return false;
    var pal = palette();
    var lineEl = document.getElementById("chartVentas");
    if (lineEl && !lineEl.dataset.rendered) {
      lineEl.dataset.rendered = "1";
      charts.chartVentas = new Chart(lineEl, {
        type: "line",
        data: {
          labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
          datasets: [
            {
              label: "Ventas netas (índice)",
              data: [100, 108, 105, 118, 124, 132],
              borderColor: pal.e,
              backgroundColor: isDark() ? "rgba(167, 139, 250, 0.10)" : "rgba(29, 142, 240, 0.14)",
              fill: true,
              tension: 0.38,
              borderWidth: 2.5,
              pointRadius: 4,
              pointBackgroundColor: pal.a,
              pointBorderColor: pal.border,
              pointBorderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: "index" },
          animation: reduced ? false : { duration: 1100, easing: "easeOutQuart" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: pal.tooltipBg,
              titleFont: { family: "Outfit, sans-serif", size: 12 },
              bodyFont: { family: "Outfit, sans-serif", size: 13 },
              padding: 10,
              cornerRadius: 10,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: pal.tick, font: { size: 11, family: "Outfit, sans-serif" } },
            },
            y: {
              beginAtZero: false,
              grid: { color: pal.grid },
              ticks: { color: pal.tick, font: { size: 11, family: "Outfit, sans-serif" } },
            },
          },
        },
      });
    }

    var doughEl = document.getElementById("chartMix");
    if (doughEl && !doughEl.dataset.rendered) {
      doughEl.dataset.rendered = "1";
      charts.chartMix = new Chart(doughEl, {
        type: "doughnut",
        data: {
          labels: ["Power BI / Fabric", "SQL & almacén", "APIs & streams", "Legacy / flat files"],
          datasets: [
            {
              data: [40, 30, 18, 12],
              backgroundColor: [pal.a, pal.e, pal.c, pal.d],
              borderWidth: 2,
              borderColor: pal.border,
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "64%",
          animation: reduced ? false : { animateRotate: true, duration: 1000 },
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: pal.tick,
                boxWidth: 12,
                padding: 12,
                font: { size: 11, family: "Outfit, sans-serif" },
              },
            },
            tooltip: {
              backgroundColor: pal.tooltipBg,
              bodyFont: { family: "Outfit, sans-serif", size: 12 },
              padding: 10,
              cornerRadius: 10,
            },
          },
        },
      });
    }

    var barEl = document.getElementById("chartBarras");
    if (barEl && !barEl.dataset.rendered) {
      barEl.dataset.rendered = "1";
      charts.chartBarras = new Chart(barEl, {
        type: "bar",
        data: {
          labels: ["Descubrimiento", "Modelo mínimo", "Endurecimiento", "Adopción"],
          datasets: [
            {
              label: "Horas % (demo)",
              data: [22, 34, 28, 16],
              backgroundColor: [pal.a, pal.e, pal.c, pal.d],
              borderRadius: 10,
              borderSkipped: false,
              barThickness: 18,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          animation: reduced ? false : { duration: 1000, easing: "easeOutQuart" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(4, 18, 33, 0.92)",
              titleFont: { family: "Outfit, sans-serif", size: 12 },
              bodyFont: { family: "Outfit, sans-serif", size: 13 },
              padding: 10,
              cornerRadius: 10,
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              grid: { color: pal.grid },
              ticks: {
                color: pal.tick,
                font: { size: 11, family: "Outfit, sans-serif" },
                callback: function (v) {
                  return v + "%";
                },
              },
            },
            y: {
              grid: { display: false },
              ticks: {
                color: pal.tick,
                font: { size: 11, family: "Outfit, sans-serif" },
              },
            },
          },
        },
      });
    }

    var funnelEl = document.getElementById("chartKpiFunnel");
    if (funnelEl && !funnelEl.dataset.rendered) {
      funnelEl.dataset.rendered = "1";
      charts.chartKpiFunnel = new Chart(funnelEl, {
        type: "bar",
        data: {
          labels: ["Sesiones", "Vistas clave", "Leads", "Ventas"],
          datasets: [
            {
              label: "Volumen (demo)",
              data: [12000, 4200, 680, 120],
              backgroundColor: [pal.c, pal.e, pal.a, pal.b],
              borderRadius: 12,
              borderSkipped: false,
              barThickness: 22,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: reduced ? false : { duration: 950, easing: "easeOutQuart" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: pal.tooltipBg,
              titleFont: { family: "Outfit, sans-serif", size: 12 },
              bodyFont: { family: "Outfit, sans-serif", size: 13 },
              padding: 10,
              cornerRadius: 10,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: pal.tick, font: { size: 11, family: "Outfit, sans-serif" } },
            },
            y: {
              beginAtZero: true,
              grid: { color: pal.grid },
              ticks: {
                color: pal.tick,
                font: { size: 11, family: "Outfit, sans-serif" },
              },
            },
          },
        },
      });
    }

    var chEl = document.getElementById("chartKpiChannels");
    if (chEl && !chEl.dataset.rendered) {
      chEl.dataset.rendered = "1";
      charts.chartKpiChannels = new Chart(chEl, {
        type: "doughnut",
        data: {
          labels: ["Orgánico", "Ads", "Referidos", "Email/CRM", "Directo"],
          datasets: [
            {
              data: [34, 26, 18, 12, 10],
              backgroundColor: [pal.a, pal.e, pal.c, pal.d, pal.b],
              borderWidth: 2,
              borderColor: pal.border,
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          animation: reduced ? false : { animateRotate: true, duration: 900 },
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: pal.tick,
                boxWidth: 12,
                padding: 12,
                font: { size: 11, family: "Outfit, sans-serif" },
              },
            },
            tooltip: {
              backgroundColor: pal.tooltipBg,
              bodyFont: { family: "Outfit, sans-serif", size: 12 },
              padding: 10,
              cornerRadius: 10,
            },
          },
        },
      });
    }

    return true;
  }

  // Si cambia el tema (lunita), re-colorear charts existentes.
  try {
    window.addEventListener("p2bi:theme", function () {
      updateExistingCharts();
    });
  } catch (_) {}

  function svgWrap(svg) {
    return (
      '<div class="p2bi-svg-fallback" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center">' +
      svg +
      "</div>"
    );
  }

  function renderFallbacks() {
    // Fallback visual (sin Chart.js). Mantiene la estética 2BI.
    function setSvg(id, svg) {
      var c = document.getElementById(id);
      if (!c || c.dataset.rendered) return;
      var wrap = c.parentElement;
      if (!wrap) return;
      wrap.innerHTML = svgWrap(svg);
      c.dataset.rendered = "1";
    }

    setSvg(
      "chartVentas",
      '<svg viewBox="0 0 640 260" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">' +
        '<defs>' +
        '<linearGradient id="l1" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#0a4a7c"/><stop offset="1" stop-color="#5eb8ff"/>' +
        "</linearGradient>" +
        '<linearGradient id="a1" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#1d8ef0" stop-opacity="0.22"/><stop offset="1" stop-color="#1d8ef0" stop-opacity="0"/>' +
        "</linearGradient>" +
        "</defs>" +
        '<path d="M40,190 C110,150 150,110 210,125 C270,140 300,92 360,105 C420,118 450,70 505,86 C560,102 585,74 600,78" fill="none" stroke="url(#l1)" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M40,190 C110,150 150,110 210,125 C270,140 300,92 360,105 C420,118 450,70 505,86 C560,102 585,74 600,78 L600,230 L40,230 Z" fill="url(#a1)"/>' +
        "</svg>"
    );

    setSvg(
      "chartMix",
      '<svg viewBox="0 0 320 260" width="100%" height="100%" aria-hidden="true">' +
        '<g transform="translate(160 130)">' +
        '<circle r="86" fill="none" stroke="#c5ddf5" stroke-width="26"/>' +
        '<circle r="86" fill="none" stroke="#0a4a7c" stroke-width="26" stroke-dasharray="165 375" stroke-linecap="round" transform="rotate(-90)"/>' +
        '<circle r="86" fill="none" stroke="#1d8ef0" stroke-width="26" stroke-dasharray="120 420" stroke-linecap="round" transform="rotate(68)"/>' +
        '<circle r="86" fill="none" stroke="#5eb8ff" stroke-width="26" stroke-dasharray="80 460" stroke-linecap="round" transform="rotate(155)"/>' +
        '<circle r="62" fill="#ffffff" fill-opacity="0.92"/>' +
        "</g>" +
        "</svg>"
    );

    setSvg(
      "chartBarras",
      '<svg viewBox="0 0 640 220" width="100%" height="100%" aria-hidden="true">' +
        '<g fill="none" stroke="rgba(10,74,124,0.10)" stroke-width="1">' +
        '<path d="M110 40H610"/><path d="M110 80H610"/><path d="M110 120H610"/><path d="M110 160H610"/>' +
        "</g>" +
        '<g fill="#0a4a7c" fill-opacity="0.95">' +
        '<rect x="110" y="34" width="190" height="18" rx="9"/>' +
        '<rect x="110" y="74" width="290" height="18" rx="9" fill="#1d8ef0"/>' +
        '<rect x="110" y="114" width="240" height="18" rx="9" fill="#5eb8ff"/>' +
        '<rect x="110" y="154" width="140" height="18" rx="9" fill="#c5ddf5"/>' +
        "</g>" +
        "</svg>"
    );

    setSvg(
      "chartKpiFunnel",
      '<svg viewBox="0 0 640 240" width="100%" height="100%" aria-hidden="true">' +
        '<g fill="rgba(10,74,124,0.10)"><rect x="40" y="210" width="560" height="1"/></g>' +
        '<g>' +
        '<rect x="90" y="70" width="90" height="140" rx="12" fill="#5eb8ff"/>' +
        '<rect x="210" y="110" width="90" height="100" rx="12" fill="#1d8ef0"/>' +
        '<rect x="330" y="160" width="90" height="50" rx="12" fill="#0a4a7c"/>' +
        '<rect x="450" y="182" width="90" height="28" rx="12" fill="#062a4a"/>' +
        "</g>" +
        "</svg>"
    );

    setSvg(
      "chartKpiChannels",
      '<svg viewBox="0 0 320 260" width="100%" height="100%" aria-hidden="true">' +
        '<g transform="translate(160 130)">' +
        '<circle r="86" fill="none" stroke="#c5ddf5" stroke-width="26"/>' +
        '<circle r="86" fill="none" stroke="#0a4a7c" stroke-width="26" stroke-dasharray="140 400" stroke-linecap="round" transform="rotate(-90)"/>' +
        '<circle r="86" fill="none" stroke="#1d8ef0" stroke-width="26" stroke-dasharray="110 430" stroke-linecap="round" transform="rotate(45)"/>' +
        '<circle r="86" fill="none" stroke="#5eb8ff" stroke-width="26" stroke-dasharray="85 455" stroke-linecap="round" transform="rotate(120)"/>' +
        '<circle r="86" fill="none" stroke="#062a4a" stroke-width="26" stroke-dasharray="60 480" stroke-linecap="round" transform="rotate(185)"/>' +
        '<circle r="62" fill="#ffffff" fill-opacity="0.92"/>' +
        "</g>" +
        "</svg>"
    );
  }

  function initObservers() {
    // Render diferido: se activa al ver Gráficos o al ver KPIs.
    var mounts = [];
    var m1 = document.querySelector(".js-charts-mount");
    if (m1) mounts.push(m1);
    var m2 = document.getElementById("section-kpis");
    if (m2) mounts.push(m2);

    if (mounts.length === 0) {
      if (!makeCharts()) renderFallbacks();
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          if (!makeCharts()) renderFallbacks();
        });
        if (allRendered()) io.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    mounts.forEach(function (m) {
      io.observe(m);
    });

    // Si llegamos por hash (anchor), forzar un intento rápido.
    if (location && typeof location.hash === "string" && /section-kpis|section-dashboard/i.test(location.hash)) {
      setTimeout(function () {
        if (!makeCharts()) renderFallbacks();
      }, 60);
    }

    // BFCache / volver atrás: reintenta.
    window.addEventListener("pageshow", function () {
      setTimeout(function () {
        if (!makeCharts()) renderFallbacks();
      }, 60);
    });
  }

  (function waitForChartThenInit() {
    if (typeof Chart !== "undefined") {
      initObservers();
      return;
    }
    if (Date.now() - START > MAX_WAIT_MS) {
      // Último intento: si nunca cargó Chart.js, mostramos fallbacks (no vacío).
      renderFallbacks();
      return;
    }
    setTimeout(waitForChartThenInit, 90);
  })();
})();
