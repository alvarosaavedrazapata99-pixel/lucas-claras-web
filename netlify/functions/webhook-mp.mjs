// POST /api/webhook-mp
// Mercado Pago avisa aquí cada alta, cobro mensual, pausa o cancelación. Se verifica la firma
// y se vuelve a consultar la suscripción en Mercado Pago (nunca se confía solo en el aviso).
import { firmaWebhookValida, leerFicha, mp, sincronizar } from '../lib/comun.mjs'

export default async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  const url = new URL(req.url)
  let cuerpo = {}
  try { cuerpo = await req.json() } catch { /* algunos avisos vienen solo en la URL */ }
  const tipo = cuerpo.type ?? url.searchParams.get('type') ?? ''
  const dataId = String(cuerpo?.data?.id ?? url.searchParams.get('data.id') ?? '')
  if (!dataId) return new Response('sin id', { status: 400 })
  if (!(await firmaWebhookValida(req, dataId))) return new Response('firma inválida', { status: 401 })

  try {
    let preapprovalId = null
    if (tipo === 'subscription_preapproval') preapprovalId = dataId
    else if (tipo === 'subscription_authorized_payment') preapprovalId = (await mp(`/authorized_payments/${dataId}`)).preapproval_id
    if (preapprovalId) {
      const s = await mp(`/preapproval/${preapprovalId}`)
      const ficha = s.external_reference ? await leerFicha(s.external_reference) : null
      if (ficha) {
        ficha.preapprovalId = preapprovalId
        await sincronizar(ficha)
      }
    }
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 500 }) // Mercado Pago reintenta
  }
  return new Response('ok')
}

export const config = { path: '/api/webhook-mp' }
