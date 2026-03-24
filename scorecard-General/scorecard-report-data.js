/**
 * Scorecard General — datos de ventas demo coherentes (sumas verificables).
 * Sustituir por API: exponer el mismo shape { LINEAS, MONTH_LABEL, … }.
 */
(function () {
  'use strict';

  const MONTH_LABEL = 'Marzo 2026';
  const MONTH_KEY = '2026-03';
  const PREV_MONTH_LABEL = 'Febrero 2026';
  const PREV_MONTH_KEY = '2026-02';

  /**
   * Líneas de ventas del mes. La suma de importe === totalVentas.
   * Mismos clientes/vendedores se repiten para que tops tengan sentido.
   */
  const LINEAS = [
    { fecha: '2026-03-01', cliente: 'Acme Industrial', vendedor: 'Laura Méndez', importe: 520000 },
    { fecha: '2026-03-01', cliente: 'Beta Logística', vendedor: 'Laura Méndez', importe: 310000 },
    { fecha: '2026-03-05', cliente: 'Gamma Retail', vendedor: 'Carlos Ruiz', importe: 410000 },
    { fecha: '2026-03-07', cliente: 'Delta Foods', vendedor: 'Carlos Ruiz', importe: 195000 },
    { fecha: '2026-03-10', cliente: 'Epsilon Tech', vendedor: 'Ana Torres', importe: 280000 },
    { fecha: '2026-03-12', cliente: 'Acme Industrial', vendedor: 'Ana Torres', importe: 265000 },
    { fecha: '2026-03-18', cliente: 'Beta Logística', vendedor: 'Diego Vargas', importe: 50000 },
    { fecha: '2026-03-22', cliente: 'Gamma Retail', vendedor: 'Ana Torres', importe: 120000 },
  ];

  function sumLines(rows) {
    return rows.reduce((s, r) => s + r.importe, 0);
  }

  const totalVentas = sumLines(LINEAS);

  /** Mes anterior (demo): suma distinta para permitir comparativas en el asistente. */
  const LINEAS_PREV = [
    { fecha: '2026-02-03', cliente: 'Acme Industrial', vendedor: 'Laura Méndez', importe: 480000 },
    { fecha: '2026-02-05', cliente: 'Gamma Retail', vendedor: 'Carlos Ruiz', importe: 390000 },
    { fecha: '2026-02-08', cliente: 'Delta Foods', vendedor: 'Ana Torres', importe: 310000 },
    { fecha: '2026-02-14', cliente: 'Beta Logística', vendedor: 'Laura Méndez', importe: 295000 },
    { fecha: '2026-02-20', cliente: 'Epsilon Tech', vendedor: 'Carlos Ruiz', importe: 255000 },
    { fecha: '2026-02-26', cliente: 'Acme Industrial', vendedor: 'Diego Vargas', importe: 250000 },
  ];
  const totalVentasPrev = sumLines(LINEAS_PREV);

  function aggregateBy(field, topN) {
    const map = {};
    LINEAS.forEach((r) => {
      const k = r[field];
      map[k] = (map[k] || 0) + r.importe;
    });
    return Object.entries(map)
      .map(([nombre, importe]) => ({ nombre, importe }))
      .sort((a, b) => b.importe - a.importe)
      .slice(0, topN || 10);
  }

  function verifyCoherence() {
    return sumLines(LINEAS) === totalVentas;
  }

  window.SCORECARD_REPORT_DATA = {
    MONTH_LABEL,
    MONTH_KEY,
    PREV_MONTH_LABEL,
    PREV_MONTH_KEY,
    LINEAS,
    LINEAS_PREV,
    totalVentas,
    totalVentasPrev,
    get topVendedores() {
      return aggregateBy('vendedor', 5);
    },
    get topClientes() {
      return aggregateBy('cliente', 5);
    },
    verifyCoherence,
  };
})();
