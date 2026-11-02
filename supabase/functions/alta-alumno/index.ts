// Crea la cuenta de un alumno ya confirmada y la mete en el centro. Vive en el servidor porque
// necesita la clave de servicio, que nunca puede llegar a la app.
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

  // Quién llama lo dice su sesión y su perfil, nunca lo que venga en el cuerpo.
  const token = peticion.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: sesion } = await admin.auth.getUser(token);
  if (!sesion.user) return fallo(401, 'sin_sesion');
  const { data: quien } = await admin
    .from('perfiles')
    .select('rol, centro_id')
    .eq('id', sesion.user.id)
    .maybeSingle();

  const cuerpo = await peticion.json().catch(() => null);
  const nombre = typeof cuerpo?.nombre === 'string' ? cuerpo.nombre.trim() : '';
  const email = typeof cuerpo?.email === 'string' ? cuerpo.email.trim().toLowerCase() : '';
  const contrasena = typeof cuerpo?.contrasena === 'string' ? cuerpo.contrasena : '';
  const centroId = typeof cuerpo?.centroId === 'string' ? cuerpo.centroId : '';

  const administra =
    quien?.rol === 'generalitat' || (quien?.rol === 'instituto' && quien.centro_id === centroId);
  if (!administra) return fallo(403, 'sin_permiso');
  if (nombre.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || contrasena.length < 8 || !centroId) {
    return fallo(400, 'datos_invalidos');
  }

  const { data: creado, error } = await admin.auth.admin.createUser({
    email,
    password: contrasena,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error || !creado.user) {
    const repetido = error?.code === 'email_exists' || error?.status === 422;
    return fallo(repetido ? 409 : 500, repetido ? 'correo_repetido' : 'error_servidor');
  }

  const { data: fila, error: errorCentro } = await admin
    .from('perfiles')
    .update({ centro_id: centroId })
    .eq('id', creado.user.id)
    .select('id, nombre, email, centro_id, profe_id')
    .single();
  if (errorCentro) {
    // Sin centro la cuenta no sirve: se deshace para no dejarla a medias.
    await admin.auth.admin.deleteUser(creado.user.id);
    return fallo(500, 'error_servidor');
  }
  return responder(200, { alumno: fila });
});
