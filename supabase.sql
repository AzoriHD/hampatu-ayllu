-- Hampatu Ayllu · base de datos para Supabase
-- Pégalo entero en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.

-- 1. Tabla única con todo (avisos, comunidades, fechas, respuestas, votos, apuntados)
create table if not exists public.docs (
  col text not null check (col in ('comunidades','avisos','respuestas','fechas','votos','apuntes')),
  id text not null check (char_length(id) between 1 and 200),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 20000),
  by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (col, id)
);
alter table public.docs enable row level security;

-- 2. Quién coordina (admin). Nadie puede leer esta tabla desde la web.
create table if not exists public.admin_emails (email text primary key);
alter table public.admin_emails enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (select 1 from public.admin_emails a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- 3. Permisos
drop policy if exists "docs: leer" on public.docs;
drop policy if exists "docs: crear" on public.docs;
drop policy if exists "docs: cambiar" on public.docs;
drop policy if exists "docs: borrar" on public.docs;

-- Todo el mundo puede leer
create policy "docs: leer" on public.docs for select to anon, authenticated using (true);

-- Publicar: cualquiera con sesión (también anónima). Fechas, ejemplos y fotos verificadas: solo coordinación.
-- Un voto y un apuntado por persona (el id lleva el usuario).
-- Un aviso no puede llamarse «f:…»: ese prefijo es de las fechas y al borrarlo se llevaría sus apuntados.
create policy "docs: crear" on public.docs for insert to authenticated with check (
  by = auth.uid() and (
    public.is_admin() or (
      data ->> 'by' = auth.uid()::text
      and col <> 'fechas'
      and coalesce(data ->> 'ejemplo', 'false') <> 'true'
      and coalesce(data ->> 'verificada', 'false') <> 'true'
      and (col not in ('votos','apuntes') or id = (data ->> 'aviso') || '__' || auth.uid()::text)
      and (col <> 'avisos' or id not like 'f:%')
    )
  )
);

-- Cambiar: lo tuyo (sin verificar fotos ni tocar fechas) o coordinación todo.
-- Mismas reglas que al crear, para que no se pueda mover un voto a otro aviso y votar dos veces.
create policy "docs: cambiar" on public.docs for update to authenticated
  using (by = auth.uid() or public.is_admin())
  with check (public.is_admin() or (
    by = auth.uid() and col <> 'fechas'
    and data ->> 'by' = auth.uid()::text
    and coalesce(data ->> 'ejemplo', 'false') <> 'true'
    and coalesce(data ->> 'verificada', 'false') <> 'true'
    and (col not in ('votos','apuntes') or id = (data ->> 'aviso') || '__' || auth.uid()::text)
    and (col <> 'avisos' or id not like 'f:%')
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

-- 6. Fotos (carpeta pública «fotos», máx. 3 MB, cada persona sube a su propia carpeta)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "fotos: subir" on storage.objects;
create policy "fotos: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 7. TU CORREO DE COORDINACIÓN (cámbialo por el tuyo)
insert into public.admin_emails (email) values ('TU_CORREO@gmail.com') on conflict do nothing;
