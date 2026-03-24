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

  const MESES_ES = [
    '',
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  /** Fecha local → YYYY-MM-DD */
  function toIsoDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** Líneas de demo ordenadas (mes anterior + mes actual). */
  const ALL_LINEAS = [...LINEAS_PREV, ...LINEAS].sort((a, b) => a.fecha.localeCompare(b.fecha));

  function sumImporte(rows) {
    return rows.reduce((s, r) => s + r.importe, 0);
  }

  function sumEnRangoInclusive(desdeIso, hastaIso) {
    return sumImporte(ALL_LINEAS.filter((r) => r.fecha >= desdeIso && r.fecha <= hastaIso));
  }

  /** Lunes 00:00 local de la semana ISO (lunes = inicio). */
  function startOfWeekMonday(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
  }

  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function lastDayOfMonth(y, m1to12) {
    return new Date(y, m1to12, 0).getDate();
  }

  /**
   * Totales por tipo de periodo según la fecha de referencia (normalmente `new Date()` del navegador).
   * Sirve al asistente para responder: hoy, ayer, semana, mes, año, trimestre, etc.
   */
  function computeVentasPorPeriodo(ref) {
    const now = ref instanceof Date ? ref : new Date();
    const Y = now.getFullYear();
    const M = now.getMonth() + 1;
    const D = now.getDate();
    const todayIso = toIsoDate(now);

    const ayer = addDays(now, -1);
    const ayerIso = toIsoDate(ayer);

    const wStart = startOfWeekMonday(now);
    const wEnd = addDays(wStart, 6);
    const semanaDesde = toIsoDate(wStart);
    const semanaHasta = toIsoDate(wEnd);

    const wPrevStart = addDays(wStart, -7);
    const wPrevEnd = addDays(wStart, -1);
    const semanaAntDesde = toIsoDate(wPrevStart);
    const semanaAntHasta = toIsoDate(wPrevEnd);

    const mesKey = Y + '-' + pad2(M);
    const prevM = M === 1 ? 12 : M - 1;
    const prevY = M === 1 ? Y - 1 : Y;
    const mesAntKey = prevY + '-' + pad2(prevM);

    const ventasHoy = sumImporte(ALL_LINEAS.filter((r) => r.fecha === todayIso));
    const ventasAyer = sumImporte(ALL_LINEAS.filter((r) => r.fecha === ayerIso));

    const ventasSemanaActual = sumEnRangoInclusive(semanaDesde, semanaHasta);
    const ventasSemanaAnterior = sumEnRangoInclusive(semanaAntDesde, semanaAntHasta);

    const ventasMesActual = sumImporte(ALL_LINEAS.filter((r) => r.fecha.startsWith(mesKey + '-')));
    const ventasMesAnterior = sumImporte(ALL_LINEAS.filter((r) => r.fecha.startsWith(mesAntKey + '-')));

    const ventasAnioActual = sumImporte(ALL_LINEAS.filter((r) => String(r.fecha).startsWith(String(Y) + '-')));
    const ventasAnioAnterior = sumImporte(ALL_LINEAS.filter((r) => String(r.fecha).startsWith(String(Y - 1) + '-')));

    const q = Math.floor((M - 1) / 3) + 1;
    const qStartM = (q - 1) * 3 + 1;
    const qEndM = q * 3;
    const trimDesde = Y + '-' + pad2(qStartM) + '-01';
    const trimHasta = Y + '-' + pad2(qEndM) + '-' + pad2(lastDayOfMonth(Y, qEndM));
    const ventasTrimestreActual = sumEnRangoInclusive(trimDesde, trimHasta);

    let pq = q - 1;
    let pY = Y;
    if (pq < 1) {
      pq = 4;
      pY = Y - 1;
    }
    const pqStartM = (pq - 1) * 3 + 1;
    const pqEndM = pq * 3;
    const trimAntDesde = pY + '-' + pad2(pqStartM) + '-01';
    const trimAntHasta = pY + '-' + pad2(pqEndM) + '-' + pad2(lastDayOfMonth(pY, pqEndM));
    const ventasTrimestreAnterior = sumEnRangoInclusive(trimAntDesde, trimAntHasta);

    return {
      refIso: todayIso,
      ventasHoy,
      ventasAyer,
      labelAyer: MESES_ES[ayer.getMonth() + 1] + ' ' + ayer.getDate() + ', ' + ayer.getFullYear(),
      rangoSemanaActual: semanaDesde + ' a ' + semanaHasta,
      ventasSemanaActual,
      rangoSemanaAnterior: semanaAntDesde + ' a ' + semanaAntHasta,
      ventasSemanaAnterior,
      labelMesActual: MESES_ES[M] + ' ' + Y,
      ventasMesActual,
      labelMesAnterior: MESES_ES[prevM] + ' ' + prevY,
      ventasMesAnterior,
      labelAnio: String(Y),
      ventasAnioActual,
      labelAnioAnterior: String(Y - 1),
      ventasAnioAnterior,
      labelTrimActual: 'T' + q + ' ' + Y,
      ventasTrimestreActual,
      labelTrimAnterior: 'T' + pq + ' ' + pY,
      ventasTrimestreAnterior,
    };
  }

  /** Suma ventas de un día concreto YYYY-MM-DD (demo). */
  function ventasEnFecha(isoYyyyMmDd) {
    const iso = String(isoYyyyMmDd || '').slice(0, 10);
    return sumImporte(ALL_LINEAS.filter((r) => r.fecha === iso));
  }

  function normTxt(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /** Fecha explícita en texto del usuario → YYYY-MM-DD */
  function parseExplicitDateFromText(text) {
    const raw = String(text || '');
    let m = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
    if (m) {
      let d = +m[1];
      let mo = +m[2];
      let y = +m[3];
      if (y < 100) y += 2000;
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return y + '-' + pad2(mo) + '-' + pad2(d);
    }
    m = raw.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    const meses = {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      setiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12,
    };
    m = raw.match(/\b(\d{1,2})\s+de\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)\s*(?:de\s*(\d{4}))?\b/);
    if (m) {
      const mo = meses[normTxt(m[2])];
      if (mo) {
        const y = m[3] ? +m[3] : new Date().getFullYear();
        const d = +m[1];
        return y + '-' + pad2(mo) + '-' + pad2(d);
      }
    }
    return null;
  }

  /**
   * Periodo de ventas inferido del texto (asistente + informe).
   * null → usar vista mensual clásica o comparativa mes vs mes anterior.
   */
  function detectReportPeriodPreset(text) {
    const t = String(text || '');
    if (
      /compar|versus|vs\.?|variaci[oó]n|diferencia.*mes|mes\s*vs|frente\s+al\s+mes|respecto\s+al\s+mes/i.test(t) &&
      /mes\s+anterior|anterior|previo/i.test(t)
    ) {
      return null;
    }
    const wantsSumBothMonths =
      /(suma|sumar|total|junt[oa]s?|ambos|los\s+dos|m[aá]s\s+el|con\s+el)\s+(el\s+)?(mes\s+)?(anterior|previo)/i.test(t) ||
      /ventas?\s+(de\s+)?(este|actual|mes)\s+(con|y|m[aá]s)\s+(el\s+)?(mes\s+)?(anterior|pasado)/i.test(t) ||
      /\b(dos|ambos)\s+meses\b/i.test(t) ||
      (/suma(r)?\s+(me\s+)?(las\s+)?ventas?/i.test(t) && /(anterior|dos|ambos|mes|junto)/i.test(t));
    if (wantsSumBothMonths) return null;

    const isoExplicit = parseExplicitDateFromText(t);
    if (isoExplicit && /\b(ventas?|vend|factur|cu[aá]nto|movimientos|cifra|total|importe|d[ií]a)\b/i.test(t)) {
      return { kind: 'fecha', iso: isoExplicit };
    }

    if (/\btrimestre\s+anterior\b|\btrimestre\s+pasado\b|\bel\s+t\s*[-]?\s*anterior\b/i.test(t)) return { kind: 'trimestre_ant' };
    if (/\beste\s+trimestre\b|\btrimestre\s+actual\b|\btrimestre\s+en\s+curso\b/i.test(t)) return { kind: 'trimestre' };

    if (/\ba[nñ]o\s+anterior\b|\ba[nñ]o\s+pasado\b|\bel\s+a[nñ]o\s+pasado\b/i.test(t)) return { kind: 'anio_ant' };
    if (/\beste\s+a[nñ]o\b|\ba[nñ]o\s+en\s+curso\b|\bacumulado(\s+del)?\s+a[nñ]o\b|\bytd\b/i.test(t)) return { kind: 'anio' };

    if (/\b(el\s+)?mes\s+anterior\b/.test(t) || /\bmes\s+pasado\b/.test(t)) return { kind: 'mes_ant' };
    if (/\b(la\s+)?semana\s+anterior\b/.test(t) || /\bsemana\s+pasada\b/.test(t) || /\bsemana\s+previa\b/.test(t)) {
      return { kind: 'semana_ant' };
    }
    if (/\besta\s+semana\b/.test(t) || /\bsemana\s+actual\b/.test(t) || /\bsemana\s+en\s+curso\b/.test(t)) return { kind: 'semana' };

    if (/\bantier\b|\banteayer\b|\bhace\s+dos\s+d[ií]as\b/i.test(t)) return { kind: 'antier' };
    if (/\bayer\b/.test(t) || /\bd[ií]a\s+anterior\b/.test(t) || /\bel\s+d[ií]a\s+previo\b/.test(t)) return { kind: 'ayer' };

    /* Frases cortas tipo «ventas hoy» (sin «de») — deben resolver antes del bloque genérico de «hoy». */
    if (/\bventas?\s+hoy\b/i.test(t) || /\bhoy\s+ventas?\b/i.test(t)) return { kind: 'hoy' };

    if (/\beste\s+mes\b|\bmes\s+actual\b|\bmes\s+en\s+curso\b|\bmes\s+vigente\b/.test(t)) return { kind: 'mes' };
    if (/\bventas?\s+del\s+mes\b/i.test(t) && !/mes\s+anterior|mes\s+pasado/.test(t)) return { kind: 'mes' };

    const ctxVentasCorto =
      /\b(ventas?|vendimos|vendieron|vendi[oó]|factur|cu[aá]nto|total|importe|dame|cu[eé]nt|mu[eé]strame)\b/i.test(t);
    if (
      !/\bhoy\s+en\s+d[ií]a\b/i.test(t) &&
      /\bhoy\b/.test(t) &&
      (ctxVentasCorto || /\bventas?\s+de\s+hoy\b/i.test(t) || /\bd[ií]a\s+de\s+hoy\b/i.test(t) || /\bdel\s+d[ií]a\b/i.test(t))
    ) {
      return { kind: 'hoy' };
    }

    if (
      /\b(el\s+)?trimestre\b/i.test(t) &&
      !/trimestre\s+anterior|trimestre\s+pasado|t\s*[-]?\s*anterior/i.test(t) &&
      (/este|actual|en\s+curso|vigente/i.test(t) || !/anterior|pasado/i.test(t))
    ) {
      if (!/a[nñ]o\s+anterior|mes\s+anterior/.test(t)) return { kind: 'trimestre' };
    }

    if (
      /\bventas?\b/i.test(t) &&
      /\b(el\s+)?anterior\b/.test(t) &&
      !/\bsemana\b/.test(t) &&
      !/\btrimestre\b/.test(t) &&
      !/\ba[nñ]o\b/.test(t)
    ) {
      return { kind: 'mes_ant' };
    }

    return null;
  }

  function hash32(str) {
    let h = 2166136261 >>> 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  /** Entero en [min, max] determinista por semilla (demo cuando no hay líneas reales). */
  function syntheticBand(seedKey, min, max) {
    const span = max - min + 1;
    if (span <= 0) return min;
    return min + (hash32(String(seedKey)) % span);
  }

  /**
   * Importe mostrado en demo por tipo de periodo: si hay facturas en el set, usa la suma real;
   * si no, inventa un total creíble y distinto por periodo (misma semilla = mismo número).
   */
  function demoVentasForPreset(kind, refDate, isoFecha) {
    const ref = refDate instanceof Date ? refDate : new Date();
    const P = computeVentasPorPeriodo(ref);
    const pick = function (real, seedKey, lo, hi) {
      return real > 0 ? real : syntheticBand(seedKey, lo, hi);
    };
    switch (kind) {
      case 'hoy':
        return pick(P.ventasHoy, P.refIso + ';hoy', 42000, 178000);
      case 'ayer':
        return pick(P.ventasAyer, toIsoDate(addDays(ref, -1)) + ';ayer', 39000, 185000);
      case 'antier': {
        const iso = toIsoDate(addDays(ref, -2));
        const v = ventasEnFecha(iso);
        return pick(v, iso + ';antier', 36000, 172000);
      }
      case 'semana':
        return pick(P.ventasSemanaActual, P.rangoSemanaActual + ';sem', 285000, 648000);
      case 'semana_ant':
        return pick(P.ventasSemanaAnterior, P.rangoSemanaAnterior + ';sant', 268000, 615000);
      case 'mes':
        return pick(P.ventasMesActual, P.labelMesActual + ';mes', 1820000, 2360000);
      case 'mes_ant':
        return pick(P.ventasMesAnterior, P.labelMesAnterior + ';mant', 1710000, 2290000);
      case 'anio':
        return pick(P.ventasAnioActual, P.labelAnio + ';ytd', 4150000, 5350000);
      case 'anio_ant':
        return pick(P.ventasAnioAnterior, P.labelAnioAnterior + ';yp', 3920000, 5180000);
      case 'trimestre':
        return pick(P.ventasTrimestreActual, P.labelTrimActual + ';tq', 2080000, 2680000);
      case 'trimestre_ant':
        return pick(P.ventasTrimestreAnterior, P.labelTrimAnterior + ';tqp', 1960000, 2550000);
      case 'fecha': {
        const iso = String(isoFecha || '').slice(0, 10);
        const v = ventasEnFecha(iso);
        return pick(v, iso + ';1d', 44000, 176000);
      }
      default:
        return totalVentas;
    }
  }

  const _SYN_CLIENTS = ['Acme Industrial', 'Gamma Retail', 'Beta Logística', 'Epsilon Tech', 'Delta Foods'];
  const _SYN_VENDS = ['Laura Méndez', 'Ana Torres', 'Carlos Ruiz', 'Diego Vargas'];

  function addDaysToIso(isoYyyyMmDd, days) {
    const p = String(isoYyyyMmDd).slice(0, 10).split('-').map(Number);
    const dt = new Date(p[0], p[1] - 1, p[2] + days);
    return toIsoDate(dt);
  }

  /** Líneas sintéticas que suman exactamente `total` (coherentes para Excel/PDF). */
  function buildSyntheticLineas(total, seedKey, kind, refDate, isoFecha) {
    const ref = refDate instanceof Date ? refDate : new Date();
    const n = 4 + (hash32(seedKey + '|n') % 4);
    const rows = [];
    let baseIso = isoFecha || toIsoDate(ref);
    if (kind === 'ayer') baseIso = toIsoDate(addDays(ref, -1));
    if (kind === 'antier') baseIso = toIsoDate(addDays(ref, -2));
    if (kind === 'semana') baseIso = toIsoDate(startOfWeekMonday(ref));
    if (kind === 'semana_ant') baseIso = toIsoDate(addDays(startOfWeekMonday(ref), -7));

    let left = total;
    for (let i = 0; i < n; i++) {
      const h = hash32(seedKey + '|row|' + i);
      let chunk =
        i === n - 1
          ? left
          : Math.max(8000, Math.round(total * (0.1 + ((h % 70) / 220))));
      if (chunk > left) chunk = left;
      left -= chunk;
      let fechaRow = baseIso;
      if (kind === 'semana' || kind === 'semana_ant' || kind === 'mes' || kind === 'mes_ant') {
        fechaRow = addDaysToIso(baseIso, i * 2 + (h % 4));
      } else if (kind === 'anio' || kind === 'anio_ant' || kind === 'trimestre' || kind === 'trimestre_ant') {
        fechaRow = addDaysToIso(baseIso, i * 5 + (h % 9));
      }
      rows.push({
        fecha: fechaRow,
        cliente: _SYN_CLIENTS[h % _SYN_CLIENTS.length],
        vendedor: _SYN_VENDS[(h >> 5) % _SYN_VENDS.length],
        importe: chunk,
      });
    }
    const drift = total - rows.reduce((s, r) => s + r.importe, 0);
    if (rows.length) rows[rows.length - 1].importe += drift;
    return rows;
  }

  function filterLineasPorPreset(kind, refDate, isoFecha) {
    const ref = refDate instanceof Date ? refDate : new Date();
    const Y = ref.getFullYear();
    const M = ref.getMonth() + 1;
    const mesKey = Y + '-' + pad2(M);
    const prevM = M === 1 ? 12 : M - 1;
    const prevY = M === 1 ? Y - 1 : Y;
    const mesAntKey = prevY + '-' + pad2(prevM);
    const todayIso = toIsoDate(ref);
    const ayerIso = toIsoDate(addDays(ref, -1));
    const antierIso = toIsoDate(addDays(ref, -2));
    const wStart = startOfWeekMonday(ref);
    const wEnd = addDays(wStart, 6);
    const semanaDesde = toIsoDate(wStart);
    const semanaHasta = toIsoDate(wEnd);
    const wPrevStart = addDays(wStart, -7);
    const wPrevEnd = addDays(wStart, -1);
    const semanaAntDesde = toIsoDate(wPrevStart);
    const semanaAntHasta = toIsoDate(wPrevEnd);
    const q = Math.floor((M - 1) / 3) + 1;
    const qStartM = (q - 1) * 3 + 1;
    const qEndM = q * 3;
    const trimDesde = Y + '-' + pad2(qStartM) + '-01';
    const trimHasta = Y + '-' + pad2(qEndM) + '-' + pad2(lastDayOfMonth(Y, qEndM));
    let pq = q - 1;
    let pY = Y;
    if (pq < 1) {
      pq = 4;
      pY = Y - 1;
    }
    const pqStartM = (pq - 1) * 3 + 1;
    const pqEndM = pq * 3;
    const trimAntDesde = pY + '-' + pad2(pqStartM) + '-01';
    const trimAntHasta = pY + '-' + pad2(pqEndM) + '-' + pad2(lastDayOfMonth(pY, pqEndM));

    switch (kind) {
      case 'hoy':
        return ALL_LINEAS.filter((r) => r.fecha === todayIso);
      case 'ayer':
        return ALL_LINEAS.filter((r) => r.fecha === ayerIso);
      case 'antier':
        return ALL_LINEAS.filter((r) => r.fecha === antierIso);
      case 'semana':
        return ALL_LINEAS.filter((r) => r.fecha >= semanaDesde && r.fecha <= semanaHasta);
      case 'semana_ant':
        return ALL_LINEAS.filter((r) => r.fecha >= semanaAntDesde && r.fecha <= semanaAntHasta);
      case 'mes':
        return ALL_LINEAS.filter((r) => r.fecha.startsWith(mesKey + '-'));
      case 'mes_ant':
        return ALL_LINEAS.filter((r) => r.fecha.startsWith(mesAntKey + '-'));
      case 'anio':
        return ALL_LINEAS.filter((r) => String(r.fecha).startsWith(String(Y) + '-'));
      case 'anio_ant':
        return ALL_LINEAS.filter((r) => String(r.fecha).startsWith(String(Y - 1) + '-'));
      case 'trimestre':
        return ALL_LINEAS.filter((r) => r.fecha >= trimDesde && r.fecha <= trimHasta);
      case 'trimestre_ant':
        return ALL_LINEAS.filter((r) => r.fecha >= trimAntDesde && r.fecha <= trimAntHasta);
      case 'fecha': {
        const iso = String(isoFecha || '').slice(0, 10);
        return ALL_LINEAS.filter((r) => r.fecha === iso);
      }
      default:
        return [];
    }
  }

  function flexHeadline(kind, refDate, isoFecha) {
    const ref = refDate instanceof Date ? refDate : new Date();
    const P = computeVentasPorPeriodo(ref);
    switch (kind) {
      case 'hoy':
        return 'Ventas · Hoy (' + P.refIso + ')';
      case 'ayer':
        return 'Ventas · Ayer (' + P.labelAyer + ')';
      case 'antier': {
        const a = addDays(ref, -2);
        return 'Ventas · Antier (' + MESES_ES[a.getMonth() + 1] + ' ' + a.getDate() + ', ' + a.getFullYear() + ')';
      }
      case 'semana':
        return 'Ventas · Esta semana (' + P.rangoSemanaActual + ')';
      case 'semana_ant':
        return 'Ventas · Semana anterior (' + P.rangoSemanaAnterior + ')';
      case 'mes':
        return 'Ventas · ' + P.labelMesActual;
      case 'mes_ant':
        return 'Ventas · ' + P.labelMesAnterior;
      case 'anio':
        return 'Ventas · Año ' + P.labelAnio;
      case 'anio_ant':
        return 'Ventas · Año ' + P.labelAnioAnterior;
      case 'trimestre':
        return 'Ventas · ' + P.labelTrimActual;
      case 'trimestre_ant':
        return 'Ventas · ' + P.labelTrimAnterior;
      case 'fecha':
        return 'Ventas · Día ' + String(isoFecha || '').slice(0, 10);
      default:
        return MONTH_LABEL;
    }
  }

  /**
   * Vista de informe para un periodo concreto (hoy, ayer, semana, año…).
   * @param {{ kind: string, iso?: string }} preset
   */
  function buildFlexibleReportView(preset) {
    const kind = preset && preset.kind;
    const isoFecha = preset && preset.iso;
    const ref = new Date();
    if (!kind || kind === 'default') return buildReportView(false);

    const filtered = filterLineasPorPreset(kind, ref, isoFecha);
    const sumReal = sumImporte(filtered);
    const headlineMonth = flexHeadline(kind, ref, isoFecha);
    let LINEAS;
    let totalVentas;
    if (sumReal > 0) {
      LINEAS = filtered.slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
      totalVentas = sumReal;
    } else {
      totalVentas = demoVentasForPreset(kind, ref, isoFecha);
      LINEAS = buildSyntheticLineas(
        totalVentas,
        headlineMonth + '|' + kind,
        kind,
        ref,
        isoFecha
      ).sort((a, b) => a.fecha.localeCompare(b.fecha));
    }

    const safeExport = String(kind) + '_' + (isoFecha || toIsoDate(ref)).replace(/[^0-9-]/g, '');

    return {
      mode: 'flex',
      flexLabel: headlineMonth,
      periodLabel: headlineMonth,
      headlineMonth: headlineMonth,
      MONTH_KEY_EXPORT: 'demo_' + safeExport,
      LINEAS: LINEAS,
      totalVentas: totalVentas,
      totalVentasMesActual: totalVentas,
      totalVentasMesAnterior: totalVentasPrev,
      topVendedores: aggregateByLines(LINEAS, 'vendedor', 5),
      topClientes: aggregateByLines(LINEAS, 'cliente', 5),
      verifyCoherence: function () {
        return sumImporte(LINEAS) === totalVentas;
      },
      PREV_MONTH_LABEL: PREV_MONTH_LABEL,
      MONTH_LABEL_SINGLE: headlineMonth,
    };
  }

  function aggregateByLines(rows, field, topN) {
    const map = {};
    rows.forEach((r) => {
      const k = r[field];
      map[k] = (map[k] || 0) + r.importe;
    });
    return Object.entries(map)
      .map(([nombre, importe]) => ({ nombre, importe }))
      .sort((a, b) => b.importe - a.importe)
      .slice(0, topN || 10);
  }

  /**
   * Vista para informe/PDF/Excel: un solo mes o mes actual + anterior (líneas y totales coherentes).
   */
  function buildReportView(twoMonth) {
    if (!twoMonth) {
      return {
        mode: 'single',
        periodLabel: MONTH_LABEL,
        headlineMonth: MONTH_LABEL,
        MONTH_KEY_EXPORT: MONTH_KEY,
        LINEAS: LINEAS,
        totalVentas: totalVentas,
        totalVentasMesActual: totalVentas,
        totalVentasMesAnterior: totalVentasPrev,
        topVendedores: aggregateBy('vendedor', 5),
        topClientes: aggregateBy('cliente', 5),
        verifyCoherence: verifyCoherence,
        PREV_MONTH_LABEL: PREV_MONTH_LABEL,
        MONTH_LABEL_SINGLE: MONTH_LABEL,
      };
    }
    const todas = [...LINEAS_PREV, ...LINEAS].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const totalAmbos = totalVentas + totalVentasPrev;
    const delta = totalVentas - totalVentasPrev;
    const pct = totalVentasPrev ? (delta / totalVentasPrev) * 100 : 0;
    return {
      mode: 'two-month',
      periodLabel: PREV_MONTH_LABEL + ' y ' + MONTH_LABEL,
      headlineMonth: PREV_MONTH_LABEL + ' y ' + MONTH_LABEL,
      MONTH_KEY_EXPORT: PREV_MONTH_KEY + '_' + MONTH_KEY,
      LINEAS: todas,
      LINEAS_PREV: LINEAS_PREV,
      LINEAS_CURRENT: LINEAS,
      totalVentas: totalAmbos,
      totalVentasMesActual: totalVentas,
      totalVentasMesAnterior: totalVentasPrev,
      deltaVsAnterior: delta,
      pctVsAnterior: pct,
      topVendedores: aggregateByLines(todas, 'vendedor', 5),
      topClientes: aggregateByLines(todas, 'cliente', 5),
      verifyCoherence: () => sumLines(todas) === totalAmbos,
      PREV_MONTH_LABEL: PREV_MONTH_LABEL,
      MONTH_LABEL_SINGLE: MONTH_LABEL,
      PREV_MONTH_KEY: PREV_MONTH_KEY,
      MONTH_KEY: MONTH_KEY,
    };
  }

  function etiquetaMesLinea(fecha, view) {
    if (!view || view.mode !== 'two-month' || !fecha) return '';
    const f = String(fecha);
    if (f.startsWith(PREV_MONTH_KEY) || f.slice(0, 7) === PREV_MONTH_KEY) return PREV_MONTH_LABEL;
    return MONTH_LABEL;
  }

  window.SCORECARD_REPORT_DATA = {
    MONTH_LABEL,
    MONTH_KEY,
    PREV_MONTH_LABEL,
    PREV_MONTH_KEY,
    LINEAS,
    LINEAS_PREV,
    ALL_LINEAS,
    totalVentas,
    totalVentasPrev,
    get topVendedores() {
      return aggregateBy('vendedor', 5);
    },
    get topClientes() {
      return aggregateBy('cliente', 5);
    },
    verifyCoherence,
    buildReportView,
    etiquetaMesLinea,
    computeVentasPorPeriodo,
    ventasEnFecha,
    toIsoDate,
    demoVentasForPreset,
    buildFlexibleReportView,
    detectReportPeriodPreset,
  };
})();
