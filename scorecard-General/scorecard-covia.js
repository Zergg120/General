/* global window, document, Chart */
(function () {
  'use strict';

  const DATA = window.SCORECARD_COVIA_DATA;
  if (!DATA) return;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const elYear = $('#covia-year');
  const elMonth = $('#covia-month');
  const elMainTitle = $('#covia-title');
  const elTbody = $('#covia-tbody');
  const elEyebrow = $('.covia-eyebrow');

  if (!elYear || !elMonth || !elMainTitle || !elTbody) return;

  const charts = new Map();

  function option(value, label) {
    const o = document.createElement('option');
    o.value = String(value);
    o.textContent = String(label);
    return o;
  }

  /** Formato número / decimales para celdas */
  function fmtCell(val) {
    if (val == null || Number.isNaN(Number(val))) return '—';
    const n = Number(val);
    if (Math.abs(n) >= 1000 && Number.isInteger(n)) return n.toLocaleString('en-US');
    if (Number.isInteger(n)) return String(n);
    const s = n.toFixed(1);
    return s.replace(/\.0$/, '');
  }

  function fmtTarget(k, which) {
    const lab = which === 'm' ? k.targetMonthLabel : k.targetYtdLabel;
    if (lab) return lab;
    return fmtCell(which === 'm' ? k.targetMonth : k.targetYtd);
  }

  function buildControls() {
    elYear.innerHTML = '';
    DATA.years.forEach((y) => elYear.appendChild(option(y, y)));
    elMonth.innerHTML = '';
    DATA.months.forEach((m) => elMonth.appendChild(option(m.key, m.label)));
    elYear.value = String(DATA.years.includes(2024) ? 2024 : DATA.years[0]);
    elMonth.value = '04';
  }

  function compareOk(k, value, target) {
    const v = Number(value);
    const t = Number(target);
    if (Number.isNaN(v) || Number.isNaN(t)) return false;
    if (k.cmp === 'lte') return v <= t;
    if (k.cmp === 'gte') return v >= t;
    return false;
  }

  function statusFor(k, which) {
    if (which === 'm' && k.okMonth != null) return k.okMonth;
    if (which === 'y' && k.okYtd != null) return k.okYtd;
    const v = which === 'm' ? k.month : k.ytd;
    const t = which === 'm' ? k.targetMonth : k.targetYtd;
    return compareOk(k, v, t);
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
    $$('.covia-tab').forEach((b) => {
      const on = b.dataset.coviaTab === tabKey;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.classList.toggle('covia-tab--active', on);
    });
  }

  function periodLabel(monthKey) {
    const mk = String(monthKey).padStart(2, '0');
    const m = DATA.months.find((x) => x.key === mk);
    return m ? m.label : mk;
  }

  function render(tabKey) {
    const year = parseInt(elYear.value, 10) || 2024;
    const monthKey = elMonth.value;
    const materialize = typeof DATA.materializeTab === 'function' ? DATA.materializeTab : null;
    const tab = materialize
      ? materialize(tabKey, year, monthKey)
      : DATA.tabs[tabKey] || DATA.tabs.delivery_financials;

    setActiveTab(tabKey);
    elMainTitle.textContent = tab.title;
    if (elEyebrow) {
      const ref = DATA.referencePeriod === `${year}-${String(monthKey).padStart(2, '0')}`;
      elEyebrow.textContent = ref
        ? `Monthly Operations Scorecard · ${year} · ${periodLabel(monthKey)} (datos de referencia)`
        : `Monthly Operations Scorecard · ${year} · ${periodLabel(monthKey)} (variación demo)`;
    }

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
          tdArea.innerHTML = `<div class="covia-area__inner"><div class="covia-area__icon" aria-hidden="true">${g.icon}</div><div class="covia-area__name">${g.area}</div></div>`;
          tr.appendChild(tdArea);
        }

        const tdKpi = document.createElement('td');
        tdKpi.className = 'covia-kpi';
        tdKpi.textContent = k.label;
        tr.appendChild(tdKpi);

        const tdUnit = document.createElement('td');
        tdUnit.className = 'covia-unit';
        tdUnit.textContent = k.unit;
        tr.appendChild(tdUnit);

        const tdMonth = document.createElement('td');
        tdMonth.className = 'covia-num';
        tdMonth.textContent = fmtCell(k.month);
        tr.appendChild(tdMonth);

        const tdTargetM = document.createElement('td');
        tdTargetM.className = 'covia-num covia-num--muted';
        tdTargetM.textContent = fmtTarget(k, 'm');
        tr.appendChild(tdTargetM);

        const okM = statusFor(k, 'm');
        const tdStatusM = document.createElement('td');
        tdStatusM.className = 'covia-status';
        tdStatusM.innerHTML = `<span class="covia-dot ${okM ? 'covia-dot--ok' : 'covia-dot--bad'}" aria-label="${okM ? 'OK' : 'Atención'}"></span>`;
        tr.appendChild(tdStatusM);

        const tdYtd = document.createElement('td');
        tdYtd.className = 'covia-num';
        tdYtd.textContent = fmtCell(k.ytd);
        tr.appendChild(tdYtd);

        const tdTargetY = document.createElement('td');
        tdTargetY.className = 'covia-num covia-num--muted';
        tdTargetY.textContent = fmtTarget(k, 'y');
        tr.appendChild(tdTargetY);

        const okY = statusFor(k, 'y');
        const tdStatusY = document.createElement('td');
        tdStatusY.className = 'covia-status';
        tdStatusY.innerHTML = `<span class="covia-dot ${okY ? 'covia-dot--ok' : 'covia-dot--bad'}" aria-label="${okY ? 'OK' : 'Atención'}"></span>`;
        tr.appendChild(tdStatusY);

        const tdTrend = document.createElement('td');
        tdTrend.className = 'covia-trend';
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 44;
        canvas.className = 'covia-spark';
        tdTrend.appendChild(canvas);
        tr.appendChild(tdTrend);

        if (rowIdx % 2 === 0) tr.classList.add('covia-row--alt');
        frag.appendChild(tr);

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
    const rerender = () => {
      const active = $('.covia-tab[aria-selected="true"]');
      render(active ? active.dataset.coviaTab : 'delivery_financials');
    };
    elYear.addEventListener('change', rerender);
    elMonth.addEventListener('change', rerender);
  }

  buildControls();
  bind();
  render('delivery_financials');
})();
