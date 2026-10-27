# App Socios Barolo

App para socios del Club Barolo Selecto con 6 secciones: Sommelier (IA), Carta (vinos, habanos, bebidas, cajas del club, packs y regalos, con pedido por WhatsApp), Mi cava, Promos, Reservar y Agenda, más la credencial de socio.

## Archivos

- `index.html`: la app completa.
- `logo-barolo.png`: el ícono (pestaña del navegador y acceso directo del celular).
- `netlify/functions/sommelier.mjs`: la parte que consulta a la IA (Claude, de Anthropic).
- `netlify.toml`: la configuración para Netlify.

## Cómo publicarla

1. Creá una clave en https://console.anthropic.com (sección API Keys) y cargá saldo (Billing).
2. Subí esta carpeta a un repositorio de GitHub ("uploading an existing file"), respetando la carpeta `netlify/functions`.
3. En Netlify: "Import a Git repository" > GitHub > elegí el repositorio > Deploy.
4. En Netlify: Site configuration > Environment variables, agregá:
   - `ANTHROPIC_API_KEY`: tu clave.
   - `SOCIO_CODE`: el código que les das a los socios (por ejemplo `BAROLO2026`). El socio lo carga una vez en "Mi credencial".
5. Volvé a publicar: Deploys > Trigger deploy > Deploy site.
6. Probá abriendo `tu-sitio.netlify.app/api/sommelier`: tiene que decir "La función del sommelier está publicada".

## Número de WhatsApp para reservas

En `index.html` buscá `whatsapp: ''` y poné el número de Barolo, solo dígitos con código de país. Ejemplo: `whatsapp: '5493815555555'`.
Así el mensaje de la reserva llega escrito solo. Si lo dejás vacío, la app abre el link de reservas del Instagram y copia el mensaje para pegarlo.

## Precios, carta, cajas y promos

La carta, las cajas del club, los packs, los regalos y las promos salen de tus listas de precios de octubre 2026. Están dentro de `index.html` (`var CATALOG` y `var OFFERS`). Para actualizar precios, pasale a Claude la lista nueva y te genera el archivo otra vez.

Los eventos de la agenda están en `var EVENTS = [`: copiá un bloque y cambiá los textos.

## Importante

- Nunca pongas la clave dentro de `index.html`: solo en las variables de entorno de Netlify.
- "Mi cava", la credencial y los pedidos de reserva se guardan en el teléfono de cada socio. Si cambia de teléfono o borra los datos del navegador, se pierden.
