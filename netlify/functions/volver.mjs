// GET /api/volver?ref=...&preapproval_id=...
// Mercado Pago trae al cliente aquí después de pagar. Se revisa la suscripción y se le lleva a la app,
// a la pantalla que activa el plan sola.
import { leerFicha, sincronizar, env } from '../lib/comun.mjs'

export default async (req) => {
  const url = new URL(req.url)
  const ref = url.searchParams.get('ref') ?? ''
  const destino = `${env('URL_SITIO')}/app/#/pago?ref=${encodeURIComponent(ref)}`
  try {
    const ficha = await leerFicha(ref)
    if (ficha) {
      const id = url.searchParams.get('preapproval_id')
      if (id && !ficha.preapprovalId) ficha.preapprovalId = id
      await sincronizar(ficha)
    }
  } catch (e) {
    console.error(e) // la app vuelve a consultar; no se bloquea el regreso
  }
  return Response.redirect(destino, 302)
}

export const config = { path: '/api/volver' }
