# Scorecard General — uso como plantilla / borrador

Este proyecto es la **base neutra** para clonar y adaptar por cliente (marca, KPIs, idioma, módulos).

## Checklist por cliente nuevo

1. **Copiar carpeta** `scorecard-General` → `scorecard-NombreCliente` (o similar).
2. **Marca** — Editar al inicio de `scorecard-app.js`:
   ```js
   window.SCORECARD_BRAND = {
     appName: 'Nombre comercial',
     eyebrow: 'Tagline o división',
     primary: '#2563eb',
     secondary: '#7c3aed',
     radius: '14px',
   };
   ```
   (Opcional: cargar este objeto desde un `<script>` previo en `executive.html`.)
3. **Favicon** — Sustituir `favicon.svg` o apuntar a logo en `manifest.json` + `<link rel="icon">`.
4. **`manifest.json`** — `name`, `short_name`, `theme_color` alineados al cliente.
5. **Módulos** — Por defecto todos visibles; el cliente puede ocultar bloques con el botón **Módulos** (o tú dejas desactivados algunos en código quitando secciones o `data-module`).
6. **Datos** — Sustituir textos/valores dummy por API, JSON o embed de BI.
7. **Legal** — Sustituir el párrafo de aviso en el footer y el enlace de privacidad.
8. **IA** — En producción, no uses API key en el navegador; proxy en backend.

## Archivos clave

| Archivo | Rol |
|--------|-----|
| `index.html` | Portada del portal (módulos / hub) |
| `executive.html` | Layout scorecard, KPIs, gráficas Chart.js, Excel, asistente |
| `tactical.html` / `operaciones.html` / `oee.html` | Stubs para enlazar BI o API |
| `portal-shared.css` / `portal-shared.js` | Tema y chrome compartido del portal |
| `scorecard-app.js` | Marca, periodo dummy, módulos, drill-down, modo presentación |
| `scorecard-assistant.js` | Paleta Ctrl+K, chat, voz, IA opcional |
| `manifest.json` / `favicon.svg` | PWA ligera e icono |

## Convención `data-module`

Cada bloque reordenable u opcional lleva `data-module="clave"`. En `scorecard-app.js`, array `MODULES` debe listar la misma clave y selector.

---

*Última revisión: plantilla interna Scorecard General.*
