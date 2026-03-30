/* global window */
(function () {
  'use strict';

  /**
   * Datos demo para maqueta (sin marca de empresa).
   * Valores Productivity/Inventory, EHS y Quality/Labor alineados a las capturas de referencia (abril 2024).
   * Delivery & Financials: mismos KPIs que el ejemplo; números demo coherentes (sin captura detallada).
   *
   * cmp: 'gte' | 'lte' (meta alcanzada si valor cumple vs umbral numérico)
   * trend: 12 puntos para sparkline (Ene–Dic)
   */
  function trendAround(last, spread, n) {
    const out = [];
    let x = last;
    for (let i = 0; i < (n || 12); i++) {
      x = last + (Math.sin(i * 0.7) * spread * 0.25) + (i - 6) * (spread / 24);
      out.push(Math.max(0, x));
    }
    out[11] = last;
    return out;
  }

  function row(id, label, unit, month, targetM, ytd, targetY, cmp, override) {
    const m = Number(month);
    const t = trendAround(m, Math.abs(m) * 0.08 || 5, 12);
    const base = {
      id,
      label,
      unit,
      month: m,
      targetMonth: Number(targetM),
      ytd: Number(ytd),
      targetYtd: Number(targetY),
      cmp,
      targetMonthLabel: null,
      targetYtdLabel: null,
      trend: t,
      okMonth: null,
      okYtd: null,
    };
    if (override && typeof override === 'object') {
      if (override.okMonth != null) base.okMonth = override.okMonth;
      if (override.okYtd != null) base.okYtd = override.okYtd;
      if (override.targetMonthLabel != null) base.targetMonthLabel = override.targetMonthLabel;
      if (override.targetYtdLabel != null) base.targetYtdLabel = override.targetYtdLabel;
    }
    return base;
  }

  /** Metas con texto en pantalla (ej. umbral &lt; 1.0) pero comparación numérica interna */
  function rowLabeled(id, label, unit, month, targetM, ytd, targetY, cmp, labelM, labelY) {
    const r = row(id, label, unit, month, targetM, ytd, targetY, cmp);
    r.targetMonthLabel = labelM;
    r.targetYtdLabel = labelY;
    return r;
  }

  const MONTHS = [
    { key: '01', label: 'enero' },
    { key: '02', label: 'febrero' },
    { key: '03', label: 'marzo' },
    { key: '04', label: 'abril' },
    { key: '05', label: 'mayo' },
    { key: '06', label: 'junio' },
    { key: '07', label: 'julio' },
    { key: '08', label: 'agosto' },
    { key: '09', label: 'septiembre' },
    { key: '10', label: 'octubre' },
    { key: '11', label: 'noviembre' },
    { key: '12', label: 'diciembre' },
  ];

  const TABS = {
    delivery_financials: {
      title: 'Delivery & Financials',
      groups: [
        {
          area: 'Delivery',
          icon: '🚚',
          kpis: [
            row('del_vol_budget', 'Volume shipped in Tons vs Budget', '%', 94, 92, 93, 91, 'gte'),
            row('del_vol_new', 'Volume shipped in Tons vs New Order', '%', 91, 93, 89, 90, 'gte'),
            row('del_otif', 'OTIF — On Time In Full', '%', 96, 95, 95.2, 94.5, 'gte'),
            row('del_otd', 'On Time Delivery (OTD)', '%', 93, 92, 92.1, 91, 'gte'),
            row('del_forecast', 'Forecast Accuracy', '%', 87, 90, 88, 89, 'gte'),
          ],
        },
        {
          area: 'Financials',
          icon: '📊',
          kpis: [
            row('fin_cpt', 'Unit Cost (CPT)', '$/MT', 655, 680, 662, 670, 'lte'),
            row('fin_mo', 'Costo de Mano de Obra por producción', '$/MT', 88, 92, 90, 91, 'lte'),
            row('fin_var', 'Costo Variable', '$/MT', 470, 500, 485, 495, 'lte'),
            row('fin_fijo', 'Costo Fijo', '$/MT', 195, 210, 202, 205, 'lte'),
            row('fin_var_pres', 'Variación vs presupuesto', '%', 4.2, 5, 4.8, 5, 'lte'),
            row('fin_freight', 'Freight Cost por producción', '$/MT', 598, 620, 605, 615, 'lte'),
            row('fin_uo', 'Utilidad Operativa', '%', 26, 24, 25, 24, 'gte'),
          ],
        },
      ],
    },
    productivity_inventory: {
      title: 'Productivity & Inventory',
      groups: [
        {
          area: 'Productivity',
          icon: '🏭',
          kpis: [
            row('p_oee', 'OEE — Overall Equipment Effectiveness', '%', 86, 83, 84, 83, 'gte'),
            row('p_disp', 'Disponibilidad de equipos', '%', 0, 2, 0, 2, 'gte'),
            row('p_daily', 'Daily production average', 'MT/day', 1200, 1300, 987, 1300, 'gte'),
            row('p_plan', 'Cumplimiento del plan de producción', '%', 100, 95, 3, 95, 'gte'),
            row('p_through', 'Throughput / tasa de producción', '#', 165, 170, 166, 170, 'gte'),
            row('p_down', 'Unplanned Downtime', '%', 3, 5, 4, 5, 'lte'),
          ],
        },
        {
          area: 'Inventory',
          icon: '🏗️',
          kpis: [
            row('i_raw', 'Raw Material Inventory', '%', 3.7, 3.6, 3.5, 3.6, 'gte'),
            /* Captura: ambos en rojo; se fija semáforo explícito (reglas de negocio no claras en la imagen). */
            row('i_wip', 'Work-in-progress Inventory', '%', 6.5, 10.6, 6.7, 10.6, 'gte', { okMonth: false, okYtd: false }),
            /* Mes verde, YTD rojo en la referencia. */
            row('i_fg', 'Finished Goods Inventory', '%', 82.3, 74.0, 82.0, 74.0, 'gte', { okMonth: true, okYtd: false }),
            row('i_mine', 'Mine Stockpiles', 'Days', 210, 190, 210, 190, 'lte', { okMonth: true, okYtd: false }),
            row('i_dio', 'DIO', 'Days', 34, 30, 45, 30, 'lte', { okMonth: true, okYtd: false }),
          ],
        },
      ],
    },
    ehs: {
      title: 'EHS',
      groups: [
        {
          area: 'Safety',
          icon: '🦺',
          kpis: [
            rowLabeled('e_trir', 'TRIR — Total Recordable Incident Rate', 'Rate', 0.23, 1.0, 0.65, 1.0, 'lte', '< 1.0', '< 1.0'),
            rowLabeled('e_ltir', 'LTIR — Lost Time Injury Rate', 'Rate', 0.45, 0.25, 0.35, 0.25, 'lte', '< 0.25', '< 0.25'),
            rowLabeled('e_lost', 'Accidentes con días perdidos', 'Days', 0, 1, 3, 8, 'lte', '< 1', '< 8'),
            row('e_near', 'Near Misses reportados', '#', 65, 72, 250, 287, 'gte'),
            row('e_sbis', '% SBIs Achievement', '%', 85, 95, 97, 95, 'gte'),
            row('e_wpe', '% WPE Achievement', '%', 74, 95, 88, 95, 'gte'),
            row('e_safe_act', '% Implemented Safety Actions', '%', 100, 95, 96, 95, 'gte'),
          ],
        },
        {
          area: 'Environmental',
          icon: '🌿',
          kpis: [
            row('e_env_act', '% Implemented Environmental Actions', '%', 56, 95, 75, 95, 'gte'),
            row('e_elec', 'Consumo eléctrico', 'kWh/MT', 67, 83, 85, 83, 'lte'),
            row('e_term', 'Consumo térmico', 'mcal/MT', 95, 90, 99, 90, 'lte'),
            row('e_die', 'Consumo Diesel', 'l/MT', 9.7, 8.5, 6.7, 8.5, 'lte'),
          ],
        },
      ],
    },
    quality_labor: {
      title: 'Quality & Labor',
      groups: [
        {
          area: 'Quality',
          icon: '🛡️',
          kpis: [
            row('q_fpy', 'First Pass Yield (FPY)', '%', 89, 95, 96, 95, 'gte'),
            row('q_scrap', 'Scrap Rate', '%', 0, 2, 0, 2, 'lte'),
            row('q_rework', 'Rework Rate', '%', 0, 3, 3, 3, 'lte'),
            row('q_claims', 'Reclamos de clientes', '#', 0, 0, 1, 0, 'lte'),
            row('q_oca', 'On Time Corrective Actions', '%', 85, 95, 97, 95, 'gte'),
          ],
        },
        {
          area: 'Labor',
          icon: '👥',
          kpis: [
            row('l_tons_h', 'Tons per total hours', 'h/MT', 3.7, 3.6, 3.5, 3.6, 'gte'),
            row('l_ot', '% OT', '%', 6.5, 10.6, 6.7, 10.6, 'lte'),
            row('l_tons_op', 'Tons per OP hours', 'h/MT', 82.3, 74.0, 82.0, 74.0, 'gte'),
            row('l_die', 'Consumo Diesel', 'l/MT', 9.7, 8.5, 6.7, 8.5, 'lte'),
          ],
        },
      ],
    },
  };

  window.SCORECARD_COVIA_DATA = {
    version: 'demo-kpis-2026-03',
    years: [2024, 2025, 2026],
    months: MONTHS,
    tabs: TABS,
  };
})();
