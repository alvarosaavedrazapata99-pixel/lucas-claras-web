// Firma de códigos y verificación de avisos de Mercado Pago. Sin dependencias: se prueba desde la app (src/core/pagos.test.ts).

const b64url = (buf) => Buffer.from(buf).toString('base64url')
export const iso = (d) => d.toISOString().slice(0, 10)

/** Código LC1 firmado (mismo formato que LucasClaras/src/core/licencia.ts). */
export async function firmarCodigo(codigoPlan, cliente, vence, clavePrivada, hoy = new Date()) {
  const json = JSON.stringify({ p: codigoPlan, c: String(cliente ?? '').trim().slice(0, 60), v: iso(vence), e: iso(hoy) })
  const datos = `LC1.${b64url(new TextEncoder().encode(json))}`
  const firma = await crypto.subtle.sign({ name: 'Ed25519' }, clavePrivada, new TextEncoder().encode(datos))
  return `${datos}.${b64url(firma)}`
}

function igualSeguro(a, b) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/**
 * Firma de Mercado Pago (cabecera x-signature "ts=...,v1=..."):
 * HMAC-SHA256(secreto, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;") en hexadecimal.
 */
export async function firmaValida({ firma, idPedido, dataId, secreto }) {
  const partes = Object.fromEntries(String(firma ?? '').split(',').map((p) => p.trim().split('=')))
  if (!partes.ts || !partes.v1 || !secreto) return false
  const id = /^[a-z0-9]+$/i.test(dataId) ? String(dataId).toLowerCase() : String(dataId)
  const manifiesto = `id:${id};request-id:${idPedido ?? ''};ts:${partes.ts};`
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = Buffer.from(await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(manifiesto))).toString('hex')
  return igualSeguro(mac, partes.v1)
}
