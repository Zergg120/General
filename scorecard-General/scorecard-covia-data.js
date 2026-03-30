/* global window */
(function () {
  'use strict';

  // Datos demo para maqueta tipo COVIA.
  // Reglas por KPI:
  // - compare: 'gte' => verde si value >= target
  // - compare: 'lte' => verde si value <= target
  // - compare: 'between' => verde si min <= value <= max (target = { min, max })

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

  function spark(seed, base, noise, len) {
    const out = [];
    let x = seed;
    for (let i = 0; i < (len || 12); i++) {
      // LCG simple determinístico
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      const r = (x % 1000) / 1000;
      out.push(Math.max(0, base + (r - 0.5) * 2 * noise));
    }
    return out;
  }

  function kpi(id, label, unit, compare, trendBase, trendNoise) {
    return {
      id,
      label,
      unit,
      compare,
      // valores demo del mes y ytd se “derivan” del trend (para maqueta)
      trend: spark(id.length * 97, trendBase, trendNoise, 12),
    };
  }

  const TABS = {
    delivery_financials: {
      title: 'Delivery & Financials',
      groups: [
        {
          area: 'Delivery',
          icon: '🚚',
          kpis: [
            kpi('del_volume_budget', 'Volume shipped in Tons vs Budget', '%', 'gte', 90, 10),
            kpi('del_volume_new', 'Volume shipped in Tons vs New Order', '%', 'gte', 95, 8),
            kpi('del_otif', 'OTIF — On Time In Full', '%', 'gte', 96, 6),
            kpi('del_otd', 'On Time Delivery (OTD)', '%', 'gte', 92, 9),
            kpi('del_forecast', 'Forecast Accuracy', '%', 'gte', 88, 12),
          ],
        },
        {
          area: 'Financials',
          icon: '📊',
          kpis: [
            kpi('fin_unit_cost', 'Unit Cost (CPT)', '$/MT', 'lte', 680, 60),
            kpi('fin_labor_cost', 'Costo de Mano de Obra por producción', '$/MT', 'lte', 90, 12),
            kpi('fin_variable_cost', 'Costo Variable', '$/MT', 'lte', 480, 80),
            kpi('fin_fixed_cost', 'Costo Fijo', '$/MT', 'lte', 200, 30),
            kpi('fin_budget_var', 'Variación vs presupuesto', '%', 'lte', 36, 10),
            kpi('fin_freight_cost', 'Freight Cost por producción', '$/MT', 'lte', 610, 90),
            kpi('fin_operating_income', 'Utilidad Operativa', '%', 'gte', 24, 9),
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
            kpi('prod_oee', 'OEE — Overall Equipment Effectiveness', '%', 'gte', 86, 10),
            kpi('prod_availability', 'Disponibilidad de equipos', '%', 'gte', 2, 2),
            kpi('prod_daily_avg', 'Daily production average', 'MT/day', 'gte', 1150, 220),
            kpi('prod_plan', 'Cumplimiento del plan de producción', '%', 'gte', 95, 25),
            kpi('prod_throughput', 'Throughput / tasa de producción', '#', 'gte', 168, 30),
            kpi('prod_downtime', 'Unplanned Downtime', '%', 'lte', 4, 3),
          ],
        },
        {
          area: 'Inventory',
          icon: '🏗️',
          kpis: [
            kpi('inv_raw', 'Raw Material Inventory', '%', 'gte', 3.6, 2),
            kpi('inv_wip', 'Work-in-progress Inventory', '%', 'gte', 7.2, 3.2),
            kpi('inv_fg', 'Finished Goods Inventory', '%', 'gte', 80, 18),
            kpi('inv_stockpiles', 'Mine Stockpiles', 'Days', 'lte', 210, 30),
            kpi('inv_dio', 'DIO', 'Days', 'lte', 36, 12),
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
            kpi('ehs_trir', 'TRIR — Total Recordable Incident Rate', 'Rate', 'lte', 0.6, 0.4),
            kpi('ehs_ltir', 'LTIR — Lost Time Injury Rate', 'Rate', 'lte', 0.35, 0.3),
            kpi('ehs_lost_days', 'Accidentes con días perdidos', 'Days', 'lte', 2, 3),
            kpi('ehs_near_miss', 'Near Misses reportados', '#', 'gte', 80, 60),
            kpi('ehs_sbis', '% SBIs Achievement', '%', 'gte', 90, 12),
            kpi('ehs_wpe', '% WPE Achievement', '%', 'gte', 86, 14),
            kpi('ehs_actions', '% Implemented Safety Actions', '%', 'gte', 94, 10),
          ],
        },
        {
          area: 'Environmental',
          icon: '🌿',
          kpis: [
            kpi('env_actions', '% Implemented Environmental Actions', '%', 'gte', 78, 16),
            kpi('env_electric', 'Consumo eléctrico', 'kWh/MT', 'lte', 85, 14),
            kpi('env_thermal', 'Consumo térmico', 'mcal/MT', 'lte', 95, 16),
            kpi('env_diesel', 'Consumo Diesel', 'l/MT', 'lte', 7.8, 2.8),
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
            kpi('q_fpy', 'First Pass Yield (FPY)', '%', 'gte', 92, 10),
            kpi('q_scrap', 'Scrap Rate', '%', 'lte', 1.1, 1.2),
            kpi('q_rework', 'Rework Rate', '%', 'lte', 2.2, 1.6),
            kpi('q_claims', 'Reclamos de clientes', '#', 'lte', 1.2, 1.6),
            kpi('q_oca', 'On Time Corrective Actions', '%', 'gte', 90, 10),
          ],
        },
        {
          area: 'Labor',
          icon: '👥',
          kpis: [
            kpi('lab_tons_total_hours', 'Tons per total hours', 'h/MT', 'gte', 3.7, 1.2),
            kpi('lab_ot', '% OT', '%', 'lte', 8.5, 3.6),
            kpi('lab_tons_op_hours', 'Tons per OP hours', 'h/MT', 'gte', 82, 18),
            kpi('lab_diesel', 'Consumo Diesel', 'l/MT', 'lte', 7.8, 2.8),
          ],
        },
      ],
    },
  };

  window.SCORECARD_COVIA_DATA = {
    version: 'demo-2026-03',
    years: [2024, 2025, 2026],
    months: MONTHS,
    tabs: TABS,
  };
})();

