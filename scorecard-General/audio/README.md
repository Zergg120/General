# Música ambiental

El reproductor usa por defecto **`nastelbom-ambient-495893.mp3`** en esta carpeta (puedes sustituirlo manteniendo el nombre o cambiando `window.SCORECARD_AUDIO.src`).

- Pistas **libres de derechos**: [Pixabay Music](https://pixabay.com/music/search/corporate/) o similar.
- Volumen música: **~10%** por defecto; bajo la bocina hay una **flecha** (**▲** oculta / **▼** muestra) y luego botones **−** y **+** (±**10%**), **barra de píldoras** y **%**. La primera vez (sin preferencia guardada) el panel de volumen va **cerrado** (solo bocina + **▼**); al desplegar se guarda en `scorecard_audio_vol_ui_expanded`. El nivel en `scorecard_audio_music_volume`. Clics UI y voz IA al **30%** (otros scripts).
- **Continuidad**: la posición se guarda en el navegador; al refrescar u otra página del mismo sitio, la música **sigue el hilo** en la medida que permite un sitio estático (cada página vuelve a cargar el MP3; con **precarga** + `canplay` el salto es mínimo).
- **Por defecto** la preferencia es **sonido encendido**; el usuario puede silenciar con la bocina. Muchos navegadores piden **un gesto** (clic/tecla) antes de reproducir: el **primer** clic en la página también inicia la música.
- Si el MP3 **no** carga, se usa un **tono sintético** muy suave (Web Audio).

## Clics de interfaz (`mixkit-mouseclicks.wav`)

- Archivo: **`mixkit-mouseclicks.wav`** (sonido corto tipo clic).
- Script: `scorecard-ui-sounds.js` — suena en botones, enlaces, pestañas, tarjetas del portal/scorecard, etc.
- Volumen por defecto ~35%; opcional: `window.SCORECARD_UI_SOUNDS = { volume: 0.3 }` antes del script.
- Para **silenciar** un control concreto: `data-no-ui-sound` en el elemento.
- Con **preferencia de movimiento reducido** del sistema, los clics UI se silencian (accesibilidad).

## Voz del asistente (`voice-preview-dani.mp3`)

- Muestra de referencia; **Probar voz** reproduce solo este MP3. Las respuestas del chat usan **síntesis del navegador** (no se puede clonar el acento del MP3 sin API en la nube).
- Modo **Dani** en el desplegable: elige la voz ES más “natural” disponible y ritmo algo más dinámico.
- Precarga en `executive.html`: `<link rel="preload" href="audio/voice-preview-dani.mp3" …>`.
