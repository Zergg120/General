/**
 * Barra mínima: En línea / sin conexión + reloj hora local.
 * En segundo plano: sincronización diaria (evento scorecard:dailydatasync) sin mostrar textos extra.
 */
(function () {
  'use strict';

  var STORAGE_DAY = 'scorecard_sync_calendar_day';
  var STORAGE_MS = 'scorecard_sync_last_ms';

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  /** Reloj en el huso del usuario (ej. 11:46:08 a. m.) */
  function formatLiveClock(d) {
    try {
      return d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch (_) {
      var h = d.getHours();
      var ampm = h >= 12 ? 'p. m.' : 'a. m.';
      h = h % 12;
      if (h === 0) h = 12;
      return h + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' ' + ampm;
    }
  }

  function tickClock() {
    var el = document.getElementById('scorecard-live-clock');
    if (el) el.textContent = formatLiveClock(new Date());
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function runDailyIfNeeded() {
    var key = todayKey();
    var stored = null;
    try {
      stored = localStorage.getItem(STORAGE_DAY);
    } catch (_) {}
    if (stored === key) return false;
    try {
      localStorage.setItem(STORAGE_DAY, key);
      localStorage.setItem(STORAGE_MS, String(Date.now()));
    } catch (_) {}
    document.dispatchEvent(
      new CustomEvent('scorecard:dailydatasync', {
        detail: { day: key, at: Date.now() },
      })
    );
    return true;
  }

  function render(el) {
    if (!el) return;
    var online = navigator.onLine;
    el.innerHTML =
      '<span class="scorecard-status-pill scorecard-status-pill--' +
      (online ? 'ok' : 'bad') +
      '">' +
      (online ? 'En línea' : 'Sin conexión') +
      '</span>' +
      '<span class="scorecard-status-sep" aria-hidden="true"></span>' +
      '<span class="scorecard-status-clock-wrap"><strong id="scorecard-live-clock" class="scorecard-status-clock"></strong></span>';
  }

  function mount() {
    var mountEl = document.getElementById('scorecard-status-mount');
    if (!mountEl) return;
    var bar = document.createElement('div');
    bar.className = 'scorecard-status-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Estado de conexión y hora local');
    mountEl.appendChild(bar);

    var clockTimer = null;
    function startClockTimer() {
      if (clockTimer != null) return;
      tickClock();
      clockTimer = setInterval(tickClock, 1000);
    }
    function stopClockTimer() {
      if (clockTimer != null) {
        clearInterval(clockTimer);
        clockTimer = null;
      }
    }

    render(bar);
    runDailyIfNeeded();
    startClockTimer();

    window.addEventListener('online', function () {
      render(bar);
      tickClock();
    });
    window.addEventListener('offline', function () {
      render(bar);
      tickClock();
    });

    setInterval(function () {
      runDailyIfNeeded();
    }, 60 * 1000);

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        stopClockTimer();
      } else {
        runDailyIfNeeded();
        render(bar);
        startClockTimer();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
