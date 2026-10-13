# Vídeo Bugatti en Dubái

Montaje en Remotion calcado del vídeo de referencia: 30,6 s, horizontal 16:9 (1920×1080), 30 fps, etalonaje cálido, ráfaga de cortes rápidos y cierre con tu usuario.

Los planos se generan gratis con los créditos de Gemini, Kling, Hailuo o PixVerse. Cuando dejas cada clip en `public/clips/` con su nombre exacto, entra solo en su sitio. Mientras falte, se ve un marcador con lo que falta.

## Cómo usarlo

```bash
npm install
npm run studio    # vista previa en el navegador
npm run render    # vídeo final en out/bugatti-dubai.mp4
```

- Tu usuario del cierre y la música se cambian en `src/shots.ts` (`config`).
- La música opcional va en `public/music.mp3`.
- Los clips, la música y `out/` no se suben a git porque pesan y sales tú en ellos.

## Paso 1 · Tu cara (Gemini, gratis)

Sube tu selfie a la app de Gemini y pide:

```
Using the attached photo as the identity reference, create a character sheet of this exact man: front view, 3/4 left, left profile, 3/4 right. Keep the face, curly hair, thin mustache, chin goatee and black crew-neck t-shirt identical. Plain grey background, soft light, photorealistic.
```

En Dubái se conduce por la derecha, así que el conductor va a la izquierda del coche. Por eso el perfil izquierdo es el que más se va a ver.

## Paso 2 · Clips

Ajustes en todas las apps: **16:9**, **5 s**, la mejor calidad que te dejen gratis. Añade al final de cada prompt:

```
Night in Dubai, Sheikh Zayed Road. Copper-orange Bugatti Chiron with black accents. Cinematic, photorealistic, warm amber color grade, soft highlights, anamorphic lens, light film grain, 16:9.
```

Los planos marcados con 🧑 son de **imagen a vídeo**:
1. En Gemini, con tu foto adjunta, genera la **imagen inicial**.
2. En la app de vídeo, sube esa imagen y usa el **movimiento**.

El resto son de **texto a vídeo**.

| Archivo | Prompt |
|---|---|
| `01-dron-burj.mp4` | Aerial drone shot starting high beside the illuminated spire of the Burj Khalifa, camera glides slowly downward along the glass facade, endless grid of golden city lights below stretching to the horizon. |
| `02-dron-descenso.mp4` | Drone descends between glowing skyscrapers toward a wide multi-lane freeway, camera tilts forward, traffic light trails below, towers lining both sides of the highway. |
| `03-bugatti-trasera.mp4` | Low tracking shot from behind the Bugatti as it speeds down the empty freeway, red taillights glowing, skyscrapers on both sides, Burj Khalifa in the distance ahead. |
| 🧑 `04-lateral-ventanilla.mp4` | **Imagen inicial:** Side view of the Bugatti driving on a Dubai freeway at night, driver's window down, the man from the reference image at the wheel seen in left profile, red leather interior, city lights blurred behind. **Movimiento:** Camera tracks alongside at matching speed and slowly pushes toward the open driver's window, background rushing past, driver steady, looking ahead. |
| 🧑 `05-perfil-cara.mp4` | **Imagen inicial:** Close-up of the man from the reference image driving at night, left profile, calm focused expression, warm bokeh city lights through the window behind him. **Movimiento:** Subtle handheld drift, streetlights sweep across his face, background bokeh moving fast. |
| 🧑 `06a-cara-interior.mp4` | **Imagen inicial:** Interior shot of the man from the reference image driving, three-quarter view, dashboard glow on his face, Dubai lights through the windshield. **Movimiento:** Orange streetlight reflections slide across his face, he blinks and keeps his eyes on the road. |
| `06b-cuentakilometros.mp4` | Close-up of a Bugatti digital instrument cluster at night seen past the steering wheel, speedometer needle climbing fast, blue and white gauges, red leather interior. |
| 🧑 `06c-cara-cerca.mp4` | **Imagen inicial:** Tight close-up of the face of the man from the reference image in profile, night, single warm light on his cheek, soft bokeh behind. **Movimiento:** Very slow push-in, lights flicker across his face, subtle breathing. |
| 🧑 `07-retrovisor.mp4` | **Imagen inicial:** Interior view from the back seat of a Bugatti at night, the man from the reference image driving, his eyes clearly reflected in the rearview mirror, bright Dubai freeway ahead through the windshield. **Movimiento:** Minimal motion, city lights stream past, reflections in the mirror shift slightly. |
| `08-faros-frontal.mp4` | Front three-quarter low shot of the Bugatti approaching the camera on the freeway at night, LED headlights glowing, skyscrapers behind, glossy paint reflecting the city lights. |
| `09-trasera-alejandose.mp4` | Rear shot of the Bugatti speeding away down the empty freeway at night, taillights glowing, streetlights in a row, Dubai skyline ahead with the Burj Khalifa. |
| `10-skyline-final.mp4` | Static wide shot of an empty Dubai freeway at night, the Bugatti's taillights disappearing into the distance, the full skyline with the Burj Khalifa glowing on the horizon, camera slowly rises. |

La ráfaga de cortes rápidos (21–24 s) reutiliza `05`, `06b`, `07` y `08`, así que no hace falta generar nada más.

## Consejos

- Empieza por los planos 🧑, que son los que más fallan. Si uno no se parece a ti, repite la imagen inicial antes de gastar créditos en el vídeo.
- Si un clip va lento, cambia `speed` en `src/shots.ts` (por ejemplo `1.3`). Si quieres que empiece más tarde, cambia `offset`.
- El tamaño da igual: el montaje recorta y escala cada clip solo. Si una app solo descarga `.mov` o `.webm`, pásamelo y lo convierto a `.mp4`.
