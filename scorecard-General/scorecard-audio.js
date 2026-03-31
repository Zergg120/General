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
  var THEME_KEY = 'p2bi_theme';

  function getThemePref() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (_) {
      return null;
    }
  }

  function pickSrcForMode(mode) {
    if (mode === 'dark') {
      if (cfg.srcDark != null) return String(cfg.srcDark);
    } else {
      if (cfg.srcLight != null) return String(cfg.srcLight);
    }
    if (cfg.src != null) return String(cfg.src);
    return 'audio/Music-Background.mp3';
  }

  var activeMode = getThemePref() === 'dark' ? 'dark' : 'light';

  function k(base) {
    return base + '_' + activeMode;
  }

  /** Persistencia de posición entre páginas (multi-page) por pista (light/dark) */
  var STORAGE_TIME = k('scorecard_audio_time_s');
  var STORAGE_TIME_AT = k('scorecard_audio_time_at_ms');
  var STORAGE_WAS_PLAYING = k('scorecard_audio_was_playing');

  var src = pickSrcForMode(activeMode);

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
  var restoredTime = false;
  var lastSavedAt = 0;

  // Nota importante: en Scorecard el portal navega por páginas HTML distintas (no SPA).
  // En móviles, intentar “sincronizar” tiempo/estado entre páginas suele causar trabas.
  // Estrategia estable (multi-página): Audio simple + gesto para desbloquear + guardar tiempo + reanudar suave al cambiar de módulo.

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
    try {
      localStorage.setItem(STORAGE_WAS_PLAYING, '0');
    } catch (_) {}
  }

  function savePlaybackState(force) {
    if (!audioEl) return;
    var now = Date.now();
    if (!force && now - lastSavedAt < 1200) return;
    lastSavedAt = now;
    try {
      if (!isFinite(audioEl.currentTime)) return;
      localStorage.setItem(STORAGE_TIME, String(Math.max(0, audioEl.currentTime)));
      localStorage.setItem(STORAGE_TIME_AT, String(now));
      localStorage.setItem(STORAGE_WAS_PLAYING, audioEl.paused ? '0' : '1');
    } catch (_) {}
  }

  function restorePlaybackTimeOnce() {
    if (restoredTime) return;
    restoredTime = true;
    if (!audioEl) return;
    var tRaw = null;
    var atRaw = null;
    var wasPlaying = false;
    try {
      tRaw = localStorage.getItem(STORAGE_TIME);
      atRaw = localStorage.getItem(STORAGE_TIME_AT);
      wasPlaying = localStorage.getItem(STORAGE_WAS_PLAYING) === '1';
    } catch (_) {}
    if (tRaw == null) return;
    var t = parseFloat(tRaw);
    if (!isFinite(t) || t < 0) return;

    // Si estaba reproduciendo, avanzamos aproximado por el tiempo transcurrido entre páginas.
    var at = atRaw != null ? parseInt(atRaw, 10) : NaN;
    if (wasPlaying && isFinite(at) && at > 0) {
      var drift = (Date.now() - at) / 1000;
      if (isFinite(drift) && drift > 0 && drift < 60 * 60) t += drift;
    }

    // Espera a tener metadata para saber duration y evitar seek inválido.
    var apply = function () {
      if (!audioEl || !isFinite(audioEl.duration) || audioEl.duration <= 0) return;
      // Deja un pequeño margen antes del final para evitar ended.
      var safeT = Math.min(Math.max(0, t), Math.max(0, audioEl.duration - 0.25));
      // Solo seek si hay diferencia material (evita micro-trabas).
      if (isFinite(audioEl.currentTime) && Math.abs(audioEl.currentTime - safeT) < 0.5) return;
      try {
        audioEl.currentTime = safeT;
      } catch (_) {}
    };

    if (audioEl.readyState >= 1) apply();
    else audioEl.addEventListener('loadedmetadata', apply, { once: true });
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

    // Persistencia suave: reanuda donde ibas (sin “saltos” constantes).
    a.addEventListener('loadedmetadata', function () {
      restorePlaybackTimeOnce();
    });
    a.addEventListener('timeupdate', function () {
      savePlaybackState(false);
    });
    a.addEventListener('pause', function () {
      savePlaybackState(true);
    });
    a.addEventListener('playing', function () {
      savePlaybackState(true);
    });
  }

  function tryPlay(reason) {
    if (isMutedPref() || !userWantsSound) return;
    ensureAudioOnce();
    if (!audioEl || !fileOk) return;
    audioEl.muted = false;
    audioEl.volume = getMusicVolume();
    restorePlaybackTimeOnce();
    var p = audioEl.play();
    if (p && p.catch) p.catch(function () {});
    applyMusicVolumeToOutputs();
    updateBtn();
  }

  function switchTrack(mode) {
    mode = mode === 'dark' ? 'dark' : 'light';
    if (mode === activeMode) return;

    // Guarda la pista actual antes de cambiar.
    savePlaybackState(true);

    activeMode = mode;
    src = pickSrcForMode(activeMode);
    STORAGE_TIME = k('scorecard_audio_time_s');
    STORAGE_TIME_AT = k('scorecard_audio_time_at_ms');
    STORAGE_WAS_PLAYING = k('scorecard_audio_was_playing');
    restoredTime = false;

    if (!audioEl) return;
    try {
      audioEl.pause();
    } catch (_) {}
    try {
      audioEl.src = src;
      audioEl.load();
    } catch (_) {}

    tryPlay('theme-switch');
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
        tryPlay('toggle_on');
      } else {
        setMutedPref(true);
        userWantsSound = false;
        updateBtn();
        onUserMute();
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

    // Cambiar música cuando cambia el tema (lunita).
    try {
      window.addEventListener('p2bi:theme', function (e) {
        var m = e && e.detail && e.detail.mode;
        switchTrack(m === 'dark' ? 'dark' : 'light');
      });
    } catch (_) {}

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      // Evita solapar play() si el audio ya sigue en curso (menos tirones al volver de otra pestaña).
      if (audioEl && fileOk && !audioEl.paused && !audioEl.ended) {
        applyMusicVolumeToOutputs();
        return;
      }
      tryPlay('visible');
    });
    window.addEventListener('pageshow', function () {
      tryPlay('pageshow');
    });

    // Guardar estado al salir/cambiar de página (multi-page tabs).
    window.addEventListener(
      'pagehide',
      function () {
        savePlaybackState(true);
      },
      { capture: true }
    );
    window.addEventListener(
      'beforeunload',
      function () {
        savePlaybackState(true);
      },
      { capture: true }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
