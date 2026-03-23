/**
 * Scorecard General — marca blanca, periodo dummy, módulos, drill-down, modo presentación, carga Excel.
 * Sobrescribe antes de cargar: window.SCORECARD_BRAND = { appName, eyebrow, primary, secondary, radius }
 */
(function () {
  'use strict';

  const BRAND_DEFAULT = {
    appName: 'Scorecard General',
    eyebrow: 'Proyecto',
    primary: '#3d8bfd',
    secondary: '#a78bfa',
    radius: '14px',
  };
  window.SCORECARD_BRAND = Object.assign({}, BRAND_DEFAULT, window.SCORECARD_BRAND || {});

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 61, g: 139, b: 253 };
  }
  function normalizeHeader(h) {
    return String(h || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value != null && value !== '') el.textContent = String(value);
  }
  function numberLike(v) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const s = String(v == null ? '' : v).trim();
    if (!s) return null;
    const n = Number(s.replace(/[$,%\s,]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  function formatMoney(n) {
    if (!Number.isFinite(n)) return null;
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function applyBrand() {
    const b = window.SCORECARD_BRAND;
    const rgb = hexToRgb(b.primary);
    document.documentElement.style.setProperty('--accent', b.primary);
    document.documentElement.style.setProperty('--violet', b.secondary);
    document.documentElement.style.setProperty('--radius', b.radius);
    document.documentElement.style.setProperty('--accent-dim', 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.15)');
    document.title = b.appName + ' — Panel ejecutivo';
    setText('brand-title', b.appName);
    setText('brand-eyebrow', b.eyebrow);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', b.primary);
  }

  const PERIODS = {
    q1_2026: { label: 'Ene — Mar 2026', revenue: '$6.21M', ebitda: '$842K', ccc: '42 días', nps: '+48', revNote: '▲ 12.4% vs LY' },
    q2_2026: { label: 'Abr — Jun 2026', revenue: '$6.89M', ebitda: '$901K', ccc: '39 días', nps: '+51', revNote: '▲ 8.2% vs trim ant.' },
    h1_2026: { label: 'Ene — Jun 2026 (H1)', revenue: '$13.1M', ebitda: '$1.74M', ccc: '41 días', nps: '+50', revNote: '▲ 10.1% vs H1 LY' },
    ytd_cmp: { label: 'YTD vs año anterior', revenue: '$5.52M', ebitda: '$798K', ccc: '48 días', nps: '+44', revNote: '▼ 3.1% vs LY (stress)' },
  };
  function applyPeriod(key) {
    const p = PERIODS[key];
    if (!p) return;
    setText('pill-period-label', p.label);
    setText('h-revenue', p.revenue);
    setText('h-ebitda', p.ebitda);
    setText('h-ccc', p.ccc);
    setText('h-nps', p.nps);
    const rn = document.getElementById('h-revenue-note');
    if (rn) {
      rn.textContent = p.revNote;
      rn.className = 'delta ' + (p.revNote.indexOf('▼') >= 0 ? 'neg' : 'pos');
    }
    try { localStorage.setItem('scorecard_period', key); } catch (_) {}
  }

  const MODULES = [
    { key: 'resumen', selector: '[data-module="resumen"]' },
    { key: 'charts', selector: '[data-module="charts"]' },
    { key: 'finanzas', selector: '[data-module="finanzas"]' },
    { key: 'comercial', selector: '[data-module="comercial"]' },
    { key: 'ops', selector: '[data-module="ops"]' },
    { key: 'personas', selector: '[data-module="personas"]' },
    { key: 'clientes', selector: '[data-module="clientes"]' },
    { key: 'objetivos', selector: '[data-module="objetivos"]' },
    { key: 'glosario', selector: '[data-module="glosario"]' },
  ];
  function getModuleState() {
    try {
      const raw = localStorage.getItem('scorecard_modules');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    const o = {};
    MODULES.forEach((m) => { o[m.key] = true; });
    return o;
  }
  function setModuleState(state) {
    MODULES.forEach((m) => {
      const on = state[m.key] !== false;
      document.querySelectorAll(m.selector).forEach((el) => {
        el.style.display = on ? '' : 'none';
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
    });
    try { localStorage.setItem('scorecard_modules', JSON.stringify(state)); } catch (_) {}
  }
  function buildModuleChecklist() {
    const list = document.getElementById('module-checklist');
    if (!list) return;
    const state = getModuleState();
    list.innerHTML = '';
    MODULES.forEach((m) => {
      const row = document.createElement('label');
      row.className = 'module-row';
      row.innerHTML =
        '<input type="checkbox" data-key="' +
        m.key +
        '" ' +
        (state[m.key] !== false ? 'checked' : '') +
        ' /> <span>' +
        escapeHtml(m.key.charAt(0).toUpperCase() + m.key.slice(1)) +
        '</span>';
      list.appendChild(row);
    });
    list.querySelectorAll('input[type="checkbox"]').forEach((chk) => {
      chk.addEventListener('change', () => {
        const st = getModuleState();
        st[chk.dataset.key] = chk.checked;
        setModuleState(st);
      });
    });
  }
  function openPanel(id, focusSel) {
    const panel = document.getElementById(id);
    if (!panel) return;
    panel.hidden = false;
    panel.querySelector(focusSel || '.module-dialog')?.focus?.();
  }
  function closePanel(id) {
    const panel = document.getElementById(id);
    if (panel) panel.hidden = true;
  }

  const DRILL = {
    revenue: { title: 'Ingresos netos YTD', body: '<p class="drill-p">Vista dummy para explicar el KPI por mes, región y meta.</p>' },
    ebitda: { title: 'EBITDA ajustado', body: '<p class="drill-p">Puente EBITDA (dummy): OP reportado + ajustes no caja.</p>' },
    ccc: { title: 'Cash conversion cycle', body: '<p class="drill-p">CCC = DIO + DSO − DPO. Menos días suele ser mejor.</p>' },
    nps: { title: 'NPS consolidado', body: '<p class="drill-p">Distribución dummy por segmento de cliente.</p>' },
  };
  function openDrill(key) {
    const d = DRILL[key];
    if (!d) return;
    setText('drill-title', d.title);
    const body = document.getElementById('drill-body');
    if (body) body.innerHTML = d.body;
    openPanel('drill-panel', '#drill-close');
  }

  function initDemoMode() {
    const btn = document.getElementById('btn-demo');
    if (!btn) return;
    const saved = localStorage.getItem('scorecard_demo') === '1';
    if (saved) {
      document.body.classList.add('demo-mode');
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    }
    btn.addEventListener('click', () => {
      const on = document.body.classList.toggle('demo-mode');
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      try { localStorage.setItem('scorecard_demo', on ? '1' : '0'); } catch (_) {}
    });
  }

  function hydrateFromRows(rows) {
    if (!rows.length) return { mapped: 0, msg: 'Archivo sin filas.' };
    const first = rows[0];
    const aliases = {
      revenue: ['revenue', 'ingresos', 'ventas', 'ingresos_netos', 'ventas_netas', 'total_ventas'],
      ebitda: ['ebitda', 'utilidad_operativa', 'ebitda_ajustado'],
      ccc: ['ccc', 'cash_conversion_cycle', 'ciclo_efectivo'],
      nps: ['nps', 'net_promoter'],
      revenue_note: ['revenue_note', 'nota_revenue', 'vs_ly', 'variacion_revenue'],
    };
    const pick = (arr) => {
      for (const k of arr) if (Object.prototype.hasOwnProperty.call(first, k)) return first[k];
      return null;
    };
    let mapped = 0;
    const rev = numberLike(pick(aliases.revenue));
    if (rev != null) { setText('h-revenue', formatMoney(rev)); mapped++; }
    const ebt = numberLike(pick(aliases.ebitda));
    if (ebt != null) { setText('h-ebitda', formatMoney(ebt)); mapped++; }
    const ccc = numberLike(pick(aliases.ccc));
    if (ccc != null) { setText('h-ccc', ccc.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' días'); mapped++; }
    const nps = numberLike(pick(aliases.nps));
    if (nps != null) { setText('h-nps', (nps > 0 ? '+' : '') + nps); mapped++; }
    const note = pick(aliases.revenue_note);
    if (note) { setText('h-revenue-note', note); mapped++; }
    setText('data-source-pill', 'Excel cargado');
    return { mapped, msg: mapped ? 'KPIs actualizados.' : 'No se detectaron columnas compatibles.' };
  }

  function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.onload = () => {
        try {
          const data = new Uint8Array(reader.result);
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rowsRaw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          const rows = rowsRaw.map((row) => {
            const out = {};
            Object.keys(row).forEach((k) => { out[normalizeHeader(k)] = row[k]; });
            return out;
          });
          resolve({ rows, sheetName: wb.SheetNames[0] });
        } catch (_) {
          reject(new Error('Formato no válido. Usa .xlsx/.xls/.csv con encabezados en fila 1.'));
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function buildPreview(rows, maxRows) {
    const list = rows.slice(0, maxRows || 8);
    if (!list.length) return '<p class="excel-help">Sin filas para vista previa.</p>';
    const cols = Object.keys(list[0]);
    let html = '<table><thead><tr>' + cols.map((c) => '<th>' + escapeHtml(c) + '</th>').join('') + '</tr></thead><tbody>';
    list.forEach((r) => {
      html += '<tr>' + cols.map((c) => '<td>' + escapeHtml(r[c]) + '</td>').join('') + '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyBrand();
    setText('footer-year', String(new Date().getFullYear()));

    const sel = document.getElementById('period-select');
    if (sel) {
      let key = 'q1_2026';
      try { key = localStorage.getItem('scorecard_period') || key; } catch (_) {}
      if (!PERIODS[key]) key = 'q1_2026';
      sel.value = key;
      applyPeriod(key);
      sel.addEventListener('change', () => applyPeriod(sel.value));
    }

    setModuleState(getModuleState());
    document.getElementById('btn-modules')?.addEventListener('click', () => {
      buildModuleChecklist();
      openPanel('module-panel', '.module-dialog');
    });
    document.getElementById('module-panel')?.addEventListener('click', (e) => { if (e.target.id === 'module-panel') closePanel('module-panel'); });
    document.getElementById('module-close')?.addEventListener('click', () => closePanel('module-panel'));

    // Excel upload
    document.getElementById('btn-upload')?.addEventListener('click', () => document.getElementById('excel-file')?.click());
    document.getElementById('excel-file')?.addEventListener('change', async function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      openPanel('excel-panel', '.module-dialog');
      const status = document.getElementById('excel-status');
      const preview = document.getElementById('excel-preview');
      if (status) status.textContent = 'Procesando "' + file.name + '"...';
      if (preview) preview.innerHTML = '';
      if (typeof XLSX === 'undefined') {
        if (status) status.textContent = 'Falta SheetJS (XLSX) en la página ejecutiva (executive.html).';
        return;
      }
      try {
        const parsed = await parseExcelFile(file);
        const result = hydrateFromRows(parsed.rows);
        if (status) status.textContent = 'Hoja: ' + parsed.sheetName + ' · Filas: ' + parsed.rows.length + ' · Mapeados: ' + result.mapped + '. ' + result.msg;
        if (preview) preview.innerHTML = buildPreview(parsed.rows, 8);
      } catch (err) {
        if (status) status.textContent = 'Error: ' + err.message;
      } finally {
        e.target.value = '';
      }
    });
    document.getElementById('excel-panel')?.addEventListener('click', (e) => { if (e.target.id === 'excel-panel') closePanel('excel-panel'); });
    document.getElementById('excel-close')?.addEventListener('click', () => closePanel('excel-panel'));

    document.querySelectorAll('.hero-card[data-drill]').forEach((card) => {
      card.style.cursor = 'pointer';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.addEventListener('click', () => openDrill(card.getAttribute('data-drill')));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDrill(card.getAttribute('data-drill'));
        }
      });
    });
    document.getElementById('drill-panel')?.addEventListener('click', (e) => { if (e.target.id === 'drill-panel') closePanel('drill-panel'); });
    document.getElementById('drill-close')?.addEventListener('click', () => closePanel('drill-panel'));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePanel('drill-panel');
        closePanel('module-panel');
        closePanel('excel-panel');
      }
    });

    document.addEventListener('scorecard:dailydatasync', () => {
      const sel = document.getElementById('period-select');
      if (sel && sel.value) applyPeriod(sel.value);
      const src = document.getElementById('data-source-pill');
      if (src && !/Excel/i.test(src.textContent || '')) {
        src.textContent = 'Demo · sync diaria';
      }
    });

    initDemoMode();
  });
})();
