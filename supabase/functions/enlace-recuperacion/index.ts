// El profe atiende la solicitud de su alumno y recibe el código de un solo uso para su enlace.
// Vive en el servidor porque necesita la clave de servicio, que nunca puede llegar a la app.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function responder(estado: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const fallo = (estado: number, codigo: string) => responder(estado, { codigo });

Deno.serve(async (peticion) => {
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (peticion.method !== 'POST') return fallo(405, 'metodo_no_permitido');

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Quién llama lo dice su sesión, nunca lo que venga en el cuerpo.
  const token = peticion.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: sesion } = await admin.auth.getUser(token);
  if (!sesion.user) return fallo(401, 'sin_sesion');

  const cuerpo = await peticion.json().catch(() => null);
  const solicitudId = typeof cuerpo?.solicitudId === 'string' ? cuerpo.solicitudId : '';
  if (!solicitudId) return fallo(400, 'datos_invalidos');

  const { data: solicitud } = await admin
    .from('solicitudes_contrasena')
    .select('id, alumno_id, profe_id, atendida_en')
    .eq('id', solicitudId)
    .maybeSingle();
  if (!solicitud || solicitud.profe_id !== sesion.user.id) return fallo(403, 'sin_permiso');
  if (solicitud.atendida_en) return fallo(409, 'ya_atendida');

  const { data: alumno } = await admin
    .from('perfiles')
    .select('email, rol, profe_id')
    .eq('id', solicitud.alumno_id)
    .maybeSingle();
  // Un cambio de profe posterior a la solicitud le quita el permiso. Nunca sirve para otros roles.
  if (alumno?.rol !== 'alumno' || alumno.profe_id !== sesion.user.id) {
    return fallo(403, 'sin_permiso');
  }

  const { data: enlace, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: alumno.email,
  });
  if (error || !enlace.properties?.hashed_token) return fallo(500, 'error_servidor');

  const { error: errorMarca } = await admin
    .from('solicitudes_contrasena')
    .update({ atendida_en: new Date().toISOString() })
    .eq('id', solicitud.id);
  if (errorMarca) return fallo(500, 'error_servidor');
  return responder(200, { token: enlace.properties.hashed_token });
});
