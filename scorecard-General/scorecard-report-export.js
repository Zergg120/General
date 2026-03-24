/**
 * Scorecard General — exportar informe: Excel con formato profesional (ExcelJS) o SheetJS
 * como respaldo; PNG/PDF (html2canvas + jsPDF).
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

  /* ---------- ExcelJS: estilos corporativos ---------- */
  var XL_HEADER_FILL = 'FF0F172A';
  var XL_HEADER_FONT = 'FFFFFFFF';
  var XL_LABEL_FILL = 'FFE2E8F0';
  var XL_STRIPE_FILL = 'FFF8FAFC';
  var XL_SECTION_FILL = 'FFCBD5E1';
  var XL_BORDER = { style: 'thin', color: { argb: 'FF94A3B8' } };
  var XL_BORDER_ALL = { top: XL_BORDER, left: XL_BORDER, bottom: XL_BORDER, right: XL_BORDER };
  var MONEY_FMT = '"$"#,##0';
  var PCT_FMT = '#,##0.00"%"';

  function xlHeaderRowCells(row, colCount) {
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.font = { bold: true, color: { argb: XL_HEADER_FONT }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_HEADER_FILL } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = XL_BORDER_ALL;
    }
    row.height = 24;
  }

  function xlDataCell(cell, opts) {
    opts = opts || {};
    cell.alignment = { vertical: 'middle', wrapText: true, horizontal: opts.horizontal || 'left' };
    cell.border = XL_BORDER_ALL;
    if (opts.money && typeof cell.value === 'number') cell.numFmt = MONEY_FMT;
    if (opts.pct && typeof cell.value === 'number') cell.numFmt = PCT_FMT;
    if (opts.striped) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_STRIPE_FILL } };
    }
  }

  function xlLabelCell(cell) {
    cell.font = { bold: true, size: 10, color: { argb: 'FF475569' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_LABEL_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = XL_BORDER_ALL;
  }

  function excelSheetName(label) {
    const s = String(label || 'Hoja').replace(/[:\\/?*[\]]/g, ' ').trim();
    return s.length > 31 ? s.slice(0, 31) : s;
  }

  /**
   * Excel .xlsx con encabezados, bordes, moneda MXN y tablas filtrables (ExcelJS).
   */
  async function exportExcelFromExcelJS(V) {
    const ExcelJS = window.ExcelJS;
    const D = window.SCORECARD_REPORT_DATA;
    const wb = new ExcelJS.Workbook();
    wb.creator = brandName();
    wb.created = new Date();
    wb.modified = new Date();
    const org = brandName();
    const genAt = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    const two = V.mode === 'two-month';
    const flex = V.mode === 'flex';
    const fname = 'Informe-Ventas-' + (V.MONTH_KEY_EXPORT || 'periodo').replace(/[^a-zA-Z0-9_-]/g, '_') + '.xlsx';

    /* —— Portada —— */
    const wsP = wb.addWorksheet('Portada', {
      views: [{ showGridLines: false }],
      properties: { defaultRowHeight: 18 },
    });
    wsP.getColumn(1).width = 36;
    wsP.getColumn(2).width = 58;

    wsP.mergeCells('A1:B1');
    const title = wsP.getCell('A1');
    title.value = 'INFORME EJECUTIVO DE VENTAS';
    title.font = { bold: true, size: 20, color: { argb: XL_HEADER_FONT } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    title.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    wsP.getRow(1).height = 42;

    wsP.mergeCells('A2:B2');
    const sub = wsP.getCell('A2');
    sub.value = org;
    sub.font = { italic: true, size: 11, color: { argb: 'FF64748B' } };
    sub.alignment = { horizontal: 'center', vertical: 'middle' };
    wsP.getRow(2).height = 22;

    let r = 4;
    wsP.mergeCells('A' + r + ':B' + r);
    const sec = wsP.getCell('A' + r);
    sec.value = 'Información general';
    sec.font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
    sec.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_SECTION_FILL } };
    sec.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    wsP.getRow(r).height = 26;
    r++;

    xlHeaderRowCells(wsP.getRow(r), 2);
    wsP.getCell('A' + r).value = 'Campo';
    wsP.getCell('B' + r).value = 'Descripción';
    r++;

    function portadaRow(label, value, money) {
      xlLabelCell(wsP.getCell('A' + r));
      wsP.getCell('A' + r).value = label;
      const b = wsP.getCell('B' + r);
      b.value = value;
      xlDataCell(b, { money: money && typeof value === 'number', horizontal: 'left' });
      wsP.getRow(r).height = 22;
      r++;
    }

    portadaRow('Organización', org, false);
    portadaRow('Período analizado', V.headlineMonth || V.periodLabel || '—', false);
    portadaRow(
      'Tipo de información',
      two
        ? 'Demostración: mes actual + mes anterior ficticio (muestra comparativa)'
        : flex
          ? 'Demostración: periodo flexible (día/semana/mes/año — datos ilustrativos coherentes)'
          : 'Demostración: datos ilustrativos del período',
      false
    );
    portadaRow('Documento generado', genAt, false);
    portadaRow('Fuente', 'Datos de muestra coherentes — sustituir por ERP/BI en producción', false);

    if (two) {
      r++;
      wsP.mergeCells('A' + r + ':B' + r);
      const s2 = wsP.getCell('A' + r);
      s2.value = 'Comparativa entre meses';
      s2.font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
      s2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_SECTION_FILL } };
      s2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      wsP.getRow(r).height = 26;
      r++;
      portadaRow('Total ' + V.PREV_MONTH_LABEL + ' (MXN)', V.totalVentasMesAnterior, true);
      portadaRow('Total ' + V.MONTH_LABEL_SINGLE + ' (MXN)', V.totalVentasMesActual, true);
      portadaRow('Variación $ (mes actual vs anterior)', V.deltaVsAnterior, true);
      portadaRow(
        'Variación %',
        Number.isFinite(V.pctVsAnterior) ? Math.round(V.pctVsAnterior * 100) / 100 : '—',
        false
      );
    }

    r++;
    wsP.mergeCells('A' + r + ':B' + r);
    const s3 = wsP.getCell('A' + r);
    s3.value = 'Totales del período mostrado';
    s3.font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
    s3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_SECTION_FILL } };
    s3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    wsP.getRow(r).height = 26;
    r++;

    portadaRow('TOTAL VENTAS período (MXN)', V.totalVentas, true);
    portadaRow('Movimientos (líneas)', V.LINEAS.length, false);
    portadaRow('Control de suma', V.verifyCoherence() ? 'Cuadre verificado' : 'Revisar', false);

    /* —— Resumen KPI —— */
    let kpiRows;
    if (two) {
      kpiRows = [
        ['Total ambos meses', V.totalVentas, 'Suma de líneas de ambos períodos', true],
        ['Subtotal ' + V.PREV_MONTH_LABEL, V.totalVentasMesAnterior, V.LINEAS_PREV.length + ' mov.', true],
        ['Subtotal ' + V.MONTH_LABEL_SINGLE, V.totalVentasMesActual, V.LINEAS_CURRENT.length + ' mov.', true],
        ['Movimientos (total líneas)', V.LINEAS.length, 'Cantidad de líneas', false],
        ['Cuadre (detalle = total)', V.verifyCoherence() ? 'Verificado' : 'Revisar', 'Control interno demo', false],
      ];
    } else {
      kpiRows = [
        ['Total ventas', V.totalVentas, 'Suma de líneas del período', true],
        ['Movimientos', V.LINEAS.length, 'Cantidad de líneas', false],
        ['Cuadre (detalle = total)', V.verifyCoherence() ? 'Verificado' : 'Revisar', 'Control interno demo', false],
      ];
    }
    if (V.topVendedores[0]) {
      kpiRows.push([
        'Mayor vendedor',
        V.topVendedores[0].importe,
        V.topVendedores[0].nombre,
        true,
      ]);
    }
    if (V.topClientes[0]) {
      kpiRows.push(['Mayor cliente', V.topClientes[0].importe, V.topClientes[0].nombre, true]);
    }

    const wsK = wb.addWorksheet('Resumen KPI');
    wsK.getColumn(1).width = 28;
    wsK.getColumn(2).width = 18;
    wsK.getColumn(3).width = 40;
    const hdrK = wsK.getRow(1);
    hdrK.values = ['Métrica', 'Valor (MXN)', 'Notas'];
    xlHeaderRowCells(hdrK, 3);
    kpiRows.forEach((row, i) => {
      const rr = wsK.getRow(i + 2);
      rr.getCell(1).value = row[0];
      rr.getCell(2).value = row[1];
      rr.getCell(3).value = row[2];
      xlDataCell(rr.getCell(1), { striped: i % 2 === 1 });
      xlDataCell(rr.getCell(2), {
        money: row[3] && typeof row[1] === 'number',
        striped: i % 2 === 1,
        horizontal: 'right',
      });
      xlDataCell(rr.getCell(3), { striped: i % 2 === 1 });
      rr.height = 20;
    });
    wsK.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 3 } };
    wsK.views = [{ state: 'frozen', ySplit: 1 }];

    /* —— Detalle —— */
    const detalle = V.LINEAS.map((row) => {
      if (two && D && typeof D.etiquetaMesLinea === 'function') {
        return [D.etiquetaMesLinea(row.fecha, V), row.fecha, row.cliente, row.vendedor, row.importe];
      }
      return [row.fecha, row.cliente, row.vendedor, row.importe];
    });
    const detHeaders = two
      ? ['Período', 'Fecha', 'Cliente', 'Vendedor', 'Importe (MXN)']
      : ['Fecha', 'Cliente', 'Vendedor', 'Importe (MXN)'];
    const wsD = wb.addWorksheet('Detalle ventas');
    const wDet = two ? [14, 12, 30, 22, 16] : [12, 30, 22, 16];
    wDet.forEach((w, i) => {
      wsD.getColumn(i + 1).width = w;
    });
    const hdrD = wsD.getRow(1);
    hdrD.values = detHeaders;
    xlHeaderRowCells(hdrD, detHeaders.length);
    const moneyCol = detHeaders.length;
    detalle.forEach((row, i) => {
      const rr = wsD.getRow(i + 2);
      row.forEach((val, j) => {
        const c = rr.getCell(j + 1);
        c.value = val;
        const isMoney = j + 1 === moneyCol && typeof val === 'number';
        xlDataCell(c, {
          money: isMoney,
          striped: i % 2 === 1,
          horizontal: isMoney ? 'right' : 'left',
        });
      });
      rr.height = 18;
    });
    wsD.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: detHeaders.length },
    };
    wsD.views = [{ state: 'frozen', ySplit: 1 }];

    if (two && V.LINEAS_PREV && V.LINEAS_CURRENT) {
      function sheetDetalle(lines, name) {
        const ws = wb.addWorksheet(excelSheetName(name));
        [12, 30, 22, 16].forEach((w, i) => {
          ws.getColumn(i + 1).width = w;
        });
        const h = ws.getRow(1);
        h.values = ['Fecha', 'Cliente', 'Vendedor', 'Importe (MXN)'];
        xlHeaderRowCells(h, 4);
        lines.forEach((row, i) => {
          const rr = ws.getRow(i + 2);
          rr.getCell(1).value = row.fecha;
          rr.getCell(2).value = row.cliente;
          rr.getCell(3).value = row.vendedor;
          rr.getCell(4).value = row.importe;
          for (let j = 1; j <= 4; j++) {
            xlDataCell(rr.getCell(j), {
              money: j === 4,
              striped: i % 2 === 1,
              horizontal: j === 4 ? 'right' : 'left',
            });
          }
          rr.height = 18;
        });
        ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 4 } };
        ws.views = [{ state: 'frozen', ySplit: 1 }];
      }
      sheetDetalle(V.LINEAS_PREV, V.PREV_MONTH_LABEL);
      sheetDetalle(V.LINEAS_CURRENT, V.MONTH_LABEL_SINGLE);
    }

    /* —— Rankings —— */
    function addRankSheet(name, headers, rows, moneyColIdx) {
      const ws = wb.addWorksheet(name);
      [8, 28, 16, 14].forEach((w, i) => {
        ws.getColumn(i + 1).width = w;
      });
      const h = ws.getRow(1);
      h.values = headers;
      xlHeaderRowCells(h, headers.length);
      rows.forEach((row, i) => {
        const rr = ws.getRow(i + 2);
        row.forEach((val, j) => {
          const c = rr.getCell(j + 1);
          c.value = val;
          const isMoney = j + 1 === moneyColIdx && typeof val === 'number';
          const isPct = headers[j] && String(headers[j]).indexOf('%') >= 0 && typeof val === 'number';
          xlDataCell(c, {
            money: isMoney,
            pct: isPct,
            striped: i % 2 === 1,
            horizontal: j === 0 ? 'center' : isMoney || isPct ? 'right' : 'left',
          });
        });
        rr.height = 18;
      });
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    }

    const rankV = V.topVendedores.map((x, i) => [
      i + 1,
      x.nombre,
      x.importe,
      V.totalVentas ? Math.round((x.importe / V.totalVentas) * 10000) / 100 : 0,
    ]);
    addRankSheet('Rank vendedores', ['Pos', 'Vendedor', 'Importe (MXN)', '% sobre total'], rankV, 3);

    const rankC = V.topClientes.map((x, i) => [
      i + 1,
      x.nombre,
      x.importe,
      V.totalVentas ? Math.round((x.importe / V.totalVentas) * 10000) / 100 : 0,
    ]);
    addRankSheet('Rank clientes', ['Pos', 'Cliente', 'Importe (MXN)', '% sobre total'], rankC, 3);

    const buffer = await wb.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      fname
    );
  }

  /**
   * Respaldo sin estilos (SheetJS community).
   */
  function exportExcelFromDataLegacy(V) {
    const XLSX = window.XLSX;
    const D = window.SCORECARD_REPORT_DATA;
    if (!XLSX || !XLSX.utils) {
      window.alert('SheetJS no está cargado.');
      return;
    }
    if (!V || !V.LINEAS) return;
    const wb = XLSX.utils.book_new();
    const org = brandName();
    const genAt = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    const two = V.mode === 'two-month';
    const flex = V.mode === 'flex';

    const portadaAoA = [
      ['INFORME EJECUTIVO DE VENTAS', ''],
      ['', ''],
      ['Organización', org],
      ['Período analizado', V.headlineMonth || V.periodLabel],
      [
        'Tipo de información',
        two
          ? 'Demostración: mes actual + mes anterior ficticio (muestra comparativa)'
          : flex
            ? 'Demostración: periodo flexible (día/semana/mes/año — datos ilustrativos coherentes)'
            : 'Demostración: datos ilustrativos del período',
      ],
      ['Documento generado', genAt],
      ['Fuente', 'Datos de muestra coherentes — sustituir por ERP/BI en producción'],
      ['', ''],
    ];
    if (two) {
      portadaAoA.push(
        ['Total ' + V.PREV_MONTH_LABEL + ' (MXN)', V.totalVentasMesAnterior],
        ['Total ' + V.MONTH_LABEL_SINGLE + ' (MXN)', V.totalVentasMesActual],
        ['Variación $ (mes actual vs anterior)', V.deltaVsAnterior],
        ['Variación %', Number.isFinite(V.pctVsAnterior) ? Math.round(V.pctVsAnterior * 100) / 100 : '—']
      );
    }
    portadaAoA.push(
      ['TOTAL VENTAS período (MXN)', V.totalVentas],
      ['Movimientos (líneas)', V.LINEAS.length],
      ['Control de suma', V.verifyCoherence() ? 'Cuadre verificado' : 'Revisar']
    );
    const wsPortada = XLSX.utils.aoa_to_sheet(portadaAoA);
    wsPortada['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    setColWidths(wsPortada, [36, 44]);
    XLSX.utils.book_append_sheet(wb, wsPortada, 'Portada');

    let kpiRows;
    if (two) {
      kpiRows = [
        {
          Métrica: 'Total ambos meses',
          'Valor MXN': V.totalVentas,
          Notas: 'Suma de líneas de ambos períodos',
        },
        {
          Métrica: 'Subtotal ' + V.PREV_MONTH_LABEL,
          'Valor MXN': V.totalVentasMesAnterior,
          Notas: V.LINEAS_PREV.length + ' mov.',
        },
        {
          Métrica: 'Subtotal ' + V.MONTH_LABEL_SINGLE,
          'Valor MXN': V.totalVentasMesActual,
          Notas: V.LINEAS_CURRENT.length + ' mov.',
        },
        { Métrica: 'Movimientos (total líneas)', 'Valor MXN': V.LINEAS.length, Notas: 'Cantidad de líneas' },
        {
          Métrica: 'Cuadre (detalle = total)',
          'Valor MXN': V.verifyCoherence() ? 'Verificado' : 'Revisar',
          Notas: 'Control interno demo',
        },
      ];
    } else {
      kpiRows = [
        { Métrica: 'Total ventas', 'Valor MXN': V.totalVentas, Notas: 'Suma de líneas del período' },
        { Métrica: 'Movimientos', 'Valor MXN': V.LINEAS.length, Notas: 'Cantidad de líneas' },
        {
          Métrica: 'Cuadre (detalle = total)',
          'Valor MXN': V.verifyCoherence() ? 'Verificado' : 'Revisar',
          Notas: 'Control interno demo',
        },
      ];
    }
    if (V.topVendedores[0]) {
      kpiRows.push({
        Métrica: 'Mayor vendedor',
        'Valor MXN': V.topVendedores[0].importe,
        Notas: V.topVendedores[0].nombre,
      });
    }
    if (V.topClientes[0]) {
      kpiRows.push({
        Métrica: 'Mayor cliente',
        'Valor MXN': V.topClientes[0].importe,
        Notas: V.topClientes[0].nombre,
      });
    }
    const wsKpi = XLSX.utils.json_to_sheet(kpiRows);
    setColWidths(wsKpi, [26, 16, 36]);
    XLSX.utils.book_append_sheet(wb, wsKpi, 'Resumen KPI');

    const detalle = V.LINEAS.map((r) => {
      if (two && D && typeof D.etiquetaMesLinea === 'function') {
        return {
          Período: D.etiquetaMesLinea(r.fecha, V),
          Fecha: r.fecha,
          Cliente: r.cliente,
          Vendedor: r.vendedor,
          'Importe MXN': r.importe,
        };
      }
      return {
        Fecha: r.fecha,
        Cliente: r.cliente,
        Vendedor: r.vendedor,
        'Importe MXN': r.importe,
      };
    });
    const wsDet = XLSX.utils.json_to_sheet(detalle);
    setColWidths(wsDet, two ? [14, 12, 28, 22, 16] : [12, 28, 22, 16]);
    XLSX.utils.book_append_sheet(wb, wsDet, 'Detalle ventas');

    if (two && V.LINEAS_PREV && V.LINEAS_CURRENT) {
      const prevOnly = V.LINEAS_PREV.map((r) => ({
        Fecha: r.fecha,
        Cliente: r.cliente,
        Vendedor: r.vendedor,
        'Importe MXN': r.importe,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prevOnly), excelSheetName(V.PREV_MONTH_LABEL));
      const curOnly = V.LINEAS_CURRENT.map((r) => ({
        Fecha: r.fecha,
        Cliente: r.cliente,
        Vendedor: r.vendedor,
        'Importe MXN': r.importe,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(curOnly), excelSheetName(V.MONTH_LABEL_SINGLE));
    }

    const rankV = V.topVendedores.map((x, i) => ({
      Pos: i + 1,
      Vendedor: x.nombre,
      'Importe MXN': x.importe,
      '% sobre total': V.totalVentas ? Math.round((x.importe / V.totalVentas) * 10000) / 100 : 0,
    }));
    const wsRv = XLSX.utils.json_to_sheet(rankV);
    setColWidths(wsRv, [6, 24, 16, 14]);
    XLSX.utils.book_append_sheet(wb, wsRv, 'Rank vendedores');

    const rankC = V.topClientes.map((x, i) => ({
      Pos: i + 1,
      Cliente: x.nombre,
      'Importe MXN': x.importe,
      '% sobre total': V.totalVentas ? Math.round((x.importe / V.totalVentas) * 10000) / 100 : 0,
    }));
    const wsRc = XLSX.utils.json_to_sheet(rankC);
    setColWidths(wsRc, [6, 28, 16, 14]);
    XLSX.utils.book_append_sheet(wb, wsRc, 'Rank clientes');

    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fname = 'Informe-Ventas-' + (V.MONTH_KEY_EXPORT || 'periodo').replace(/[^a-zA-Z0-9_-]/g, '_') + '.xlsx';
    downloadBlob(
      new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      fname
    );
  }

  async function exportExcelFromData(V) {
    const ExcelJS = window.ExcelJS;
    if (ExcelJS && typeof ExcelJS.Workbook === 'function') {
      try {
        await exportExcelFromExcelJS(V);
        return;
      } catch (err) {
        console.warn('Scorecard: ExcelJS falló, se usa SheetJS.', err);
      }
    }
    exportExcelFromDataLegacy(V);
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
        backgroundColor: '#ffffff',
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
        backgroundColor: '#ffffff',
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
