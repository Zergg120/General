(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* Spotlight que sigue al puntero (como 2BI ADD) */
  try {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.style.setProperty("--pointer-x", "22%");
      document.documentElement.style.setProperty("--pointer-y", "28%");
      var ptrBusy = false;
      document.addEventListener(
        "pointermove",
        function (e) {
          if (ptrBusy) return;
          if (e && e.pointerType === "touch") return;
          ptrBusy = true;
          window.requestAnimationFrame(function () {
            var iw = Math.max(window.innerWidth, 1);
            var ih = Math.max(window.innerHeight, 1);
            document.documentElement.style.setProperty("--pointer-x", ((e.clientX / iw) * 100).toFixed(2) + "%");
            document.documentElement.style.setProperty("--pointer-y", ((e.clientY / ih) * 100).toFixed(2) + "%");
            ptrBusy = false;
          });
        },
        { passive: true }
      );
    }
  } catch (_) {}

  // Nota: el usuario pidió quitar el “puntito” luciérnaga. Se conserva el spotlight (fondo vivo).

  /* CTAs “magnéticos”: acercan el botón al cursor (suave, cap ~10px) */
  (function mountMagnetic() {
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    } catch (_) {}
    var nodes = document.querySelectorAll("a.btn--primary, button.btn--primary, a.btn--ghost.btn--lg");
    if (!nodes || !nodes.length) return;
    nodes.forEach(function (btn) {
      btn.classList.add("js-magnetic");
      function onMagMove(e) {
        if (e && e.pointerType === "touch") return;
        var r = btn.getBoundingClientRect();
        var x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        var y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        var cap = 10;
        btn.style.setProperty("--mag-x", (x * cap).toFixed(2) + "px");
        btn.style.setProperty("--mag-y", (y * cap).toFixed(2) + "px");
      }
      function onMagLeave() {
        btn.style.removeProperty("--mag-x");
        btn.style.removeProperty("--mag-y");
      }
      btn.addEventListener("pointermove", onMagMove);
      btn.addEventListener("pointerleave", onMagLeave);
    });
  })();

  /* Imágenes externas (Unsplash u otras): fallback si la red las bloquea */
  (function mountExternalImageFallback() {
    function svgDataUri(label) {
      var safe = String(label || "Imagen").replace(/[<>&"]/g, "");
      var svg =
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 750'>" +
        "<defs>" +
        "<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
        "<stop offset='0' stop-color='#e4f0fb'/>" +
        "<stop offset='1' stop-color='#d4e8f9'/>" +
        "</linearGradient>" +
        "</defs>" +
        "<rect width='1200' height='750' fill='url(#g)'/>" +
        "<circle cx='965' cy='205' r='260' fill='rgba(29,142,240,0.10)'/>" +
        "<circle cx='290' cy='610' r='320' fill='rgba(94,184,255,0.12)'/>" +
        "<path d='M350 520h500a40 40 0 0 1 40 40v40H310v-40a80 80 0 0 1 80-80Z' fill='rgba(10,74,124,0.10)'/>" +
        "<path d='M360 500l110-140 120 160 90-110 160 210H360Z' fill='rgba(10,74,124,0.12)'/>" +
        "<text x='80' y='110' font-family='Outfit,system-ui,sans-serif' font-size='44' font-weight='750' fill='#0a4a7c'>Recurso visual</text>" +
        "<text x='80' y='170' font-family='Outfit,system-ui,sans-serif' font-size='28' font-weight='650' fill='#4d6b88'>" +
        safe +
        "</text>" +
        "</svg>";
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    }

    function apply(img) {
      if (!img || img.dataset && img.dataset.fallbackApplied === "1") return;
      try {
        img.referrerPolicy = "no-referrer";
      } catch (_) {}
      img.addEventListener(
        "error",
        function () {
          try {
            // En rails/strips, quita el item para que quede centrado (sin “bloque roto”).
            var railItem = img.closest && img.closest(".photo-rail__item");
            if (railItem && railItem.parentNode) {
              railItem.parentNode.removeChild(railItem);
              return;
            }
            var fig = img.closest && img.closest(".detail-photo-strip__fig");
            if (fig && fig.parentNode) {
              fig.parentNode.removeChild(fig);
              return;
            }
            var banner = img.closest && img.closest(".detail-example__banner");
            if (banner && banner.parentNode) {
              banner.parentNode.removeChild(banner);
              return;
            }

            if (img.dataset) img.dataset.fallbackApplied = "1";
            img.classList.add("is-img-fallback");
            img.src = svgDataUri(img.alt || "Imagen no disponible");
          } catch (_) {}
        },
        { once: true }
      );
    }

    document.querySelectorAll("img.js-ext-img, img[src*='images.unsplash.com']").forEach(apply);
  })();

  /* Barra de progreso scroll (delgada, arriba) */
  (function mountScrollProgress() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var progress = header.querySelector(".js-scroll-progress");
    if (!progress) {
      progress = document.createElement("div");
      progress.className = "scroll-progress js-scroll-progress";
      progress.setAttribute("aria-hidden", "true");
      header.appendChild(progress);
    }
    var raf = 0;
    function sync() {
      raf = 0;
      var doc = document.documentElement;
      var scrollTop = window.scrollY || doc.scrollTop || 0;
      var scrollHeight = Math.max(1, doc.scrollHeight - doc.clientHeight);
      var pct = Math.max(0, Math.min(1, scrollTop / scrollHeight));
      progress.style.width = (pct * 100).toFixed(2) + "%";
    }
    function onScroll() {
      if (raf) return;
      raf = window.requestAnimationFrame(sync);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    sync();
  })();

  /* Barras demo en panel hero (como 2BI ADD) */
  (function mountHeroBars() {
    var chartHome = document.getElementById("chart-bars-home");
    if (!chartHome) return;
    if (chartHome.children && chartHome.children.length) return;
    var heights = [38, 55, 42, 68, 48, 82, 52, 90, 61, 74, 44, 86];
    heights.forEach(function (h) {
      var d = document.createElement("div");
      d.className = "chart-bars__item";
      d.style.height = h + "%";
      d.title = "Serie ilustrativa";
      chartHome.appendChild(d);
    });
  })();

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".js-nav-toggle");
  var panel = document.querySelector(".js-nav-panel");
  var drawer = document.querySelector(".js-nav-drawer");

  function setOpen(open) {
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

  function onKeydown(e) {
    if (!header || !header.classList.contains("is-open")) return;
    if (e.key === "Escape") {
      setOpen(false);
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
  }

  if (toggle && header) {
    toggle.addEventListener("click", function () {
      var open = !header.classList.contains("is-open");
      setOpen(open);
      if (open && drawer) {
        var link = drawer.querySelector("a");
        if (link) link.focus();
      }
    });
  }

  if (panel) {
    panel.addEventListener("click", function (e) {
      if (e.target === panel) setOpen(false);
    });
  }

  if (drawer) {
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        setOpen(false);
      });
    });
  }

  document.addEventListener("keydown", onKeydown);

  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 900px)").matches) setOpen(false);
  });

  /* Reveal al scroll — todas las páginas con .reveal (progresivo: sin JS o con “reduced motion” todo visible) */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    document.documentElement.classList.add("reveal-animate");
    var revealNodes = document.querySelectorAll(".reveal");
    if (revealNodes.length) {
      var revealIo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealIo.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.06, rootMargin: "0px 0px -24px 0px" }
      );
      revealNodes.forEach(function (el) {
        revealIo.observe(el);
      });
    }
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  if (header) {
    function syncHeaderScroll() {
      var yScroll = window.scrollY || document.documentElement.scrollTop;
      header.classList.toggle("is-scrolled", yScroll > 18);
    }
    window.addEventListener("scroll", syncHeaderScroll, { passive: true });
    syncHeaderScroll();
  }

  /* Counters */
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animateCounter(el, target, duration) {
    var start = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - start) / duration);
      el.textContent = Math.round(target * easeOutQuart(p));
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target;
    }
    requestAnimationFrame(frame);
  }

  var statsBlock = document.querySelector(".js-stats");
  if (statsBlock) {
    var done = false;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting || done) return;
          done = true;
          statsBlock.querySelectorAll(".js-counter").forEach(function (c) {
            var t = parseInt(c.getAttribute("data-target"), 10);
            if (!isNaN(t)) animateCounter(c, t, 1500);
          });
        });
      },
      { threshold: 0.3 }
    );
    io.observe(statsBlock);
  }

  /* Year */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* Contact form → mailto */
  var form = document.querySelector(".js-contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nombre = form.querySelector("#cf-nombre");
      var email = form.querySelector("#cf-email");
      var empresa = form.querySelector("#cf-empresa");
      var mensaje = form.querySelector("#cf-mensaje");
      var ok = true;
      [nombre, email, mensaje].forEach(function (field) {
        if (!field) return;
        var wrap = field.closest(".field");
        var v = (field.value || "").trim();
        if (!v) {
          ok = false;
          if (wrap) wrap.classList.add("is-invalid");
        } else if (wrap) wrap.classList.remove("is-invalid");
      });
      if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        ok = false;
        var ew = email.closest(".field");
        if (ew) ew.classList.add("is-invalid");
      }
      if (!ok) return;

      var body =
        "Nombre: " +
        (nombre ? nombre.value.trim() : "") +
        "\nEmail: " +
        (email ? email.value.trim() : "") +
        "\nEmpresa: " +
        (empresa ? empresa.value.trim() : "") +
        "\n\n" +
        (mensaje ? mensaje.value.trim() : "");
      var subject = encodeURIComponent(
        "Contacto 2BI Intelligence Solutions — " + (empresa && empresa.value.trim() ? empresa.value.trim() : "web")
      );
      var mail = "guillermorc44@gmail.com,alvaropalma87@gmail.com,chdominiel@gmail.com";
      window.location.href =
        "mailto:" + mail + "?subject=" + subject + "&body=" + encodeURIComponent(body);
    });
  }

  /* SVG line draw (home panel) */
  var line = document.querySelector(".js-chart-line");
  if (line && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    try {
      var len = line.getTotalLength();
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      line.getBoundingClientRect();
      line.style.transition = "stroke-dashoffset 2.2s cubic-bezier(0.22, 1, 0.36, 1) 0.4s";
      line.style.strokeDashoffset = "0";
    } catch (err) {}
  }

  /* Chat demo + widget (reglas locales, sin LLM) */
  function botReply(text) {
    var t = (text || "").toLowerCase();
    if (/hola|buen|hey|hi|qué tal/.test(t))
      return "¡Hola! Soy el asistente demo de 2BI Intelligence Solutions. Puedo orientarte sobre BI, datos o cómo contactarnos. ¿Qué te interesa?";
    if (/power|fabric|bi|tabler|dashboard|dax/.test(t))
      return "Trabajamos Power BI, Fabric y modelos semánticos. Si buscas tableros ejecutivos, rendimiento de refresco o gobernanza, en Soluciones tienes ejemplos por módulo.";
    if (/firebird|sql|dato|etl|pipeline|warehouse|lake/.test(t))
      return "Integramos Firebird, SQL Server, APIs y orquestación (Airflow, n8n). Si el dolor es extracción, calidad o modelado, lo atacamos por fases con trazabilidad.";
    if (/precio|cost|coti|propuest|cuánto/.test(t))
      return "Los alcances son a medida. Usa Contacto con volumen de datos y objetivo; respondemos con fases y una estimación orientativa.";
    if (/contact|corre|email|agendar|llamad|hablar/.test(t))
      return "Puedes usar el formulario en contacto.html o escribir a guillermorc44@gmail.com, alvaropalma87@gmail.com o chdominiel@gmail.com. ¿Prefieres agendar? El botón «Hablemos» está arriba.";
    if (/gracias|thanks|genial|perfecto/.test(t))
      return "¡Con gusto! Si quieres profundizar, abre soluciones.html — cada tarjeta lleva a un ejemplo detallado.";
    if (/quién|nosotros|equipo/.test(t))
      return "Somos 2BI Intelligence Solutions: partner de datos y BI con estrategia, implementación y acompañamiento. En Nosotros está misión y forma de trabajo.";
    return "En producción esto enlazaría a tu base de conocimiento o a un LLM con grounding. Mientras tanto: prueba «Power BI», «datos», «precios» o visita soluciones.html.";
  }

  function appendBubble(container, text, who) {
    if (!container) return;
    var div = document.createElement("div");
    div.className = "chat-bubble chat-bubble--" + who;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping(container) {
    if (!container) return null;
    var el = document.createElement("div");
    el.className = "chat-typing js-typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    el.setAttribute("aria-hidden", "true");
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
  }

  function removeTyping(container) {
    if (!container) return;
    var t = container.querySelector(".js-typing");
    if (t) t.remove();
  }

  function wireChat(container, input, sendBtn, options) {
    options = options || {};
    if (!container || !input) return null;
    function go() {
      var v = (input.value || "").trim();
      if (!v) return;
      appendBubble(container, v, "user");
      input.value = "";
      showTyping(container);
      setTimeout(function () {
        removeTyping(container);
        appendBubble(container, botReply(v), "bot");
      }, 550 + Math.random() * 350);
    }
    if (sendBtn) sendBtn.addEventListener("click", go);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        go();
      }
    });
    if (options.initialMessage) {
      setTimeout(function () {
        appendBubble(container, options.initialMessage, "bot");
      }, 450);
    }
    return { go: go, input: input, container: container };
  }

  var demoChat = wireChat(
    document.getElementById("js-chat-demo-msgs"),
    document.getElementById("js-chat-demo-input"),
    document.getElementById("js-chat-demo-send"),
    {
      initialMessage:
        "¡Hola! Demo de chatbot de 2BI Intelligence Solutions: respondo con reglas locales (sin API en vivo). Prueba: Power BI, datos, precios o contacto.",
    }
  );

  if (demoChat) {
    document.querySelectorAll(".js-chat-suggest").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var msg = btn.getAttribute("data-msg");
        if (!msg) return;
        demoChat.input.value = msg;
        demoChat.input.focus();
        demoChat.go();
      });
    });
  }

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".js-tilt-card").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") return;
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;
        var px = (x / r.width - 0.5) * 2;
        var py = (y / r.height - 0.5) * 2;
        var rx = py * -5;
        var ry = px * 7;
        el.style.transform =
          "perspective(760px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-5px)";
      });
      el.addEventListener("pointerleave", function () {
        el.style.transform = "";
      });
    });
  }

  var wRoot = document.querySelector(".js-chat-widget");
  var wFab = document.querySelector(".js-chat-widget-fab");
  var wClose = document.querySelector(".js-chat-widget-close");
  var wMsg = document.querySelector(".js-chat-widget-messages");
  var wInp = document.querySelector(".js-chat-widget-input");
  var wSend = document.querySelector(".js-chat-widget-send");
  var widgetChatBound = false;
  if (wRoot && wFab && wMsg && wInp) {
    function setWidgetOpen(open) {
      wRoot.classList.toggle("is-open", open);
      wFab.setAttribute("aria-expanded", open ? "true" : "false");
    }
    wFab.addEventListener("click", function () {
      var open = !wRoot.classList.contains("is-open");
      setWidgetOpen(open);
      if (open) {
        if (!widgetChatBound) {
          widgetChatBound = true;
          wireChat(wMsg, wInp, wSend, {});
        }
        if (wMsg.querySelectorAll(".chat-bubble").length === 0) {
          appendBubble(
            wMsg,
            "¿En qué podemos ayudarte? Somos 2BI Intelligence Solutions — escribe BI, datos, precios o contacto.",
            "bot"
          );
        }
        wInp.focus();
      }
    });
    if (wClose) {
      wClose.addEventListener("click", function () {
        setWidgetOpen(false);
        wFab.focus();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !wRoot.classList.contains("is-open")) return;
      setWidgetOpen(false);
      wFab.focus();
    });
  }

  /* Volver arriba */
  var backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "back-top js-back-top";
  backBtn.setAttribute("aria-label", "Volver arriba");
  backBtn.innerHTML = "↑";
  document.body.appendChild(backBtn);
  var backShown = false;
  function syncBackTop() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var show = y > 420;
    if (show === backShown) return;
    backShown = show;
    backBtn.classList.toggle("is-visible", show);
  }
  window.addEventListener("scroll", syncBackTop, { passive: true });
  syncBackTop();
  backBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    var skip = document.querySelector(".skip-link");
    if (skip) skip.focus({ preventScroll: true });
  });
})();
