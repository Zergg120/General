/**
 * 2BI: fecha/hora (zona del navegador), tour de la web, accesos rápidos.
 */
(function () {
  'use strict';

  var MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function render(el) {
    if (!el) return;
    var d = new Date();
    var day = d.getDate();
    var mon = MONTHS[d.getMonth()];
    var yr = d.getFullYear();
    var wk = WD[d.getDay()];
    var lineDate = wk + ' · ' + day + ' ' + mon + ' ' + yr;
    var lineTime;
    try {
      lineTime = d.toLocaleTimeString(undefined, {
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
      lineTime = h + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' ' + ampm;
    }
    el.innerHTML =
      '<span class="p2bi-d">' +
      lineDate +
      '</span><span class="p2bi-t">' +
      lineTime +
      '</span>';
  }

  function mountDatetime() {
    var el = document.getElementById('p2bi-datetime-mount');
    if (!el) return;
    render(el);
    setInterval(function () {
      render(el);
    }, 1000);
  }

  var THEME_KEY = 'p2bi_theme';
  function getTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (_) {
      return null;
    }
  }
  function applyTheme(mode) {
    var dark = mode === 'dark';
    document.body.classList.toggle('p2bi-dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch (_) {}
    var b = document.getElementById('p2bi-btn-theme');
    if (b) {
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
      b.setAttribute('aria-label', dark ? 'Cambiar a modo Sol (claro)' : 'Cambiar a modo Luna (oscuro)');
      b.title = dark ? 'Modo Luna (oscuro)' : 'Modo Sol (claro)';
      b.textContent = dark ? '🌙' : '☀';
    }
  }

  function closeDialog(id) {
    var o = document.getElementById(id);
    if (!o) return;
    o.hidden = true;
    o.setAttribute('aria-hidden', 'true');
  }

  function openDialog(id) {
    var o = document.getElementById(id);
    if (!o) return;
    o.hidden = false;
    o.setAttribute('aria-hidden', 'false');
    var btn = o.querySelector('.p2bi-dialog__close');
    if (btn) btn.focus();
  }

  function ensureDialogs() {
    if (document.getElementById('p2bi-overlay-tour')) return;

    var tour = document.createElement('div');
    tour.id = 'p2bi-overlay-tour';
    tour.className = 'p2bi-overlay';
    tour.hidden = true;
    tour.setAttribute('aria-hidden', 'true');
    tour.setAttribute('role', 'dialog');
    tour.setAttribute('aria-modal', 'true');
    tour.setAttribute('aria-labelledby', 'p2bi-tour-title');
    tour.innerHTML =
      '<div class="p2bi-dialog">' +
      '<button type="button" class="p2bi-dialog__close" id="p2bi-tour-x" aria-label="Cerrar">×</button>' +
      '<h2 id="p2bi-tour-title">Tour del sitio</h2>' +
      '<p><strong>Inicio:</strong> mensaje principal, indicadores de ejemplo (ilustrativos), franja de confianza y carrusel de tecnologías. Pasa el cursor sobre el carrusel para pausarlo.</p>' +
      '<p><strong>Menú superior:</strong> <em>Nosotros</em> (quiénes somos), <em>Soluciones</em> (líneas de servicio y ejemplos), <em>Valores</em> y <em>Ecosistema</em> (stack e integraciones).</p>' +
      '<p><strong>Hablemos:</strong> abre tu correo con los tres contactos del equipo para que elijas a quién escribir (o a todos).</p>' +
      '<p><strong>Herramientas:</strong> bocina para música ambiental (primer clic o tecla puede desbloquear audio en el navegador); <em>Tour</em> es esta guía; <em>⌘K</em> son accesos rápidos a secciones.</p>' +
      '<p><strong>Chat flotante (robot):</strong> asistente demo con respuestas locales en el navegador, para mostrar la experiencia.</p>' +
      '</div>';
    document.body.appendChild(tour);

    var cmd = document.createElement('div');
    cmd.id = 'p2bi-overlay-cmd';
    cmd.className = 'p2bi-overlay';
    cmd.hidden = true;
    cmd.setAttribute('aria-hidden', 'true');
    cmd.setAttribute('role', 'dialog');
    cmd.setAttribute('aria-modal', 'true');
    cmd.setAttribute('aria-labelledby', 'p2bi-cmd-title');
    cmd.innerHTML =
      '<div class="p2bi-dialog">' +
      '<button type="button" class="p2bi-dialog__close" id="p2bi-cmd-x" aria-label="Cerrar">×</button>' +
      '<h2 id="p2bi-cmd-title">Accesos rápidos</h2>' +
      '<p style="margin-bottom:0.4rem">Saltos a las secciones principales del sitio.</p>' +
      '<ul class="p2bi-cmd-list">' +
      '<li><a href="index.html">Inicio</a></li>' +
      '<li><a href="nosotros.html">Nosotros</a></li>' +
      '<li><a href="soluciones.html">Soluciones</a></li>' +
      '<li><a href="index.html#section-kpis">KPIs y ejemplos</a></li>' +
      '<li><a href="valores.html">Valores</a></li>' +
      '<li><a href="ecosistema.html">Ecosistema</a></li>' +
      '<li><a href="contacto.html">Contacto</a></li>' +
      '</ul>' +
      '</div>';
    document.body.appendChild(cmd);

    tour.addEventListener('click', function (e) {
      if (e.target === tour) closeDialog('p2bi-overlay-tour');
    });
    cmd.addEventListener('click', function (e) {
      if (e.target === cmd) closeDialog('p2bi-overlay-cmd');
    });

    document.getElementById('p2bi-tour-x').addEventListener('click', function () {
      closeDialog('p2bi-overlay-tour');
    });
    document.getElementById('p2bi-cmd-x').addEventListener('click', function () {
      closeDialog('p2bi-overlay-cmd');
    });
  }

  function ensureExploreBar() {
    if (document.getElementById('p2bi-explorebar')) return;
    var header = document.querySelector('.site-header');
    if (!header) return;

    var bar = document.createElement('div');
    bar.id = 'p2bi-explorebar';
    bar.className = 'p2bi-explorebar';
    bar.hidden = true;
    bar.setAttribute('aria-hidden', 'true');

    var base = (document.documentElement && document.documentElement.getAttribute('data-page')) || '';
    // Links: en otras páginas apuntamos a index.html con hash.
    var isIndex = base === 'index';
    function href(hash) {
      return isIndex ? hash : 'index.html' + hash;
    }

    bar.innerHTML =
      '<div class="p2bi-explorebar__inner" role="navigation" aria-label="Explorar">' +
      '<a class="explore-chip" href="' +
      href('#section-dashboard') +
      '"><span class="explore-chip__icon" aria-hidden="true">📊</span> Gráficos interactivos</a>' +
      '<a class="explore-chip" href="' +
      href('#section-kpis') +
      '"><span class="explore-chip__icon" aria-hidden="true">📈</span> KPIs y ejemplos</a>' +
      '<a class="explore-chip" href="' +
      href('#chat-demo-heading') +
      '"><span class="explore-chip__icon" aria-hidden="true">💬</span> Chat demo</a>' +
      '<a class="explore-chip" href="soluciones.html"><span class="explore-chip__icon" aria-hidden="true">◎</span> 6 soluciones + ejemplos</a>' +
      '<a class="explore-chip" href="ecosistema.html"><span class="explore-chip__icon" aria-hidden="true">⬡</span> Ecosistema técnico</a>' +
      '<a class="explore-chip" href="nosotros.html"><span class="explore-chip__icon" aria-hidden="true">◇</span> Quiénes somos</a>' +
      '<a class="explore-chip explore-chip--accent" href="contacto.html"><span class="explore-chip__icon" aria-hidden="true">→</span> Agendar llamada</a>' +
      '</div>';

    // Inserta justo debajo de la barra principal
    header.appendChild(bar);
  }

  var EXPLORE_OPEN_KEY = 'p2bi_explore_open';
  function getExploreOpen() {
    try {
      return sessionStorage.getItem(EXPLORE_OPEN_KEY) === '1';
    } catch (_) {
      return false;
    }
  }
  function setExploreOpenPref(open) {
    try {
      sessionStorage.setItem(EXPLORE_OPEN_KEY, open ? '1' : '0');
    } catch (_) {}
  }

  function setExploreOpen(open) {
    var bar = document.getElementById('p2bi-explorebar');
    if (!bar) return;
    bar.hidden = !open;
    bar.setAttribute('aria-hidden', open ? 'false' : 'true');
    var b = document.getElementById('p2bi-nav-explore');
    if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
    setExploreOpenPref(open);
  }

  function wireButtons() {
    var bt = document.getElementById('p2bi-btn-tour');
    var bc = document.getElementById('p2bi-btn-cmd');
    var th = document.getElementById('p2bi-btn-theme');
    var ex = document.getElementById('p2bi-nav-explore');
    if (bt) {
      bt.addEventListener('click', function () {
        var c = document.getElementById('p2bi-overlay-cmd');
        if (c && !c.hidden) closeDialog('p2bi-overlay-cmd');
        openDialog('p2bi-overlay-tour');
      });
    }
    if (bc) {
      bc.addEventListener('click', function () {
        var t = document.getElementById('p2bi-overlay-tour');
        if (t && !t.hidden) closeDialog('p2bi-overlay-tour');
        openDialog('p2bi-overlay-cmd');
      });
    }
    if (th) {
      th.addEventListener('click', function () {
        var isDark = document.body.classList.contains('p2bi-dark');
        applyTheme(isDark ? 'light' : 'dark');
      });
    }
    if (ex) {
      ex.addEventListener('click', function () {
        var bar = document.getElementById('p2bi-explorebar');
        var open = !!(bar && !bar.hidden);
        setExploreOpen(!open);
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeDialog('p2bi-overlay-tour');
        closeDialog('p2bi-overlay-cmd');
        setExploreOpen(false);
      }
      var k = e.key && e.key.toLowerCase();
      if (k === 'k' && (e.metaKey || e.ctrlKey)) {
        var t = e.target;
        if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
        e.preventDefault();
        closeDialog('p2bi-overlay-tour');
        openDialog('p2bi-overlay-cmd');
      }
    });

    // Clic fuera cierra Explorar
    document.addEventListener(
      'click',
      function (e) {
        var bar = document.getElementById('p2bi-explorebar');
        if (!bar || bar.hidden) return;
        var exBtn = document.getElementById('p2bi-nav-explore');
        var t = e.target;
        if (exBtn && (t === exBtn || (t && exBtn.contains && exBtn.contains(t)))) return;
        if (t && t.closest && t.closest('#p2bi-explorebar')) return;
        setExploreOpen(false);
      },
      true
    );
  }

  function init() {
    // Default: Sol (claro). Si ya eligió, respetar.
    var t = getTheme();
    if (t === 'dark') applyTheme('dark');
    else applyTheme('light');
    mountDatetime();
    ensureDialogs();
    ensureExploreBar();
    wireButtons();

    // Si veníamos navegando con Explorar abierto, mantenerlo abierto.
    if (getExploreOpen()) {
      setTimeout(function () {
        setExploreOpen(true);
      }, 0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
