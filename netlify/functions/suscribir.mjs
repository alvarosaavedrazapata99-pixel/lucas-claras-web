// POST /api/suscribir  {plan: "pro"|"premium", negocio, email}
// Crea la suscripción mensual en Mercado Pago y devuelve la URL de su ventana de pago segura.
import { PLANES, env, guardarFicha, json, mp } from '../lib/comun.mjs'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  let d
  try { d = await req.json() } catch { return json({ error: 'Datos inválidos.' }, 400) }
  const plan = PLANES[d?.plan]
  const email = String(d?.email ?? '').trim().toLowerCase()
  const negocio = String(d?.negocio ?? '').trim().slice(0, 60)
  if (!plan) return json({ error: 'Plan desconocido.' }, 400)
  if (!EMAIL.test(email) || email.length > 120) return json({ error: 'Escribe un correo válido: ahí te llega el comprobante de Mercado Pago.' }, 400)

  const ref = crypto.randomUUID()
  const sitio = env('URL_SITIO')
  try {
    const s = await mp('/preapproval', {
      method: 'POST',
      body: JSON.stringify({
        reason: `Lucas Claras · Plan ${plan.nombre}`,
        external_reference: ref,
        payer_email: email,
        back_url: `${sitio}/api/volver?ref=${ref}`,
        status: 'pending',
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: plan.monto, currency_id: 'PEN' },
      }),
    })
    await guardarFicha({ ref, plan: d.plan, negocio, email, estado: 'pendiente', preapprovalId: s.id, creado: new Date().toISOString() })
    return json({ ref, url: s.init_point })
  } catch (e) {
    console.error(e)
    return json({ error: 'No se pudo iniciar el pago. Intenta de nuevo o paga por Yape o Plin.' }, 502)
  }
}

export const config = { path: '/api/suscribir' }
