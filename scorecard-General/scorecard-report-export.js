/**
 * Scorecard General — exportar informe: Excel multipágina (SheetJS), PNG/PDF (html2canvas + jsPDF).
 */
(function () {
  'use strict';

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function brandName() {
    const b = window.SCORECARD_BRAND;
    return (b && b.appName) || 'Scorecard General';
  }

  function setColWidths(ws, widths) {
    if (!ws || !widths || !widths.length) return;
    ws['!cols'] = widths.map((wch) => ({ wch: typeof wch === 'number' ? wch : 14 }));
  }

  /**
   * Excel con hojas ordenadas: portada, KPI, detalle numérico, rankings.
   */
  function exportExcelFromData(D) {
    const XLSX = window.XLSX;
    if (!XLSX || !XLSX.utils) {
      window.alert('SheetJS no está cargado.');
      return;
    }
    const wb = XLSX.utils.book_new();
    const org = brandName();
    const genAt = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

    /* —— Portada —— */
    const portadaAoA = [
      ['INFORME EJECUTIVO DE VENTAS', ''],
      ['', ''],
      ['Organización', org],
      ['Período analizado', D.MONTH_LABEL],
      ['Documento generado', genAt],
      ['Fuente', 'Demo coherente (reemplazar por API en producción)'],
      ['', ''],
      ['TOTAL VENTAS (MXN)', D.totalVentas],
      ['Movimientos (líneas)', D.LINEAS.length],
      ['Control de suma', D.verifyCoherence() ? 'Cuadre verificado' : 'Revisar'],
    ];
    const wsPortada = XLSX.utils.aoa_to_sheet(portadaAoA);
    wsPortada['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    setColWidths(wsPortada, [36, 44]);
    XLSX.utils.book_append_sheet(wb, wsPortada, 'Portada');

    /* —— Resumen KPI —— */
    const kpiRows = [
      { Métrica: 'Total ventas', 'Valor MXN': D.totalVentas, Notas: 'Suma de líneas del período' },
      { Métrica: 'Movimientos', 'Valor MXN': D.LINEAS.length, Notas: 'Cantidad de líneas' },
      {
        Métrica: 'Cuadre (detalle = total)',
        'Valor MXN': D.verifyCoherence() ? 'Verificado' : 'Revisar',
        Notas: 'Control interno demo',
      },
    ];
    if (D.topVendedores[0]) {
      kpiRows.push({
        Métrica: 'Mayor vendedor',
        'Valor MXN': D.topVendedores[0].importe,
        Notas: D.topVendedores[0].nombre,
      });
    }
    if (D.topClientes[0]) {
      kpiRows.push({
        Métrica: 'Mayor cliente',
        'Valor MXN': D.topClientes[0].importe,
        Notas: D.topClientes[0].nombre,
      });
    }
    const wsKpi = XLSX.utils.json_to_sheet(kpiRows);
    setColWidths(wsKpi, [26, 16, 36]);
    XLSX.utils.book_append_sheet(wb, wsKpi, 'Resumen KPI');

    /* —— Detalle (números como número) —— */
    const detalle = D.LINEAS.map((r) => ({
      Fecha: r.fecha,
      Cliente: r.cliente,
      Vendedor: r.vendedor,
      'Importe MXN': r.importe,
    }));
    const wsDet = XLSX.utils.json_to_sheet(detalle);
    setColWidths(wsDet, [12, 28, 22, 16]);
    XLSX.utils.book_append_sheet(wb, wsDet, 'Detalle ventas');

    const rankV = D.topVendedores.map((x, i) => ({
      Pos: i + 1,
      Vendedor: x.nombre,
      'Importe MXN': x.importe,
      '% sobre total': D.totalVentas ? Math.round((x.importe / D.totalVentas) * 10000) / 100 : 0,
    }));
    const wsRv = XLSX.utils.json_to_sheet(rankV);
    setColWidths(wsRv, [6, 24, 16, 14]);
    XLSX.utils.book_append_sheet(wb, wsRv, 'Rank vendedores');

    const rankC = D.topClientes.map((x, i) => ({
      Pos: i + 1,
      Cliente: x.nombre,
      'Importe MXN': x.importe,
      '% sobre total': D.totalVentas ? Math.round((x.importe / D.totalVentas) * 10000) / 100 : 0,
    }));
    const wsRc = XLSX.utils.json_to_sheet(rankC);
    setColWidths(wsRc, [6, 28, 16, 14]);
    XLSX.utils.book_append_sheet(wb, wsRc, 'Rank clientes');

    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(
      new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      'Informe-Ventas-' + D.MONTH_KEY + '.xlsx'
    );
  }

  function prepareSurfaceForExport(el) {
    if (!el) return function () {};
    el.classList.add('report-surface--export');
    return function () {
      try {
        el.classList.remove('report-surface--export');
      } catch (_) {}
    };
  }

  async function captureToPng(el) {
    const html2canvas = window.html2canvas;
    if (typeof html2canvas !== 'function') {
      window.alert('html2canvas no está cargado.');
      return;
    }
    const restore = prepareSurfaceForExport(el);
    let canvas;
    try {
      await new Promise((r) => requestAnimationFrame(r));
      canvas = await html2canvas(el, {
        scale: Math.min(2, window.devicePixelRatio || 2),
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false,
      });
    } finally {
      restore();
    }
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('toBlob'));
        },
        'image/png',
        0.95
      );
    });
  }

  async function exportPng(el, monthKey) {
    try {
      const blob = await captureToPng(el);
      downloadBlob(blob, 'Informe-Ventas-' + monthKey + '.png');
    } catch (e) {
      window.alert('No se pudo generar la imagen: ' + (e && e.message ? e.message : e));
    }
  }

  async function exportPdf(el, monthKey) {
    const html2canvas = window.html2canvas;
    let jsPDF;
    if (window.jspdf && window.jspdf.jsPDF) jsPDF = window.jspdf.jsPDF;
    else if (window.jsPDF) jsPDF = window.jsPDF;
    if (typeof html2canvas !== 'function' || !jsPDF) {
      window.alert('html2canvas o jsPDF no están cargados.');
      return;
    }
    const restore = prepareSurfaceForExport(el);
    try {
      await new Promise((r) => requestAnimationFrame(r));
      const canvas = await html2canvas(el, {
        scale: Math.min(2, window.devicePixelRatio || 2),
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      let w = maxW;
      let h = (canvas.height * w) / canvas.width;
      if (h > maxH) {
        h = maxH;
        w = (canvas.width * h) / canvas.height;
      }
      pdf.setProperties({
        title: 'Informe de ventas ' + monthKey,
        subject: 'Scorecard',
        creator: brandName(),
      });
      pdf.addImage(imgData, 'PNG', (pageW - w) / 2, margin, w, h);
      pdf.save('Informe-Ventas-' + monthKey + '.pdf');
    } catch (e) {
      window.alert('No se pudo generar el PDF: ' + (e && e.message ? e.message : e));
    } finally {
      restore();
    }
  }

  window.SCORECARD_REPORT_EXPORT = {
    exportExcelFromData,
    exportPng,
    exportPdf,
  };
})();
