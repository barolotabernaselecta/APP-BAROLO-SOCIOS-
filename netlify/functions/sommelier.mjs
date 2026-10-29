// Función de Netlify que consulta a Claude (API de Anthropic) para la app Sommelier Barolo.
// Variables de entorno en Netlify:
//   ANTHROPIC_API_KEY  (obligatoria) clave de la API de Anthropic
//   SOCIO_CODE         (opcional)    código que deben escribir los socios; si se deja vacío, la app queda abierta
//   ANTHROPIC_MODEL    (opcional)    modelo a usar; por defecto claude-haiku-5-5 (rápido y económico)

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

function buildPrompt(name, comida, withPhoto, carta) {
  return [
    'Sos el sommelier de Barolo, una taberna selecta de vinos y tapas en Yerba Buena, Tucumán (Argentina). Un socio del club quiere saber todo sobre un vino.',
    withPhoto ? 'Te adjunto una foto de la etiqueta: identificá el vino a partir de ella.' : '',
    name ? 'Vino: ' + name : '',
    comida ? 'Lo va a acompañar con: ' + comida + '. Tené en cuenta esa comida en el maridaje y ponela primera si combina bien; si no combina, decilo con respeto en "evitar" y sugerí otra opción.' : '',
    'Respondé en español rioplatense, cálido y claro, sin tecnicismos innecesarios. Si no conocés este vino exacto, describí lo más probable según la bodega, la cepa y la región, y bajá la confianza. No inventes premios, puntajes ni porcentajes exactos.',
    'Respondé SOLO con un objeto JSON, sin texto antes ni después, con esta forma exacta:',
    '{"nombre":"nombre completo con añada si la hay","bodega":"","region":"","pais":"","tipo":"Tinto|Blanco|Rosado|Espumante|Naranjo|Dulce","cepas":"","anada":"","altura":"altura del viñedo si aplica, o vacío","estilo":"una frase que defina el vino","historia":{"bodega":"2-3 frases sobre la bodega, su origen y su gente","vino":"1-2 frases sobre este vino o línea"},"cata":{"vista":"","nariz":"","boca":""},"servicio":{"temperatura":"ej. 16 a 18 °C","decantar":"","copa":"","guarda":""},"maridaje":{"ideal":[{"plato":"","por_que":""}],"quesos":["",""],"taberna":["2-3 tapas españolas o de taberna que combinen"],"evitar":["",""]},"de_la_carta":[{"nombre":"nombre EXACTO copiado de la carta de Barolo","por_que":"una frase"}],"dato_curioso":"","confianza":"alta|media|baja","nota_confianza":"una frase que explique qué tan seguro es"}',
    'En "ideal" poné 3 o 4 platos, con al menos uno típico argentino o del Norte.',
    carta ? 'En "de_la_carta" recomendá 2 o 3 vinos parecidos o que también combinen con la comida, elegidos SOLO de esta carta de Barolo (nombre | cepa | tipo | región | precio). No repitas el vino consultado:\n' + carta : 'Dejá "de_la_carta" como lista vacía.',
  ].filter(Boolean).join('\n\n');
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ ok: true, mensaje: 'La función del sommelier está publicada.', clave_cargada: !!process.env.ANTHROPIC_API_KEY, codigo_de_socio_activo: !!(process.env.SOCIO_CODE || '').trim() });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'config' }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'input' }, 400); }
  const name = String(body.name || '').slice(0, 140).trim();
  const comida = String(body.comida || '').slice(0, 140).trim();
  const code = String(body.code || '').trim();
  const carta = String(body.carta || '').slice(0, 40000);
  const image = body.image && typeof body.image.data === 'string' && body.image.data.length < 4_000_000 ? body.image : null;

  const required = (process.env.SOCIO_CODE || '').trim();
  if (required && code.toUpperCase() !== required.toUpperCase()) return json({ error: 'code' }, 401);
  if (!name && !image) return json({ error: 'input' }, 400);

  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image.data } });
  content.push({ type: 'text', text: buildPrompt(name, comida, !!image, carta) });

  let r, data;
  try {
    const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');
    r = await fetch(base + '/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      }),
    });
    data = await r.json();
  } catch {
    return json({ error: 'upstream' }, 502);
  }
  if (r.status === 429 || r.status === 529) return json({ error: 'busy' }, 503);
  if (!r.ok) {
    const msg = String((data && data.error && data.error.message) || '');
    console.error('Anthropic API error', r.status, msg);
    if (r.status === 401 || r.status === 403) return json({ error: 'key' }, 502);
    if (/credit|balance|billing/i.test(msg)) return json({ error: 'credit' }, 502);
    if (r.status === 404 && /model/i.test(msg)) return json({ error: 'model' }, 502);
    return json({ error: 'upstream', status: r.status }, 502);
  }

  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  const raw = text.slice(start, end + 1);
  const tries = [raw, raw.replace(/,\s*([}\]])/g, '$1'), raw.replace(/[\u201C\u201D]/g, '"').replace(/,\s*([}\]])/g, '$1')];
  for (const t of tries) {
    try { return json({ wine: JSON.parse(t) }); } catch {}
  }
  console.error('parse error', data.stop_reason, text.slice(0, 300), text.slice(-300));
  return json({ error: 'parse', stop: data.stop_reason }, 502);
};

