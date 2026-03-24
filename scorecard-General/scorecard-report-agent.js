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

  /** Informe/PDF/Excel del mes actual y el anterior. */
  function detectTwoMonthReportIntent(text) {
    const t = norm(text);
    if (t.length < 8) return false;
    if (
      /(dos|2)\s+meses|ambos\s+meses|mes\s+actual\s+y\s+(el\s+)?mes\s+anterior|este\s+mes\s+y\s+(el\s+)?(mes\s+)?(anterior|pasado)/i.test(
        text
      )
    ) {
      return true;
    }
    if (/(mes\s+anterior).{0,48}(mes\s+actual|este\s+mes)|(mes\s+actual|este\s+mes).{0,48}(mes\s+anterior)/i.test(text)) {
      return true;
    }
    if (/(inclu(ye|ir)|junto|ademas|además).*(mes\s+anterior|mes\s+pasado)/i.test(text) && /ventas|informe|reporte|pdf|excel/i.test(text)) {
      return true;
    }
    if (/(febrero|feb).*(marzo|mar)\s*2026|(marzo|mar).*(febrero|feb)\s*2026/i.test(text)) return true;
    return false;
  }

  function detectSalesMonthIntent(text) {
    const n = norm(text);
    if (n.length < 5) return null;
    const D = window.SCORECARD_REPORT_DATA;
    const preset = D && typeof D.detectReportPeriodPreset === 'function' ? D.detectReportPeriodPreset(text) : null;
    const wantsExport =
      /(excel|xlsx|pdf|png|descarg|imprim|export|libro|hoja)/i.test(text) ||
      /(informe|reporte)\s+(de\s+)?ventas?/i.test(text);
    if (wantsExport && preset && /ventas?/i.test(text)) return 'sales-month';
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

  function executiveSummaryText(V) {
    const tv = V.topVendedores[0];
    const tc = V.topClientes[0];
    let s = '';
    if (V.mode === 'flex') {
      s =
        '<em>Demostración</em> — Informe acotado a <strong>' +
        escapeHtml(V.flexLabel || V.headlineMonth) +
        '</strong>. Importe total <strong>' +
        escapeHtml(moneyEs(V.totalVentas)) +
        '</strong> en <strong>' +
        V.LINEAS.length +
        '</strong> movimientos. Los importes son <strong>ilustrativos</strong> y varían según el periodo solicitado (día, semana, mes, año, etc.); con API/ERP reales sustituirían esta capa.';
      if (tv) {
        s +=
          ' Mayor aporte por vendedor: <strong>' +
          escapeHtml(tv.nombre) +
          '</strong> (' +
          escapeHtml(moneyEs(tv.importe)) +
          ').';
      }
      if (tc) {
        s +=
          ' Cliente con mayor volumen: <strong>' +
          escapeHtml(tc.nombre) +
          '</strong> (' +
          escapeHtml(moneyEs(tc.importe)) +
          ').';
      }
      return s;
    }
    if (V.mode === 'two-month') {
      const pct = Number.isFinite(V.pctVsAnterior) ? V.pctVsAnterior.toFixed(1) : '—';
      const sign = V.deltaVsAnterior >= 0 ? '+' : '';
      s =
        '<em>Demostración</em> — cifras y mes anterior son <strong>datos de muestra</strong> para mostrar informes comparativos; con fuentes reales (ERP/BI) los mismos formatos reflejarían sus totales. ' +
        'Período mostrado: <strong>' +
        escapeHtml(V.headlineMonth) +
        '</strong>. En <strong>' +
        escapeHtml(V.MONTH_LABEL_SINGLE) +
        '</strong> el importe total fue <strong>' +
        escapeHtml(moneyEs(V.totalVentasMesActual)) +
        '</strong> (' +
        V.LINEAS_CURRENT.length +
        ' movimientos); en <strong>' +
        escapeHtml(V.PREV_MONTH_LABEL) +
        '</strong> fue <strong>' +
        escapeHtml(moneyEs(V.totalVentasMesAnterior)) +
        '</strong> (' +
        V.LINEAS_PREV.length +
        ' movimientos). Variación del mes corriente frente al anterior: <strong>' +
        sign +
        escapeHtml(moneyEs(V.deltaVsAnterior)) +
        '</strong> (<strong>' +
        sign +
        pct +
        '%</strong>). <strong>Total acumulado en ambos meses</strong>: <strong>' +
        escapeHtml(moneyEs(V.totalVentas)) +
        '</strong> en <strong>' +
        V.LINEAS.length +
        '</strong> movimientos.';
    } else {
      s =
        '<em>Demostración</em> — importes <strong>ilustrativos</strong> del mes en curso (muestra de capacidad del informe). ' +
        'En <strong>' +
        escapeHtml(V.periodLabel) +
        '</strong> el importe total acumulado es <strong>' +
        escapeHtml(moneyEs(V.totalVentas)) +
        '</strong> en <strong>' +
        V.LINEAS.length +
        '</strong> movimientos registrados.';
    }
    if (tv) {
      s +=
        ' El mayor aporte por vendedor corresponde a <strong>' +
        escapeHtml(tv.nombre) +
        '</strong> (' +
        escapeHtml(moneyEs(tv.importe)) +
        ' sobre el total del período mostrado).';
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

  function renderReportHtml(V, dataApi) {
    const D = dataApi || window.SCORECARD_REPORT_DATA;
    const org = escapeHtml(brandName());
    const colMes = V.mode === 'two-month' ? '<th>Período</th>' : '';
    const rows = V.LINEAS.map((r) => {
      const mesCol =
        V.mode === 'two-month'
          ? '<td>' + escapeHtml(D.etiquetaMesLinea(r.fecha, V)) + '</td>'
          : '';
      return (
        '<tr>' +
        mesCol +
        '<td>' +
        escapeHtml(r.fecha) +
        '</td><td>' +
        escapeHtml(r.cliente) +
        '</td><td>' +
        escapeHtml(r.vendedor) +
        '</td><td class="report-num">' +
        escapeHtml(moneyEs(r.importe)) +
        '</td></tr>'
      );
    }).join('');
    const tv = V.topVendedores
      .map(
        (x, i) =>
          '<tr><td>' +
          (i + 1) +
          '</td><td>' +
          escapeHtml(x.nombre) +
          '</td><td class="report-num">' +
          escapeHtml(moneyEs(x.importe)) +
          '</td><td class="report-num">' +
          (V.totalVentas ? ((x.importe / V.totalVentas) * 100).toFixed(1) : '—') +
          '%</td></tr>'
      )
      .join('');
    const tc = V.topClientes
      .map(
        (x, i) =>
          '<tr><td>' +
          (i + 1) +
          '</td><td>' +
          escapeHtml(x.nombre) +
          '</td><td class="report-num">' +
          escapeHtml(moneyEs(x.importe)) +
          '</td><td class="report-num">' +
          (V.totalVentas ? ((x.importe / V.totalVentas) * 100).toFixed(1) : '—') +
          '%</td></tr>'
      )
      .join('');
    const kpi1Label =
      V.mode === 'two-month' ? 'Total (ambos meses)' : V.mode === 'flex' ? 'Total ventas (periodo)' : 'Total ventas';
    const kpi3Label = V.mode === 'two-month' ? 'Cuadre (ambos)' : 'Cuadre';
    return (
      '<header class="report-doc-header">' +
      '<p class="report-doc-eyebrow">' +
      org +
      '</p>' +
      '<h2 class="report-doc-title">Informe ejecutivo de ventas</h2>' +
      '<p class="report-doc-period">' +
      escapeHtml(V.headlineMonth) +
      '</p>' +
      '</header>' +
      '<p class="report-demo-disclaimer">' +
      (V.mode === 'flex'
        ? '<strong>Vista de demostración.</strong> Periodo seleccionado por el usuario; cifras <strong>ilustrativas</strong> (filtradas del set demo o generadas con totales coherentes). Sustituir por API en producción.'
        : V.mode === 'two-month'
          ? '<strong>Vista de demostración.</strong> El mes anterior y las cifras son <strong>datos ficticios coherentes</strong> para exhibir comparación entre períodos, PDF/Excel y respuestas del asistente. En producción se conectan fuentes reales.'
          : '<strong>Vista de demostración.</strong> Cifras <strong>ilustrativas</strong> del período actual para validar diseño e informes; sustituir por API en producción.') +
      '</p>' +
      '<p class="report-executive-summary">' +
      executiveSummaryText(V) +
      '</p>' +
      '<div class="report-kpi-row">' +
      '<div class="report-kpi"><span>' +
      kpi1Label +
      '</span><strong>' +
      escapeHtml(moneyEs(V.totalVentas)) +
      '</strong></div>' +
      '<div class="report-kpi"><span>Movimientos</span><strong>' +
      V.LINEAS.length +
      '</strong></div>' +
      '<div class="report-kpi"><span>' +
      kpi3Label +
      '</span><strong>' +
      (V.verifyCoherence() ? 'Verificado' : '—') +
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
      '<div class="report-block report-block--detail"><h4>Detalle de movimientos</h4><div class="report-table-wrap"><table><thead><tr>' +
      colMes +
      '<th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Importe</th></tr></thead><tbody>' +
      rows +
      '</tbody></table></div></div>' +
      '<footer class="report-doc-footer">' +
      '<span>Generado automáticamente · Escenario demo (datos de muestra, no operativos) · Sustituir por API / ERP en producción</span>' +
      '</footer>'
    );
  }

  function fillSurface(opts) {
    const o = opts || {};
    const twoMonth = !!o.twoMonth;
    const preset = !twoMonth && o.reportPreset && o.reportPreset.kind ? o.reportPreset : null;
    const D = window.SCORECARD_REPORT_DATA;
    const el = document.getElementById('scorecard-report-surface');
    if (!el || !D || typeof D.buildReportView !== 'function') return;
    let V;
    if (preset && typeof D.buildFlexibleReportView === 'function') {
      V = D.buildFlexibleReportView(preset);
    } else {
      V = D.buildReportView(twoMonth);
    }
    window.__SCORECARD_REPORT_ACTIVE_VIEW__ = V;
    el.innerHTML = renderReportHtml(V, D);
    const sub = document.getElementById('scorecard-report-subtitle');
    if (sub) {
      if (V.mode === 'flex') {
        sub.textContent =
          V.headlineMonth + ' · Demo: periodo flexible · Datos ilustrativos · Excel / PDF / PNG';
      } else {
        sub.textContent =
          V.headlineMonth +
          (V.mode === 'two-month'
            ? ' · Demo: mes actual + mes anterior (ficticio) · Comparación y exportes de muestra'
            : ' · Demo: un mes · Datos ilustrativos · Excel / PDF / PNG');
      }
    }
    const hint = document.getElementById('report-hint');
    if (hint) {
      hint.textContent =
        V.mode === 'flex'
          ? 'Totales coherentes con el periodo elegido (datos filtrados del demo o filas sintéticas). Excel, PDF e imagen reflejan esta vista.'
          : V.mode === 'two-month'
            ? 'Los importes del mes anterior son ficticios de demostración; el objetivo es mostrar el flujo comparativo (asistente, vista, PDF/Excel).'
            : 'Cifras ilustrativas para validar el informe. El Excel incluye portada, KPI, detalle y rankings; PDF e imagen reflejan esta vista.';
    }
  }

  function getActiveReportView() {
    const D = window.SCORECARD_REPORT_DATA;
    if (window.__SCORECARD_REPORT_ACTIVE_VIEW__) return window.__SCORECARD_REPORT_ACTIVE_VIEW__;
    if (D && typeof D.buildReportView === 'function') return D.buildReportView(false);
    return null;
  }

  function runAutoExport(pref) {
    const D = window.SCORECARD_REPORT_DATA;
    const X = window.SCORECARD_REPORT_EXPORT;
    const el = document.getElementById('scorecard-report-surface');
    if (!pref || !D || !X) return;
    window.setTimeout(async () => {
      try {
        const V = getActiveReportView();
        if (!V) return;
        if (pref === 'xlsx') X.exportExcelFromData(V);
        else if (pref === 'pdf' && el) await X.exportPdf(el, V.MONTH_KEY_EXPORT);
        else if (pref === 'png' && el) await X.exportPng(el, V.MONTH_KEY_EXPORT);
      } catch (e) {
        console.warn(e);
      }
    }, 500);
  }

  var REPORT_OPEN_DELAY_MS = 720;
  /** Tiempo de “preparando…” antes de abrir el cuadro de impresión del sistema */
  var PRINT_PREP_DELAY_MS = 920;

  function showPrintPrepOverlay() {
    const el = document.getElementById('scorecard-print-prep');
    if (el) {
      el.hidden = false;
      el.setAttribute('aria-hidden', 'false');
    }
  }

  function hidePrintPrepOverlay() {
    const el = document.getElementById('scorecard-print-prep');
    if (el) {
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function setPrintPrepCopy(title, sub) {
    const t = document.getElementById('scorecard-print-prep-title');
    const s = document.getElementById('scorecard-print-prep-sub');
    if (t && title) t.textContent = title;
    if (s && sub) s.textContent = sub;
  }

  /**
   * Pantalla de carga con GIF (esquina superior derecha) y retardo antes de window.print().
   * @param {{ reportMode?: boolean, title?: string, sub?: string }} opts — reportMode: solo informe (oculta resto al imprimir)
   */
  function runPrintWithPrep(opts) {
    opts = opts || {};
    const reportMode = !!opts.reportMode;
    setPrintPrepCopy(
      opts.title ||
        (reportMode ? 'Preparando el informe para imprimir…' : 'Preparando la vista para imprimir…'),
      opts.sub ||
        (reportMode
          ? 'Generando la vista del informe; en un momento abrirá el cuadro de su sistema'
          : 'Generando la vista del panel; en un momento abrirá el cuadro de su sistema')
    );
    showPrintPrepOverlay();
    window.setTimeout(function () {
      hidePrintPrepOverlay();
      if (reportMode) {
        document.documentElement.classList.add('scorecard-print-report');
      }
      var safety = window.setTimeout(function () {
        if (reportMode) {
          document.documentElement.classList.remove('scorecard-print-report');
        }
      }, 120000);
      function onAfterPrint() {
        window.clearTimeout(safety);
        if (reportMode) {
          document.documentElement.classList.remove('scorecard-print-report');
        }
        window.removeEventListener('afterprint', onAfterPrint);
      }
      window.addEventListener('afterprint', onAfterPrint);
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          window.print();
        });
      });
    }, PRINT_PREP_DELAY_MS);
  }

  window.scorecardRunPrintWithPrep = runPrintWithPrep;

  function openPanel(opts) {
    const panel = document.getElementById('scorecard-report-panel');
    if (!panel) return;
    const loading = document.getElementById('scorecard-report-loading');
    const dialog = panel.querySelector('.report-dialog');
    panel.hidden = false;
    panel.classList.remove('report-panel--visible');
    panel.classList.add('report-panel--opening');
    if (dialog) dialog.classList.remove('report-dialog--enter-done');
    if (loading) {
      loading.hidden = false;
      loading.setAttribute('aria-hidden', 'false');
    }

    window.setTimeout(function () {
      const D = window.SCORECARD_REPORT_DATA;
      if (D) fillSurface(opts || {});
      if (loading) {
        loading.hidden = true;
        loading.setAttribute('aria-hidden', 'true');
      }
      window.requestAnimationFrame(function () {
        panel.classList.remove('report-panel--opening');
        panel.classList.add('report-panel--visible');
        if (dialog) dialog.classList.add('report-dialog--enter-done');
      });
      const pref = opts && opts.autoExport;
      if (pref) runAutoExport(pref);
      document.getElementById('report-close')?.focus();
    }, REPORT_OPEN_DELAY_MS);
  }

  function closePanel() {
    const panel = document.getElementById('scorecard-report-panel');
    if (!panel) return;
    panel.hidden = true;
    panel.classList.remove('report-panel--visible', 'report-panel--opening');
    const dialog = panel.querySelector('.report-dialog');
    if (dialog) dialog.classList.remove('report-dialog--enter-done');
    const loading = document.getElementById('scorecard-report-loading');
    if (loading) {
      loading.hidden = true;
      loading.setAttribute('aria-hidden', 'true');
    }
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
      const V = getActiveReportView();
      if (D && X && V) X.exportExcelFromData(V);
    });
    document.getElementById('report-export-png')?.addEventListener('click', async () => {
      const el = document.getElementById('scorecard-report-surface');
      const D = window.SCORECARD_REPORT_DATA;
      const X = window.SCORECARD_REPORT_EXPORT;
      const V = getActiveReportView();
      if (el && D && X && V) await X.exportPng(el, V.MONTH_KEY_EXPORT);
    });
    document.getElementById('report-export-pdf')?.addEventListener('click', async () => {
      const el = document.getElementById('scorecard-report-surface');
      const D = window.SCORECARD_REPORT_DATA;
      const X = window.SCORECARD_REPORT_EXPORT;
      const V = getActiveReportView();
      if (el && D && X && V) await X.exportPdf(el, V.MONTH_KEY_EXPORT);
    });
    document.getElementById('report-print')?.addEventListener('click', function () {
      runPrintWithPrep({ reportMode: true });
    });
    document.getElementById('btn-print')?.addEventListener('click', function () {
      runPrintWithPrep({ reportMode: false });
    });
    window.__scorecardCloseReportPanel = closePanel;
  }

  window.scrHandleReportIntent = function (text, api) {
    if (detectSalesMonthIntent(text) !== 'sales-month') return false;
    const pref = detectExportPreference(text);
    const twoMonth = detectTwoMonthReportIntent(text);
    const D = window.SCORECARD_REPORT_DATA;
    let reportPreset = null;
    if (!twoMonth && D && typeof D.detectReportPeriodPreset === 'function') {
      reportPreset = D.detectReportPeriodPreset(text);
    }
    openPanel({ autoExport: pref, twoMonth: twoMonth, reportPreset: reportPreset });
    let periodoMsg =
      twoMonth && D
        ? D.PREV_MONTH_LABEL + ' y ' + D.MONTH_LABEL
        : D && D.MONTH_LABEL
          ? D.MONTH_LABEL
          : 'el período';
    if (!twoMonth && reportPreset && reportPreset.kind && D && typeof D.buildFlexibleReportView === 'function') {
      try {
        const Vp = D.buildFlexibleReportView(reportPreset);
        periodoMsg = Vp.headlineMonth || periodoMsg;
      } catch (_) {}
    }
    if (api && api.addMsg && api.mdLite) {
      let extra = '';
      if (pref === 'xlsx') extra = ' También **inicié la descarga del Excel** con hojas ordenadas (portada, KPI, detalle, rankings).';
      else if (pref === 'pdf') extra = ' También **inicié la descarga del PDF** con el mismo diseño que la vista previa.';
      else if (pref === 'png') extra = ' También **inicié la descarga de la imagen PNG** del informe.';
      api.addMsg(
        'bot',
        api.mdLite(
            '**Informe de ventas preparado** (escenario **demo**: cifras de muestra) — Período mostrado: **' +
            periodoMsg +
            '**' +
            (twoMonth
              ? ' Incluye mes anterior ficticio para mostrar comparación; con datos reales vendrían de su API. '
              : '. ') +
            'Desde el panel podrá **descargar el libro Excel** (varias hojas), **PDF**, **imagen PNG** o **imprimir** (en el cuadro de impresión también puede elegir *Guardar como PDF*).' +
            extra
        )
      );
    }
    if (api && api.speak) {
      api.speak(
        pref
          ? 'Informe listo. Se ha iniciado la descarga solicitada; puede emplear también los demás formatos en el panel.'
          : 'Informe de ventas listo. Puede descargar Excel, PDF o imagen, o imprimir desde el panel.'
      );
    }
    return true;
  };

  window.scrDetectTwoMonthReportIntent = detectTwoMonthReportIntent;

  window.scrOpenReportQuick = function (api, userText) {
    const twoMonth =
      userText && typeof detectTwoMonthReportIntent === 'function'
        ? detectTwoMonthReportIntent(userText)
        : false;
    const D = window.SCORECARD_REPORT_DATA;
    let reportPreset = null;
    if (!twoMonth && D && typeof D.detectReportPeriodPreset === 'function' && userText) {
      reportPreset = D.detectReportPeriodPreset(userText);
    }
    openPanel({ twoMonth: !!twoMonth, reportPreset: reportPreset });
    if (api && api.addMsg && api.mdLite) {
      api.addMsg(
        'bot',
        api.mdLite(
          '**Informe de ventas** abierto. **Descargar Excel** genera un libro con portada y rankings; **PDF** e **imagen** reproducen esta vista; **Imprimir** abre el cuadro de su sistema (incluida la opción *Guardar como PDF*).'
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
