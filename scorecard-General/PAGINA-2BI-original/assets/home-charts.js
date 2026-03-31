(function () {
  "use strict";
  if (typeof Chart === "undefined") return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function makeCharts() {
    var lineEl = document.getElementById("chartVentas");
    if (lineEl && !lineEl.dataset.rendered) {
      lineEl.dataset.rendered = "1";
      new Chart(lineEl, {
        type: "line",
        data: {
          labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
          datasets: [
            {
              label: "Ventas netas (índice)",
              data: [100, 108, 105, 118, 124, 132],
              borderColor: "#1d8ef0",
              backgroundColor: "rgba(29, 142, 240, 0.14)",
              fill: true,
              tension: 0.38,
              borderWidth: 2.5,
              pointRadius: 4,
              pointBackgroundColor: "#0a4a7c",
              pointBorderColor: "#fff",
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
              backgroundColor: "rgba(4, 18, 33, 0.92)",
              titleFont: { family: "Outfit, sans-serif", size: 12 },
              bodyFont: { family: "Outfit, sans-serif", size: 13 },
              padding: 10,
              cornerRadius: 10,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: "#4d6b88", font: { size: 11, family: "Outfit, sans-serif" } },
            },
            y: {
              beginAtZero: false,
              grid: { color: "rgba(10, 74, 124, 0.08)" },
              ticks: { color: "#4d6b88", font: { size: 11, family: "Outfit, sans-serif" } },
            },
          },
        },
      });
    }

    var doughEl = document.getElementById("chartMix");
    if (doughEl && !doughEl.dataset.rendered) {
      doughEl.dataset.rendered = "1";
      new Chart(doughEl, {
        type: "doughnut",
        data: {
          labels: ["Power BI / Fabric", "SQL & almacén", "APIs & streams", "Legacy / flat files"],
          datasets: [
            {
              data: [40, 30, 18, 12],
              backgroundColor: ["#0a4a7c", "#1d8ef0", "#5eb8ff", "#c5ddf5"],
              borderWidth: 2,
              borderColor: "#ffffff",
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
                color: "#4d6b88",
                boxWidth: 12,
                padding: 12,
                font: { size: 11, family: "Outfit, sans-serif" },
              },
            },
            tooltip: {
              backgroundColor: "rgba(4, 18, 33, 0.92)",
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
      new Chart(barEl, {
        type: "bar",
        data: {
          labels: ["Descubrimiento", "Modelo mínimo", "Endurecimiento", "Adopción"],
          datasets: [
            {
              label: "Horas % (demo)",
              data: [22, 34, 28, 16],
              backgroundColor: ["#0a4a7c", "#1d8ef0", "#5eb8ff", "#c5ddf5"],
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
              grid: { color: "rgba(10, 74, 124, 0.08)" },
              ticks: {
                color: "#4d6b88",
                font: { size: 11, family: "Outfit, sans-serif" },
                callback: function (v) {
                  return v + "%";
                },
              },
            },
            y: {
              grid: { display: false },
              ticks: {
                color: "#4d6b88",
                font: { size: 11, family: "Outfit, sans-serif" },
              },
            },
          },
        },
      });
    }
  }

  var mount = document.querySelector(".js-charts-mount");
  if (!mount) {
    makeCharts();
    return;
  }
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          makeCharts();
          io.disconnect();
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  io.observe(mount);
})();
