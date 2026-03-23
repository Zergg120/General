/**
 * Auto-actualización: consulta un endpoint ligero del servidor y, si los datos cambiaron,
 * recarga la página (sin F5 manual). Desactivado si no defines window.SCORECARD_LIVE_POLL.url
 *
 * @example
 * <script>
 * window.SCORECARD_LIVE_POLL = {
 *   url: '/api/scorecard/version',
 *   intervalMs: 120000,
 *   credentials: 'include',
 * };
 * </script>
 */
(function () {
  'use strict';

  var cfg = window.SCORECARD_LIVE_POLL || {};
  if (cfg.enabled === false) return;
  var url = (cfg.url && String(cfg.url).trim()) || '';
  if (!url || typeof fetch !== 'function') return;

  var intervalMs = Math.max(cfg.minIntervalMs || 30000, Number(cfg.intervalMs) || 120000);
  var lastSig = null;
  var timer = null;
  var checking = false;
  var hinted = false;

  function extractSignature(res, body) {
    if (body && typeof body === 'object') {
      if (body.checksum != null) return 'c:' + String(body.checksum);
      if (body.version != null) return 'v:' + String(body.version);
      if (body.updatedAt != null) return 'u:' + String(body.updatedAt);
      if (body.etag != null) return 'e:' + String(body.etag);
      if (body.rev != null) return 'r:' + String(body.rev);
    }
    var etag = res.headers.get('ETag');
    if (etag) return 'h:' + etag;
    var lm = res.headers.get('Last-Modified');
    if (lm) return 'h:' + lm;
    return null;
  }

  function addHint() {
    if (cfg.showHint === false || hinted) return;
    var bar = document.querySelector('.scorecard-status-bar');
    if (!bar) return;
    hinted = true;
    var el = document.createElement('span');
    el.className = 'scorecard-live-hint';
    el.setAttribute('aria-hidden', 'true');
    var min = Math.max(1, Math.round(intervalMs / 60000));
    el.textContent = ' · Auto';
    el.title =
      'Comprobando el servidor cada ~' + min + ' min. Si hay datos nuevos, la página se actualiza sola.';
    bar.appendChild(el);
  }

  function check() {
    if (checking || document.visibilityState === 'hidden') return;
    checking = true;
    var init = {
      method: cfg.method || 'GET',
      cache: 'no-store',
      credentials: cfg.credentials || 'same-origin',
      headers: Object.assign({ Accept: 'application/json, text/plain, */*' }, cfg.headers || {}),
    };
    fetch(url, init)
      .then(function (res) {
        if (!res.ok) return null;
        var ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.indexOf('json') >= 0) {
          return res.json().then(function (body) {
            return { res: res, body: body };
          });
        }
        return { res: res, body: null };
      })
      .then(function (pair) {
        if (!pair) return;
        var sig = extractSignature(pair.res, pair.body);
        if (sig === null) {
          if (cfg.debug) {
            console.warn(
              '[Scorecard live] Respuesta sin checksum/version/updatedAt/ETag/Last-Modified; no se detectan cambios.'
            );
          }
          return;
        }
        if (lastSig === null) {
          lastSig = sig;
          addHint();
          return;
        }
        if (sig !== lastSig) {
          lastSig = sig;
          document.dispatchEvent(
            new CustomEvent('scorecard:liveupdate', {
              detail: { url: url, signature: sig },
            })
          );
          if (cfg.reload !== false) {
            window.location.reload();
          }
        }
      })
      .catch(function () {
        /* offline o CORS: no recargar */
      })
      .then(function () {
        checking = false;
      });
  }

  function start() {
    stop();
    check();
    timer = setInterval(check, intervalMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function boot() {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') stop();
      else start();
    });
    start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
