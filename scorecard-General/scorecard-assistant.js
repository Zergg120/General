/**
 * Scorecard General — asistente, paleta de comandos, voz, tema, revelado al scroll
 * IA cloud opcional: solo si el usuario pega API key (prototipo; en producción usar backend).
 */
(function () {
  'use strict';

  const SECTIONS = [
    { id: 'sec-resumen', label: 'Resumen ejecutivo', keys: 'inicio hero cabecera ytd ebitda' },
    { id: 'sec-charts', label: 'Gráficas', keys: 'grafica chart ingreso margen tendencia' },
    { id: 'sec-finanzas', label: 'Finanzas y liquidez', keys: 'roic deuda caja margen bruto ccc working capital' },
    /** "ventas" no va en keys: evita que «ventas del mes» salte aquí en lugar del informe (report-agent). */
    { id: 'sec-comercial', label: 'Comercial y crecimiento', keys: 'pipeline comercial crecimiento churn cac ltv win rate ingresos comerciales' },
    { id: 'sec-ops', label: 'Operaciones', keys: 'otif logistica lead time capacidad scrap proveedor sla' },
    { id: 'sec-personas', label: 'Personas y organización', keys: 'rrhh rotacion enps vacante ausentismo' },
    { id: 'sec-clientes', label: 'Clientes y riesgo', keys: 'nps csat ciberseguridad concentracion mdm grc' },
    { id: 'sec-objetivos', label: 'Tabla de objetivos', keys: 'objetivos meta semaforo seguimiento' },
    { id: 'sec-glosario', label: 'Glosario de métricas', keys: 'definicion que es significa glosario ayuda' },
  ];

  const MSG_ALCANCE_FUERA =
    'Le informo que mi cometido se limita a **este Scorecard** (métricas del panel, navegación, informes de ventas de demostración y uso de la interfaz). **No dispongo de información ajena** a esta aplicación. Si lo desea, indíqueme una métrica, una sección o solicite un **informe de ventas** y con gusto le orientaré.';

  /** Cuando no hay IA cloud o no hay respuesta local: tono formal, pedir concreción antes que tecnicismos. */
  const MSG_FALLBACK_PEDIR_CONCRECION =
    'Con todo gusto le ayudo **dentro de este Scorecard**. Si no le he entendido bien, ¿sería tan amable de **ser un poco más específico**? Por ejemplo: *ventas de hoy*, *ventas de ayer*, *este mes*, *año anterior*, *informe de ventas en Excel*, o *¿dónde veo el ROIC?* También puede usar **Ctrl+K** para ir a una sección.<br/><br/>Opcional: en **Ajustes** (⚙) puede activar **IA cloud** con una clave de prueba para preguntas más abiertas.';

  const KNOWLEDGE = [
    {
      triggers: ['hola', 'buenos dias', 'buenas', 'hey', 'hi'],
      answer:
        'Buenos días. Soy el asistente del **Scorecard General**. Podré **orientarle** en las secciones del panel, en el **glosario de métricas** y en el **informe de ventas** (demo). Puede preguntar, por ejemplo: *«¿Qué es el ROIC?»*, *«ir a operaciones»*, *«dónde veo el EBITDA»* o abrir la paleta con **Ctrl+K**.',
    },
    {
      triggers: ['que es scorecard', 'para que sirve', 'como uso', 'ayuda general'],
      answer:
        'Un **scorecard** es un panel ejecutivo que concentra los indicadores clave (finanzas, clientes, operaciones, personas, etc.). En esta vista los datos son **de demostración**; el propósito es validar el diseño antes de conectar **ERP, BI o CRM**. Le sugiero utilizar el **buscador de KPIs** o formular preguntas concretas sobre las métricas.',
    },
    {
      triggers: ['ytd', 'ingresos netos', 'revenue ytd'],
      answer:
        '**Ingresos netos YTD** designan los ingresos acumulados del ejercicio hasta la fecha de corte (*Year-to-Date*). En la tarjeta superior figura un valor **ilustrativo** para el diseño del panel.',
    },
    {
      triggers: ['ebitda', 'e b i t d a'],
      answer:
        '**EBITDA** (*Earnings Before Interest, Taxes, Depreciation and Amortization*) aproxima el resultado operativo antes de intereses, impuestos y amortizaciones. Resulta útil para comparar rentabilidad operativa; **no sustituye** al flujo de efectivo.',
    },
    {
      triggers: ['ccc', 'ciclo de efectivo', 'cash conversion'],
      answer:
        '**CCC (*Cash Conversion Cycle*)** indica cuántos días transcurren hasta convertir inversión en inventario y cuentas por cobrar en efectivo, neteando a proveedores. Por regla general, **menos días** implica liberar caja antes.',
    },
    {
      triggers: ['nps', 'net promoter'],
      answer:
        '**NPS** mide la probabilidad de recomendar la empresa (escala 0–10). Se calculan promotores (9–10) menos detractores (0–6), en rango -100 a +100. Suele cruzarse con ingresos y *churn*.',
    },
    {
      triggers: ['roic', 'return on invested capital'],
      answer:
        '**ROIC** (*return on invested capital*) refleja qué retorno operativo después de impuestos obtiene la empresa sobre el capital invertido. Si ROIC supera el **WACC** (costo del capital), en términos generales se asocia a creación de valor.',
    },
    {
      triggers: ['margen bruto', 'gm', 'gross margin'],
      answer:
        '**Margen bruto %** = (Ventas − costo de ventas) / Ventas. Mide la rentabilidad directa del bien o servicio antes de gastos operativos (SG&A).',
    },
    {
      triggers: ['deuda', 'leverage', 'ebitda deuda'],
      answer:
        '**Deuda neta / EBITDA** es un múltiplo de apalancamiento (años aproximados de EBITDA para cubrir deuda neta). Los umbrales dependen del sector; conviene observar tendencia y **covenants** bancarios.',
    },
    {
      triggers: ['cac', 'payback'],
      answer:
        '**CAC** es el costo de adquirir un cliente; **payback** son los meses para recuperar el CAC con el margen del cliente. **LTV/CAC** contrasta valor de vida frente a costo de adquisición; ratios inferiores a 1 suelen ser insostenibles.',
    },
    {
      triggers: ['churn', 'retencion'],
      answer:
        '**Churn** mide la pérdida de clientes o de ingresos recurrentes. Reducir *churn* suele ser más eficiente que adquirir nuevos clientes; se relaciona con NPS y CSAT.',
    },
    {
      triggers: ['otif', 'on time in full'],
      answer:
        '**OTIF** (*on time in full*) mide entregas a tiempo y completas; es un indicador habitual en cadena de suministro y cumplimiento al cliente.',
    },
    {
      triggers: ['enps', 'empleados'],
      answer:
        '**eNPS** aplica la lógica del NPS al personal: probabilidad de recomendar la empresa como lugar de trabajo. Complementa indicadores de rotación y absentismo.',
    },
    {
      triggers: ['csat', 'satisfaccion cliente'],
      answer:
        '**CSAT** mide la satisfacción en una interacción o ticket (p. ej. escala 1–5). Es más granular que el NPS y suele emplearse en operaciones y soporte.',
    },
    {
      triggers: ['comando', 'atajo', 'teclado', 'ctrl'],
      answer:
        'Atajos útiles: **Ctrl+K** o **/** — paleta de comandos para saltar a una sección. **Tema** — conmutador claro/oscuro. **Presentación** — tipografía ampliada y ocultación del distintivo *demo*. **Módulos** — visibilidad de bloques (preferencia en el navegador). **Imprimir** — salida a impresora o PDF del sistema. **Asistente** — acceso flotante; el micrófono funciona de forma óptima en **Chrome**.',
    },
    {
      triggers: ['informe ventas', 'ventas del mes', 'reporte ventas', 'exportar ventas'],
      answer:
        'Puede solicitar, por ejemplo, **«dame las ventas del mes»** o **«descargue el Excel»**: se desplegará un informe con **resumen ejecutivo**, rankings y detalle. **Descargar Excel** genera un libro con **varias hojas** (portada, KPI, detalle, rankings). **PDF** e **imagen** reproducen la vista; **Imprimir** emplea el cuadro de su sistema (incluido *Guardar como PDF*). También puede usar **Ctrl+K** → *Ventas del mes (demo)*.',
    },
    {
      triggers: ['modulos', 'módulos', 'ocultar seccion', 'mostrar seccion'],
      answer:
        'El botón **Módulos** en la barra superior permite activar o desactivar bloques (resumen, gráficas, finanzas, etc.). La preferencia queda almacenada en **localStorage** de este navegador. **Esc** cierra el cuadro de diálogo.',
    },
    {
      triggers: ['voz', 'microfono', 'hablar', 'escuchar'],
      answer:
        'Active el **micrófono** en el asistente (el navegador solicitará permiso). El perfil **Dani** selecciona la voz en español más natural disponible en su equipo; la **muestra en MP3** no puede replicarse al cien por cien sin un servicio **TTS en la nube**. **Probar voz** reproduce únicamente la muestra cargada; las respuestas del asistente utilizan la síntesis del sistema.',
    },
    {
      triggers: ['api', 'openai', 'chatgpt', 'ia cloud', 'clave'],
      answer:
        'En **Ajustes** puede ingresar una clave API compatible con OpenAI **únicamente para pruebas**. En entornos de producción **no** debe exponer la clave en el navegador: utilice un **proxy en servidor**. La clave permanece en *sessionStorage* hasta cerrar la pestaña.',
    },
  ];

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function scoreMatch(q, text) {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    const t = norm(text);
    let s = 0;
    words.forEach((w) => {
      if (w.length >= 2 && t.includes(w)) s += w.length;
    });
    return s;
  }

  /** Respald si el script del informe falla al cargar: misma intención que report-agent. */
  function isSalesReportMessage(text) {
    const t = String(text || '').toLowerCase();
    if (t.length < 8) return false;
    if (!/ventas?|vendedor|clientes?|informe|reporte|resumen/i.test(t)) return false;
    if (/(informe|reporte|resumen)\s*(de\s*)?ventas?/i.test(text)) return true;
    if (/dame\s+(las\s+)?ventas?(\s+del\s+mes)?/i.test(text)) return true;
    if (/quiero\s+(ver\s+)?(las\s+)?ventas?/i.test(text)) return true;
    if (/ventas?\s+del\s+mes|del\s+mes.*ventas?/i.test(text)) return true;
    if (/top\s+(vendedor|cliente|vendedores|clientes)/i.test(text)) return true;
    return false;
  }

  /** Evita que «como» dispare el trigger «como uso» en frases ajenas («cómo hacer pasta»). */
  const WEAK_MATCH_WORDS = new Set([
    'como',
    'cómo',
    'una',
    'que',
    'qué',
    'con',
    'del',
    'los',
    'las',
    'por',
    'para',
    'pero',
    'este',
    'esta',
    'esto',
    'hay',
    'son',
    'mas',
    'más',
    'bien',
    'mal',
    'dias',
    'días',
    'dia',
    'día',
    'solo',
    'todo',
    'muy',
  ]);

  function scoreMatchStrong(q, text) {
    const words = norm(q)
      .split(/\s+/)
      .filter(Boolean)
      .filter((w) => w.length >= 2 && !WEAK_MATCH_WORDS.has(w));
    if (!words.length) return 0;
    const t = norm(text);
    let s = 0;
    words.forEach((w) => {
      if (t.includes(w)) s += w.length;
    });
    return s;
  }

  function findLocalAnswer(q) {
    const nq = norm(q);
    let best = null;
    let bestScore = 0;
    KNOWLEDGE.forEach((k) => {
      k.triggers.forEach((tr) => {
        const sc = scoreMatchStrong(nq, tr) + (nq.includes(norm(tr)) ? 20 : 0);
        if (sc > bestScore) {
          bestScore = sc;
          best = k.answer;
        }
      });
    });
    if (bestScore >= 10) return best;
    for (const k of KNOWLEDGE) {
      for (const tr of k.triggers) {
        if (nq.includes(norm(tr)) || norm(tr).includes(nq)) return k.answer;
      }
    }
    return null;
  }

  function findSectionCommand(q) {
    const nq = norm(q);
    let best = null;
    let bestScore = 0;
    SECTIONS.forEach((s) => {
      const slug = norm(s.id.replace('sec-', ''));
      const hay = s.label + ' ' + s.keys + ' ' + slug;
      let sc = scoreMatch(nq, hay);
      if (nq.includes(slug)) sc += 35;
      if (sc > bestScore) {
        bestScore = sc;
        best = s;
      }
    });
    if (bestScore >= 5) return best;
    return null;
  }

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('highlight-section');
      setTimeout(() => el.classList.remove('highlight-section'), 1600);
    }
  }

  /** Markdown mínimo para el chat: negritas y cursivas; el TTS usa stripMarkdownForSpeech (sin leer asteriscos). */
  function mdLite(s) {
    let t = String(s);
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return t;
  }

  /** Texto plano para síntesis de voz: sin HTML ni marcadores *, **, ` */
  function stripMarkdownForSpeech(s) {
    return String(s)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ---------- UI: mensajes ---------- */
  const messagesEl = () => document.getElementById('asst-messages');
  function addMsg(role, html) {
    const box = messagesEl();
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'asst-msg asst-msg--' + role;
    div.innerHTML = html;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  /* ---------- Voz ---------- */
  let recognition = null;
  function getRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    if (!recognition) {
      recognition = new SR();
      recognition.lang = 'es-MX';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
    }
    return recognition;
  }

  const TTS_VOICE_URI_KEY = 'scorecard_tts_voice_uri';
  /** Voz web (muestra MP3) + lectura TTS — más cercana a “humana” que solo síntesis del sistema */
  const DANI_VOICE_URI = '__dani_web_sample__';
  const DANI_MP3 = 'audio/Voice-Agent IA.mp3';

  /** Prioriza voces en español que suelen ser femeninas y suenan menos “robóticas”. */
  const FEMALE_VOICE_HINT = /sabina|dalia|helena|mar[ií]a|paulina|m[oó]nica|karla|paloma|luciana|sof[ií]a|ines|elena|teresa|laura|natalia|valentina|isabel|cecilia|beatriz|female|femenina|woman|girl|mujer|española|espanola|latina/i;
  const MALE_VOICE_HINT = /\b(male|masculin|hombre|masculino)\b|diego|jorge|pablo|david|carlos|[aá]lvaro|ricardo|\bjuan\b|javier|antonio|gonzalo|manuel|andr[eé]s|roberto|fernando|miguel|ra[uú]l|pedro|luis\b|joaqu[ií]n/i;
  const NEURAL_HINT = /neural|natural|premium|enhanced|wavenet|online|multilingual|polyglot|journey|expressive|studio|sonnet|nova|aurora|generative|hd\b|high quality|polly|azure/i;
  /** Voces antiguas / “desktop” suelen sonar más metálicas */
  const ROBOTIC_HINT = /\bstandard\b|\bcompact\b|legacy|basic\s*tts|\bsapi\b|tts\s*basic/i;
  const HUMAN_BOOST = /natural|neural|premium|online|wavenet|enhanced|google|edge|apple|samantha|siri|polly|azure|cortana/i;

  function scoreSpanishVoice(v) {
    const lang = String(v.lang || '').toLowerCase();
    if (!lang.startsWith('es')) return -1e9;
    let s = 0;
    if (lang.includes('mx') || lang.includes('419') || lang.includes('latam')) s += 35;
    else if (lang.startsWith('es')) s += 22;
    if (v.localService) s += 8;
    const n = `${v.name} ${lang}`;
    if (FEMALE_VOICE_HINT.test(n)) s += 55;
    if (MALE_VOICE_HINT.test(n)) s -= 45;
    if (NEURAL_HINT.test(n)) s += 32;
    return s;
  }

  /** Prioriza voces que suenan menos robóticas (neural/natural; penaliza “standard/desktop” viejos). */
  function scoreVoiceHumanity(v) {
    let s = scoreSpanishVoice(v);
    const n = `${v.name} ${v.lang}`;
    if (HUMAN_BOOST.test(n)) s += 45;
    if (ROBOTIC_HINT.test(n)) s -= 65;
    if (/microsoft/i.test(n) && /natural|neural|online/i.test(n)) s += 55;
    if (/microsoft/i.test(n) && !/natural|neural|online|premium/i.test(n)) s -= 28;
    if (/google/i.test(n) && NEURAL_HINT.test(n)) s += 35;
    if (v.localService === false) s += 12;
    return s;
  }

  function pickBestFemaleSpanishVoice(voices) {
    const es = (voices || []).filter((v) => String(v.lang || '').toLowerCase().startsWith('es'));
    if (!es.length) return null;
    let best = es[0];
    let bestScore = scoreVoiceHumanity(best);
    for (let i = 1; i < es.length; i++) {
      const sc = scoreVoiceHumanity(es[i]);
      if (sc > bestScore) {
        best = es[i];
        bestScore = sc;
      }
    }
    return best;
  }

  /**
   * Modo Dani: prioriza máxima “naturalidad” (neural/premium). El MP3 no se clona sin API en la nube.
   */
  function pickVoiceForDaniProfile(voices) {
    const list = voices || [];
    const es = list.filter((v) => String(v.lang || '').toLowerCase().startsWith('es'));
    if (!es.length) return pickBestFemaleSpanishVoice(list);
    let best = es[0];
    let bestScore = -1e9;
    es.forEach((v) => {
      const n = `${v.name} ${v.lang}`;
      let s = scoreVoiceHumanity(v);
      if (NEURAL_HINT.test(n)) s += 48;
      if (FEMALE_VOICE_HINT.test(n)) s += 18;
      if (MALE_VOICE_HINT.test(n)) s -= 35;
      if (s > bestScore) {
        bestScore = s;
        best = v;
      }
    });
    return best;
  }

  function resolveVoiceForSpeech() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    let uri = null;
    try {
      uri = localStorage.getItem(TTS_VOICE_URI_KEY);
    } catch (_) {}
    if (uri === DANI_VOICE_URI) {
      return pickVoiceForDaniProfile(voices);
    }
    if (uri) {
      const chosen = voices.find((x) => x.voiceURI === uri);
      if (chosen) return chosen;
    }
    return pickBestFemaleSpanishVoice(voices);
  }

  function populateVoiceSelect() {
    const sel = document.getElementById('asst-voice-select');
    if (!sel || !window.speechSynthesis) return;
    const voices = window.speechSynthesis
      .getVoices()
      .filter((v) => String(v.lang || '').toLowerCase().startsWith('es'));
    voices.sort((a, b) => {
      const d = scoreVoiceHumanity(b) - scoreVoiceHumanity(a);
      if (d !== 0) return d;
      return `${a.lang} ${a.name}`.localeCompare(`${b.lang} ${b.name}`, 'es');
    });
    let saved = null;
    try {
      saved = localStorage.getItem(TTS_VOICE_URI_KEY);
    } catch (_) {}
    sel.replaceChildren();
    const auto = document.createElement('option');
    auto.value = '';
    auto.textContent = 'Automática (solo sistema, sin muestra)';
    sel.appendChild(auto);
    const daniOpt = document.createElement('option');
    daniOpt.value = DANI_VOICE_URI;
    daniOpt.textContent = 'Dani · lectura dinámica (acento aprox. vía sistema; la muestra MP3 no se puede clonar)';
    sel.appendChild(daniOpt);
    voices.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      sel.appendChild(opt);
    });
    if (saved === null) {
      sel.value = DANI_VOICE_URI;
      try {
        localStorage.setItem(TTS_VOICE_URI_KEY, DANI_VOICE_URI);
      } catch (_) {}
    } else if (saved === DANI_VOICE_URI) {
      sel.value = DANI_VOICE_URI;
    } else if (saved === '') {
      sel.value = '';
    } else if (voices.some((v) => v.voiceURI === saved)) {
      sel.value = saved;
    } else {
      sel.value = DANI_VOICE_URI;
    }
  }

  function bindVoiceSelectEvents() {
    const sel = document.getElementById('asst-voice-select');
    const test = document.getElementById('asst-voice-test');
    sel?.addEventListener('change', () => {
      try {
        const v = sel.value;
        if (v === '') localStorage.setItem(TTS_VOICE_URI_KEY, '');
        else localStorage.setItem(TTS_VOICE_URI_KEY, v);
      } catch (_) {}
    });
    test?.addEventListener('click', () => {
      let uri = null;
      try {
        uri = localStorage.getItem(TTS_VOICE_URI_KEY);
      } catch (_) {}
      if (uri === DANI_VOICE_URI || uri === null) {
        playDaniVoiceSampleDemo();
      } else {
        speak(
          'Hola. Soy la asistente del scorecard. Así suena la voz que elegiste: un poco más pausada y clara para que sea fácil de escuchar en reunión.'
        );
      }
    });
  }

  function initSpeechVoices() {
    if (!window.speechSynthesis) return;
    const run = () => populateVoiceSelect();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', run);
    } else {
      window.speechSynthesis.onvoiceschanged = run;
    }
    run();
    setTimeout(run, 250);
    setTimeout(run, 900);
  }

  let speakEnabled = true;
  let assistantVoiceSample = null;

  function doSpeechSynthesis(plain) {
    if (!window.speechSynthesis) return;
    let uri = null;
    try {
      uri = localStorage.getItem(TTS_VOICE_URI_KEY);
    } catch (_) {}
    const dani = uri === DANI_VOICE_URI;

    const u = new SpeechSynthesisUtterance(plain);
    const voice = resolveVoiceForSpeech();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang || 'es-MX';
    } else {
      u.lang = 'es-MX';
    }
    const nm = `${voice?.name || ''} ${voice?.lang || ''}`;
    const seemsMale = MALE_VOICE_HINT.test(nm);

    const nmLower = nm.toLowerCase();
    const likelyNeural = NEURAL_HINT.test(nmLower) || HUMAN_BOOST.test(nmLower);
    /** Volumen fijo 30% (independiente de la música de fondo ~10%) */
    var TTS_VOL = 0.3;
    if (dani) {
      u.rate = seemsMale ? 0.94 : 0.93;
      u.pitch = seemsMale ? 0.99 : 1.04;
      u.volume = TTS_VOL;
    } else {
      u.rate = likelyNeural ? 0.9 : 0.87;
      u.pitch = seemsMale ? 0.98 : 1.03;
      u.volume = TTS_VOL;
    }
    window.speechSynthesis.speak(u);
  }

  /** Solo la muestra MP3 (referencia de acento). Las respuestas del asistente usan síntesis del sistema. */
  function playDaniVoiceSampleDemo() {
    window.speechSynthesis.cancel();
    if (assistantVoiceSample) {
      try {
        assistantVoiceSample.pause();
      } catch (_) {}
      assistantVoiceSample = null;
    }
    const a = new Audio(DANI_MP3);
    assistantVoiceSample = a;
    a.volume = 0.3;
    a.play().catch(() => {});
    a.addEventListener(
      'ended',
      () => {
        assistantVoiceSample = null;
      },
      { once: true }
    );
  }

  function speak(text) {
    if (!speakEnabled) return;
    const plain = stripMarkdownForSpeech(text);
    window.speechSynthesis.cancel();
    doSpeechSynthesis(plain);
  }

  /* ---------- OpenAI opcional ---------- */
  async function tryOpenAI(userText) {
    const key = sessionStorage.getItem('scorecard_openai_key');
    const base = sessionStorage.getItem('scorecard_openai_base') || 'https://api.openai.com/v1/chat/completions';
    const model = sessionStorage.getItem('scorecard_openai_model') || 'gpt-4o-mini';
    if (!key || key.length < 12) return null;
    const sys =
      'Usted es el asistente formal del panel ejecutivo Scorecard General. Responda siempre en español (México), tratando al usuario de "usted", con tono profesional y conciso. ' +
      'Solo puede orientar sobre: KPIs y secciones de este tablero, informes de ventas del prototipo (demo), exportación Excel/PDF, navegación y lectura ejecutiva. ' +
      'Los números mostrados son ilustrativos salvo que el usuario indique fuentes reales conectadas. No invente cifras de empresas reales. ' +
      'Si la pregunta no guarda relación con el scorecard (clima, ocio, política, tareas ajenas al panel, etc.), decline cortésmente e indique que solo puede ayudar con este sitio web.';
    const r = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userText },
        ],
        max_tokens: 500,
        temperature: 0.4,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error?.message || r.statusText);
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  function tryAnswerDemoVentasPeriod(text) {
    const D = window.SCORECARD_REPORT_DATA;
    if (!D || typeof D.detectReportPeriodPreset !== 'function' || typeof D.demoVentasForPreset !== 'function') {
      return false;
    }
    const preset = D.detectReportPeriodPreset(text);
    if (!preset || !preset.kind) return false;
    const t = String(text);
    const looksSales =
      /\b(ventas?|vendimos|vendieron|vendi[oó]|factur|cu[aá]nto|importe|total|cifra|movimientos)\b/i.test(t) ||
      /\b(hoy|ayer|antier|anteayer|semana|mes|a[nñ]o|trimestre|fecha|d[ií]a)\b/i.test(t);
    if (!looksSales) return false;
    const amount = D.demoVentasForPreset(preset.kind, new Date(), preset.iso);
    if (!Number.isFinite(amount)) return false;
    const fmt = amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    addMsg(
      'bot',
      mdLite(
        '**Datos ilustrativos (demo)** — Para el periodo solicitado, el total de ventas es **' +
          fmt +
          '**. Las cifras dependen del periodo (día, semana, mes, año). Puede pedir también el **informe** con Excel o PDF desde el panel.'
      )
    );
    speak('Total de ventas en demostración para el periodo solicitado.');
    if (typeof window.scrOpenReportPanel === 'function') {
      window.scrOpenReportPanel({ reportPreset: preset, twoMonth: false });
    }
    return true;
  }

  async function handleUserMessage(raw) {
    const text = String(raw || '').trim();
    if (!text) return;

    addMsg('user', escapeHtml(text));

    if (typeof window.scrHandleReportIntent === 'function') {
      const handled = window.scrHandleReportIntent(text, { addMsg, speak, mdLite });
      if (handled) return;
    } else if (typeof window.scrOpenReportQuick === 'function' && isSalesReportMessage(text)) {
      window.scrOpenReportQuick({ addMsg, mdLite }, text);
      if (typeof window.scrTryAutoExportFromText === 'function') window.scrTryAutoExportFromText(text);
      speak(
        'Informe de ventas preparado. Puede descargar el libro Excel, PDF, imagen o imprimir desde el panel.'
      );
      return;
    }

    if (
      window.SCORECARD_ASSISTANT_INTEL &&
      typeof window.SCORECARD_ASSISTANT_INTEL.shouldDeclineAsOffTopic === 'function' &&
      window.SCORECARD_ASSISTANT_INTEL.shouldDeclineAsOffTopic(text)
    ) {
      addMsg('bot', mdLite(MSG_ALCANCE_FUERA));
      speak(
        'Le informo que solo puedo ayudarle con este Scorecard: métricas, navegación e informes de demostración.'
      );
      return;
    }

    const ctxIntel = { addMsg, speak, mdLite, scrollToId, escapeHtml };
    if (
      window.SCORECARD_ASSISTANT_INTEL &&
      typeof window.SCORECARD_ASSISTANT_INTEL.tryHandle === 'function' &&
      window.SCORECARD_ASSISTANT_INTEL.tryHandle(text, ctxIntel)
    ) {
      return;
    }

    const sec = findSectionCommand(text);
    if (sec && sec.id) {
      scrollToId(sec.id);
      const rep =
        'Con gusto le indico: he desplazado la vista a la sección **' +
        sec.label +
        '**. Allí podrá localizar la información relacionada.';
      addMsg('bot', mdLite(rep));
      speak(
        'He desplazado la vista a la sección ' + sec.label + '. Allí podrá consultar la información.'
      );
      return;
    }

    const local = findLocalAnswer(text);
    if (local) {
      addMsg('bot', mdLite(local));
      speak(local);
      return;
    }

    /**
     * Red de seguridad: si la capa intel no respondió pero el texto encaja en un periodo de ventas demo
     * (p. ej. caché viejo o orden de carga), devolver total desde SCORECARD_REPORT_DATA.
     */
    if (tryAnswerDemoVentasPeriod(text)) return;

    const loading = document.createElement('div');
    loading.className = 'asst-msg asst-msg--bot asst-loading';
    loading.textContent = 'Consultando servicio de inteligencia en la nube…';
    messagesEl().appendChild(loading);
    messagesEl().scrollTop = messagesEl().scrollHeight;
    try {
      const ai = await tryOpenAI(text);
      loading.remove();
      if (ai) {
        const safe = escapeHtml(ai).replace(/\n/g, '<br/>');
        addMsg('bot', safe);
        speak(ai);
      } else {
        addMsg('bot', mdLite(MSG_FALLBACK_PEDIR_CONCRECION));
        speak(
          'Si no le he entendido bien, sea un poco más específico con su pregunta, por ejemplo ventas de hoy o informe del mes. También puede usar Ctrl+K. Opcionalmente active IA cloud en ajustes.'
        );
      }
    } catch (e) {
      loading.remove();
      addMsg('bot', 'Se produjo un error al consultar el servicio: ' + escapeHtml(e.message));
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- Command palette ---------- */
  function openPalette() {
    const o = document.getElementById('cmd-palette');
    const input = document.getElementById('cmd-input');
    if (!o || !input) return;
    o.hidden = false;
    input.value = '';
    input.focus();
    renderPalette('');
  }

  function closePalette() {
    const o = document.getElementById('cmd-palette');
    if (o) o.hidden = true;
  }

  function renderPalette(filter) {
    const list = document.getElementById('cmd-list');
    if (!list) return;
    const f = norm(filter);
    const items = [];
    if (typeof window.scrOpenReportQuick === 'function') {
      items.push({
        type: 'Informe',
        label: 'Ventas del mes (demo)',
        action: () => {
          window.scrOpenReportQuick({ addMsg, mdLite });
          document.getElementById('asst-drawer')?.classList.add('open');
        },
      });
    }
    SECTIONS.forEach((s) => {
      items.push({ type: 'Ir a', label: s.label, action: () => scrollToId(s.id) });
    });
    KNOWLEDGE.slice(0, 10).forEach((k) => {
      items.push({ type: 'Ayuda', label: k.triggers[0], action: () => handleUserMessage(k.triggers[0]) });
    });
    let show = items.map((it) => ({
      it,
      sc: f ? scoreMatch(f, it.label + ' ' + it.type + ' ' + it.label) : 1,
    }));
    if (f) {
      show = show.filter((x) => x.sc > 0 || norm(x.it.label).includes(f));
      show.sort((a, b) => b.sc - a.sc);
    }
    const finalList = show.slice(0, 14).map((x) => x.it);

    list.innerHTML = '';
    finalList.forEach((it) => {
      const li = document.createElement('li');
      li.innerHTML = '<span class="cmd-type">' + escapeHtml(it.type) + '</span><span>' + escapeHtml(it.label) + '</span>';
      li.addEventListener('click', () => {
        it.action();
        closePalette();
        if (it.type === 'Ayuda') document.getElementById('asst-drawer')?.classList.add('open');
      });
      list.appendChild(li);
    });
  }

  /* ---------- KPI filter ---------- */
  function initKpiFilter() {
    const input = document.getElementById('kpi-search');
    if (!input) return;
    document.querySelectorAll('.kpi-card, .hero-card').forEach((card) => {
      const t = card.textContent || '';
      card.dataset.search = norm(t);
    });
    input.addEventListener('input', () => {
      const q = norm(input.value);
      document.querySelectorAll('.kpi-card, .hero-card').forEach((card) => {
        if (!q) {
          card.style.opacity = '';
          card.style.display = '';
          return;
        }
        const ok = !q || (card.dataset.search && card.dataset.search.includes(q));
        card.style.opacity = ok ? '1' : '0.22';
        card.style.display = ok || q.length < 2 ? '' : 'none';
      });
    });
  }

  /* ---------- Theme ---------- */
  function initTheme() {
    const btn = document.getElementById('btn-theme');
    let saved = null;
    try {
      saved = localStorage.getItem('scorecard_theme');
    } catch (_) {}
    if (saved === 'light') document.body.classList.add('light');
    btn?.addEventListener('click', () => {
      document.body.classList.toggle('light');
      try {
        localStorage.setItem('scorecard_theme', document.body.classList.contains('light') ? 'light' : 'dark');
      } catch (_) {}
      document.dispatchEvent(new CustomEvent('scorecard:themechange'));
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('reveal-in');
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Assistant drawer ---------- */
  function initAssistant() {
    const fab = document.getElementById('asst-fab');
    const drawer = document.getElementById('asst-drawer');
    const close = document.getElementById('asst-close');
    const send = document.getElementById('asst-send');
    const input = document.getElementById('asst-input');
    const mic = document.getElementById('asst-mic');
    const tts = document.getElementById('asst-tts');
    const gear = document.getElementById('asst-gear');
    const settings = document.getElementById('asst-settings');

    function closeAssistantDrawer() {
      drawer?.classList.remove('open');
      settings?.classList.remove('open');
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (assistantVoiceSample) {
        try {
          assistantVoiceSample.pause();
        } catch (_) {}
        assistantVoiceSample = null;
      }
      try {
        if (recognition) recognition.stop();
      } catch (_) {}
      mic?.classList.remove('listening');
    }

    fab?.addEventListener('click', () => drawer?.classList.toggle('open'));
    close?.addEventListener('click', closeAssistantDrawer);
    send?.addEventListener('click', () => {
      handleUserMessage(input.value);
      input.value = '';
    });
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send?.click();
      }
    });

    tts?.addEventListener('click', () => {
      speakEnabled = !speakEnabled;
      tts.classList.toggle('off', !speakEnabled);
      tts.title = speakEnabled ? 'Lectura en voz: encendida' : 'Lectura en voz: apagada';
    });

    gear?.addEventListener('click', () => {
      settings?.classList.toggle('open');
      if (settings?.classList.contains('open')) {
        const k = sessionStorage.getItem('scorecard_openai_key');
        const b = sessionStorage.getItem('scorecard_openai_base');
        const m = sessionStorage.getItem('scorecard_openai_model');
        const ik = document.getElementById('asst-api-key');
        const ib = document.getElementById('asst-api-base');
        const im = document.getElementById('asst-api-model');
        if (ik && k) ik.value = k;
        if (ib && b) ib.value = b;
        if (im && m) im.value = m;
        populateVoiceSelect();
      }
    });
    document.getElementById('asst-save-key')?.addEventListener('click', () => {
      const k = document.getElementById('asst-api-key')?.value?.trim();
      const b = document.getElementById('asst-api-base')?.value?.trim();
      const m = document.getElementById('asst-api-model')?.value?.trim();
      if (k) sessionStorage.setItem('scorecard_openai_key', k);
      else sessionStorage.removeItem('scorecard_openai_key');
      if (b) sessionStorage.setItem('scorecard_openai_base', b);
      if (m) sessionStorage.setItem('scorecard_openai_model', m);
      settings?.classList.remove('open');
      addMsg('bot', k ? 'API key guardada en esta sesión. **No uses esto en producción sin backend.**' : 'Clave eliminada de la sesión.');
    });

    const rec = getRecognition();
    if (rec && mic) {
      mic.addEventListener('click', () => {
        try {
          rec.onresult = (ev) => {
            const t = ev.results[0][0].transcript;
            input.value = t;
            handleUserMessage(t);
            input.value = '';
            mic.classList.remove('listening');
          };
          rec.onerror = () => mic.classList.remove('listening');
          rec.onend = () => mic.classList.remove('listening');
          mic.classList.add('listening');
          rec.start();
        } catch {
          mic.classList.remove('listening');
          addMsg('bot', 'No se pudo iniciar el micrófono. Prueba Chrome y permisos del sitio.');
        }
      });
    } else {
      mic?.setAttribute('disabled', 'disabled');
      mic && (mic.title = 'Voz no disponible en este navegador');
    }

    initSpeechVoices();
    bindVoiceSelectEvents();

    addMsg(
      'bot',
      mdLite(
        '**Asistente a su servicio.** Puede consultar métricas (*¿Qué es el EBITDA?*), solicitar *«ir a comercial»*, pedir *«dame las ventas del mes»* para el **informe de demostración** (Excel, PDF, imagen), preguntar *«dónde veo el ROIC»* o comparar ventas entre meses; también dispone de **Ctrl+K** y del **micrófono** (se recomienda Chrome).'
      )
    );

    // Escape behavior:
    // 1) si ajustes están abiertos, los cierra;
    // 2) si el panel del asistente está abierto, lo cierra.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const reportPanel = document.getElementById('scorecard-report-panel');
      if (reportPanel && !reportPanel.hidden) {
        if (typeof window.__scorecardCloseReportPanel === 'function') {
          window.__scorecardCloseReportPanel();
        } else {
          reportPanel.hidden = true;
        }
        try {
          document.documentElement.classList.remove('scorecard-print-report');
        } catch (_) {}
        return;
      }
      if (settings?.classList.contains('open')) {
        settings.classList.remove('open');
        return;
      }
      if (drawer?.classList.contains('open')) {
        closeAssistantDrawer();
        return;
      }
    });
  }

  function initPalette() {
    document.getElementById('cmd-input')?.addEventListener('input', (e) => renderPalette(e.target.value));
    document.getElementById('cmd-palette')?.addEventListener('click', (e) => {
      if (e.target.id === 'cmd-palette') closePalette();
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        openPalette();
      }
      if (e.key === 'Escape') closePalette();
    });
    document.getElementById('btn-cmd')?.addEventListener('click', openPalette);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPalette();
    initAssistant();
    initReveal();
    initTheme();
    initKpiFilter();
  });
})();
