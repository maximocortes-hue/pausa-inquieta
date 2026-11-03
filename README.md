# Pausa Inquieta — web

Sitio estático (HTML + CSS + JavaScript en módulos). No necesita instalar nada ni compilar:
se sube tal cual a GitHub y se publica con GitHub Pages.

## Publicar en GitHub Pages

1. Crear un repositorio nuevo en GitHub y subir **el contenido de esta carpeta** (que `index.html` quede en la raíz).
2. En el repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Elegir la rama `main` y la carpeta `/ (root)`. Guardar.
4. En un par de minutos la web queda en `https://<usuario>.github.io/<repo>/`.

## Probar en la compu

Los módulos de JavaScript no funcionan abriendo el archivo con doble click: hace falta un servidor local.
Cualquiera sirve, por ejemplo la extensión **Live Server** de VS Code (click derecho en `index.html` → *Open with Live Server*).

## Estructura

```
index.html            Home: hero, quiénes somos, promesa, caja 3D, controles, recorrido, qué te llevás, llavero, redes
recorrido.html        El paso a paso (16 escenas: aula + Unreal)
css/base.css          Paleta, tipografías, texturas (papel, polvo, bordes rasgados), cursor, corazón, nav
css/home.css          Secciones de la home
css/recorrido.css     Escenas del recorrido
js/core/              Piezas compartidas (sonido, corazón, scroll, utilidades)
js/home/              Un módulo por sección de la home
js/three/             Caja y llavero en 3D (Three.js)
js/recorrido/         Motor del recorrido + escenas
assets/img/           Logo, imágenes del brandboard y texturas
```

## Librerías (por CDN, versiones fijas)

- **GSAP 3.13 + ScrollTrigger**: animaciones atadas al scroll.
- **Lenis 1.1**: scroll suave.
- **Three.js 0.169**: la caja y el llavero en 3D (se cargan solo cuando te acercás a esas secciones).

## Imágenes

- `assets/img/logo-white.png` / `logo-black.png`: el logo original con fondo transparente.
- `assets/img/brand-a.webp` (banner, posteos, llaveros) y `brand-b.webp` (afiche de la chica, trama de letras,
  trama de círculos): de acá salen todas las fotos y tramas.
- Las fotos se recortan en el HTML con `data-src` (imagen), `data-size="ANCHO,ALTO"` (tamaño de la imagen)
  y `data-crop="x,y,ancho,alto"` (recorte en píxeles). Para usar una foto nueva completa:
  `data-src="assets/img/foto.jpg" data-size="ANCHO,ALTO" data-crop="0,0,ANCHO,ALTO"`.
- Texturas: `paper.svg` (papel gastado), `dust-light.svg` (polvo sobre negro), `grunge-mask.svg`
  (tinta gastada de las letras), `torn-edge*.svg` (bordes rasgados).

## Cosas para reemplazar cuando tengan el material final

- **Neue Haas Grotesk**: es paga. Si tienen la licencia web, poner los archivos en `assets/fonts/` y declarar
  un `@font-face` con el nombre `"Neue Haas Grotesk Display Pro"`: la web la usa automáticamente.
  Mientras tanto se usa *Inter Tight* (libre y parecida).
- **Voz** (“No hagas nada”, “Te dije que no hagas nada”): hoy se muestra como subtítulo. Si existe la grabación,
  se puede sumar.

## Detalles de interacción

- La entrada es una invitación a conocer tu ruido: se entra con sonido (se puede apagar desde la nav).
- El **corazón** (semicírculo abajo) mide cuánto hacés: clicks, toques y teclas. Scrollear no suma ruido.
  Cuanto más hacés, más aparece *inquieta* (la mitad en blanco y negro con ruido). Si te quedás quieto, se calma.
- En el **recorrido**, si no hacés nada durante unos segundos, la experiencia avanza sola.
- Respeta `prefers-reduced-motion`.
