// GET /api/estado?ref=...
// La app pregunta si el pago ya se confirmó y recibe su código (también cada mes, para renovarlo).
// "ref" es un identificador aleatorio que solo conoce el equipo de quien pagó.
import { json, leerFicha, sincronizar } from '../lib/comun.mjs'

export default async (req) => {
  const ref = new URL(req.url).searchParams.get('ref') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(ref)) return json({ error: 'Referencia inválida.' }, 400)
  let ficha = await leerFicha(ref)
  if (!ficha) return json({ error: 'No encontramos ese pago.' }, 404)
  try {
    // Revisa en Mercado Pago si aún no hay código o si está por vencer (renovación mensual).
    const porVencer = !ficha.vence || new Date(ficha.vence).getTime() - Date.now() < 5 * 864e5
    if (!ficha.codigo || porVencer) ficha = await sincronizar(ficha)
  } catch (e) {
    console.error(e)
  }
  return json({ estado: ficha.estado, plan: ficha.plan, codigo: ficha.estado === 'authorized' ? ficha.codigo ?? null : null, vence: ficha.vence ?? null })
}

export const config = { path: '/api/estado' }
