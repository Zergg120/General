/**
 * Música ambiental + bocina + control de volumen (solo música de fondo).
 * Clics de UI y voz del asistente van aparte (30% en sus scripts).
 *
 * Opcional: window.SCORECARD_AUDIO = { src, volume (0–1, default música ~10%), crossOrigin };
 *
 * Pista por defecto: `audio/Music-Background.mp3`. Reanudación al volver a la pestaña (como
 * sistema-cotizacion-web: solo `visibilitychange`, sin `focus` en cada carga — evitaba `play()` duplicado).
 * `play()` con `.catch` vacío; `currentTime` solo con metadata lista. `pageshow` + `persisted` = bfcache.
 * Tras cargar página, ~450 ms sin resume automático para no competir con el arranque del reproductor.
 * Primer clic / tecla desbloquea audio; Num+ / Num− ajustan volumen (±10%).
 */
(function () {
  'use strict';

  // Si esta página está embebida en el portal contenedor, NO crear otro reproductor aquí.
  // El audio persistente vive en `portal.html` (top-level) para que no se corte al cambiar de módulo.
  try {
    if (window.top && window.top !== window) return;
  } catch (_) {}

  var STORAGE_MUTED = 'scorecard_audio_muted';
  var STORAGE_MUSIC_VOL = 'scorecard_audio_music_volume';
  var MIGRATE_FLAG = 'scorecard_audio_prefs_v3';
  /** '1' = panel volumen visible, '0' = colapsado (solo bocina + flecha) */
  var STORAGE_VOL_UI_EXPANDED = 'scorecard_audio_vol_ui_expanded';

  var cfg = window.SCORECARD_AUDIO || {};
  var userSrc = cfg.src != null ? String(cfg.src) : null;
  var src = userSrc || 'audio/Music-Background.mp3';

  var audioEl = null;
  var btn = null;
  var volPctEl = null;
  var pillNodes = null;
  var volChevronBtn = null;
  var volPanelEl = null;
  var userWantsSound = false;
  /** Paso de volumen con teclado numérico (alineado a ±10% de los botones). */
  var NUMPAD_VOL_STEP = 10;
  var fileOk = false;

  // Nota importante: en Scorecard el portal navega por páginas HTML distintas (no SPA).
  // En móviles, intentar “sincronizar” tiempo/estado entre páginas suele causar trabas.
  // Estrategia estable (como David, pero multi-página): Audio simple + gesto para desbloquear + play() en visible/pageshow.

  function defaultMusicPercent() {
    if (cfg.volume != null) return Math.min(100, Math.max(0, Math.round(Number(cfg.volume) * 100)));
    return 10;
  }

  function getMusicVolume() {
    var defPct = defaultMusicPercent();
    try {
      var raw = localStorage.getItem(STORAGE_MUSIC_VOL);
      if (raw === null) return Math.min(1, Math.max(0, defPct / 100));
      var pct = parseInt(raw, 10);
      if (isNaN(pct)) return Math.min(1, Math.max(0, defPct / 100));
      return Math.min(1, Math.max(0, pct / 100));
    } catch (_) {
      return Math.min(1, Math.max(0, defPct / 100));
    }
  }

  var VOL_STEP = 10;
  var PILL_COUNT = 10;

  /** Sin clave en localStorage: panel colapsado (solo bocina + ▼), como primera visita. */
  function isVolPanelExpanded() {
    try {
      var v = localStorage.getItem(STORAGE_VOL_UI_EXPANDED);
      if (v === null) return false;
      return v === '1';
    } catch (_) {
      return false;
    }
  }

  function setVolPanelExpanded(expanded) {
    try {
      localStorage.setItem(STORAGE_VOL_UI_EXPANDED, expanded ? '1' : '0');
    } catch (_) {}
    syncVolPanelUi();
  }

  function syncVolPanelUi() {
    if (!volChevronBtn || !volPanelEl) return;
    var expanded = isVolPanelExpanded();
    volPanelEl.hidden = !expanded;
    volPanelEl.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    volChevronBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    volChevronBtn.textContent = expanded ? '▲' : '▼';
    volChevronBtn.title = expanded
      ? 'Ocultar control de volumen (− / + y barra)'
      : 'Mostrar control de volumen';
    volChevronBtn.setAttribute('aria-label', volChevronBtn.title);
    if (audioWrapEl) audioWrapEl.classList.toggle('scorecard-audio-vol-collapsed', !expanded);
  }

  function setMusicVolumePercent(pct) {
    pct = Math.min(100, Math.max(0, Math.round(pct)));
    try {
      localStorage.setItem(STORAGE_MUSIC_VOL, String(pct));
    } catch (_) {}
    renderPillBar();
    applyMusicVolumeToOutputs();
  }

  function renderPillBar() {
    var pct = Math.round(getMusicVolume() * 100);
    var filled = Math.min(PILL_COUNT, Math.ceil(pct / VOL_STEP));
    if (pct === 0) filled = 0;
    if (volPctEl) volPctEl.textContent = pct + '%';
    if (pillNodes) {
      for (var i = 0; i < pillNodes.length; i++) {
        pillNodes[i].classList.toggle('is-on', i < filled);
      }
    }
    var bar = document.getElementById('scorecard-audio-pillbar');
    if (bar) bar.setAttribute('aria-valuenow', String(pct));
  }

  function applyMusicVolumeToOutputs() {
    var v = getMusicVolume();
    if (audioEl) audioEl.volume = v;
  }

  function migratePrefsOnce() {
    try {
      if (!localStorage.getItem(MIGRATE_FLAG)) {
        if (localStorage.getItem(STORAGE_MUTED) === null) {
          localStorage.setItem(STORAGE_MUTED, '0');
        }
        localStorage.setItem(MIGRATE_FLAG, '1');
      }
      if (localStorage.getItem(STORAGE_MUSIC_VOL) === null) {
        localStorage.setItem(STORAGE_MUSIC_VOL, String(defaultMusicPercent()));
      }
    } catch (_) {}
  }

  function isMutedPref() {
    try {
      var v = localStorage.getItem(STORAGE_MUTED);
      if (v === null) return false;
      return v !== '0';
    } catch (_) {
      return false;
    }
  }

  function setMutedPref(m) {
    try {
      localStorage.setItem(STORAGE_MUTED, m ? '1' : '0');
    } catch (_) {}
  }

  function onUserMute() {
    userWantsSound = false;
    if (audioEl) {
      try {
        audioEl.pause();
      } catch (_) {}
    }
  }

  function ensureAudioOnce() {
    if (audioEl) return;
    var a = new Audio();
    a.loop = true;
    a.preload = 'auto';
    a.volume = getMusicVolume();
    if (cfg.crossOrigin) a.crossOrigin = cfg.crossOrigin;
    a.src = src;
    audioEl = a;
    fileOk = true;
  }

  function tryPlay(reason) {
    if (isMutedPref() || !userWantsSound) return;
    ensureAudioOnce();
    if (!audioEl || !fileOk) return;
    audioEl.muted = false;
    audioEl.volume = getMusicVolume();
    var p = audioEl.play();
    if (p && p.catch) p.catch(function () {});
    applyMusicVolumeToOutputs();
    updateBtn();
  }

  var audioWrapEl = null;

  function updateBtn() {
    if (!btn) return;
    var m = isMutedPref();
    btn.setAttribute('aria-pressed', m ? 'false' : 'true');
    btn.setAttribute('aria-label', m ? 'Activar música ambiental' : 'Silenciar música');
    btn.title = m ? 'Activar música de fondo (usa Num+ / Num− para volumen)' : 'Silenciar música de fondo';
    btn.textContent = m ? '🔇' : '🔊';
  }

  function onUserGestureResume() {
    if (!userWantsSound || isMutedPref()) return;
    ensureAudioOnce();
    if (audioEl && fileOk && !audioEl.paused) {
      applyMusicVolumeToOutputs();
      return;
    }
    tryPlay('gesture');
  }

  function mount() {
    if (document.getElementById('scorecard-audio-wrap')) return;
    migratePrefsOnce();

    userWantsSound = !isMutedPref();

    var wrap = document.createElement('div');
    wrap.id = 'scorecard-audio-wrap';
    wrap.setAttribute('data-no-ui-sound', '');
    audioWrapEl = wrap;

    var stack = document.createElement('div');
    stack.className = 'scorecard-audio-stack';

    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'scorecard-audio-toggle';
    btn.setAttribute('data-no-ui-sound', '');
    updateBtn();

    // UI de volumen removida (estorbaba en header). Volumen por teclado: Num+ / Num−.
    pillNodes = null;
    volPctEl = null;
    volChevronBtn = null;
    volPanelEl = null;

    btn.addEventListener('click', function () {
      var m = isMutedPref();
      if (m) {
        setMutedPref(false);
        userWantsSound = true;
        updateBtn();
        startPlayback();
        startTick();
      } else {
        setMutedPref(true);
        userWantsSound = false;
        updateBtn();
        onUserMute();
        stopTick();
      }
    });

    stack.appendChild(btn);
    wrap.appendChild(stack);

    var mountEl = document.getElementById('scorecard-audio-mount');
    if (mountEl) {
      wrap.classList.add('scorecard-audio--header');
      mountEl.appendChild(wrap);
    } else {
      document.body.appendChild(wrap);
    }

    // Sin panel de volumen.

    document.addEventListener('pointerdown', onUserGestureResume, { passive: true, capture: true });
    document.addEventListener('keydown', onUserGestureResume, { passive: true, capture: true });

    function unlockAudioFirstGesture() {
      if (unlockAudioFirstGesture._done) return;
      unlockAudioFirstGesture._done = true;
      if (isMutedPref()) return;
      userWantsSound = true;
      tryPlay('unlock');
    }
    document.addEventListener('click', unlockAudioFirstGesture, { once: true, capture: true });
    document.addEventListener('pointerdown', unlockAudioFirstGesture, { once: true, capture: true });
    document.addEventListener('keydown', unlockAudioFirstGesture, { once: true, capture: true });

    document.addEventListener(
      'keydown',
      function onNumpadBgmVol(e) {
        var t = e.target;
        if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
        if (e.code !== 'NumpadAdd' && e.code !== 'NumpadSubtract') return;
        e.preventDefault();
        var p = Math.round(getMusicVolume() * 100);
        var next = e.code === 'NumpadAdd' ? p + NUMPAD_VOL_STEP : p - NUMPAD_VOL_STEP;
        setMusicVolumePercent(next);
        applyMusicVolumeToOutputs();
        if (next > 0 && isMutedPref()) {
          setMutedPref(false);
          userWantsSound = true;
          updateBtn();
          tryPlay('numpad');
        }
      },
      true
    );

    ensureAudioOnce();
    applyMusicVolumeToOutputs();
    if (userWantsSound && !isMutedPref()) {
      tryPlay('boot');
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') tryPlay('visible');
    });
    window.addEventListener('pageshow', function () {
      tryPlay('pageshow');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
