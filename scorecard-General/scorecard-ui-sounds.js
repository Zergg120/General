/**
 * Clics de interfaz: reproduce **`audio/Mouse-clic.wav`** (mismo criterio que la música de fondo).
 *
 * Orden: 1) `<audio id="scorecard-ui-click-sfx">` (se crea si falta; carga el .wav real)
 *        2) Web Audio con muestras decodificadas del mismo fichero (http/https)
 *        3) `<audio>` dinámico
 *        4) Pitido sintético **solo** si `allowSyntheticFallback: true` (por defecto **false** para no confundir con tu WAV).
 *
 * Otro nombre: `window.SCORECARD_UI_SOUNDS = { src: 'audio/TuArchivo.wav' }`
 * Opcional: `window.SCORECARD_UI_SOUNDS = { src, volume, strictZones, allowSyntheticFallback: true }`
 * Depuración: ?debugUiSound=1
 *
 * Nota IA: aquí no se puede “escuchar” el navegador; sí se puede comprobar que exista el .wav y el flujo de código.
 */
(function () {
  'use strict';

  var cfg = window.SCORECARD_UI_SOUNDS || {};
  var srcRel = cfg.src != null ? String(cfg.src) : 'audio/Mouse-clic.wav';
  var src = (function () {
    try {
      return new URL(srcRel, window.location.href).href;
    } catch (_) {
      return srcRel;
    }
  })();
  var debugUi = /(?:^|[?&])debugUiSound=1(?:&|$)/.test(String(window.location.search || ''));
  var volume = cfg.volume != null ? Math.min(1, Math.max(0, Number(cfg.volume))) : 0.65;
  var lastPlay = 0;
  var throttleMs = cfg.throttleMs != null ? Number(cfg.throttleMs) : 45;
  var suppressClickSound = false;
  var suppressClickTimer = null;

  var decodedClickBuffer = null;
  var decodeInFlight = null;
  var decodeFailed = false;

  var UI_ZONE =
    '.shell, .portal-shell, .portal-body, ' +
    '.portal-filters, .portal-table-wrap, .portal-page-head, .portal-topbar, .portal-back, ' +
    '.portal-hub-title, .portal-hero, .portal-module-grid, .portal-quick, ' +
    '.top, .brand, .meta-bar, .action-bar, .period-wrap, ' +
    '.section, .hero-grid, .kpi-grid, .charts-row, ' +
    '.hero-card, .kpi-card, .chart-card, .chart-wrap, .table-card, ' +
    '.portal-table, .drill-table, .op-kpi, .op-kpi-row, ' +
    '#scorecard-status-mount, .scorecard-status-bar, .scorecard-status-pill, ' +
    '#drill-panel, #module-panel, #excel-panel, #cmd-palette, #asst-drawer, #asst-fab, #asst-messages, ' +
    'footer, .legal-footer, ' +
    '[data-drill], [data-ui-click-sound]';

  function reducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function shouldPlay() {
    if (cfg.enabled === false) return false;
    if (cfg.ignoreReducedMotion === true) return true;
    if (cfg.respectReducedMotion === true && reducedMotion()) return false;
    return true;
  }

  function isTextInput(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable) return true;
    var t = el.tagName;
    if (t === 'TEXTAREA') return true;
    if (t === 'INPUT') {
      var type = (el.type || '').toLowerCase();
      if (
        type === 'text' ||
        type === 'search' ||
        type === 'email' ||
        type === 'number' ||
        type === 'password' ||
        type === 'tel' ||
        type === 'url' ||
        type === 'date' ||
        type === 'time' ||
        type === 'datetime-local'
      ) {
        return true;
      }
    }
    return false;
  }

  function wantsUiSoundStrict(target) {
    if (!target || target.nodeType !== 1) return false;
    if (target.closest && target.closest(UI_ZONE)) return true;
    if (target.hasAttribute && target.hasAttribute('data-drill')) return true;
    var tag = target.tagName;
    if (tag === 'BUTTON' || tag === 'SUMMARY' || tag === 'LABEL' || tag === 'SELECT') return true;
    if (tag === 'A' && target.getAttribute('href')) return true;
    if (tag === 'INPUT') {
      var type = (target.type || '').toLowerCase();
      if (/^(button|submit|reset|checkbox|radio|file)$/i.test(type)) return true;
    }
    var role = target.getAttribute && target.getAttribute('role');
    if (role === 'tab' || role === 'button' || role === 'link') return true;
    return false;
  }

  function wantsUiSound(target) {
    if (!target || target.nodeType !== 1) return false;
    if (isTextInput(target)) return false;
    if (target.closest && target.closest('[data-no-ui-sound]')) return false;
    if (target.closest && target.closest('#scorecard-audio-wrap')) return false;
    if (target.id === 'scorecard-audio-toggle') return false;
    if (cfg.strictZones === true) return wantsUiSoundStrict(target);
    return true;
  }

  function getAudioContext() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!window.__sc_ui_audio_ctx) window.__sc_ui_audio_ctx = new AC();
    return window.__sc_ui_audio_ctx;
  }

  var isFilePage = /^file:/i.test(String(window.location.protocol || ''));

  /**
   * Misma idea que la música: un <audio> fijo con src al .wav (el navegador lo decodifica como tu archivo).
   */
  function ensureUiClickAudioEl() {
    var el = document.getElementById('scorecard-ui-click-sfx');
    if (el) {
      el.src = src;
      return el;
    }
    if (!document.body) return null;
    el = document.createElement('audio');
    el.id = 'scorecard-ui-click-sfx';
    el.setAttribute('preload', 'auto');
    el.setAttribute('data-no-ui-sound', '');
    el.setAttribute('aria-hidden', 'true');
    el.src = src;
    el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;clip:rect(0,0,0,0)';
    document.body.appendChild(el);
    return el;
  }

  function playFromDedicatedElement(then) {
    var el = ensureUiClickAudioEl();
    if (!el) {
      if (then) then(false);
      return;
    }
    el.volume = volume;
    try {
      el.currentTime = 0;
    } catch (_) {}
    var p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(function () {
        if (debugUi && window.console) console.log('[ui-sound] <audio id=scorecard-ui-click-sfx> OK');
        if (then) then(true);
      }).catch(function (err) {
        if (debugUi && window.console) console.warn('[ui-sound] elemento dedicado play()', err);
        if (then) then(false);
      });
    } else {
      if (then) then(true);
    }
  }

  function ensureDecodedWav(then) {
    if (decodedClickBuffer) {
      then(true, decodedClickBuffer);
      return;
    }
    if (isFilePage) {
      then(false, null);
      return;
    }
    if (decodeFailed) {
      then(false, null);
      return;
    }
    if (decodeInFlight) {
      decodeInFlight
        .then(function (buf) {
          then(true, buf);
        })
        .catch(function () {
          then(false, null);
        });
      return;
    }
    if (!window.fetch) {
      decodeFailed = true;
      then(false, null);
      return;
    }

    decodeInFlight = fetch(src, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (ab) {
        var ctx = getAudioContext();
        if (!ctx) throw new Error('no AudioContext');
        return new Promise(function (resolve, reject) {
          ctx.decodeAudioData(ab.slice(0), resolve, reject);
        });
      })
      .then(function (audioBuffer) {
        decodedClickBuffer = audioBuffer;
        decodeInFlight = null;
        if (debugUi && window.console) console.log('[ui-sound] WAV decodificado', src, String(audioBuffer.duration) + 's');
        return audioBuffer;
      })
      .catch(function (e) {
        decodeInFlight = null;
        decodeFailed = true;
        if (debugUi && window.console) console.warn('[ui-sound] decode falló', src, e);
        throw e;
      });

    decodeInFlight
      .then(function (buf) {
        then(true, buf);
      })
      .catch(function () {
        then(false, null);
      });
  }

  function playDecodedBuffer(buf, then) {
    var ctx = getAudioContext();
    if (!ctx || !buf) {
      if (then) then(false);
      return;
    }

    function start() {
      try {
        var srcN = ctx.createBufferSource();
        srcN.buffer = buf;
        var g = ctx.createGain();
        g.gain.value = volume;
        srcN.connect(g);
        g.connect(ctx.destination);
        srcN.start(0);
        if (then) then(true);
      } catch (e) {
        if (debugUi && window.console) console.warn('[ui-sound] play buffer', e);
        if (then) then(false);
      }
    }

    if (ctx.state === 'suspended') {
      var pr = ctx.resume();
      if (pr && typeof pr.then === 'function') {
        pr.then(start).catch(start);
      } else {
        start();
      }
    } else {
      start();
    }
  }

  function playWavFile(then) {
    var a = new Audio();
    a.preload = 'auto';
    a.volume = volume;

    var finished = false;
    function finish(ok) {
      if (finished) return;
      finished = true;
      if (then) then(ok);
    }

    var timeoutId = setTimeout(function () {
      try {
        a.pause();
      } catch (_) {}
      if (debugUi && window.console) console.warn('[ui-sound] <audio> dinámico timeout', src);
      finish(false);
    }, 800);

    function clear() {
      clearTimeout(timeoutId);
    }

    a.addEventListener(
      'ended',
      function () {
        try {
          a.removeAttribute('src');
          a.load();
        } catch (_) {}
      },
      { once: true }
    );

    a.addEventListener(
      'error',
      function () {
        clear();
        if (debugUi && window.console) console.warn('[ui-sound] <audio> dinámico error', src);
        finish(false);
      },
      { once: true }
    );

    a.src = src;

    var p = a.play();
    if (p && typeof p.then === 'function') {
      p.then(function () {
        clear();
        if (debugUi && window.console) console.log('[ui-sound] <audio> dinámico OK', src);
        finish(true);
      }).catch(function (err) {
        clear();
        if (debugUi && window.console) console.warn('[ui-sound] <audio> dinámico play()', err);
        finish(false);
      });
    } else {
      clear();
      finish(true);
    }
  }

  function writeString(view, offset, str) {
    for (var i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i) & 0xff);
    }
  }

  function pcm16MonoWavBlob(sampleRate, numSamples, getSample) {
    var dataBytes = numSamples * 2;
    var buffer = new ArrayBuffer(44 + dataBytes);
    var view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataBytes, true);
    var off = 44;
    var i;
    for (i = 0; i < numSamples; i++) {
      var s = Math.max(-1, Math.min(1, getSample(i)));
      var v = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(off, v | 0, true);
      off += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function playUiClickBlob(onResult) {
    try {
      var sr = 44100;
      var dur = 0.08;
      var n = Math.max(1, Math.floor(sr * dur));
      var f = 880;
      var blob = pcm16MonoWavBlob(sr, n, function (i) {
        var env = 1 - i / n;
        return Math.sin((2 * Math.PI * f * i) / sr) * 0.45 * env;
      });
      var url = URL.createObjectURL(blob);
      var a = new Audio();
      a.src = url;
      a.volume = volume;

      function cleanup() {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {}
      }

      a.addEventListener('ended', cleanup, { once: true });
      a.addEventListener(
        'error',
        function () {
          cleanup();
          if (onResult) onResult(false);
        },
        { once: true }
      );

      var p = a.play();
      if (p && typeof p.then === 'function') {
        p.then(function () {
          if (onResult) onResult(true);
        }).catch(function (err) {
          if (debugUi && window.console) console.warn('[ui-sound] blob', err);
          cleanup();
          if (onResult) onResult(false);
        });
      } else {
        if (onResult) onResult(true);
      }
    } catch (e) {
      if (debugUi && window.console) console.warn('[ui-sound] blob ex', e);
      if (onResult) onResult(false);
    }
  }

  function playUiBeepOsc() {
    try {
      var ctx = getAudioContext();
      if (!ctx) return;

      function beep() {
        try {
          var rate = ctx.sampleRate;
          var dur = 0.09;
          var n = Math.max(1, Math.floor(rate * dur));
          var buf = ctx.createBuffer(1, n, rate);
          var d = buf.getChannelData(0);
          var freq = 880;
          var i;
          for (i = 0; i < n; i++) {
            var env = 1 - i / n;
            d[i] = Math.sin((2 * Math.PI * freq * i) / rate) * 0.5 * env;
          }
          var srcN = ctx.createBufferSource();
          srcN.buffer = buf;
          var g = ctx.createGain();
          g.gain.value = 1;
          srcN.connect(g);
          g.connect(ctx.destination);
          srcN.start(0);
        } catch (e2) {
          if (debugUi && window.console) console.warn('[ui-sound] osc', e2);
        }
      }

      if (ctx.state === 'suspended') {
        var pr = ctx.resume();
        if (pr && typeof pr.then === 'function') {
          pr.then(function () {
            beep();
          }).catch(function () {
            beep();
          });
        } else {
          beep();
        }
      } else {
        beep();
      }
    } catch (e) {
      if (debugUi && window.console) console.warn('[ui-sound] ctx', e);
    }
  }

  function maybeSynth() {
    if (cfg.allowSyntheticFallback === true) {
      playUiClickBlob(function (ok) {
        if (!ok) playUiBeepOsc();
      });
    } else if (debugUi && window.console) {
      console.warn(
        '[ui-sound] No se pudo reproducir el WAV. Coloca audio/Mouse-clic.wav o SCORECARD_UI_SOUNDS = { allowSyntheticFallback: true }'
      );
    }
  }

  function playOnce() {
    if (!shouldPlay()) {
      if (debugUi && window.console) console.log('[ui-sound] off');
      return;
    }
    var now = Date.now();
    if (now - lastPlay < throttleMs) return;
    lastPlay = now;

    if (cfg.useGeneratedOnly === true) {
      playUiClickBlob(function (ok) {
        if (!ok) playUiBeepOsc();
      });
      return;
    }

    playFromDedicatedElement(function (ok) {
      if (ok) return;
      ensureDecodedWav(function (ok2, buf) {
        if (ok2 && buf) {
          playDecodedBuffer(buf, function (played) {
            if (played) return;
            playWavFile(function (ok3) {
              if (ok3) return;
              maybeSynth();
            });
          });
          return;
        }
        playWavFile(function (ok3) {
          if (ok3) return;
          maybeSynth();
        });
      });
    });
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    var ok = wantsUiSound(e.target);
    if (debugUi && window.console) console.log('[ui-sound] pd', e.target && e.target.tagName, ok);
    if (!ok) return;
    if (suppressClickTimer) clearTimeout(suppressClickTimer);
    suppressClickSound = true;
    playOnce();
    suppressClickTimer = setTimeout(function () {
      suppressClickSound = false;
      suppressClickTimer = null;
    }, 700);
  }

  function onClick(e) {
    if (e.button != null && e.button !== 0) return;
    if (suppressClickSound) {
      suppressClickSound = false;
      if (suppressClickTimer) {
        clearTimeout(suppressClickTimer);
        suppressClickTimer = null;
      }
      return;
    }
    var ok = wantsUiSound(e.target);
    if (debugUi && window.console) console.log('[ui-sound] ck', e.target && e.target.tagName, ok);
    if (!ok) return;
    playOnce();
  }

  function primeAudioContextFromGesture() {
    try {
      getAudioContext();
      var ctx = window.__sc_ui_audio_ctx;
      if (ctx && ctx.state === 'suspended') {
        var pr = ctx.resume();
        if (pr && typeof pr.then === 'function') pr.catch(function () {});
      }
    } catch (_) {}
  }

  function primeWavDecode() {
    if (decodedClickBuffer || decodeFailed || cfg.useGeneratedOnly === true || isFilePage) return;
    ensureDecodedWav(function () {});
  }

  ensureUiClickAudioEl();

  window.addEventListener('pointerdown', primeAudioContextFromGesture, true);
  window.addEventListener('pointerdown', primeWavDecode, true);
  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('click', onClick, true);
})();
