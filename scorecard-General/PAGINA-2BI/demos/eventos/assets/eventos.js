(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ——— Tema claro / oscuro ——— */
  var STORAGE_THEME = "2bi_orquesta_theme_v1";

  function getPreferredTheme() {
    try {
      var stored = localStorage.getItem(STORAGE_THEME);
      if (stored === "light" || stored === "dark") return stored;
    } catch (e) {}
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
    return "dark";
  }

  function applyTheme(theme) {
    var t = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(STORAGE_THEME, t);
    } catch (e) {}
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", t === "light" ? "#f3efe8" : "#0a080c");
    var toLight = t === "dark";
    document.querySelectorAll(".js-theme-toggle").forEach(function (btn) {
      btn.setAttribute("aria-pressed", toLight ? "false" : "true");
      btn.setAttribute("aria-label", toLight ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    });
  }

  applyTheme(getPreferredTheme());
  document.querySelectorAll(".js-theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      applyTheme(cur === "dark" ? "light" : "dark");
    });
  });

  /* ——— Scroll progress, header, nav activo, stagger, contadores, parallax, lightbox ——— */
  (function initEffects() {
    var progress = document.querySelector(".js-scroll-progress");
    var head = document.querySelector(".js-site-header");
    function onScroll() {
      var h = document.documentElement;
      var scroll = h.scrollTop || document.body.scrollTop;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (scroll / max) * 100 : 0;
      if (progress) progress.style.width = pct + "%";
      if (head) head.classList.toggle("is-scrolled", scroll > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var anchorRail = document.querySelector(".js-anchor-rail");
    function anchorRailScroll() {
      if (!anchorRail) return;
      var y = document.documentElement.scrollTop || document.body.scrollTop;
      anchorRail.classList.toggle("is-visible", y > 320);
    }
    if (anchorRail) {
      window.addEventListener("scroll", anchorRailScroll, { passive: true });
      anchorRailScroll();
    }

    var railNav = document.querySelector(".js-anchor-rail");
    if (railNav) {
      var spyLinks = railNav.querySelectorAll("a[href^='#']");
      var sectionIds = Array.prototype.map.call(spyLinks, function (a) {
        return (a.getAttribute("href") || "").slice(1);
      });
      function scrollSpy() {
        var headH = document.querySelector(".js-site-header");
        var offset = (headH && headH.offsetHeight ? headH.offsetHeight : 72) + 44;
        var activeId = sectionIds[0] || "";
        for (var i = sectionIds.length - 1; i >= 0; i--) {
          var sec = document.getElementById(sectionIds[i]);
          if (sec && sec.getBoundingClientRect().top <= offset) {
            activeId = sectionIds[i];
            break;
          }
        }
        spyLinks.forEach(function (a) {
          var id = (a.getAttribute("href") || "").slice(1);
          var on = id === activeId;
          a.classList.toggle("is-active", on);
          if (on) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        });
      }
      window.addEventListener("scroll", scrollSpy, { passive: true });
      scrollSpy();
    }

    var path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (!path || path === "") path = "index.html";
    var navMap = {
      "index.html": "index",
      "galeria.html": "galeria",
      "experiencia.html": "experiencia",
      "paquetes.html": "paquetes",
      "contacto.html": "contacto",
    };
    var navKey = navMap[path] || "";
    document.querySelectorAll(".nav__link[data-nav]").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-nav") === navKey);
    });

    document.querySelectorAll(".js-reveal-stagger").forEach(function (el) {
      if (!("IntersectionObserver" in window)) {
        el.classList.add("is-visible");
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              en.target.classList.add("is-visible");
              io.unobserve(en.target);
            }
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.06 }
      );
      io.observe(el);
    });

    function animateCount(el, target, duration, opts) {
      opts = opts || {};
      var prefix = opts.prefix || "";
      var suffix = opts.suffix || "";
      var t0 = null;
      function frame(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = Math.round(eased * target);
        el.textContent = prefix + val + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    document.querySelectorAll(".js-count-up").forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-target") || "0", 10);
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      if (!("IntersectionObserver" in window)) {
        el.textContent = prefix + target + suffix;
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              animateCount(el, target, 1100, { prefix: prefix, suffix: suffix });
              io.unobserve(el);
            }
          });
        },
        { threshold: 0.35 }
      );
      io.observe(el);
    });

    document.querySelectorAll(".js-parallax").forEach(function (wrap) {
      var amt = parseFloat(wrap.getAttribute("data-parallax") || "0.06", 10);
      var img = wrap.querySelector("img");
      if (!img) return;
      function upd() {
        var r = wrap.getBoundingClientRect();
        var cy = r.top + r.height / 2;
        var vh = window.innerHeight || 1;
        var off = (cy - vh / 2) / vh;
        img.style.transform = "translateY(" + off * amt * -100 + "px)";
      }
      window.addEventListener("scroll", upd, { passive: true });
      window.addEventListener("resize", upd);
      upd();
    });

    var lb = document.querySelector(".js-lightbox");
    var lbImg = document.querySelector(".js-lightbox-img");
    var lbCap = document.querySelector(".js-lightbox-cap");
    var lbClose = document.querySelector(".js-lightbox-close");
    function closeLb() {
      if (!lb) return;
      lb.classList.remove("is-open");
      lb.setAttribute("hidden", "");
      document.body.style.overflow = "";
    }
    function openLb(src, cap) {
      if (!lb || !lbImg) return;
      lbImg.src = src;
      lbImg.alt = cap || "Ampliado";
      if (lbCap) lbCap.textContent = cap || "";
      lb.classList.add("is-open");
      lb.removeAttribute("hidden");
      document.body.style.overflow = "hidden";
    }
    document.querySelectorAll(".js-gallery-item").forEach(function (item) {
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          item.click();
        }
      });
      item.addEventListener("click", function () {
        var full = item.getAttribute("data-full");
        var im = item.querySelector("img");
        openLb(full || (im && im.src) || "", item.getAttribute("data-caption") || (im && im.alt) || "");
      });
    });
    if (lbClose) lbClose.addEventListener("click", closeLb);
    if (lb) {
      lb.addEventListener("click", function (e) {
        if (e.target === lb) closeLb();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLb();
    });
  })();

  /* ——— Capa viva: parallax suave + botones magnéticos (respeta reduced-motion) ——— */
  (function initLivingMotion() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var root = document.documentElement;
    var mesh = document.querySelector(".ambient__mesh");
    var rafParallax = null;
    var lx = 0.5;
    var ly = 0.5;

    function onPointerMove(e) {
      lx = e.clientX / (window.innerWidth || 1);
      ly = e.clientY / (window.innerHeight || 1);
      if (rafParallax) return;
      rafParallax = requestAnimationFrame(function () {
        rafParallax = null;
        var px = (lx - 0.5) * 28;
        var py = (ly - 0.5) * 22;
        root.style.setProperty("--parallax-x", px.toFixed(2) + "px");
        root.style.setProperty("--parallax-y", py.toFixed(2) + "px");
        if (mesh) mesh.style.willChange = "transform";
      });
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.addEventListener(
        "pointermove",
        function (e) {
          if (e.pointerType === "touch") return;
          var r = btn.getBoundingClientRect();
          var dx = (e.clientX - r.left) / r.width - 0.5;
          var dy = (e.clientY - r.top) / r.height - 0.5;
          var cap = btn.classList.contains("btn--sm") ? 4 : 5;
          btn.style.setProperty("--mag-x", (dx * 2 * cap).toFixed(2) + "px");
          btn.style.setProperty("--mag-y", (dy * 2 * cap).toFixed(2) + "px");
        },
        { passive: true }
      );
      btn.addEventListener("pointerleave", function () {
        btn.style.setProperty("--mag-x", "0px");
        btn.style.setProperty("--mag-y", "0px");
      });
    });
  })();

  /* Glow del cursor solo en el hero (respeta reduced-motion) */
  (function initHeroGlowPointer() {
    var hero = document.querySelector(".js-hero-zone");
    if (!hero) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function setFromClient(clientX, clientY) {
      var r = hero.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      var x = ((clientX - r.left) / r.width) * 100;
      var y = ((clientY - r.top) / r.height) * 100;
      hero.style.setProperty("--hero-gx", Math.max(0, Math.min(100, x)) + "%");
      hero.style.setProperty("--hero-gy", Math.max(0, Math.min(100, y)) + "%");
    }

    function resetGlow() {
      hero.style.setProperty("--hero-gx", "50%");
      hero.style.setProperty("--hero-gy", "36%");
    }

    hero.addEventListener(
      "pointermove",
      function (e) {
        setFromClient(e.clientX, e.clientY);
      },
      { passive: true }
    );
    hero.addEventListener("pointerleave", resetGlow);
    hero.addEventListener("pointercancel", resetGlow);
    resetGlow();
  })();

  var STORAGE_PIPELINE = "2bi_orquesta_pipeline_v1";
  var STORAGE_CHECK = "2bi_orquesta_checklist_v1";
  var STORAGE_CHK_TYPE = "2bi_orquesta_check_type_v1";

  /* ——— Nav ——— */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".js-nav-toggle");
  var panel = document.querySelector(".js-nav-panel");
  var drawer = document.querySelector(".js-nav-drawer");

  function setNavOpen(open) {
    if (!header) return;
    header.classList.toggle("is-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }

  function focusables(container) {
    if (!container) return [];
    return Array.prototype.slice
      .call(
        container.querySelectorAll(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
      )
      .filter(function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      });
  }

  if (toggle && header) {
    toggle.addEventListener("click", function () {
      var open = !header.classList.contains("is-open");
      setNavOpen(open);
      if (open && drawer) {
        var link = drawer.querySelector("a");
        if (link) link.focus();
      }
    });
  }
  if (panel) {
    panel.addEventListener("click", function (e) {
      if (e.target === panel) setNavOpen(false);
    });
  }
  if (drawer) {
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        setNavOpen(false);
      });
    });
  }
  document.addEventListener("keydown", function (e) {
    if (!header || !header.classList.contains("is-open")) return;
    if (e.key === "Escape") {
      setNavOpen(false);
      if (toggle) toggle.focus();
      return;
    }
    if (e.key !== "Tab" || !drawer) return;
    var items = focusables(drawer);
    if (items.length === 0) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 960px)").matches) setNavOpen(false);
  });

  /* ——— Reveal ——— */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ——— Chart bars ——— */
  var chartRoot = document.getElementById("chart-bars");
  if (chartRoot) {
    var heights = [42, 58, 35, 72, 48, 88, 55, 92, 65];
    heights.forEach(function (h) {
      var d = document.createElement("div");
      d.className = "chart-bars__item";
      d.style.height = h + "%";
      d.title = "Mes ilustrativo";
      chartRoot.appendChild(d);
    });
  }

  /* ——— AI replies (local, extensible) ——— */
  function replyAI(text) {
    var t = (text || "").toLowerCase();
    if (!t.trim()) return "Escribe una pregunta o usa un atajo arriba.";

    if (
      t.indexOf("plan b") !== -1 ||
      t.indexOf("lluvia") !== -1 ||
      t.indexOf("climát") !== -1 ||
      t.indexOf("climatic") !== -1
    ) {
      return (
        "**Plan B climático:** confirma **toldo o cierre**, **drenaje** en jardín y **tiempo máximo** para reconfigurar el salón. " +
        "Define **quién decide** el cambio el día del evento, si hay **costos extra** (carpa, personal) y **umbrales** acordados. " +
        "Inclúyelo en el contrato y haz **prueba de sonido** también en la configuración alterna."
      );
    }
    if (
      (t.indexOf("contrato") !== -1 || t.indexOf("firmar") !== -1) &&
      (t.indexOf("xv") !== -1 || t.indexOf("quince") !== -1)
    ) {
      return (
        "Al **cerrar salón para XV**, valida por escrito: **horario** (ensayo, evento, desalojo), **rango de invitados** y **mesa extra**, " +
        "**proveedores externos**, **penalidades** por cancelación o cambio de fecha, **anticipos** y qué cubre **decoración / coordinación**. " +
        "Pide **planta** con pista, mesa imperial y espacio de vals."
      );
    }
    if (
      t.indexOf("mejor opci") !== -1 ||
      t.indexOf("mejor opcion") !== -1 ||
      (t.indexOf("boda") !== -1 && (t.indexOf("salón") !== -1 || t.indexOf("salon") !== -1 || t.indexOf("mejor") !== -1))
    ) {
      return (
        "Para sentir que **este salón** es tu mejor opción en **boda**, contrasta cuatro cosas: (1) **capacidad y layout** real vs. tu lista de invitados, " +
        "(2) **qué está incluido** en el paquete (no solo el precio base), (3) **coordinación día B** — ¿hay equipo dedicado?, " +
        "(4) **reseñas y referidos** de bodas recientes. Si encajan con lo que viste en galería y cotizador, agenda visita con preguntas concretas: horarios de carga, plan B climático y política de proveedores externos."
      );
    }
    if (t.indexOf("pregunt") !== -1 && (t.indexOf("xv") !== -1 || t.indexOf("quince") !== -1 || t.indexOf("visita") !== -1)) {
      return (
        "En la **visita por XV**, pregunta: horas de salón y si hay **ensayo de vals**, **cambio de look** y espacio para **chambelanes**, " +
        "límite de **invitados** y **mesas**, **sonido y pantallas** para video homenaje, **comida** (menú infantil / intolerancias), " +
        "**decoración** incluida vs. extra, y **fecha límite** para confirmar pax. Anota todo en el checklist de esta página."
      );
    }
    if (t.indexOf("comparar") !== -1 && (t.indexOf("paquete") !== -1 || t.indexOf("salón") !== -1 || t.indexOf("salon") !== -1)) {
      return (
        "Para **comparar paquetes** sin volverte loca: haz una tabla con columnas **precio**, **horas**, **comida/barra**, **personal** (meseros/coordinación), " +
        "**mobiliario**, **pista/DJ**, **extras** (foto, cabina, coctel). Usa el **mismo número de invitados** en cada cotización. " +
        "Lo barato que esconde cargos después suele perder contra lo claro desde el inicio — como en el cotizador de esta demo."
      );
    }
    if (t.indexOf("checklist") !== -1 || t.indexOf("6 meses") !== -1 || t.indexOf("seis meses") !== -1) {
      return (
        "Para **boda 6 meses**: (1) fecha y venue, (2) presupuesto maestro, (3) lista de invitados v1, " +
        "(4) proveedores clave: fotografía, música, catering, (5) prueba de menú, (6) invitaciones y web, " +
        "(7) plan B climático. Puedes marcar el checklist en esta misma página."
      );
    }
    if (t.indexOf("quince") !== -1 || t.indexOf("xv") !== -1 || t.indexOf("llamada") !== -1) {
      return (
        "Guion sugerido: saludo cálido + felicitación por la fecha → **descubrir** tema/colores y número de invitados → " +
        "proponer **visita** con 2 opciones de horario → enviar brochure por WhatsApp → recordatorio cortés en 48h."
      );
    }
    if (t.indexOf("upsell") !== -1 || t.indexOf("premium") !== -1) {
      return (
        "Upsell premium: **cabina 360** o **drone** en paquete Imperial, **coctel extendido** con signature, " +
        "**suite de novios** o **cuarto de valientes** para XV, y **coordinación día B** con timeline minuto a minuto."
      );
    }
    if (t.indexOf("timeline") !== -1 || t.indexOf("150") !== -1) {
      return (
        "Timeline 150 pax (referencia): **T-2h** preparación y fotos detalle → **T-1h** invitados → **ceremonia 45′** → " +
        "**coctel 60′** → **entrada protocolo** → **cena** → **brindis** → **fiesta** (DJ + hora loca). Ajusta según tu ritmo local."
      );
    }
    if (t.indexOf("disponibilidad") !== -1 || t.indexOf("fecha") !== -1) {
      return (
        "Para disponibilidad real: conecta un **calendario** (Google/Microsoft) o tu CRM. Aquí puedes simular " +
        "reglas: fines de mes suelen saturarse primero; propone **2–3 alternativas** al cliente."
      );
    }
    if (t.indexOf("proveedor") !== -1 || t.indexOf("dj") !== -1 || t.indexOf("catering") !== -1) {
      return (
        "Mantén proveedores **homologados** (seguro + bitácora). Prioriza: catering con **prueba de menú**, DJ con **playlist** " +
        "y plan de respaldo, decoración con **render** o moodboard. Registra todo en un solo lugar para el día del evento."
      );
    }
    if (t.indexOf("hola") !== -1 || t.indexOf("ayuda") !== -1) {
      return (
        "Soy el **Copiloto 2BI**. Te ayudo a **decidir con calma** si este salón encaja con tu **boda** o tus **XV**: checklist, qué preguntar en la visita, " +
        "comparar paquetes, timeline del día o proveedores. Usa los atajos de arriba o el micrófono."
      );
    }

    return (
      "Entendido: *" +
      (text.length > 120 ? text.slice(0, 117) + "…" : text) +
      "*. Para producción, conecta un modelo vía API y envía el contexto del salón (paquetes, precios, políticas). " +
      "Así las respuestas serán 100% alineadas a tu operación."
    );
  }

  function formatMsg(s) {
    return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  var chatMessages = document.querySelector(".js-chat-messages");
  var chatInput = document.querySelector(".js-chat-input");
  var chatSend = document.querySelector(".js-chat-send");
  var chatWindowEl = document.querySelector(".chat-window");

  function setChatSending(busy) {
    if (chatSend) {
      chatSend.classList.toggle("is-busy", busy);
      chatSend.setAttribute("aria-busy", busy ? "true" : "false");
    }
    if (chatWindowEl) chatWindowEl.classList.toggle("chat-window--busy", busy);
  }

  function chatMotionOk() {
    return !window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function appendMsg(role, html, opts) {
    opts = opts || {};
    if (!chatMessages) return;
    var div = document.createElement("div");
    div.className = "msg " + (role === "user" ? "msg--user" : "msg--bot");
    if (opts.animate && chatMotionOk()) {
      div.classList.add("msg--pop-in");
      div.addEventListener(
        "animationend",
        function onPop(ev) {
          if (ev.animationName !== "msg-pop-in") return;
          div.removeEventListener("animationend", onPop);
          div.classList.remove("msg--pop-in");
        }
      );
    }
    div.innerHTML = html;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function sendChat() {
    if (!chatInput) return;
    var v = chatInput.value.trim();
    if (!v) return;
    setChatSending(true);
    appendMsg("user", escapeHtml(v), { animate: true });
    chatInput.value = "";
    setTimeout(function () {
      appendMsg("bot", formatMsg(replyAI(v)), { animate: true });
      setChatSending(false);
    }, 280);
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  if (chatSend && chatInput) {
    chatSend.addEventListener("click", sendChat);
    chatInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendChat();
    });
  }

  document.querySelectorAll(".quick-prompts button[data-prompt]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var p = btn.getAttribute("data-prompt");
      if (chatInput && p) {
        chatInput.value = p;
        sendChat();
      }
    });
  });

  if (chatMessages) {
    appendMsg(
      "bot",
      "Hola. Soy el <strong>Copiloto 2BI</strong>: estoy aquí para que sepas <strong>por qué este salón</strong> puede ser la mejor elección para tu <strong>boda</strong> o tus <strong>XV</strong> — con respuestas claras sobre visita, paquetes y día B. ¿Qué te gustaría resolver primero?",
      { animate: false }
    );
  }

  /* ——— Voice ——— */
  var voiceBtn = document.querySelector(".js-voice-btn");
  if (voiceBtn && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = new SpeechRecognition();
    rec.lang = "es-MX";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    voiceBtn.addEventListener("click", function () {
      try {
        rec.start();
        voiceBtn.textContent = "…";
      } catch (e) {
        voiceBtn.textContent = "Dictar";
      }
    });
    rec.onresult = function (ev) {
      var t = ev.results[0][0].transcript;
      if (chatInput) {
        chatInput.value = t;
        sendChat();
      }
      voiceBtn.textContent = "Dictar";
    };
    rec.onerror = function () {
      voiceBtn.textContent = "Dictar";
    };
    rec.onend = function () {
      if (voiceBtn.textContent === "…") voiceBtn.textContent = "Dictar";
    };
  } else if (voiceBtn) {
    voiceBtn.disabled = true;
    voiceBtn.title = "Dictado no disponible en este navegador";
  }

  /* ——— Pipeline ——— */
  var defaultCols = [
    {
      id: "lead",
      title: "Lead",
      items: [
        { id: "l1", name: "Valeria & Marco", meta: "Boda · 180 pax · junio" },
        { id: "l2", name: "Familia Herrera", meta: "XV Sofía · 120 pax" },
      ],
    },
    {
      id: "visita",
      title: "Visita agendada",
      items: [{ id: "l3", name: "Andrea + Luis", meta: "Boda · tour sáb 11:00" }],
    },
    {
      id: "propuesta",
      title: "Propuesta enviada",
      items: [{ id: "l4", name: "Corporativo Gala Q4", meta: "200 pax · requiere planta" }],
    },
    {
      id: "contrato",
      title: "Contrato / anticipo",
      items: [],
    },
    {
      id: "evento",
      title: "Evento",
      items: [{ id: "l5", name: "Boda R. & J.", meta: "Confirmada · 14 sep" }],
    },
  ];

  function loadPipeline() {
    try {
      var raw = localStorage.getItem(STORAGE_PIPELINE);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return defaultCols;
  }

  function savePipeline(cols) {
    try {
      localStorage.setItem(STORAGE_PIPELINE, JSON.stringify(cols));
    } catch (e) {}
  }

  var pipelineData = loadPipeline();
  var board = document.getElementById("pipeline-board");
  var PIPELINE_THUMBS = [
    "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=120&q=80",
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=120&q=80",
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=120&q=80",
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=120&q=80",
    "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=120&q=80",
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=120&q=80",
    "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=120&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=120&q=80",
  ];

  function thumbForPipelineItem(itemId, seq) {
    var h = 0;
    var s = String(itemId || "");
    for (var i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % 997;
    var idx = (h + seq) % PIPELINE_THUMBS.length;
    return PIPELINE_THUMBS[idx];
  }

  function renderPipeline() {
    if (!board) return;
    board.innerHTML = "";
    var thumbSeq = 0;
    pipelineData.forEach(function (col) {
      var colEl = document.createElement("div");
      colEl.className = "pipeline__col";
      colEl.dataset.colId = col.id;
      var h = document.createElement("h4");
      h.textContent = col.title;
      colEl.appendChild(h);
      col.items.forEach(function (item) {
        var card = document.createElement("div");
        card.className = "lead-card";
        card.draggable = true;
        card.dataset.itemId = item.id;
        var thumb = thumbForPipelineItem(item.id, thumbSeq++);
        card.innerHTML =
          '<div class="lead-card__body">' +
          '<div class="lead-card__media"><img src="' +
          thumb +
          '" alt="" width="48" height="48" loading="lazy" decoding="async" /></div>' +
          '<div class="lead-card__text"><strong>' +
          escapeHtml(item.name) +
          "</strong><span>" +
          escapeHtml(item.meta) +
          "</span></div></div>";
        card.addEventListener("dragstart", onDragStart);
        colEl.appendChild(card);
      });
      colEl.addEventListener("dragover", function (e) {
        e.preventDefault();
      });
      colEl.addEventListener("drop", onDrop);
      board.appendChild(colEl);
    });
  }

  var dragged = { id: null, fromCol: null };

  function onDragStart(e) {
    var card = e.target.closest(".lead-card");
    if (!card) return;
    dragged.id = card.dataset.itemId;
    dragged.fromCol = card.closest(".pipeline__col").dataset.colId;
    e.dataTransfer.setData("text/plain", dragged.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e) {
    e.preventDefault();
    var colEl = e.currentTarget;
    var toColId = colEl.dataset.colId;
    if (!dragged.id || !dragged.fromCol || dragged.fromCol === toColId) return;

    var item = null;
    var fromCol = pipelineData.find(function (c) {
      return c.id === dragged.fromCol;
    });
    var toCol = pipelineData.find(function (c) {
      return c.id === toColId;
    });
    if (!fromCol || !toCol) return;

    var idx = fromCol.items.findIndex(function (i) {
      return i.id === dragged.id;
    });
    if (idx === -1) return;
    item = fromCol.items.splice(idx, 1)[0];
    toCol.items.push(item);
    savePipeline(pipelineData);
    dragged.id = null;
    dragged.fromCol = null;
    renderPipeline();
  }

  if (board) {
    board.addEventListener("dragend", function () {
      dragged.id = null;
      dragged.fromCol = null;
    });
  }

  renderPipeline();

  /* ——— Calculator ——— */
  var calcTipo = document.getElementById("calc-tipo");
  var calcPax = document.getElementById("calc-pax");
  var calcPaq = document.getElementById("calc-paquete");
  var calcExtras = document.getElementById("calc-extras");
  var calcOut = document.getElementById("calc-resultado");
  var calcNota = document.getElementById("calc-nota");

  var baseMult = { esencial: 1, signature: 1.45, imperial: 1.95 };
  var tipoMult = { boda: 1.08, xv: 1, corpo: 0.92 };

  function runCalc() {
    if (!calcOut) return;
    var pax = Math.max(20, Math.min(800, parseInt(calcPax && calcPax.value, 10) || 150));
    var paq = calcPaq && calcPaq.value ? calcPaq.value : "signature";
    var tipo = calcTipo && calcTipo.value ? calcTipo.value : "boda";
    var extras = calcExtras ? parseInt(calcExtras.value, 10) / 100 : 0.35;

    var perHead = 420 + 180 * extras;
    var base = pax * perHead * baseMult[paq] * (tipoMult[tipo] || 1);
    var low = Math.round(base * 0.88);
    var high = Math.round(base * 1.18);
    calcOut.textContent =
      "$ " + low.toLocaleString("es-MX") + " — $ " + high.toLocaleString("es-MX");
    if (calcNota) {
      calcNota.textContent =
        "Incluye estimación de salón + servicios base. Ajusta costos fijos en eventos.js para tu ciudad.";
    }
  }

  ["change", "input"].forEach(function (ev) {
    if (calcTipo) calcTipo.addEventListener(ev, runCalc);
    if (calcPax) calcPax.addEventListener(ev, runCalc);
    if (calcPaq) calcPaq.addEventListener(ev, runCalc);
    if (calcExtras) calcExtras.addEventListener(ev, runCalc);
  });
  runCalc();

  /* ——— Checklist ——— */
  var lists = {
    boda: [
      "Contrato de fecha y política de pagos",
      "Lista de invitados v1 y mesa de dulces",
      "Proveedores: fotografía, video, música",
      "Prueba de menú y restricciones alimentarias",
      "Invitaciones y confirmación RSVP",
      "Coordinación día B y plan B climático",
      "Seguro / responsabilidad civil si aplica en el venue",
      "Sesión de muestras (floral, mobiliario) o moodboard firmado",
    ],
    xv: [
      "Tema / paleta y vestuario",
      "Corte de pastel y vals (coreografía)",
      "Chambelanes y coreografía grupal",
      "Fotografía, video y cabina de fotos",
      "Mesa de dulces y souvenirs",
      "Cambio de look y hora feliz / DJ",
      "Homenaje en video / audio y prueba en pantalla",
      "Confirmación de horas de ensayo en salón",
    ],
  };

  var chkRoot = document.getElementById("checklist-root");
  var chkType = "";

  function loadCheckType() {
    try {
      var t = localStorage.getItem(STORAGE_CHK_TYPE);
      if (t === "boda" || t === "xv") return t;
    } catch (e) {}
    return "boda";
  }

  function loadChecks() {
    try {
      var raw = localStorage.getItem(STORAGE_CHECK);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }

  var checksState = loadChecks();

  function renderChecklist() {
    if (!chkRoot) return;
    chkType = chkType || loadCheckType();
    var items = lists[chkType] || lists.boda;
    chkRoot.innerHTML = "";
    items.forEach(function (label, i) {
      var key = chkType + "_" + i;
      var id = "chk_" + key;
      var li = document.createElement("li");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = id;
      cb.checked = !!checksState[key];
      cb.addEventListener("change", function () {
        checksState[key] = cb.checked;
        try {
          localStorage.setItem(STORAGE_CHECK, JSON.stringify(checksState));
        } catch (e) {}
      });
      var lab = document.createElement("label");
      lab.htmlFor = id;
      lab.textContent = label;
      li.appendChild(cb);
      li.appendChild(lab);
      chkRoot.appendChild(li);
    });
  }

  document.querySelectorAll(".js-chk-type").forEach(function (btn) {
    btn.addEventListener("click", function () {
      chkType = btn.getAttribute("data-type") || "boda";
      try {
        localStorage.setItem(STORAGE_CHK_TYPE, chkType);
      } catch (e) {}
      document.querySelectorAll(".js-chk-type").forEach(function (b) {
        var on = b.getAttribute("data-type") === chkType;
        b.classList.toggle("btn--primary", on);
        b.classList.toggle("btn--ghost", !on);
      });
      renderChecklist();
    });
  });

  chkType = loadCheckType();
  document.querySelectorAll(".js-chk-type").forEach(function (b) {
    var on = b.getAttribute("data-type") === chkType;
    b.classList.toggle("btn--primary", on);
    b.classList.toggle("btn--ghost", !on);
  });
  renderChecklist();

  /* ——— Print ——— */
  var printBtn = document.querySelector(".js-print");
  if (printBtn) {
    printBtn.addEventListener("click", function () {
      window.print();
    });
  }

  /* ——— Tabs (paquetes / experiencia) ——— */
  function tabMotionReduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  document.querySelectorAll(".js-tabs").forEach(function (root) {
    var buttons = root.querySelectorAll(".tabs button");
    var panels = root.querySelectorAll(".tab-panel");
    if (!buttons.length || !panels.length) return;
    var uid = "tab_" + Math.random().toString(36).slice(2, 9);
    buttons.forEach(function (btn, i) {
      var pid = uid + "_p" + i;
      btn.id = uid + "_t" + i;
      btn.setAttribute("aria-controls", pid);
      btn.setAttribute("tabindex", i === 0 ? "0" : "-1");
      if (panels[i]) {
        panels[i].id = pid;
        panels[i].setAttribute("aria-labelledby", btn.id);
      }
    });
    buttons.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b, j) {
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
          b.setAttribute("tabindex", b === btn ? "0" : "-1");
        });
        panels.forEach(function (p, j) {
          if (j === i) {
            p.removeAttribute("hidden");
            if (!tabMotionReduced()) {
              p.classList.remove("tab-panel--enter");
              void p.offsetWidth;
              p.classList.add("tab-panel--enter");
              var onEnd = function (ev) {
                if (ev.animationName !== "tab-panel-in") return;
                p.classList.remove("tab-panel--enter");
                p.removeEventListener("animationend", onEnd);
              };
              p.addEventListener("animationend", onEnd);
            }
          } else {
            p.setAttribute("hidden", "");
            p.classList.remove("tab-panel--enter");
          }
        });
      });
      btn.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        var next = e.key === "ArrowRight" ? i + 1 : i - 1;
        if (next < 0) next = buttons.length - 1;
        if (next >= buttons.length) next = 0;
        buttons[next].focus();
        buttons[next].click();
      });
    });
  });

  var CONSENT_KEY = "2bi_demo_notice_dismiss";
  var consentStrip = document.querySelector(".js-consent-strip");
  var consentOk = document.querySelector(".js-consent-ok");
  if (consentStrip && consentOk) {
    try {
      if (!sessionStorage.getItem(CONSENT_KEY)) consentStrip.removeAttribute("hidden");
    } catch (err) {
      consentStrip.removeAttribute("hidden");
    }
    consentOk.addEventListener("click", function () {
      try {
        sessionStorage.setItem(CONSENT_KEY, "1");
      } catch (err2) {}
      consentStrip.setAttribute("hidden", "");
    });
  }

  var backTop = document.querySelector(".js-back-top");
  if (backTop) {
    function updBackTop() {
      var y = document.documentElement.scrollTop || document.body.scrollTop;
      backTop.classList.toggle("is-visible", y > 480);
    }
    window.addEventListener("scroll", updBackTop, { passive: true });
    updBackTop();
    backTop.addEventListener("click", function () {
      var reduceMotion =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      try {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      } catch (err) {
        window.scrollTo(0, 0);
      }
    });
  }
})();
