// Pide recuperar la contraseña desde el inicio de sesión, sin sesión. Un alumno con profe avisa a su
// profe; cualquier otra cuenta recibe el enlace por correo. La respuesta es siempre la misma para no
// revelar qué correos tienen cuenta.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const responder = (estado: number) =>
  new Response(JSON.stringify({ ok: estado === 200 }), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (peticion) => {
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (peticion.method !== 'POST') return responder(405);

  const cuerpo = await peticion.json().catch(() => null);
  const email = typeof cuerpo?.email === 'string' ? cuerpo.email.trim().toLowerCase() : '';
  const urlVuelta = typeof cuerpo?.urlVuelta === 'string' ? cuerpo.urlVuelta : undefined;
  if (!/^\S+@\S+\.\S+$/.test(email)) return responder(400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, rol, profe_id')
    .eq('email', email)
    .maybeSingle();
  if (!perfil) return responder(200);

  if (perfil.rol === 'alumno' && perfil.profe_id) {
    const { error } = await admin
      .from('solicitudes_contrasena')
      .insert({ alumno_id: perfil.id, profe_id: perfil.profe_id });
    // 23505: ya tiene una pendiente.
    if (error && error.code !== '23505') console.error('solicitud', error.code);
    return responder(200);
  }

  // Supabase valida `urlVuelta` contra su lista de redirecciones permitidas.
  const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo: urlVuelta });
  if (error) console.error('correo', error.code);
  return responder(200);
});
