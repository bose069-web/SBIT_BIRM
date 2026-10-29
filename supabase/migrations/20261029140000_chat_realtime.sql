-- Los eventos conservan las restricciones de lectura de las tablas (RLS).
alter publication supabase_realtime add table public.chat_mensajes;
alter publication supabase_realtime add table public.chat_lecturas;
