/**
 * Scorecard General — intención "ventas del mes" → informe ejecutivo + exportaciones.
 */
(function () {
  'use strict';

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function brandName() {
    const b = window.SCORECARD_BRAND;
    return (b && b.appName) || 'Scorecard General';
  }

  function detectSalesMonthIntent(text) {
    const n = norm(text);
    if (n.length < 5) return null;
    const aboutSales =
      /ventas?|vendedor|clientes?/i.test(text) ||
      /(informe|reporte|resumen)\s+(de\s+)?ventas?/i.test(text);
    if (!aboutSales) return null;
    const mes =
      /mes\s*(actual|corriente)?|del\s*mes|este\s*mes|mes\s*en\s*curso/i.test(text) ||
      n.includes('ventas del mes') ||
      n.includes('venta del mes');
    const reporteVentas = /(informe|reporte|resumen)\s*(de\s*)?ventas?/i.test(text);
    const dame =
      /dame\s+(las\s+)?ventas?(\s+del\s+mes)?\b/i.test(text) ||
      /quiero\s*(ver\s*)?(las\s*)?ventas?|mu[eé]strame\s*(las\s*)?ventas?/i.test(text);
    const top = /top\s+(vendedor|cliente|vendedores|clientes)/i.test(text);
    if (reporteVentas || dame || top) return 'sales-month';
    if (mes && /ventas?/i.test(text)) return 'sales-month';
    if (/ventas?\s+marzo|marzo.*ventas/i.test(text)) return 'sales-month';
    return null;
  }

  /** Si el usuario pide un formato concreto, se descarga al abrir. */
  function detectExportPreference(text) {
    const t = norm(text);
    if (/solo\s+excel|descargar\s+excel|mand(me|a)\s+excel|archivo\s+excel|genera(r)?\s+excel|pasame\s+excel|exporta(r)?\s+a\s+excel/i.test(t)) {
      return 'xlsx';
    }
    if (/solo\s+pdf|descargar\s+pdf|mand(me|a)\s+pdf|genera(r)?\s+pdf|pasame\s+pdf|exporta(r)?\s+a\s+pdf/i.test(t)) {
      return 'pdf';
    }
    if ((/png|imagen|captura|foto|screenshot/i.test(t) || /imagen\s+png/i.test(t)) && /ventas|informe|reporte|mes|venta/i.test(t)) {
      return 'png';
    }
    return null;
  }

  function moneyEs(n) {
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function executiveSummaryText(D) {
    const tv = D.topVendedores[0];
    const tc = D.topClientes[0];
    let s =
      'En <strong>' +
      escapeHtml(D.MONTH_LABEL) +
      '</strong> el importe total acumulado es <strong>' +
      escapeHtml(moneyEs(D.totalVentas)) +
      '</strong> en <strong>' +
      D.LINEAS.length +
      '</strong> movimientos registrados.';
    if (tv) {
      s +=
        ' El mayor aporte por vendedor corresponde a <strong>' +
        escapeHtml(tv.nombre) +
        '</strong> (' +
        escapeHtml(moneyEs(tv.importe)) +
        ').';
    }
    if (tc) {
      s +=
        ' El cliente con mayor volumen es <strong>' +
        escapeHtml(tc.nombre) +
        '</strong> (' +
        escapeHtml(moneyEs(tc.importe)) +
        ').';
    }
    return s;
  }

  function renderReportHtml(D) {
    const org = escapeHtml(brandName());
    const rows = D.LINEAS.map(
      (r) =>
        '<tr><td>' +
        escapeHtml(r.fecha) +
        '</td><td>' +
        escapeHtml(r.cliente) +
        '</td><td>' +
        escapeHtml(r.vendedor) +
        '</td><td class="report-num">' +
        escapeHtml(moneyEs(r.importe)) +
        '</td></tr>'
    ).join('');
    const tv = D.topVendedores
      .map(
        (x, i) =>
          '<tr><td>' +
          (i + 1) +
          '</td><td>' +
          escapeHtml(x.nombre) +
          '</td><td class="report-num">' +
          escapeHtml(moneyEs(x.importe)) +
          '</td><td class="report-num">' +
          (D.totalVentas ? ((x.importe / D.totalVentas) * 100).toFixed(1) : '—') +
          '%</td></tr>'
      )
      .join('');
    const tc = D.topClientes
      .map(
        (x, i) =>
          '<tr><td>' +
          (i + 1) +
          '</td><td>' +
          escapeHtml(x.nombre) +
          '</td><td class="report-num">' +
          escapeHtml(moneyEs(x.importe)) +
          '</td><td class="report-num">' +
          (D.totalVentas ? ((x.importe / D.totalVentas) * 100).toFixed(1) : '—') +
          '%</td></tr>'
      )
      .join('');
    return (
      '<header class="report-doc-header">' +
      '<p class="report-doc-eyebrow">' +
      org +
      '</p>' +
      '<h2 class="report-doc-title">Informe ejecutivo de ventas</h2>' +
      '<p class="report-doc-period">' +
      escapeHtml(D.MONTH_LABEL) +
      '</p>' +
      '</header>' +
      '<p class="report-executive-summary">' +
      executiveSummaryText(D) +
      '</p>' +
      '<div class="report-kpi-row">' +
      '<div class="report-kpi"><span>Total ventas</span><strong>' +
      escapeHtml(moneyEs(D.totalVentas)) +
      '</strong></div>' +
      '<div class="report-kpi"><span>Movimientos</span><strong>' +
      D.LINEAS.length +
      '</strong></div>' +
      '<div class="report-kpi"><span>Cuadre</span><strong>' +
      (D.verifyCoherence() ? 'Verificado' : '—') +
      '</strong></div>' +
      '</div>' +
      '<div class="report-grid-2">' +
      '<div class="report-block"><h4>Ranking vendedores</h4><div class="report-table-wrap"><table><thead><tr><th>#</th><th>Vendedor</th><th>Importe</th><th>% total</th></tr></thead><tbody>' +
      tv +
      '</tbody></table></div></div>' +
      '<div class="report-block"><h4>Ranking clientes</h4><div class="report-table-wrap"><table><thead><tr><th>#</th><th>Cliente</th><th>Importe</th><th>% total</th></tr></thead><tbody>' +
      tc +
      '</tbody></table></div></div>' +
      '</div>' +
      '<div class="report-block report-block--detail"><h4>Detalle de movimientos</h4><div class="report-table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Importe</th></tr></thead><tbody>' +
      rows +
      '</tbody></table></div></div>' +
      '<footer class="report-doc-footer">' +
      '<span>Documento generado automáticamente · Datos demo coherentes · Sustituir por API en producción</span>' +
      '</footer>'
    );
  }

  function fillSurface(D) {
    const el = document.getElementById('scorecard-report-surface');
    if (!el) return;
    el.innerHTML = renderReportHtml(D);
    const sub = document.getElementById('scorecard-report-subtitle');
    if (sub) {
      sub.textContent =
        D.MONTH_LABEL +
        ' · Informe listo para exportar (Excel con 5 hojas, PDF/PNG o impresión)';
    }
    const hint = document.getElementById('report-hint');
    if (hint) {
      hint.textContent =
        'El Excel incluye portada, KPI, detalle y rankings. PDF e imagen reflejan esta vista. Imprimir abre el cuadro de impresión del sistema (puedes guardar como PDF).';
    }
  }

  function runAutoExport(pref) {
    const D = window.SCORECARD_REPORT_DATA;
    const X = window.SCORECARD_REPORT_EXPORT;
    const el = document.getElementById('scorecard-report-surface');
    if (!pref || !D || !X) return;
    window.setTimeout(async () => {
      try {
        if (pref === 'xlsx') X.exportExcelFromData(D);
        else if (pref === 'pdf' && el) await X.exportPdf(el, D.MONTH_KEY);
        else if (pref === 'png' && el) await X.exportPng(el, D.MONTH_KEY);
      } catch (e) {
        console.warn(e);
      }
    }, 500);
  }

  function openPanel(opts) {
    const panel = document.getElementById('scorecard-report-panel');
    if (!panel) return;
    panel.hidden = false;
    const D = window.SCORECARD_REPORT_DATA;
    if (D) fillSurface(D);
    const pref = opts && opts.autoExport;
    if (pref) runAutoExport(pref);
    document.getElementById('report-close')?.focus();
  }

  function closePanel() {
    const panel = document.getElementById('scorecard-report-panel');
    if (panel) panel.hidden = true;
  }

  function bindPanel() {
    const panel = document.getElementById('scorecard-report-panel');
    if (!panel) return;
    document.getElementById('report-close')?.addEventListener('click', closePanel);
    panel.addEventListener('click', (e) => {
      if (e.target === panel) closePanel();
    });
    document.getElementById('report-export-xlsx')?.addEventListener('click', () => {
      const D = window.SCORECARD_REPORT_DATA;
      const X = window.SCORECARD_REPORT_EXPORT;
      if (D && X) X.exportExcelFromData(D);
    });
    document.getElementById('report-export-png')?.addEventListener('click', async () => {
      const el = document.getElementById('scorecard-report-surface');
      const D = window.SCORECARD_REPORT_DATA;
      const X = window.SCORECARD_REPORT_EXPORT;
      if (el && D && X) await X.exportPng(el, D.MONTH_KEY);
    });
    document.getElementById('report-export-pdf')?.addEventListener('click', async () => {
      const el = document.getElementById('scorecard-report-surface');
      const D = window.SCORECARD_REPORT_DATA;
      const X = window.SCORECARD_REPORT_EXPORT;
      if (el && D && X) await X.exportPdf(el, D.MONTH_KEY);
    });
    document.getElementById('report-print')?.addEventListener('click', () => {
      document.documentElement.classList.add('scorecard-print-report');
      const after = () => {
        document.documentElement.classList.remove('scorecard-print-report');
        window.removeEventListener('afterprint', after);
      };
      window.addEventListener('afterprint', after);
      window.setTimeout(() => {
        window.print();
      }, 120);
    });
  }

  window.scrHandleReportIntent = function (text, api) {
    if (detectSalesMonthIntent(text) !== 'sales-month') return false;
    const pref = detectExportPreference(text);
    openPanel({ autoExport: pref });
    if (api && api.addMsg && api.mdLite) {
      let extra = '';
      if (pref === 'xlsx') extra = ' También **inicié la descarga del Excel** con hojas ordenadas (portada, KPI, detalle, rankings).';
      else if (pref === 'pdf') extra = ' También **inicié la descarga del PDF** con el mismo diseño que la vista previa.';
      else if (pref === 'png') extra = ' También **inicié la descarga de la imagen PNG** del informe.';
      api.addMsg(
        'bot',
        api.mdLite(
          '**Informe de ventas preparado** — Datos ordenados para **' +
            (window.SCORECARD_REPORT_DATA && window.SCORECARD_REPORT_DATA.MONTH_LABEL
              ? window.SCORECARD_REPORT_DATA.MONTH_LABEL
              : 'el período') +
            '**. Desde el panel puedes **descargar Excel** (libro con varias hojas), **PDF**, **PNG** o **imprimir** (desde el diálogo de impresión también puedes “Guardar como PDF”).' +
            extra
        )
      );
    }
    if (api && api.speak) {
      api.speak(
        pref
          ? 'Informe listo. Se descargó el archivo que pediste; también puedes usar los demás botones.'
          : 'Informe de ventas listo. Puedes descargar Excel, PDF o imagen, o imprimir desde el panel.'
      );
    }
    return true;
  };

  window.scrOpenReportQuick = function (api) {
    openPanel({});
    if (api && api.addMsg && api.mdLite) {
      api.addMsg(
        'bot',
        api.mdLite(
          '**Informe de ventas** abierto. **Descargar Excel** genera un libro con portada y rankings; **PDF/PNG** copian esta vista; **Imprimir** usa tu impresora o guardar como PDF del sistema.'
        )
      );
    }
  };

  /** Respaldo si el handler principal no está: misma lógica de auto-descarga por texto. */
  window.scrTryAutoExportFromText = function (text) {
    const pref = detectExportPreference(text);
    if (pref) runAutoExport(pref);
  };

  document.addEventListener('DOMContentLoaded', bindPanel);
})();
