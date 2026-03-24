# Scorecard General

Plantilla de **panel ejecutivo** (HTML + JS) con KPIs de ejemplo, diseño premium y asistente.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | **Portada del portal** — módulos grandes y accesos rápidos (estilo hub Power BI) |
| `executive.html` | **Panel ejecutivo completo** — KPIs, gráficas, Excel, asistente, `Ctrl+K` |
| `tactical.html` | Matriz táctica (stub con tabla de ejemplo) |
| `operaciones.html` | Reporte operaciones ancho (stub) |
| `oee.html` | OEE / planta con sidebar (stub) |
| `portal-shared.css` / `portal-shared.js` | Estilos y tema (`scorecard_theme`) compartidos en páginas del portal; **fondo corporativo** (mismo tono que Presentación en el ejecutivo) detrás del contenido |
| `scorecard-status.css` / `scorecard-status.js` | Barra compacta **En línea** + reloj hora local; en segundo plano dispara `scorecard:dailydatasync` al cambiar el día |
| `scorecard-audio.css` / `scorecard-audio.js` | Música: bocina + **flecha ▲/▼** (plegar volumen) + **− / +**, **píldoras** y %; **primera visita sin pref**: panel volumen **cerrado**; prefs `scorecard_audio_vol_ui_expanded` + `scorecard_audio_music_volume`; clics/IA al 30% |
| `scorecard-ui-sounds.js` | Sonido corto de **clic** (`audio/Mouse-clic.wav`) en botones, enlaces, pestañas y tarjetas; opción `respectReducedMotion`; `data-no-ui-sound` para excluir |
| `scorecard-live.js` | **Auto-actualización** opcional: sondea `SCORECARD_LIVE_POLL.url` y recarga la página si el servidor indica datos nuevos |
| `scorecard-charts.js` | Gráficas Chart.js (carga con `defer` junto al CDN) |
| `scorecard-version.example.json` | Ejemplo de respuesta JSON para el endpoint de versión |
| `scorecard-app.js` | **Marca blanca** (`SCORECARD_BRAND`), periodo dummy, **módulos** on/off, **drill-down** en hero, modo **Presentación** |
| `scorecard-assistant.js` | **Ctrl+K**, asistente, voz, IA opcional |
| `scorecard-report-data.js` | Datos demo **coherentes** de ventas del mes (líneas que suman al total) |
| `scorecard-report-export.js` | Export del informe: **Excel** (SheetJS), **PNG/PDF** (html2canvas + jsPDF) |
| `scorecard-report-agent.js` + `scorecard-report.css` | Intención *ventas del mes* / informe → panel con vista previa y exportar / imprimir |
| `favicon.svg` / `manifest.json` | Icono y PWA ligera |
| `PLANTILLA_BORRADOR.md` | Checklist para clonar por cliente |

## Funciones añadidas (plantilla)

- **Periodo** (selector): cambia valores dummy del resumen ejecutivo.
- **Subir Excel**: botón `Subir Excel` para cargar `.xlsx/.xls/.csv`, mapear columnas comunes (`revenue`, `ebitda`, `ccc`, `nps`) y refrescar KPIs hero con vista previa.
- **Módulos**: muestra/oculta bloques; preferencia en `localStorage`.
- **Drill-down**: clic (o Enter/Espacio) en las 4 tarjetas hero → modal con tabla/lista dummy.
- **Presentación**: tipografía más grande, oculta badge “Datos de ejemplo” y añade **fondo corporativo** (degradados + trama suave) detrás de las tarjetas.
- **Accesibilidad**: `:focus-visible`, `prefers-reduced-motion`, roles en hero.
- **Legal**: aviso de datos ilustrativos y no PII en el chat.
- **Gráficas**: color de línea alineado a `--accent` (marca).
- **Música ambiental**: por defecto **sonido encendido** (`scorecard_audio_prefs_v3` migra `scorecard_audio_muted` a `'0'` si no existía). La música **sigue** al cambiar de pestaña (no se pausa al ocultar); **BroadcastChannel** evita que dos pestañas del mismo sitio reproduzcan a la vez. Se intenta `play()` con **muted** y luego se quita el mute (autoplay). Precarga en `<head>` del MP3.
- **Asistente (solo ejecutivo)**: muestra de voz (`audio/Voice-Agent IA.mp3`) — muestra más humana + lectura TTS del texto (el MP3 no puede leer respuestas arbitrarias; el texto sigue con síntesis del sistema).
- **Informe de ventas (demo)**: el asistente interpreta *«dame las ventas del mes»*, *«solo el pdf»*, etc. Genera una **vista previa** tipo informe ejecutivo (marca, período, texto resumen, KPIs, rankings con %, detalle). **Descargar Excel** = libro `.xlsx` con hojas *Portada*, *Resumen KPI*, *Detalle ventas*, *Rank vendedores*, *Rank clientes*; **PDF/PNG** capturan la vista en formato claro; **Imprimir** abre el diálogo del sistema (incl. guardar como PDF). Datos demo **coherentes**; en producción sustituir `SCORECARD_REPORT_DATA` por tu API.

## Uso

Abre **`index.html`** (portada): incluye un **hero** con imagen profesional (Unsplash); sustituye `src` / `srcset` del `<img>` por la foto de tu cliente. El scorecard interactivo está en **`executive.html`**. Misma carpeta que los `.js`. Para IA cloud con `file://`, a veces hace falta un servidor estático.

**Rendimiento:** Chart.js y SheetJS van con **`defer`**; las gráficas viven en `scorecard-charts.js` para no bloquear el primer pintado. **Sincronización diaria** es demo local (`localStorage` + evento `scorecard:dailydatasync`); en producción sustituye por llamada a tu API en ese evento.

### Auto-actualización con servidor (sin F5)

1. Crea un endpoint **ligero** (ej. `GET /api/scorecard/version`) que devuelva JSON con **al menos uno** de: `checksum`, `version`, `updatedAt`, `etag` — o responde con cabeceras **`ETag`** / **`Last-Modified`**.
2. En **`executive.html`** (o antes de cargar `scorecard-live.js`) define:

```js
window.SCORECARD_LIVE_POLL = {
  url: '/api/scorecard/version',
  intervalMs: 120000,       // cada 2 min (mínimo ~30 s)
  credentials: 'include',  // si usas cookies de sesión
};
```

3. Cuando ese valor **cambie** respecto a la última respuesta, se dispara `scorecard:liveupdate` y la página hace **`location.reload()`** para cargar HTML/datos nuevos.
4. El sondeo **se pausa** si la pestaña está oculta (ahorra red y batería).
5. Opciones: `reload: false` (solo el evento, tú actualizas el DOM), `showHint: false` (oculta el texto **· Auto** en la barra), `headers: { Authorization: 'Bearer …' }`, `debug: true` (avisos en consola si falta firma en la respuesta).

Mismo script está en las páginas del portal: con la misma config global se comportan igual.

### Música / sonido ambiental

1. Por defecto se usa **`audio/Music-Background.mp3`** (puedes reemplazar el archivo).
2. Opcional, antes de `scorecard-audio.js`:

```js
window.SCORECARD_AUDIO = {
  src: '/ruta/a/tu-pista.mp3',
  volume: 0.1, // 0–1, volumen inicial música (~10%); el usuario ajusta con − / +
};
```

3. Preferencia **silencio / sonido**: `localStorage` `scorecard_audio_muted` (`'1'` = silenciado; si no existe clave = **no** silenciado). Posición: `scorecard_audio_sync_v2`.

### Sonidos de clic (UI)

- Archivo: `audio/Mouse-clic.wav`, script `scorecard-ui-sounds.js`.
- Opcional: `window.SCORECARD_UI_SOUNDS = { src: '…', volume: 0.35, enabled: true }` antes del script.
- En cualquier elemento: `data-no-ui-sound` para no reproducir clic (el botón de música ya lo lleva).

## Marca rápida

En `scorecard-app.js`, antes del IIFE o vía script previo:

```js
window.SCORECARD_BRAND = {
  appName: 'Mi empresa',
  eyebrow: 'Dashboard',
  primary: '#0ea5e9',
  secondary: '#8b5cf6',
  radius: '16px',
};
```

Ver **PLANTILLA_BORRADOR.md** para el flujo completo por cliente.
