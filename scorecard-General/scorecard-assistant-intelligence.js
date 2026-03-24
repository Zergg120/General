/**
 * Scorecard General — capa de “inteligencia” local: tono formal, alcance del panel,
 * navegación “¿dónde está…?” y operaciones con datos demo de ventas (comparar / sumar meses).
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

  function moneyMx(n) {
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  }

  /** Temas claramente ajenos al scorecard (si no hay palabras de contexto del panel). */
  const OFF_TOPIC_HINT =
    /\b(clima|temperatura|llover|receta|cocinar|cocina|comida|pasta|queso|platillo|chef|restaurante|desayuno|cena|pel[ií]cula|netflix|f[úu]tbol|mundial|chisme|bitcoin|cripto|whatsapp|instagram|tarea\s+de\s+mate|historia\s+de\s+m[eé]xico|quien\s+gan[oó]|cumpleaños|hor[óo]scopo|chiste)\b/i;

  const IN_SCOPE_HINT =
    /\b(scorecard|ventas?|kpi|métrica|metrica|panel|dashboard|ebitda|roic|nps|ccc|finanzas|comercial|operaciones|personas|cliente|glosario|objetivo|gr[áa]fica|informe|excel|pdf|secci[oó]n|buscador|mes|compar|suma|sumar|anterior|d[oó]nde|ubicar|llevar|ir\s+a|asistente|contabilidad|liquidez|riesgo|margen|deuda|ytd|resumen|pipeline|churn|presentaci[oó]n|m[oó]dulo|dummy|tabla|hero|ingresos|cash|capital|proveedor|otif|enps|csat|facturaci[oó]n|libro|cuenta)\b/i;

  function shouldDeclineAsOffTopic(text) {
    const t = String(text || '');
    if (t.length < 4) return false;
    if (IN_SCOPE_HINT.test(t)) return false;
    if (!OFF_TOPIC_HINT.test(t)) return false;
    return true;
  }

  /** “¿Dónde veo X?” → sección del DOM */
  const WHERE_NAV = [
    {
      re: /grafica|gr[áa]fica|chart|tendencia|ingreso.*margen/i,
      id: 'sec-charts',
      label: 'Gráficas',
    },
    {
      re: /roic|apalanc|leverage|deuda.*ebitda|working\s*capital|liquidez(?!.*cliente)/i,
      id: 'sec-finanzas',
      label: 'Finanzas y liquidez',
    },
    {
      re: /pipeline|churn|cac|ltv|crecimiento|comercial(?!.*riesgo)/i,
      id: 'sec-comercial',
      label: 'Comercial y crecimiento',
    },
    {
      re: /otif|logistica|logística|lead\s*time|scrap|proveedor|sla|operaciones(?!.*personas)/i,
      id: 'sec-ops',
      label: 'Operaciones',
    },
    {
      re: /rrhh|rotacion|rotación|enps|ausentismo|vacante|personas\s+y/i,
      id: 'sec-personas',
      label: 'Personas y organización',
    },
    {
      re: /nps(?!\s*emple)|csat|concentraci[oó]n|ciber|riesgo\s+cliente|mdm|grc/i,
      id: 'sec-clientes',
      label: 'Clientes y riesgo',
    },
    {
      re: /objetivo|meta|sem[aá]foro|seguimiento/i,
      id: 'sec-objetivos',
      label: 'Tabla de objetivos',
    },
    {
      re: /glosario|definici[oó]n|qu[eé]\s+significa|ayuda.*métrica/i,
      id: 'sec-glosario',
      label: 'Glosario de métricas',
    },
    {
      re: /ebitda|ingresos\s+netos|ytd|tarjeta|hero|resumen\s+ejecutivo|cabecera|nps\s+consolidado|ccc(?!\s*finanzas)/i,
      id: 'sec-resumen',
      label: 'Resumen ejecutivo',
    },
  ];

  function tryWhereIsQuestion(text, ctx) {
    const t = String(text || '');
    if (!/(d[oó]nde|en\s+qu[eé]\s+parte|en\s+qu[eé]\s+secci[oó]n|ubicaci[oó]n|localiz|ver\s+la|est[aá]\s+el|est[aá]n\s+las)/i.test(t)) {
      return false;
    }
    if (!IN_SCOPE_HINT.test(t) && !/finanzas|ventas|kpi|metrica|m[ée]trica/i.test(t)) return false;

    for (let i = 0; i < WHERE_NAV.length; i++) {
      if (WHERE_NAV[i].re.test(t)) {
        const sec = WHERE_NAV[i];
        ctx.scrollToId(sec.id);
        ctx.addMsg(
          'bot',
          ctx.mdLite(
            'Con gusto: la información relacionada con esa consulta se encuentra en la sección **' +
              sec.label +
              '**. He desplazado la vista hasta allí; podrá revisarla en el panel principal.'
          )
        );
        ctx.speak(
          'La información solicitada está en la sección ' + sec.label + '. He desplazado la vista.'
        );
        return true;
      }
    }
    ctx.addMsg(
      'bot',
      ctx.mdLite(
        'Le sugiero utilizar el **buscador de KPIs** en la parte superior o la paleta **Ctrl+K** para localizar una sección concreta. Si indica una métrica (por ejemplo ROIC, EBITDA, NPS), podré orientarle con mayor precisión.'
      )
    );
    ctx.speak('Puede usar el buscador de KPIs o Ctrl+K para localizar la sección.');
    return true;
  }

  function tryVentasAnalytics(text, ctx) {
    const D = window.SCORECARD_REPORT_DATA;
    if (!D || typeof D.totalVentas !== 'number') return false;
    const hasPrev = typeof D.totalVentasPrev === 'number';
    const t = String(text || '');
    if (!/(ventas?|importe|facturaci[oó]n|mes\s+anterior|anterior|compar|suma|sumar|total|variaci[oó]n|diferencia|vs\.?|versus)/i.test(t)) {
      return false;
    }
    if (!hasPrev) return false;

    const sumBoth = D.totalVentas + D.totalVentasPrev;
    const delta = D.totalVentas - D.totalVentasPrev;
    const pct = D.totalVentasPrev ? ((delta / D.totalVentasPrev) * 100).toFixed(1) : '—';

    const wantsSum =
      /(suma|sumar|total|junt[oa]s?|ambos|los\s+dos|m[aá]s\s+el|con\s+el)\s+(el\s+)?(mes\s+)?(anterior|previo)/i.test(t) ||
      /ventas?\s+(de\s+)?(este|actual|mes)\s+(con|y|m[aá]s)\s+(el\s+)?(mes\s+)?(anterior|pasado)/i.test(t) ||
      /(suma|total).*ventas.*(mes|dos)/i.test(t) ||
      /\b(dos|ambos)\s+meses\b/i.test(t) ||
      (/suma(r)?\s+(me\s+)?(las\s+)?ventas?/i.test(t) && /(anterior|dos|ambos|mes|junto)/i.test(t));

    const wantsCompare =
      /compar|versus|vs\.?|diferencia|variaci[oó]n|evoluci[oó]n|respecto\s+al\s+mes\s+anterior/i.test(t);

    if (!wantsSum && !wantsCompare && !/(mes\s+anterior|anterior|previo)/i.test(t)) return false;

    let body =
      '**Datos ilustrativos (demo)** — Con la información disponible en este prototipo: **' +
      D.MONTH_LABEL +
      '** totaliza **' +
      moneyMx(D.totalVentas) +
      '**. **' +
      D.PREV_MONTH_LABEL +
      '** registró **' +
      moneyMx(D.totalVentasPrev) +
      '**. ';

    if (wantsSum || wantsCompare) {
      body +=
        'La **suma de ambos períodos** asciende a **' +
        moneyMx(sumBoth) +
        '**. La **variación del mes corriente frente al anterior** es **' +
        (delta >= 0 ? '+' : '') +
        moneyMx(delta) +
        '** (**' +
        pct +
        '%**).';
    } else {
      body +=
        'La **variación frente al mes anterior** es **' +
        (delta >= 0 ? '+' : '') +
        moneyMx(delta) +
        '** (**' +
        pct +
        '%**).';
    }

    body +=
      ' Cuando conecte datos reales vía API, estos cálculos reflejarán sus fuentes oficiales.';

    ctx.addMsg('bot', ctx.mdLite(body));
    ctx.speak(
      'Datos de demostración. Total del mes actual, del anterior, suma y variación porcentual.'
    );
    return true;
  }

  /**
   * @returns {boolean} true si ya respondió (no seguir cadena local/IA)
   */
  function tryHandle(text, ctx) {
    if (tryVentasAnalytics(text, ctx)) return true;
    if (tryWhereIsQuestion(text, ctx)) return true;
    return false;
  }

  window.SCORECARD_ASSISTANT_INTEL = {
    tryHandle,
    shouldDeclineAsOffTopic,
    moneyMx,
  };
})();
