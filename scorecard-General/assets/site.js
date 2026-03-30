(function () {
  "use strict";

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

  /* Reveal */
  document.querySelectorAll(".reveal").forEach(function (el) {
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            obs.unobserve(en.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -32px 0px" }
    );
    obs.observe(el);
  });

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
      var subject = encodeURIComponent("Contacto 2BI — " + (empresa && empresa.value.trim() ? empresa.value.trim() : "web"));
      var mail = "hola@2bi.example";
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

  /* Tablero overlay (Scorecard) */
  var openBtn = document.querySelector(".js-open-tablero");
  var closeBtn = document.querySelector(".js-close-tablero");
  var overlay = document.querySelector(".tablero-overlay");
  function setTablero(open) {
    if (!overlay) return;
    overlay.hidden = !open;
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (openBtn) openBtn.addEventListener("click", function (e) { e.preventDefault(); setTablero(true); });
  if (closeBtn) closeBtn.addEventListener("click", function (e) { e.preventDefault(); setTablero(false); });
  if (overlay) overlay.addEventListener("click", function (e) { if (e.target === overlay) setTablero(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setTablero(false); });
})();

