/**
 * Sonidos cortos de interfaz (clics) — delegación global.
 *
 * Archivo por defecto: audio/mixkit-mouseclicks.wav
 * Opcional antes de cargar este script:
 *   window.SCORECARD_UI_SOUNDS = { src, enabled: true }; /* volumen fijo 30% */
 *
 * Excluye: inputs de texto, contenteditable, [data-no-ui-sound], #scorecard-audio-toggle
 * Respeta prefers-reduced-motion (silencia UI salvo ignoreReducedMotion: true)
 */
(function () {
  'use strict';

  var cfg = window.SCORECARD_UI_SOUNDS || {};
  var src = cfg.src != null ? String(cfg.src) : 'audio/mixkit-mouseclicks.wav';
  /** Siempre 30% — independiente del volumen de la música de fondo */
  var volume = 0.3;
  var POOL = 5;
  var pool = [];
  var lastPlay = 0;
  var throttleMs = cfg.throttleMs != null ? Number(cfg.throttleMs) : 55;

  function reducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function shouldPlay() {
    if (cfg.enabled === false) return false;
    if (reducedMotion() && cfg.ignoreReducedMotion !== true) return false;
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

  function classMatches(el) {
    if (!el.classList) return false;
    var c = el.classList;
    return (
      c.contains('hero-card') ||
      c.contains('kpi-card') ||
      c.contains('chart-card') ||
      c.contains('table-card') ||
      c.contains('portal-module-card-shell') ||
      c.contains('portal-module-card__hit') ||
      c.contains('portal-module-card__body') ||
      c.contains('portal-oee-tab') ||
      c.contains('btn-soft') ||
      c.contains('icon-btn') ||
      c.contains('portal-icon-btn') ||
      c.contains('panel-close') ||
      c.contains('module-dialog') ||
      c.contains('portal-quick-item') ||
      c.contains('search-kpi') ||
      c.contains('period-select') ||
      c.contains('asst-tool') ||
      c.contains('asst-settings')
    );
  }

  /** ¿Este nodo o un ancestro (pocos niveles) debe disparar sonido? */
  function wantsUiSound(target) {
    if (!target || target.nodeType !== 1) return false;
    if (isTextInput(target)) return false;
    if (target.closest && target.closest('#scorecard-audio-wrap')) return false;

    var cur = target;
    for (var depth = 0; depth < 10 && cur && cur !== document.documentElement; depth++) {
      if (cur.hasAttribute && cur.hasAttribute('data-no-ui-sound')) return false;
      if (cur.id === 'scorecard-audio-toggle') return false;

      var tag = cur.tagName;
      if (tag === 'BUTTON' || tag === 'SUMMARY') return true;
      if (tag === 'LABEL') return true;
      if (tag === 'SELECT') return true;
      if (tag === 'A' && cur.getAttribute('href')) return true;
      if (tag === 'INPUT') {
        var type = (cur.type || '').toLowerCase();
        if (/^(button|submit|reset|checkbox|radio|file)$/i.test(type)) return true;
      }
      var role = cur.getAttribute && cur.getAttribute('role');
      if (role === 'tab' || role === 'button' || role === 'link') return true;

      var pid = cur.id;
      if (
        pid === 'drill-panel' ||
        pid === 'module-panel' ||
        pid === 'excel-panel' ||
        pid === 'cmd-palette' ||
        pid === 'asst-drawer' ||
        pid === 'asst-fab' ||
        pid === 'drill-body' ||
        pid === 'asst-messages'
      ) {
        return true;
      }

      if (classMatches(cur)) return true;

      cur = cur.parentElement;
    }
    return false;
  }

  function release(a) {
    try {
      a.pause();
      a.currentTime = 0;
    } catch (_) {}
    if (pool.length < POOL) pool.push(a);
  }

  function playOnce() {
    if (!shouldPlay()) return;
    var now = Date.now();
    if (now - lastPlay < throttleMs) return;
    lastPlay = now;

    var a = pool.pop();
    if (!a) {
      a = new Audio(src);
      a.preload = 'auto';
    }
    a.volume = volume;
    try {
      a.currentTime = 0;
    } catch (_) {}

    var p = a.play();
    if (p && p.then) {
      p.then(function () {
        setTimeout(function () {
          release(a);
        }, 400);
      }).catch(function () {
        release(a);
      });
    } else {
      release(a);
    }
  }

  function onClick(e) {
    if (e.button != null && e.button !== 0) return;
    if (!wantsUiSound(e.target)) return;
    playOnce();
  }

  document.addEventListener('click', onClick, true);

  try {
    var preload = new Audio(src);
    preload.preload = 'auto';
    preload.load();
  } catch (_) {}
})();
