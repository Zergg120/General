/**
 * Tema portal: misma clave que scorecard-assistant.js (scorecard_theme).
 */
(function () {
  var KEY = 'scorecard_theme';

  function applySaved() {
    try {
      if (localStorage.getItem(KEY) === 'light') {
        document.body.classList.add('portal-light');
      } else {
        document.body.classList.remove('portal-light');
      }
    } catch (e) { /* ignore */ }
  }

  function persist() {
    try {
      localStorage.setItem(KEY, document.body.classList.contains('portal-light') ? 'light' : 'dark');
    } catch (e) { /* ignore */ }
  }

  function bindThemeButton(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', function () {
      document.body.classList.toggle('portal-light');
      persist();
      btn.setAttribute('aria-pressed', document.body.classList.contains('portal-light') ? 'true' : 'false');
      btn.textContent = document.body.classList.contains('portal-light') ? '☾' : '☼';
    });
  }

  function tickRefresh(id) {
    var el = document.getElementById(id);
    if (!el) return;
    function fmt() {
      var d = new Date();
      var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' '
        + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    el.textContent = fmt();
    setInterval(function () { el.textContent = fmt(); }, 60000);
  }

  document.addEventListener('DOMContentLoaded', function () {
    applySaved();
    bindThemeButton('portal-btn-theme');
    tickRefresh('portal-refresh-time');
    var btn = document.getElementById('portal-btn-theme');
    if (btn && document.body.classList.contains('portal-light')) {
      btn.textContent = '☾';
      btn.setAttribute('aria-pressed', 'true');
    }
  });
})();
