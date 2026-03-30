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

  var STORAGE_MUTED = 'scorecard_audio_muted';
  var STORAGE_MUSIC_VOL = 'scorecard_audio_music_volume';
  var MIGRATE_FLAG = 'scorecard_audio_prefs_v3';
  /** '1' = panel volumen visible, '0' = colapsado (solo bocina + flecha) */
  var STORAGE_VOL_UI_EXPANDED = 'scorecard_audio_vol_ui_expanded';

  var cfg = window.SCORECARD_AUDIO || {};
  var userSrc = cfg.src != null ? String(cfg.src) : null;
  var src = userSrc || 'audio/Music-Background.mp3';

  var audioEl = null;
  var synthCtx = null;
  var synthOsc = [];
  var synthMasterGain = null;
  var btn = null;
  var volPctEl = null;
  var pillNodes = null;
  var volChevronBtn = null;
  var volPanelEl = null;
  var fileOk = null;
  var tickTimer = null;
  var userWantsSound = false;
  /** Paso de volumen con teclado numérico (alineado a ±10% de los botones). */
  var NUMPAD_VOL_STEP = 10;
  /** Evita doble resume cuando visibility + focus disparan seguido. */
  var resumeBgmTimer = null;
  /** Tras cargar una página nueva, ignorar resume hasta que termine el arranque (evita play() doble con mount). */
  var resumeAfterBootOk = false;

  var tabId = 't' + Math.random().toString(36).slice(2) + Date.now();
  var bc = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('scorecard-audio-v1');
      bc.onmessage = function (ev) {
        var d = ev.data;
        if (!d || d.from === tabId) return;
        if (d.type === 'pause') {
          if (audioEl && !audioEl.paused) {
            try {
              audioEl.pause();
            } catch (_) {}
          }
          stopSynth();
        }
      };
    }
  } catch (_) {}

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
    if (synthMasterGain) {
      try {
        synthMasterGain.gain.value = v * 0.32;
      } catch (_) {}
    }
  }

  function broadcastPauseOthers() {
    try {
      if (bc) bc.postMessage({ type: 'pause', from: tabId });
    } catch (_) {}
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

  // Nota: En Scorecard el portal navega por páginas HTML distintas (no SPA).
  // En algunos móviles, persistir/forzar `currentTime` entre cargas puede trabar el MP3.
  // Para estabilidad, aquí NO sincronizamos posición entre páginas; solo mantenemos mute/volumen.

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

  function stopSynth() {
    synthOsc.forEach(function (o) {
      try {
        o.stop();
      } catch (_) {}
    });
    synthOsc = [];
    synthMasterGain = null;
    if (synthCtx) {
      try {
        synthCtx.close();
      } catch (_) {}
      synthCtx = null;
    }
  }

  function startSynth() {
    stopSynth();
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    synthCtx = new Ctx();
    var master = synthCtx.createGain();
    synthMasterGain = master;
    master.gain.value = getMusicVolume() * 0.32;
    var freqs = [196, 247, 293.66];
    freqs.forEach(function (hz, i) {
      var o = synthCtx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz;
      var g = synthCtx.createGain();
      g.gain.value = 0.14 / (i + 1);
      o.connect(g);
      g.connect(master);
      o.start();
      synthOsc.push(o);
    });
    master.connect(synthCtx.destination);
    if (synthCtx.state === 'suspended') synthCtx.resume();
  }

  function stopPlaybackHard() {
    if (audioEl) {
      try {
        audioEl.pause();
      } catch (_) {}
    }
    stopSynth();
  }

  function savePlayingState() {}

  function onUserMute() {
    userWantsSound = false;
    stopPlaybackHard();
    savePlayingState(false);
  }

  function tryLoadUrl(url) {
    return new Promise(function (resolve) {
      var a = new Audio();
      a.loop = true;
      a.preload = 'auto';
      a.volume = getMusicVolume();
      if (cfg.crossOrigin) a.crossOrigin = cfg.crossOrigin;
      a.src = url;
      var done = false;
      function fin(ok) {
        if (done) return;
        done = true;
        if (ok) {
          src = url;
          fileOk = true;
          audioEl = a;
          resolve(true);
        } else {
          resolve(false);
        }
      }
      a.addEventListener(
        'canplay',
        function () {
          fin(true);
        },
        { once: true }
      );
      a.addEventListener(
        'error',
        function () {
          fin(false);
        },
        { once: true }
      );
      a.load();
      setTimeout(function () {
        if (!done) fin(false);
      }, 6000);
    });
  }

  function ensureAudio() {
    if (audioEl && fileOk) return Promise.resolve(true);
    return tryLoadUrl(src).then(function (ok) {
      if (!ok) {
        fileOk = false;
        audioEl = null;
      }
      return ok;
    });
  }

  function applySeekFromStorage() {
    // Intencionalmente vacío (ver nota arriba).
  }

  function tryPlayMp3() {
    if (!audioEl || !fileOk) return;
    if (!userWantsSound || isMutedPref()) return;
    if (!audioEl.paused) {
      applyMusicVolumeToOutputs();
      return;
    }

    audioEl.volume = getMusicVolume();
    audioEl.muted = false;

    broadcastPauseOthers();

    var p = audioEl.play();
    if (p && p.then) {
      p.then(function () {
        applyMusicVolumeToOutputs();
        updateBtn();
      }).catch(function () {
        updateBtn();
      });
    } else {
      applyMusicVolumeToOutputs();
      updateBtn();
    }
  }

  function tryPlayFallback() {
    if (!userWantsSound || isMutedPref()) return;
    broadcastPauseOthers();
    startSynth();
    if (!synthCtx) {
      updateBtn();
      return;
    }
    if (synthCtx.state === 'suspended') {
      synthCtx.resume().then(function () {
        applyMusicVolumeToOutputs();
        updateBtn();
      }).catch(function () {
        updateBtn();
      });
    } else {
      applyMusicVolumeToOutputs();
      updateBtn();
    }
  }

  function startPlayback() {
    ensureAudio().then(function (ok) {
      if (!userWantsSound || isMutedPref()) return;
      if (ok && audioEl) {
        tryPlayMp3();
      } else {
        tryPlayFallback();
      }
    });
  }

  function startTick() {
    // Sincronización de posición desactivada para evitar trabas al navegar entre páginas.
  }

  function stopTick() {
    tickTimer = null;
  }

  function scheduleResumeBgm() {
    if (!resumeAfterBootOk) return;
    if (isMutedPref() || !userWantsSound) return;
    if (resumeBgmTimer) clearTimeout(resumeBgmTimer);
    resumeBgmTimer = setTimeout(function () {
      resumeBgmTimer = null;
      resumeBgmFromHidden();
    }, 120);
  }

  /** Misma idea que sistema-cotizacion-web: al volver a visible/foco, empujar play sin pausar en el catch. */
  function resumeBgmFromHidden() {
    if (isMutedPref() || !userWantsSound) return;
    ensureAudio().then(function (ok) {
      if (!ok || !audioEl) {
        if (userWantsSound && !isMutedPref()) tryPlayFallback();
        return;
      }
      audioEl.muted = false;
      var p = audioEl.play();
      if (p && p.then) {
        p.then(function () {
          applyMusicVolumeToOutputs();
          updateBtn();
          startTick();
        }).catch(function () {});
      } else {
        applyMusicVolumeToOutputs();
        updateBtn();
        startTick();
      }
    });
  }

  var audioWrapEl = null;

  function updateBtn() {
    if (!btn) return;
    var m = isMutedPref();
    btn.setAttribute('aria-pressed', m ? 'false' : 'true');
    btn.setAttribute('aria-label', m ? 'Activar música ambiental' : 'Silenciar música');
    btn.title = m
      ? !isVolPanelExpanded()
        ? 'Activar música de fondo (flecha ▼ debajo para mostrar volumen)'
        : 'Activar música de fondo (usa + / − para el volumen)'
      : 'Silenciar música de fondo';
    btn.textContent = m ? '🔇' : '🔊';
  }

  function onUserGestureResume() {
    if (!userWantsSound || isMutedPref()) return;
    if (audioEl && fileOk && !audioEl.paused) {
      applyMusicVolumeToOutputs();
      return;
    }
    startPlayback();
    startTick();
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

    var volRow = document.createElement('div');
    volRow.className = 'scorecard-audio-volrow';

    var btnMinus = document.createElement('button');
    btnMinus.type = 'button';
    btnMinus.className = 'scorecard-audio-vol-btn scorecard-audio-vol-minus';
    btnMinus.setAttribute('data-no-ui-sound', '');
    btnMinus.title = 'Bajar volumen música';
    btnMinus.setAttribute('aria-label', 'Bajar volumen de la música');
    btnMinus.textContent = '−';
    btnMinus.addEventListener('click', function (e) {
      e.stopPropagation();
      var p = Math.round(getMusicVolume() * 100);
      setMusicVolumePercent(p - VOL_STEP);
    });

    var btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.className = 'scorecard-audio-vol-btn scorecard-audio-vol-plus';
    btnPlus.setAttribute('data-no-ui-sound', '');
    btnPlus.title = 'Subir volumen música';
    btnPlus.setAttribute('aria-label', 'Subir volumen de la música');
    btnPlus.textContent = '+';
    btnPlus.addEventListener('click', function (e) {
      e.stopPropagation();
      var p = Math.round(getMusicVolume() * 100);
      setMusicVolumePercent(p + VOL_STEP);
    });

    volRow.appendChild(btnMinus);
    volRow.appendChild(btnPlus);

    var pillBar = document.createElement('div');
    pillBar.id = 'scorecard-audio-pillbar';
    pillBar.className = 'scorecard-audio-pillbar';
    pillBar.setAttribute('role', 'meter');
    pillBar.setAttribute('aria-valuemin', '0');
    pillBar.setAttribute('aria-valuemax', '100');
    pillBar.setAttribute('aria-label', 'Nivel de volumen de la música');
    pillBar.setAttribute('data-no-ui-sound', '');

    pillNodes = [];
    for (var pi = 0; pi < PILL_COUNT; pi++) {
      var pill = document.createElement('span');
      pill.className = 'scorecard-audio-pill';
      pill.setAttribute('aria-hidden', 'true');
      pillBar.appendChild(pill);
      pillNodes.push(pill);
    }

    volPctEl = document.createElement('span');
    volPctEl.className = 'scorecard-audio-vpct';
    volPctEl.setAttribute('data-no-ui-sound', '');

    volPanelEl = document.createElement('div');
    volPanelEl.id = 'scorecard-audio-vol-panel';
    volPanelEl.className = 'scorecard-audio-vol-panel';
    volPanelEl.setAttribute('data-no-ui-sound', '');
    volPanelEl.appendChild(volRow);
    volPanelEl.appendChild(pillBar);
    volPanelEl.appendChild(volPctEl);

    volChevronBtn = document.createElement('button');
    volChevronBtn.type = 'button';
    volChevronBtn.id = 'scorecard-audio-vol-chevron';
    volChevronBtn.className = 'scorecard-audio-vol-chevron';
    volChevronBtn.setAttribute('data-no-ui-sound', '');
    volChevronBtn.setAttribute('aria-controls', 'scorecard-audio-vol-panel');
    volChevronBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      setVolPanelExpanded(!isVolPanelExpanded());
      updateBtn();
    });

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
    stack.appendChild(volChevronBtn);
    stack.appendChild(volPanelEl);
    wrap.appendChild(stack);
    document.body.appendChild(wrap);

    syncVolPanelUi();
    renderPillBar();

    document.addEventListener('pointerdown', onUserGestureResume, { passive: true, capture: true });
    document.addEventListener('keydown', onUserGestureResume, { passive: true, capture: true });

    function unlockAudioFirstGesture() {
      if (unlockAudioFirstGesture._done) return;
      unlockAudioFirstGesture._done = true;
      if (isMutedPref()) return;
      userWantsSound = true;
      ensureAudio().then(function (ok) {
        if (ok) {
          tryPlayMp3();
          startTick();
        } else if (!isMutedPref()) {
          tryPlayFallback();
        }
      });
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
          startPlayback();
          startTick();
        }
      },
      true
    );

    ensureAudio().then(function (ok) {
      if (!ok || !audioEl) return;
      applyMusicVolumeToOutputs();
      audioEl.addEventListener('loadedmetadata', function () {
        applySeekFromStorage();
      });
      audioEl.addEventListener('play', function () {
        startTick();
      });
      audioEl.addEventListener('pause', function () {
        // no-op
      });
      if (userWantsSound && !isMutedPref()) {
        startPlayback();
        startTick();
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') scheduleResumeBgm();
    });
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) scheduleResumeBgm();
    });

    // Sin persistencia de posición entre páginas.

    setTimeout(function () {
      resumeAfterBootOk = true;
    }, 450);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
