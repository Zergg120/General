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
    { id: 'sec-comercial', label: 'Comercial y crecimiento', keys: 'pipeline ventas churn cac ltv win rate' },
    { id: 'sec-ops', label: 'Operaciones', keys: 'otif logistica lead time capacidad scrap proveedor sla' },
    { id: 'sec-personas', label: 'Personas y organización', keys: 'rrhh rotacion enps vacante ausentismo' },
    { id: 'sec-clientes', label: 'Clientes y riesgo', keys: 'nps csat ciberseguridad concentracion mdm grc' },
    { id: 'sec-objetivos', label: 'Tabla de objetivos', keys: 'objetivos meta semaforo seguimiento' },
    { id: 'sec-glosario', label: 'Glosario de métricas', keys: 'definicion que es significa glosario ayuda' },
  ];

  const KNOWLEDGE = [
    {
      triggers: ['hola', 'buenos dias', 'buenas', 'hey', 'hi'],
      answer:
        '¡Hola! Soy el asistente del **Scorecard General**. Puedo llevarte a cualquier sección, explicar métricas del glosario o responder por voz. Prueba: *«¿Qué es el ROIC?»*, *«ir a operaciones»*, o abre la paleta con **Ctrl+K**.',
    },
    {
      triggers: ['que es scorecard', 'para que sirve', 'como uso', 'ayuda general'],
      answer:
        'Un **scorecard** es un panel ejecutivo que resume en una sola vista los indicadores clave (finanzas, clientes, operaciones, personas…). Aquí los datos son **de ejemplo**: sirve como prototipo para luego conectar tus fuentes reales (ERP, BI, CRM). Usa el buscador de KPIs arriba o pregúntame por una métrica.',
    },
    {
      triggers: ['ytd', 'ingresos netos', 'revenue ytd'],
      answer:
        '**Ingresos netos YTD** = ingresos acumulados del año fiscal hasta la fecha de corte (Year-to-Date). En la tarjeta superior es un número **dummy** para diseño.',
    },
    {
      triggers: ['ebitda', 'e b i t d a'],
      answer:
        '**EBITDA** (Earnings Before Interest, Taxes, Depreciation and Amortization) aproxima el resultado operativo antes de intereses, impuestos y amortizaciones. Es útil para comparar rentabilidad operativa entre empresas; no sustituye al flujo de caja.',
    },
    {
      triggers: ['ccc', 'ciclo de efectivo', 'cash conversion'],
      answer:
        '**CCC (Cash Conversion Cycle)** mide cuántos días tarda la empresa en convertir inversión en inventario y cuentas por cobrar en efectivo, neteando proveedores. **Menos días** suele ser mejor (liberas caja antes).',
    },
    {
      triggers: ['nps', 'net promoter'],
      answer:
        '**NPS** pregunta qué tan probable es recomendar la empresa (0–10). Promotores (9–10) menos detractores (0–6), en escala -100 a +100. Es proxy de lealtad; conviene cruzarlo con ingresos y churn.',
    },
    {
      triggers: ['roic', 'return on invested capital'],
      answer:
        '**ROIC** = retorno sobre capital invertido: qué tan bien la empresa usa el capital (deuda + equity) para generar beneficio operativo después de impuestos. Si ROIC > **WACC** (costo del capital), suele crearse valor.',
    },
    {
      triggers: ['margen bruto', 'gm', 'gross margin'],
      answer:
        '**Margen bruto %** = (Ventas − Costo de ventas) / Ventas. Mide la rentabilidad directa del producto/servicio antes de gastos operativos (SG&A).',
    },
    {
      triggers: ['deuda', 'leverage', 'ebitda deuda'],
      answer:
        '**Deuda neta / EBITDA** es un múltiplo de apalancamiento: años de EBITDA aproximados para pagar deuda neta. Umbrales dependen del sector; lo importante es tendencia y covenant bancario.',
    },
    {
      triggers: ['cac', 'payback'],
      answer:
        '**CAC** = costo de adquirir un cliente. **Payback** = meses para recuperar el CAC con margen del cliente. **LTV/CAC** compara valor de vida del cliente vs costo de adquisición; ratios &lt;1 suelen ser insostenibles.',
    },
    {
      triggers: ['churn', 'retencion'],
      answer:
        '**Churn** (pérdida de clientes o ingresos recurrentes) mide fuga. Bajar churn suele ser más barato que adquirir nuevos clientes; se cruza con NPS y CSAT.',
    },
    {
      triggers: ['otif', 'on time in full'],
      answer:
        '**OTIF** = entregas a tiempo y completas. Es KPI clásico de cadena de suministro y cumplimiento a cliente.',
    },
    {
      triggers: ['enps', 'empleados'],
      answer:
        '**eNPS** adapta la lógica del NPS a empleados: probabilidad de recomendar la empresa como lugar de trabajo. Complementa rotación y absentismo.',
    },
    {
      triggers: ['csat', 'satisfaccion cliente'],
      answer:
        '**CSAT** mide satisfacción en una interacción o ticket (ej. escala 1–5). Es más granular que NPS; sirve para operaciones y soporte.',
    },
    {
      triggers: ['comando', 'atajo', 'teclado', 'ctrl'],
      answer:
        'Atajos: **Ctrl+K** o **/** — paleta de comandos (saltar a sección). **Tema** — botón sol/luna. **Presentación** — tipografía grande y oculta badge demo. **Módulos** — botón para mostrar/ocultar bloques del tablero (se guarda en el navegador). **Imprimir** — PDF. **Asistente** — botón flotante o micrófono (Chrome recomendado para voz).',
    },
    {
      triggers: ['modulos', 'módulos', 'ocultar seccion', 'mostrar seccion'],
      answer:
        'Usa el botón **Módulos** en la barra superior: marca o desmarca bloques (resumen, gráficas, finanzas, etc.). La preferencia queda guardada en **localStorage** de este navegador. **Esc** cierra el cuadro.',
    },
    {
      triggers: ['voz', 'microfono', 'hablar', 'escuchar'],
      answer:
        'Pulsa el **micrófono** en el asistente (permiso del navegador). El modo **Dani** usa la **mejor voz en español** que tenga tu sistema (prioriza las que digan *neural* / *natural*) y un ritmo un poco más dinámico; **no** puede copiar al 100% el acento de un MP3 — eso requeriría **TTS en la nube** con clonación (ElevenLabs, Azure, etc.). **Probar voz** reproduce solo la **muestra** que subiste; las respuestas se leen con síntesis del sistema.',
    },
    {
      triggers: ['api', 'openai', 'chatgpt', 'ia cloud', 'clave'],
      answer:
        'En **Ajustes** del asistente puedes pegar una API key compatible con OpenAI **solo para pruebas**. En producción **no** expongas la clave en el navegador: usa un backend proxy. La key se guarda en *sessionStorage* (se borra al cerrar la pestaña).',
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

  function findLocalAnswer(q) {
    const nq = norm(q);
    let best = null;
    let bestScore = 0;
    KNOWLEDGE.forEach((k) => {
      k.triggers.forEach((tr) => {
        const sc = scoreMatch(nq, tr) + (nq.includes(norm(tr)) ? 20 : 0);
        if (sc > bestScore) {
          bestScore = sc;
          best = k.answer;
        }
      });
    });
    if (bestScore >= 4) return best;
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

  function mdLite(s) {
    return String(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
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
  const DANI_MP3 = 'audio/voice-preview-dani.mp3';

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
    const plain = String(text).replace(/<[^>]+>/g, '');
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
      'Eres asistente de un scorecard ejecutivo en español. Respuestas cortas y claras. Los números en pantalla son ejemplos/dummy salvo que el usuario diga lo contrario. No inventes cifras concretas de empresas reales.';
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

  async function handleUserMessage(raw) {
    const text = String(raw || '').trim();
    if (!text) return;

    addMsg('user', escapeHtml(text));

    const sec = findSectionCommand(text);
    if (sec && sec.id) {
      scrollToId(sec.id);
      const rep = 'Listo: te llevé a **' + sec.label + '**.';
      addMsg('bot', mdLite(rep));
      speak(rep.replace(/\*\*/g, ''));
      return;
    }

    const local = findLocalAnswer(text);
    if (local) {
      addMsg('bot', mdLite(local));
      speak(local);
      return;
    }

    const loading = document.createElement('div');
    loading.className = 'asst-msg asst-msg--bot asst-loading';
    loading.textContent = 'Consultando IA cloud…';
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
        addMsg(
          'bot',
          mdLite(
            'No tengo una respuesta local para eso. Opciones: activa **IA cloud** en el engrane (API key de prueba), reformula, o di *«ir a finanzas»* / **Ctrl+K**.'
          )
        );
      }
    } catch (e) {
      loading.remove();
      addMsg('bot', 'Error IA: ' + escapeHtml(e.message));
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
        '**Asistente listo.** Pregunta por métricas (*¿Qué es el EBITDA?*), di *«ir a comercial»*, usa **Ctrl+K** o el **micrófono** (Chrome).'
      )
    );

    // Escape behavior:
    // 1) si ajustes están abiertos, los cierra;
    // 2) si el panel del asistente está abierto, lo cierra.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
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
