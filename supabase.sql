-- Hampatu Ayllu · base de datos para Supabase
-- Pégalo entero en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.

-- 1. Tabla única con todo (avisos, comunidades, fechas, respuestas, votos, apuntados, perfiles)
create table if not exists public.docs (
  col text not null,
  id text not null check (char_length(id) between 1 and 200),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 20000),
  by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (col, id)
);
alter table public.docs enable row level security;
-- (se rehace aparte para que también se actualice en bases de datos ya creadas)
alter table public.docs drop constraint if exists docs_col_check;
alter table public.docs add constraint docs_col_check
  check (col in ('comunidades','avisos','respuestas','fechas','votos','apuntes','perfiles'));

-- 2. Quién coordina (admin). Nadie puede leer esta tabla desde la web.
create table if not exists public.admin_emails (email text primary key);
alter table public.admin_emails enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (select 1 from public.admin_emails a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Cuenta de verdad (correo y contraseña), no una sesión anónima
create or replace function public.con_cuenta() returns boolean
language sql stable as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;
grant execute on function public.con_cuenta() to anon, authenticated;

-- 3. Permisos
drop policy if exists "docs: leer" on public.docs;
drop policy if exists "docs: crear" on public.docs;
drop policy if exists "docs: cambiar" on public.docs;
drop policy if exists "docs: borrar" on public.docs;

-- Todo el mundo puede leer
create policy "docs: leer" on public.docs for select to anon, authenticated using (true);

-- Publicar: hace falta una cuenta (las sesiones anónimas ya no pueden). Fechas, ejemplos y fotos verificadas: solo coordinación.
-- Un voto y un apuntado por persona (el id lleva el usuario). Cada perfil tiene el id de su dueño.
-- Un aviso no puede llamarse «f:…»: ese prefijo es de las fechas y al borrarlo se llevaría sus apuntados.
create policy "docs: crear" on public.docs for insert to authenticated with check (
  by = auth.uid() and (
    public.is_admin() or (
      public.con_cuenta()
      and data ->> 'by' = auth.uid()::text
      and col <> 'fechas'
      and coalesce(data ->> 'ejemplo', 'false') <> 'true'
      and coalesce(data ->> 'verificada', 'false') <> 'true'
      and (col not in ('votos','apuntes') or id = (data ->> 'aviso') || '__' || auth.uid()::text)
      and (col <> 'avisos' or id not like 'f:%')
      and (col <> 'perfiles' or id = auth.uid()::text)
    )
  )
);

-- Cambiar: lo tuyo (sin verificar fotos ni tocar fechas) o coordinación todo.
-- Mismas reglas que al crear, para que no se pueda mover un voto a otro aviso y votar dos veces.
create policy "docs: cambiar" on public.docs for update to authenticated
  using (by = auth.uid() or public.is_admin())
  with check (public.is_admin() or (
    by = auth.uid() and col <> 'fechas'
    and public.con_cuenta()
    and data ->> 'by' = auth.uid()::text
    and coalesce(data ->> 'ejemplo', 'false') <> 'true'
    and coalesce(data ->> 'verificada', 'false') <> 'true'
    and (col not in ('votos','apuntes') or id = (data ->> 'aviso') || '__' || auth.uid()::text)
    and (col <> 'avisos' or id not like 'f:%')
    and (col <> 'perfiles' or id = auth.uid()::text)
  ));

-- Borrar: lo tuyo o coordinación todo
create policy "docs: borrar" on public.docs for delete to authenticated
  using (by = auth.uid() or public.is_admin());

-- 4. Al borrar un aviso o una fecha se borran sus respuestas, votos y apuntados
create or replace function public.docs_cascade() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.col = 'avisos' then
    delete from public.docs where col in ('respuestas','votos','apuntes') and data ->> 'aviso' = old.id;
  elsif old.col = 'fechas' then
    delete from public.docs where col = 'apuntes' and data ->> 'aviso' = 'f:' || old.id;
  end if;
  return old;
end $$;
drop trigger if exists docs_cascade on public.docs;
create trigger docs_cascade after delete on public.docs for each row execute function public.docs_cascade();

-- 5. Cambios en directo
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- 6. Fotos de avisos y de perfil (carpeta pública «fotos», máx. 3 MB, cada cuenta sube a su propia carpeta)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "fotos: subir" on storage.objects;
create policy "fotos: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.con_cuenta() and (storage.foldername(name))[1] = auth.uid()::text);

-- 7. TU CORREO DE COORDINACIÓN (cámbialo por el tuyo)
insert into public.admin_emails (email) values ('TU_CORREO@gmail.com') on conflict do nothing;

-- 8. AVISTAMIENTOS PRIVADOS («He visto un sapo»). Si la base de datos ya existe, pega solo este bloque.
-- El sitio exacto del sapo solo lo leen quien lo envía y la coordinación; nunca sale en el tablón.
create table if not exists public.avistamientos (
  id uuid primary key default gen_random_uuid(),
  by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  estado text not null default 'nuevo' check (estado in ('nuevo','revisado','confirmado','descartado')),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 20000)
);
alter table public.avistamientos enable row level security;
drop policy if exists "avist: leer" on public.avistamientos;
drop policy if exists "avist: crear" on public.avistamientos;
drop policy if exists "avist: cambiar" on public.avistamientos;
drop policy if exists "avist: borrar" on public.avistamientos;
create policy "avist: leer" on public.avistamientos for select to authenticated
  using (by = auth.uid() or public.is_admin());
create policy "avist: crear" on public.avistamientos for insert to authenticated
  with check (by = auth.uid() and public.con_cuenta() and (estado = 'nuevo' or public.is_admin()));
create policy "avist: cambiar" on public.avistamientos for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "avist: borrar" on public.avistamientos for delete to authenticated
  using (by = auth.uid() or public.is_admin());

-- Fotos de los avistamientos: carpeta PRIVADA (se ven con enlaces que caducan en una hora)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avistamientos', 'avistamientos', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false;
drop policy if exists "avist fotos: subir" on storage.objects;
drop policy if exists "avist fotos: ver" on storage.objects;
drop policy if exists "avist fotos: borrar" on storage.objects;
create policy "avist fotos: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'avistamientos' and public.con_cuenta() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avist fotos: ver" on storage.objects for select to authenticated
  using (bucket_id = 'avistamientos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "avist fotos: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'avistamientos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- 9. MENSAJES PRIVADOS. Si la base de datos ya existe, pega solo este bloque.
-- Cada mensaje solo lo leen quien lo manda y quien lo recibe. Después solo se puede cambiar «leído»,
-- y solo quien lo recibe. Llegan al momento (Realtime).
create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  de uuid not null default auth.uid(),
  para uuid not null,
  texto text not null check (char_length(texto) between 1 and 2000),
  nombre text check (nombre is null or char_length(nombre) <= 60),
  ref jsonb check (ref is null or pg_column_size(ref) < 2000),
  leido boolean not null default false,
  created_at timestamptz not null default now(),
  check (de <> para)
);
create index if not exists mensajes_para_idx on public.mensajes (para, created_at);
create index if not exists mensajes_de_idx on public.mensajes (de, created_at);
alter table public.mensajes enable row level security;
drop policy if exists "mensajes: leer" on public.mensajes;
drop policy if exists "mensajes: mandar" on public.mensajes;
drop policy if exists "mensajes: leido" on public.mensajes;
create policy "mensajes: leer" on public.mensajes for select to authenticated
  using (de = auth.uid() or para = auth.uid());
create policy "mensajes: mandar" on public.mensajes for insert to authenticated
  with check (de = auth.uid() and public.con_cuenta() and leido = false);
create policy "mensajes: leido" on public.mensajes for update to authenticated
  using (para = auth.uid()) with check (para = auth.uid());
-- Solo la columna «leido» se puede cambiar
revoke update on public.mensajes from anon, authenticated;
grant update (leido) on public.mensajes to authenticated;
-- Que lleguen al momento
do $$ begin
  alter publication supabase_realtime add table public.mensajes;
exception when duplicate_object then null; end $$;
