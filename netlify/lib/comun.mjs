// Lucas Claras — lógica común de pagos (funciones de Netlify).
// Variables de entorno (Netlify → Site configuration → Environment variables):
//   MP_ACCESS_TOKEN    Access token de Mercado Pago (Tus integraciones → Credenciales de producción)
//   MP_WEBHOOK_SECRET  Clave secreta de webhooks (Tus integraciones → Webhooks)
//   LC_CLAVE_PRIVADA   Clave privada Ed25519 en base64 (PKCS8): la de LucasClaras/claves/privada.pem, sin las líneas BEGIN/END
//   URL_SITIO          Dirección pública del sitio, p. ej. https://lucasclaras.pe (sin "/" al final)
// Ningún número de tarjeta pasa por aquí: el cliente paga en la ventana segura de Mercado Pago.

import { getStore } from '@netlify/blobs'
import { firmaValida, firmarCodigo, iso } from './codigo.mjs'

export const PLANES = {
  pro: { codigo: 'm', nombre: 'Pro', monto: 12.9 },
  premium: { codigo: 'a', nombre: 'Premium', monto: 22.9 },
}

const MP = 'https://api.mercadopago.com'

export function env(nombre) {
  const v = process.env[nombre]
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`)
  return v
}

export const json = (cuerpo, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

// ---------- Almacenamiento (Netlify Blobs): una ficha por suscripción ----------
// { ref, plan, negocio, email, estado, preapprovalId, codigo, vence, creado, actualizado }
export const fichas = () => getStore('suscripciones')
export async function leerFicha(ref) { return (await fichas().get(ref, { type: 'json' })) ?? null }
export async function guardarFicha(f) { f.actualizado = new Date().toISOString(); await fichas().setJSON(f.ref, f); return f }

// ---------- Mercado Pago ----------
export async function mp(ruta, opciones = {}) {
  const r = await fetch(MP + ruta, {
    ...opciones,
    headers: { authorization: `Bearer ${env('MP_ACCESS_TOKEN')}`, 'content-type': 'application/json', ...(opciones.headers ?? {}) },
  })
  const cuerpo = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${cuerpo.message ?? 'error'}`)
  return cuerpo
}

/** Verifica la firma del aviso de Mercado Pago. */
export function firmaWebhookValida(req, dataId) {
  return firmaValida({ firma: req.headers.get('x-signature'), idPedido: req.headers.get('x-request-id'), dataId, secreto: env('MP_WEBHOOK_SECRET') })
}

let clavePrivada
async function clave() {
  clavePrivada ??= await crypto.subtle.importKey('pkcs8', Buffer.from(env('LC_CLAVE_PRIVADA').replace(/-----[^-]+-----|\s/g, ''), 'base64'), { name: 'Ed25519' }, false, ['sign'])
  return clavePrivada
}

/**
 * Revisa la suscripción en Mercado Pago y, si está activa, emite (o renueva) el código.
 * El código vence 3 días después del próximo cobro: si el cobro falla o cancela, el plan se apaga solo.
 */
export async function sincronizar(ficha) {
  if (!ficha.preapprovalId) return ficha
  const s = await mp(`/preapproval/${ficha.preapprovalId}`)
  ficha.estado = s.status // pending | authorized | paused | cancelled
  if (s.status === 'authorized') {
    const proximo = s.next_payment_date ? new Date(s.next_payment_date) : new Date(Date.now() + 31 * 864e5)
    const vence = new Date(proximo.getTime() + 3 * 864e5)
    if (!ficha.codigo || !ficha.vence || iso(vence) > ficha.vence) {
      ficha.codigo = await firmarCodigo(PLANES[ficha.plan].codigo, ficha.negocio, vence, await clave())
      ficha.vence = iso(vence)
    }
  }
  return guardarFicha(ficha)
}
