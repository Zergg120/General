# Música ambiental

El reproductor usa por defecto **`Music-Background.mp3`** en esta carpeta (puedes sustituirlo manteniendo el nombre o cambiando `window.SCORECARD_AUDIO.src`).

- Pistas **libres de derechos**: [Pixabay Music](https://pixabay.com/music/search/corporate/) o similar.
- Volumen música: **~10%** por defecto; bajo la bocina hay una **flecha** (**▲** oculta / **▼** muestra) y luego botones **−** y **+** (±**10%**), **barra de píldoras** y **%**. La primera vez (sin preferencia guardada) el panel de volumen va **cerrado** (solo bocina + **▼**); al desplegar se guarda en `scorecard_audio_vol_ui_expanded`. El nivel en `scorecard_audio_music_volume`. Clics UI y voz IA al **30%** (otros scripts).
- **Continuidad**: la posición se guarda en el navegador; al refrescar u otra página del mismo sitio, la música **sigue el hilo** en la medida que permite un sitio estático (cada página vuelve a cargar el MP3; con **precarga** + `canplay` el salto es mínimo).
- **Por defecto** la preferencia es **sonido encendido**; el usuario puede silenciar con la bocina. Muchos navegadores piden **un gesto** (clic/tecla) antes de reproducir: el **primer** clic en la página también inicia la música.
- Si el MP3 **no** carga, se usa un **tono sintético** muy suave (Web Audio).

## Clics de interfaz (`Mouse-clic.wav`)

- Archivo por defecto: **`Mouse-clic.wav`** (sonido corto tipo clic). Otro nombre: `window.SCORECARD_UI_SOUNDS = { src: 'audio/…' }` antes del script.
- Script: `scorecard-ui-sounds.js` — suena en botones, enlaces, pestañas, tarjetas del portal/scorecard, etc.
- Volumen por defecto ~35%; opcional: `window.SCORECARD_UI_SOUNDS = { volume: 0.35 }` antes del script.
- Para **silenciar** un control concreto: `data-no-ui-sound` en el elemento.
- Opcional: `respectReducedMotion: true` para silenciar clics si el sistema pide menos movimiento.

## Voz del asistente (`Voice-Agent IA.mp3`)

- Muestra de referencia; **Probar voz** reproduce solo este MP3. Las respuestas del chat usan **síntesis del navegador** (no se puede clonar el acento del MP3 sin API en la nube).
- Modo **Dani** en el desplegable: elige la voz ES más “natural” disponible y ritmo algo más dinámico.
- Precarga en `executive.html`: `audio/Voice-Agent%20IA.mp3` (nombre con espacio codificado en el `href`).
