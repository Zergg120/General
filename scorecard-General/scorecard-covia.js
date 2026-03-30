/* global window, document, Chart */
(function () {
  'use strict';

  const DATA = window.SCORECARD_COVIA_DATA;
  if (!DATA) return;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const elYear = $('#covia-year');
  const elMonth = $('#covia-month');
  const elTitle = $('#covia-title');
  const elTbody = $('#covia-tbody');
  const elMainTitle = $('#covia-title');

  if (!elYear || !elMonth || !elTitle || !elTbody) return;

  const charts = new Map(); // canvas -> Chart

  function option(value, label) {
    const o = document.createElement('option');
    o.value = String(value);
    o.textContent = String(label);
    return o;
  }

  function fmtNum(x) {
    if (x == null || Number.isNaN(Number(x))) return '';
    const n = Number(x);
    if (Math.abs(n) >= 1000 && Number.isInteger(n)) return n.toLocaleString('en-US');
    return String(n);
  }

  function buildControls() {
    elYear.innerHTML = '';
    DATA.years.forEach((y) => elYear.appendChild(option(y, y)));

    elMonth.innerHTML = '';
    DATA.months.forEach((m) => elMonth.appendChild(option(m.key, m.label)));

    // Default: 2024 / abril como screenshots
    elYear.value = String(DATA.years.includes(2024) ? 2024 : DATA.years[0]);
    elMonth.value = '04';
  }

  function compareOk(compare, value, target) {
    const v = Number(value);
    if (Number.isNaN(v)) return false;
    if (compare === 'lte') return v <= Number(target);
    if (compare === 'gte') return v >= Number(target);
    if (compare === 'between') {
      if (!target || typeof target !== 'object') return false;
      return v >= Number(target.min) && v <= Number(target.max);
    }
    return false;
  }

  function deriveMonthValue(k) {
    // demo: usa el último punto del trend como “Month”
    const v = k.trend && k.trend.length ? k.trend[k.trend.length - 1] : 0;
    return k.unit === 'Rate' ? Number(v).toFixed(2) : Number(v).toFixed(0);
  }

  function deriveYtdValue(k) {
    // demo: promedio del trend como “YTD”
    if (!k.trend || !k.trend.length) return 0;
    const avg = k.trend.reduce((s, x) => s + x, 0) / k.trend.length;
    return k.unit === 'Rate' ? Number(avg).toFixed(2) : Number(avg).toFixed(0);
  }

  function deriveTargets(k) {
    // demo targets por unidad (solo maqueta)
    const last = Number(k.trend[k.trend.length - 1] || 0);
    if (k.compare === 'gte') {
      const t = k.unit === '$/MT' ? Math.max(0, last - 35) : Math.max(0, last - (last * 0.03));
      return { month: t, ytd: t };
    }
    if (k.compare === 'lte') {
      const t = k.unit === '$/MT' ? last - 35 : last - (last * 0.03);
      return { month: Math.max(0, t), ytd: Math.max(0, t) };
    }
    return { month: last, ytd: last };
  }

  function destroyCharts() {
    charts.forEach((c) => c.destroy());
    charts.clear();
  }

  function sparkline(canvas, series) {
    if (!window.Chart || !canvas) return;
    const ctx = canvas.getContext('2d');
    const existing = charts.get(canvas);
    if (existing) existing.destroy();

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: series.map((_, i) => i + 1),
        datasets: [
          {
            data: series,
            borderWidth: 0,
            backgroundColor: 'rgba(61, 139, 253, 0.65)',
            borderRadius: 2,
            barPercentage: 0.8,
            categoryPercentage: 0.95,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: false,
      },
    });
    charts.set(canvas, chart);
  }

  function setActiveTab(tabKey) {
    const tabs = $$('.covia-tab');
    tabs.forEach((b) => {
      const on = b.dataset.coviaTab === tabKey;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.classList.toggle('covia-tab--active', on);
      if (on) b.focus({ preventScroll: true });
    });
  }

  function render(tabKey) {
    const tab = DATA.tabs[tabKey] || DATA.tabs.delivery_financials;
    setActiveTab(tabKey);
    elMainTitle.textContent = tab.title;

    destroyCharts();
    elTbody.innerHTML = '';

    const frag = document.createDocumentFragment();
    let rowIdx = 0;

    tab.groups.forEach((g) => {
      const areaRowspan = g.kpis.length;
      g.kpis.forEach((k, i) => {
        const tr = document.createElement('tr');
        if (i === 0) {
          const tdArea = document.createElement('td');
          tdArea.className = 'covia-area';
          tdArea.rowSpan = areaRowspan;
          tdArea.innerHTML = `<div class=\"covia-area__inner\"><div class=\"covia-area__icon\" aria-hidden=\"true\">${g.icon}</div><div class=\"covia-area__name\">${g.area}</div></div>`;
          tr.appendChild(tdArea);
        }

        const tds = [];
        const tdKpi = document.createElement('td');
        tdKpi.className = 'covia-kpi';
        tdKpi.textContent = k.label;
        tds.push(tdKpi);

        const tdUnit = document.createElement('td');
        tdUnit.className = 'covia-unit';
        tdUnit.textContent = k.unit;
        tds.push(tdUnit);

        const monthVal = deriveMonthValue(k);
        const ytdVal = deriveYtdValue(k);
        const targets = deriveTargets(k);

        const tdMonth = document.createElement('td');
        tdMonth.className = 'covia-num';
        tdMonth.textContent = fmtNum(monthVal);
        tds.push(tdMonth);

        const tdTargetM = document.createElement('td');
        tdTargetM.className = 'covia-num covia-num--muted';
        tdTargetM.textContent = fmtNum(targets.month);
        tds.push(tdTargetM);

        const okM = compareOk(k.compare, monthVal, targets.month);
        const tdStatusM = document.createElement('td');
        tdStatusM.className = 'covia-status';
        tdStatusM.innerHTML = `<span class=\"covia-dot ${okM ? 'covia-dot--ok' : 'covia-dot--bad'}\" aria-label=\"${okM ? 'OK' : 'Atención'}\"></span>`;
        tds.push(tdStatusM);

        const tdYtd = document.createElement('td');
        tdYtd.className = 'covia-num';
        tdYtd.textContent = fmtNum(ytdVal);
        tds.push(tdYtd);

        const tdTargetY = document.createElement('td');
        tdTargetY.className = 'covia-num covia-num--muted';
        tdTargetY.textContent = fmtNum(targets.ytd);
        tds.push(tdTargetY);

        const okY = compareOk(k.compare, ytdVal, targets.ytd);
        const tdStatusY = document.createElement('td');
        tdStatusY.className = 'covia-status';
        tdStatusY.innerHTML = `<span class=\"covia-dot ${okY ? 'covia-dot--ok' : 'covia-dot--bad'}\" aria-label=\"${okY ? 'OK' : 'Atención'}\"></span>`;
        tds.push(tdStatusY);

        const tdTrend = document.createElement('td');
        tdTrend.className = 'covia-trend';
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 44;
        canvas.className = 'covia-spark';
        tdTrend.appendChild(canvas);
        tds.push(tdTrend);

        tds.forEach((td) => tr.appendChild(td));
        if (rowIdx % 2 === 0) tr.classList.add('covia-row--alt');
        frag.appendChild(tr);

        // Dibuja el trend al final para que el canvas ya esté en el DOM
        requestAnimationFrame(() => sparkline(canvas, k.trend));
        rowIdx++;
      });
    });

    elTbody.appendChild(frag);
  }

  function bind() {
    $$('.covia-tab').forEach((b) => {
      b.addEventListener('click', () => render(b.dataset.coviaTab));
    });
    elYear.addEventListener('change', () => {
      // En demo no cambia cálculos; se deja para API real
      const active = $('.covia-tab[aria-selected=\"true\"]');
      render(active ? active.dataset.coviaTab : 'delivery_financials');
    });
    elMonth.addEventListener('change', () => {
      const active = $('.covia-tab[aria-selected=\"true\"]');
      render(active ? active.dataset.coviaTab : 'delivery_financials');
    });
  }

  buildControls();
  bind();
  render('delivery_financials');
})();

