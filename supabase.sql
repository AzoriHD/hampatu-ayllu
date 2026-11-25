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

-- =====================================================================================
-- AMPLIACIÓN · bloques 10 a 15: comunidades con representantes, proyectos, colabora,
-- financiación (donaciones y gastos), transparencia y registro de cambios.
-- Si la base de datos ya existe, pega desde aquí hasta el final y pulsa Run.
-- Se puede ejecutar más de una vez. Ver README → «Base de datos de la ampliación».
-- =====================================================================================

-- 10. ROLES, PERMISOS Y REPRESENTANTES DE COMUNIDAD
--   · Administración: los correos de admin_emails (bloque 7). Todo, también dar y quitar permisos.
--   · Coordinación: las cuentas de roles_usuario. Proyectos, comunidades, candidaturas, finanzas,
--     informes y validar resultados.
--   · Representantes: los acepta cada comunidad (o la coordinación). Gestionan la ficha de su comunidad,
--     crean proyectos y deciden en cuáles participa.
--   · Responsables de proyecto: quien lo crea y a quien añada. Gestionan su proyecto.
--   · Cuentas normales: siguen, comentan, se ofrecen a colaborar y donan.

-- Peticiones sin usuario (SQL Editor) o con la clave secreta del servidor: de confianza
create or replace function public.es_servidor() returns boolean
language sql stable as $$
  select auth.jwt() is null or coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;
grant execute on function public.es_servidor() to anon, authenticated;

create table if not exists public.roles_usuario (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rol text not null check (rol in ('coordinador')),
  by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.roles_usuario enable row level security;

create or replace function public.es_coordinador() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or (public.con_cuenta()
    and exists (select 1 from public.roles_usuario r where r.user_id = auth.uid() and r.rol = 'coordinador'));
$$;
grant execute on function public.es_coordinador() to anon, authenticated;

drop policy if exists "roles: leer" on public.roles_usuario;
drop policy if exists "roles: dar" on public.roles_usuario;
drop policy if exists "roles: quitar" on public.roles_usuario;
create policy "roles: leer" on public.roles_usuario for select to authenticated
  using (user_id = auth.uid() or public.es_coordinador());
create policy "roles: dar" on public.roles_usuario for insert to authenticated with check (public.is_admin());
create policy "roles: quitar" on public.roles_usuario for delete to authenticated using (public.is_admin());

create or replace function public.comunidad_existe(c text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.docs d where d.col = 'comunidades' and d.id = c);
$$;
grant execute on function public.comunidad_existe(text) to anon, authenticated;

-- Quién forma parte de cada comunidad. Solo sale en público quien lo consiente (publico = true).
create table if not exists public.comunidad_miembros (
  id uuid primary key default gen_random_uuid(),
  comunidad text not null,                                         -- id de la comunidad (docs, col «comunidades»)
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rol text not null default 'miembro' check (rol in ('miembro','representante')),
  rol_pedido text not null default 'miembro' check (rol_pedido in ('miembro','representante')),
  estado text not null default 'solicitada' check (estado in ('solicitada','aceptada','rechazada')),
  cargo text check (cargo is null or char_length(cargo) <= 80),
  mensaje text check (mensaje is null or char_length(mensaje) <= 500),
  publico boolean not null default false,
  decidido_por uuid,
  decidido_en timestamptz,
  created_at timestamptz not null default now(),
  unique (comunidad, user_id)
);
create index if not exists comunidad_miembros_user_idx on public.comunidad_miembros (user_id);
alter table public.comunidad_miembros enable row level security;

create or replace function public.representa(com text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.con_cuenta() and exists (select 1 from public.comunidad_miembros m
    where m.comunidad = com and m.user_id = auth.uid() and m.rol = 'representante' and m.estado = 'aceptada');
$$;
create or replace function public.representa_alguna() returns boolean
language sql stable security definer set search_path = public as $$
  select public.con_cuenta() and exists (select 1 from public.comunidad_miembros m
    where m.user_id = auth.uid() and m.rol = 'representante' and m.estado = 'aceptada');
$$;
grant execute on function public.representa(text) to anon, authenticated;
grant execute on function public.representa_alguna() to anon, authenticated;

-- La comunidad decide: solo sus representantes (o la coordinación) aceptan, rechazan o cambian el papel.
-- Cada persona decide si su nombre sale en la ficha pública.
create or replace function public.miembros_antes() returns trigger
language plpgsql security definer set search_path = public as $$
declare decide boolean;
begin
  if public.es_servidor() then return new; end if;
  if tg_op = 'INSERT' then
    if not public.comunidad_existe(new.comunidad) then raise exception 'La comunidad no existe' using errcode = '23503'; end if;
    decide := public.es_coordinador() or public.representa(new.comunidad);
    if not decide then
      new.user_id := auth.uid(); new.estado := 'solicitada'; new.rol := 'miembro';
    end if;
    if new.estado <> 'solicitada' then new.decidido_por := auth.uid(); new.decidido_en := now();
    else new.decidido_por := null; new.decidido_en := null; end if;
    if new.user_id <> auth.uid() then new.publico := false; new.mensaje := null; end if;
    new.created_at := now();
  else
    decide := public.es_coordinador() or public.representa(old.comunidad);
    new.comunidad := old.comunidad; new.user_id := old.user_id; new.created_at := old.created_at;
    new.rol_pedido := old.rol_pedido; new.mensaje := old.mensaje;
    if not decide then
      new.estado := old.estado; new.rol := old.rol; new.decidido_por := old.decidido_por; new.decidido_en := old.decidido_en;
    elsif (new.estado, new.rol) is distinct from (old.estado, old.rol) then
      new.decidido_por := auth.uid(); new.decidido_en := now();
    else
      new.decidido_por := old.decidido_por; new.decidido_en := old.decidido_en;
    end if;
    if old.user_id <> auth.uid() then new.publico := old.publico; end if;
    if new.estado <> 'aceptada' then new.publico := false; end if;
  end if;
  return new;
end $$;
drop trigger if exists miembros_antes on public.comunidad_miembros;
create trigger miembros_antes before insert or update on public.comunidad_miembros
  for each row execute function public.miembros_antes();

drop policy if exists "miembros: leer" on public.comunidad_miembros;
drop policy if exists "miembros: pedir" on public.comunidad_miembros;
drop policy if exists "miembros: cambiar" on public.comunidad_miembros;
drop policy if exists "miembros: quitar" on public.comunidad_miembros;
create policy "miembros: leer" on public.comunidad_miembros for select to anon, authenticated
  using ((estado = 'aceptada' and publico) or user_id = auth.uid() or public.representa(comunidad) or public.es_coordinador());
create policy "miembros: pedir" on public.comunidad_miembros for insert to authenticated
  with check (public.con_cuenta() and (user_id = auth.uid() or public.representa(comunidad) or public.es_coordinador()));
create policy "miembros: cambiar" on public.comunidad_miembros for update to authenticated
  using (user_id = auth.uid() or public.representa(comunidad) or public.es_coordinador())
  with check (user_id = auth.uid() or public.representa(comunidad) or public.es_coordinador());
create policy "miembros: quitar" on public.comunidad_miembros for delete to authenticated
  using (user_id = auth.uid() or public.representa(comunidad) or public.es_coordinador());

-- Fichas de comunidad (tabla docs): además de quien la creó, la editan sus representantes y la coordinación
drop policy if exists "docs: cambiar" on public.docs;
create policy "docs: cambiar" on public.docs for update to authenticated
  using (by = auth.uid() or public.is_admin() or (col = 'comunidades' and (public.representa(id) or public.es_coordinador())))
  with check (public.is_admin() or (
    col = 'comunidades' and (public.representa(id) or public.es_coordinador()) and public.con_cuenta()
    and coalesce(data ->> 'ejemplo', 'false') <> 'true'
  ) or (
    by = auth.uid() and col <> 'fechas'
    and public.con_cuenta()
    and data ->> 'by' = auth.uid()::text
    and coalesce(data ->> 'ejemplo', 'false') <> 'true'
    and coalesce(data ->> 'verificada', 'false') <> 'true'
    and (col not in ('votos','apuntes') or id = (data ->> 'aviso') || '__' || auth.uid()::text)
    and (col <> 'avisos' or id not like 'f:%')
    and (col <> 'perfiles' or id = auth.uid()::text)
  ));
drop policy if exists "docs: borrar" on public.docs;
create policy "docs: borrar" on public.docs for delete to authenticated
  using (by = auth.uid() or public.is_admin() or (col = 'comunidades' and public.es_coordinador()));

-- Al editar la ficha de otra persona no cambia quién la creó
create or replace function public.docs_autor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_servidor() or public.is_admin() then return new; end if;
  new."by" := old."by"; new.created_at := old.created_at;
  if old."by" is distinct from auth.uid() and old.data ? 'by' then
    new.data := jsonb_set(new.data, '{by}', old.data -> 'by');
  end if;
  return new;
end $$;
drop trigger if exists docs_autor on public.docs;
create trigger docs_autor before update on public.docs for each row execute function public.docs_autor();

-- Al borrar una comunidad se van sus miembros y sus vínculos con proyectos (lo demás del bloque 4 sigue igual)
create or replace function public.docs_cascade() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.col = 'avisos' then
    delete from public.docs where col in ('respuestas','votos','apuntes') and data ->> 'aviso' = old.id;
  elsif old.col = 'fechas' then
    delete from public.docs where col = 'apuntes' and data ->> 'aviso' = 'f:' || old.id;
  elsif old.col = 'comunidades' then
    delete from public.comunidad_miembros where comunidad = old.id;
    delete from public.proyecto_comunidades where comunidad = old.id;
    update public.oportunidades set comunidad = null where comunidad = old.id;
  end if;
  return old;
end $$;

-- 11. PROYECTOS DE CONSERVACIÓN
create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 3 and 140),
  resumen text check (resumen is null or char_length(resumen) <= 300),
  descripcion text check (descripcion is null or char_length(descripcion) <= 8000),
  problema text check (problema is null or char_length(problema) <= 4000),
  especies text check (especies is null or char_length(especies) <= 600),
  ecosistemas text check (ecosistemas is null or char_length(ecosistemas) <= 600),
  zona text check (zona is null or char_length(zona) <= 20),
  region text check (region is null or char_length(region) <= 120),             -- ubicación general, nunca coordenadas
  responsable_org text check (responsable_org is null or char_length(responsable_org) <= 140),
  objetivos jsonb not null default '[]'::jsonb check (jsonb_typeof(objetivos) = 'array' and pg_column_size(objetivos) < 8000),
  actividades jsonb not null default '[]'::jsonb check (jsonb_typeof(actividades) = 'array' and pg_column_size(actividades) < 8000),
  calendario jsonb not null default '[]'::jsonb check (jsonb_typeof(calendario) = 'array' and pg_column_size(calendario) < 8000),
  necesidades jsonb not null default '[]'::jsonb check (jsonb_typeof(necesidades) = 'array' and pg_column_size(necesidades) < 8000),
  fotos jsonb not null default '[]'::jsonb check (jsonb_typeof(fotos) = 'array' and jsonb_array_length(fotos) <= 12),
  documentos jsonb not null default '[]'::jsonb check (jsonb_typeof(documentos) = 'array' and jsonb_array_length(documentos) <= 20),
  portada text check (portada is null or portada ~ '^https://'),
  moneda text not null default 'pen' check (moneda in ('eur','usd','pen')),
  presupuesto integer check (presupuesto is null or presupuesto >= 0),          -- presupuesto estimado, en céntimos
  meta_fondos integer check (meta_fondos is null or meta_fondos >= 0),          -- objetivo de financiación, en céntimos
  destino_fondos text check (destino_fondos is null or char_length(destino_fondos) <= 2000),
  acepta_donaciones boolean not null default false,                             -- lo activa la coordinación
  resultados text check (resultados is null or char_length(resultados) <= 4000),
  estado text not null default 'preparacion'
    check (estado in ('preparacion','buscando','activo','pausado','finalizado')),
  publicado boolean not null default false,                                     -- lo publica la coordinación
  revision_pedida boolean not null default false,
  ejemplo boolean not null default false,
  by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
alter table public.proyectos enable row level security;

create table if not exists public.proyecto_equipo (
  id uuid primary key default gen_random_uuid(),
  proyecto uuid not null references public.proyectos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rol text not null default 'colaborador' check (rol in ('responsable','colaborador')),
  funcion text check (funcion is null or char_length(funcion) <= 80),
  publico boolean not null default false,                                       -- la persona decide si sale en la ficha
  by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (proyecto, user_id)
);
create index if not exists proyecto_equipo_user_idx on public.proyecto_equipo (user_id);
alter table public.proyecto_equipo enable row level security;

create table if not exists public.proyecto_comunidades (
  id uuid primary key default gen_random_uuid(),
  proyecto uuid not null references public.proyectos (id) on delete cascade,
  comunidad text not null,
  estado text not null default 'propuesta' check (estado in ('propuesta','aceptada','rechazada')),
  propuesta_por text not null default 'proyecto' check (propuesta_por in ('proyecto','comunidad')),
  papel text check (papel is null or char_length(papel) <= 120),
  by uuid default auth.uid(),
  decidido_por uuid,
  decidido_en timestamptz,
  created_at timestamptz not null default now(),
  unique (proyecto, comunidad)
);
create index if not exists proyecto_comunidades_com_idx on public.proyecto_comunidades (comunidad);
alter table public.proyecto_comunidades enable row level security;

create table if not exists public.proyecto_actualizaciones (
  id uuid primary key default gen_random_uuid(),
  proyecto uuid not null references public.proyectos (id) on delete cascade,
  tipo text not null default 'avance' check (tipo in ('avance','actividad','resultado')),
  titulo text not null check (char_length(titulo) between 3 and 160),
  texto text check (texto is null or char_length(texto) <= 6000),
  fecha date not null default current_date,
  comunidad text,                                                               -- si la publica una comunidad
  fotos jsonb not null default '[]'::jsonb check (jsonb_typeof(fotos) = 'array' and jsonb_array_length(fotos) <= 6),
  documentos jsonb not null default '[]'::jsonb check (jsonb_typeof(documentos) = 'array' and jsonb_array_length(documentos) <= 6),
  validada boolean not null default false,                                      -- la valida la coordinación
  validada_por uuid,
  validada_en timestamptz,
  by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists proyecto_act_idx on public.proyecto_actualizaciones (proyecto, fecha desc);
alter table public.proyecto_actualizaciones enable row level security;

create table if not exists public.proyecto_comentarios (
  id uuid primary key default gen_random_uuid(),
  proyecto uuid not null references public.proyectos (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 2000),
  by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists proyecto_com_idx on public.proyecto_comentarios (proyecto, created_at);
alter table public.proyecto_comentarios enable row level security;

create table if not exists public.proyecto_seguidores (
  id uuid primary key default gen_random_uuid(),
  proyecto uuid not null references public.proyectos (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (proyecto, user_id)
);
alter table public.proyecto_seguidores enable row level security;

create or replace function public.gestiona_proyecto(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_coordinador() or (public.con_cuenta() and exists (select 1 from public.proyecto_equipo e
    where e.proyecto = p and e.user_id = auth.uid() and e.rol = 'responsable'));
$$;
create or replace function public.participa_proyecto(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_coordinador() or (public.con_cuenta() and (
    exists (select 1 from public.proyecto_equipo e where e.proyecto = p and e.user_id = auth.uid())
    or exists (select 1 from public.proyecto_comunidades pc join public.comunidad_miembros m on m.comunidad = pc.comunidad
      where pc.proyecto = p and pc.estado = 'aceptada' and m.user_id = auth.uid() and m.rol = 'representante' and m.estado = 'aceptada')));
$$;
create or replace function public.proyecto_publicado(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.proyectos x where x.id = p and x.publicado);
$$;
-- Ver un borrador: su equipo, la coordinación y las comunidades a las que se ha propuesto
create or replace function public.ve_proyecto(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.proyecto_publicado(p) or public.participa_proyecto(p) or (public.con_cuenta() and exists (
    select 1 from public.proyecto_comunidades pc join public.comunidad_miembros m on m.comunidad = pc.comunidad
    where pc.proyecto = p and pc.estado = 'propuesta' and m.user_id = auth.uid() and m.rol = 'representante' and m.estado = 'aceptada'));
$$;
create or replace function public.participa_alguno() returns boolean
language sql stable security definer set search_path = public as $$
  select public.con_cuenta() and exists (select 1 from public.proyecto_equipo e where e.user_id = auth.uid());
$$;
create or replace function public.gestiona_alguno() returns boolean
language sql stable security definer set search_path = public as $$
  select public.con_cuenta() and exists (select 1 from public.proyecto_equipo e where e.user_id = auth.uid() and e.rol = 'responsable');
$$;
grant execute on function public.gestiona_proyecto(uuid), public.participa_proyecto(uuid), public.proyecto_publicado(uuid),
  public.ve_proyecto(uuid), public.participa_alguno(), public.gestiona_alguno() to anon, authenticated;

-- Lo que solo decide la coordinación: publicar, activar las donaciones y marcar ejemplos
create or replace function public.proyectos_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_servidor() then new.actualizado := now(); return new; end if;
  if tg_op = 'INSERT' then
    new."by" := auth.uid(); new.created_at := now();
    if not public.es_coordinador() then
      new.publicado := false; new.ejemplo := false; new.acepta_donaciones := false;
    end if;
  else
    new."by" := old."by"; new.created_at := old.created_at;
    if not public.es_coordinador() then
      new.publicado := old.publicado; new.ejemplo := old.ejemplo; new.acepta_donaciones := old.acepta_donaciones;
    end if;
  end if;
  if new.publicado then new.revision_pedida := false; end if;
  new.actualizado := now();
  return new;
end $$;
drop trigger if exists proyectos_antes on public.proyectos;
create trigger proyectos_antes before insert or update on public.proyectos for each row execute function public.proyectos_antes();

-- Quien crea el proyecto queda como responsable (y sale en la ficha; puede ocultarse después)
create or replace function public.proyectos_despues() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new."by" is not null and not new.ejemplo then
    perform set_config('hampatu.sistema', '1', true);
    insert into public.proyecto_equipo (proyecto, user_id, rol, publico, by)
      values (new.id, new."by", 'responsable', true, new."by") on conflict (proyecto, user_id) do nothing;
    perform set_config('hampatu.sistema', '', true);
  end if;
  return new;
end $$;
drop trigger if exists proyectos_despues on public.proyectos;
create trigger proyectos_despues after insert on public.proyectos for each row execute function public.proyectos_despues();

create or replace function public.equipo_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_servidor() or current_setting('hampatu.sistema', true) = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new."by" := auth.uid(); new.created_at := now();
    if new.user_id <> auth.uid() then new.publico := false; end if;
  else
    new.proyecto := old.proyecto; new.user_id := old.user_id; new."by" := old."by"; new.created_at := old.created_at;
    if old.user_id <> auth.uid() then new.publico := old.publico; end if;
    if not public.gestiona_proyecto(old.proyecto) then new.rol := old.rol; new.funcion := old.funcion; end if;
  end if;
  return new;
end $$;
drop trigger if exists equipo_antes on public.proyecto_equipo;
create trigger equipo_antes before insert or update on public.proyecto_equipo for each row execute function public.equipo_antes();

-- Vincular comunidades y proyectos: propone una parte y acepta la otra
create or replace function public.vinculos_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_servidor() then return new; end if;
  if tg_op = 'INSERT' then
    if not public.comunidad_existe(new.comunidad) then raise exception 'La comunidad no existe' using errcode = '23503'; end if;
    new."by" := auth.uid(); new.created_at := now();
    new.propuesta_por := case when public.gestiona_proyecto(new.proyecto) then 'proyecto' else 'comunidad' end;
    if new.estado = 'aceptada' and (public.es_coordinador()
        or (public.gestiona_proyecto(new.proyecto) and public.representa(new.comunidad))) then
      new.decidido_por := auth.uid(); new.decidido_en := now();
    else
      new.estado := 'propuesta'; new.decidido_por := null; new.decidido_en := null;
    end if;
  else
    new.proyecto := old.proyecto; new.comunidad := old.comunidad; new.propuesta_por := old.propuesta_por;
    new."by" := old."by"; new.created_at := old.created_at;
    if new.estado is distinct from old.estado then
      if not (public.es_coordinador()
          or (old.propuesta_por = 'proyecto' and public.representa(old.comunidad))
          or (old.propuesta_por = 'comunidad' and public.gestiona_proyecto(old.proyecto))) then
        raise exception 'Esta propuesta la tiene que aceptar la otra parte' using errcode = '42501';
      end if;
      new.decidido_por := auth.uid(); new.decidido_en := now();
    else
      new.decidido_por := old.decidido_por; new.decidido_en := old.decidido_en;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists vinculos_antes on public.proyecto_comunidades;
create trigger vinculos_antes before insert or update on public.proyecto_comunidades for each row execute function public.vinculos_antes();

-- Actualizaciones: cambiar el contenido quita la validación; solo la coordinación valida
create or replace function public.actualizaciones_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_servidor() then return new; end if;
  if new.comunidad is not null and not (public.es_coordinador() or public.representa(new.comunidad)) then new.comunidad := null; end if;
  if tg_op = 'INSERT' then
    new."by" := auth.uid(); new.created_at := now();
    if public.es_coordinador() and new.validada then new.validada_por := auth.uid(); new.validada_en := now();
    else new.validada := false; new.validada_por := null; new.validada_en := null; end if;
  else
    new.proyecto := old.proyecto; new."by" := old."by"; new.created_at := old.created_at;
    if public.es_coordinador() then
      if new.validada and not old.validada then new.validada_por := auth.uid(); new.validada_en := now();
      elsif not new.validada then new.validada_por := null; new.validada_en := null;
      else new.validada_por := old.validada_por; new.validada_en := old.validada_en; end if;
    elsif (new.tipo, new.titulo, new.texto, new.fecha, new.fotos, new.documentos)
        is distinct from (old.tipo, old.titulo, old.texto, old.fecha, old.fotos, old.documentos) then
      new.validada := false; new.validada_por := null; new.validada_en := null;
    else
      new.validada := old.validada; new.validada_por := old.validada_por; new.validada_en := old.validada_en;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists actualizaciones_antes on public.proyecto_actualizaciones;
create trigger actualizaciones_antes before insert or update on public.proyecto_actualizaciones
  for each row execute function public.actualizaciones_antes();

create or replace function public.poner_autor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_servidor() then new."by" := auth.uid(); new.created_at := now(); end if;
  return new;
end $$;
drop trigger if exists comentarios_autor on public.proyecto_comentarios;
create trigger comentarios_autor before insert on public.proyecto_comentarios for each row execute function public.poner_autor();

-- Permisos de proyectos
drop policy if exists "proyectos: leer" on public.proyectos;
drop policy if exists "proyectos: crear" on public.proyectos;
drop policy if exists "proyectos: cambiar" on public.proyectos;
drop policy if exists "proyectos: borrar" on public.proyectos;
create policy "proyectos: leer" on public.proyectos for select to anon, authenticated
  using (publicado or by = auth.uid() or public.ve_proyecto(id));
create policy "proyectos: crear" on public.proyectos for insert to authenticated
  with check (public.con_cuenta() and (public.es_coordinador() or public.representa_alguna()));
create policy "proyectos: cambiar" on public.proyectos for update to authenticated
  using (public.gestiona_proyecto(id)) with check (public.gestiona_proyecto(id));
create policy "proyectos: borrar" on public.proyectos for delete to authenticated
  using (public.es_coordinador() or (public.gestiona_proyecto(id) and not publicado));

drop policy if exists "equipo: leer" on public.proyecto_equipo;
drop policy if exists "equipo: añadir" on public.proyecto_equipo;
drop policy if exists "equipo: cambiar" on public.proyecto_equipo;
drop policy if exists "equipo: quitar" on public.proyecto_equipo;
create policy "equipo: leer" on public.proyecto_equipo for select to anon, authenticated
  using ((publico and public.proyecto_publicado(proyecto)) or user_id = auth.uid() or public.participa_proyecto(proyecto));
create policy "equipo: añadir" on public.proyecto_equipo for insert to authenticated with check (public.gestiona_proyecto(proyecto));
create policy "equipo: cambiar" on public.proyecto_equipo for update to authenticated
  using (user_id = auth.uid() or public.gestiona_proyecto(proyecto)) with check (user_id = auth.uid() or public.gestiona_proyecto(proyecto));
create policy "equipo: quitar" on public.proyecto_equipo for delete to authenticated
  using (user_id = auth.uid() or public.gestiona_proyecto(proyecto));

drop policy if exists "vinculos: leer" on public.proyecto_comunidades;
drop policy if exists "vinculos: proponer" on public.proyecto_comunidades;
drop policy if exists "vinculos: decidir" on public.proyecto_comunidades;
drop policy if exists "vinculos: quitar" on public.proyecto_comunidades;
create policy "vinculos: leer" on public.proyecto_comunidades for select to anon, authenticated
  using ((estado = 'aceptada' and public.proyecto_publicado(proyecto)) or public.participa_proyecto(proyecto) or public.representa(comunidad));
create policy "vinculos: proponer" on public.proyecto_comunidades for insert to authenticated
  with check (public.gestiona_proyecto(proyecto) or (public.representa(comunidad) and public.ve_proyecto(proyecto)));
create policy "vinculos: decidir" on public.proyecto_comunidades for update to authenticated
  using (public.gestiona_proyecto(proyecto) or public.representa(comunidad))
  with check (public.gestiona_proyecto(proyecto) or public.representa(comunidad));
create policy "vinculos: quitar" on public.proyecto_comunidades for delete to authenticated
  using (public.gestiona_proyecto(proyecto) or public.representa(comunidad));

drop policy if exists "actualizaciones: leer" on public.proyecto_actualizaciones;
drop policy if exists "actualizaciones: crear" on public.proyecto_actualizaciones;
drop policy if exists "actualizaciones: cambiar" on public.proyecto_actualizaciones;
drop policy if exists "actualizaciones: borrar" on public.proyecto_actualizaciones;
create policy "actualizaciones: leer" on public.proyecto_actualizaciones for select to anon, authenticated
  using (public.proyecto_publicado(proyecto) or public.participa_proyecto(proyecto));
create policy "actualizaciones: crear" on public.proyecto_actualizaciones for insert to authenticated
  with check (public.participa_proyecto(proyecto));
create policy "actualizaciones: cambiar" on public.proyecto_actualizaciones for update to authenticated
  using (by = auth.uid() or public.es_coordinador()) with check (by = auth.uid() or public.es_coordinador());
create policy "actualizaciones: borrar" on public.proyecto_actualizaciones for delete to authenticated
  using (by = auth.uid() or public.gestiona_proyecto(proyecto));

drop policy if exists "comentarios: leer" on public.proyecto_comentarios;
drop policy if exists "comentarios: crear" on public.proyecto_comentarios;
drop policy if exists "comentarios: borrar" on public.proyecto_comentarios;
create policy "comentarios: leer" on public.proyecto_comentarios for select to anon, authenticated
  using (public.proyecto_publicado(proyecto) or public.participa_proyecto(proyecto));
create policy "comentarios: crear" on public.proyecto_comentarios for insert to authenticated
  with check (public.con_cuenta() and (public.proyecto_publicado(proyecto) or public.participa_proyecto(proyecto)));
create policy "comentarios: borrar" on public.proyecto_comentarios for delete to authenticated
  using (by = auth.uid() or public.gestiona_proyecto(proyecto));

drop policy if exists "seguir: leer" on public.proyecto_seguidores;
drop policy if exists "seguir: seguir" on public.proyecto_seguidores;
drop policy if exists "seguir: dejar" on public.proyecto_seguidores;
create policy "seguir: leer" on public.proyecto_seguidores for select to authenticated using (user_id = auth.uid());
create policy "seguir: seguir" on public.proyecto_seguidores for insert to authenticated
  with check (user_id = auth.uid() and public.con_cuenta() and public.proyecto_publicado(proyecto));
create policy "seguir: dejar" on public.proyecto_seguidores for delete to authenticated using (user_id = auth.uid());

-- 12. COLABORA: necesidades de colaboración y candidaturas
-- Voluntariado y apoyo en especie: no son ofertas de empleo.
create table if not exists public.oportunidades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 5 and 140),
  descripcion text not null check (char_length(descripcion) between 10 and 4000),
  categoria text not null check (categoria in ('voluntariado','investigacion','herpetologia','educacion','material',
    'equipamiento','transporte','tecnologia','diseno','traduccion','formacion','institucional')),
  proyecto uuid references public.proyectos (id) on delete set null,
  comunidad text,
  ubicacion text check (ubicacion is null or char_length(ubicacion) <= 120),
  duracion text check (duracion is null or char_length(duracion) <= 120),
  requisitos text check (requisitos is null or char_length(requisitos) <= 2000),
  responsable_texto text check (responsable_texto is null or char_length(responsable_texto) <= 140),
  estado text not null default 'abierta' check (estado in ('abierta','en_curso','cubierta','cerrada')),
  publicado boolean not null default true,
  by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists oportunidades_proyecto_idx on public.oportunidades (proyecto);
alter table public.oportunidades enable row level security;

create table if not exists public.candidaturas (
  id uuid primary key default gen_random_uuid(),
  oportunidad uuid references public.oportunidades (id) on delete set null,
  proyecto uuid references public.proyectos (id) on delete set null,
  comunidad text,
  tipo text not null default 'persona' check (tipo in ('persona','profesional','universidad','organizacion')),
  organizacion text check (organizacion is null or char_length(organizacion) <= 140),
  categoria text check (categoria is null or categoria in ('voluntariado','investigacion','herpetologia','educacion','material',
    'equipamiento','transporte','tecnologia','diseno','traduccion','formacion','institucional')),
  mensaje text not null check (char_length(mensaje) between 10 and 3000),
  experiencia text check (experiencia is null or char_length(experiencia) <= 2000),
  disponibilidad text check (disponibilidad is null or char_length(disponibilidad) <= 300),
  contacto text check (contacto is null or char_length(contacto) <= 160),     -- solo lo ve quien revisa
  aparecer boolean not null default false,                                     -- consiente salir como colaborador si se acepta
  estado text not null default 'enviada' check (estado in ('enviada','en_revision','aceptada','rechazada','retirada')),
  nota text check (nota is null or char_length(nota) <= 1000),                -- respuesta de quien revisa
  by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  decidido_por uuid,
  decidido_en timestamptz
);
create index if not exists candidaturas_by_idx on public.candidaturas (by);
alter table public.candidaturas enable row level security;

create or replace function public.gestiona_oportunidad(o uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_coordinador() or (public.con_cuenta() and exists (select 1 from public.oportunidades x where x.id = o and (
    x.by = auth.uid() or (x.proyecto is not null and public.gestiona_proyecto(x.proyecto))
    or (x.comunidad is not null and public.representa(x.comunidad)))));
$$;
create or replace function public.revisa_candidatura(o uuid, p uuid, c text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_coordinador() or (o is not null and public.gestiona_oportunidad(o))
    or (p is not null and public.gestiona_proyecto(p)) or (c is not null and public.representa(c));
$$;
grant execute on function public.gestiona_oportunidad(uuid), public.revisa_candidatura(uuid, uuid, text) to anon, authenticated;

create or replace function public.oportunidades_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_servidor() then new.actualizado := now(); return new; end if;
  if new.comunidad is not null and not public.comunidad_existe(new.comunidad) then
    raise exception 'La comunidad no existe' using errcode = '23503';
  end if;
  if tg_op = 'INSERT' then new."by" := auth.uid(); new.created_at := now();
  else new."by" := old."by"; new.created_at := old.created_at; end if;
  new.actualizado := now();
  return new;
end $$;
drop trigger if exists oportunidades_antes on public.oportunidades;
create trigger oportunidades_antes before insert or update on public.oportunidades for each row execute function public.oportunidades_antes();

create or replace function public.candidaturas_antes() returns trigger
language plpgsql security definer set search_path = public as $$
declare op record; revisor boolean;
begin
  if public.es_servidor() then return new; end if;
  if tg_op = 'INSERT' then
    new."by" := auth.uid(); new.created_at := now(); new.estado := 'enviada'; new.nota := null;
    new.decidido_por := null; new.decidido_en := null;
    if new.oportunidad is not null then
      select * into op from public.oportunidades x where x.id = new.oportunidad;
      if not found or not op.publicado or op.estado not in ('abierta','en_curso') then
        raise exception 'Esta necesidad ya no admite candidaturas' using errcode = '42501';
      end if;
      new.proyecto := op.proyecto; new.comunidad := op.comunidad; new.categoria := op.categoria;
    elsif new.proyecto is not null and not public.proyecto_publicado(new.proyecto) then
      raise exception 'Proyecto no disponible' using errcode = '42501';
    end if;
    if new.comunidad is not null and not public.comunidad_existe(new.comunidad) then new.comunidad := null; end if;
    return new;
  end if;
  revisor := public.revisa_candidatura(old.oportunidad, old.proyecto, old.comunidad);
  new."by" := old."by"; new.oportunidad := old.oportunidad; new.proyecto := old.proyecto; new.comunidad := old.comunidad;
  new.created_at := old.created_at; new.tipo := old.tipo; new.organizacion := old.organizacion; new.categoria := old.categoria;
  new.mensaje := old.mensaje; new.experiencia := old.experiencia; new.disponibilidad := old.disponibilidad;
  new.contacto := old.contacto; new.aparecer := old.aparecer;
  if new.estado is distinct from old.estado then
    if old."by" = auth.uid() and new.estado = 'retirada' and old.estado in ('enviada','en_revision') then
      null;
    elsif revisor and new.estado in ('en_revision','aceptada','rechazada') and old.estado <> 'retirada' then
      new.decidido_por := auth.uid(); new.decidido_en := now();
    else
      raise exception 'No puedes cambiar el estado de esta candidatura' using errcode = '42501';
    end if;
  else
    new.decidido_por := old.decidido_por; new.decidido_en := old.decidido_en;
  end if;
  if not revisor then new.nota := old.nota; end if;
  return new;
end $$;
drop trigger if exists candidaturas_antes on public.candidaturas;
create trigger candidaturas_antes before insert or update on public.candidaturas for each row execute function public.candidaturas_antes();

-- Al aceptar una candidatura de un proyecto, la persona entra en su equipo como colaboradora
create or replace function public.candidaturas_despues() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'aceptada' and old.estado <> 'aceptada' and new.proyecto is not null and new."by" is not null then
    perform set_config('hampatu.sistema', '1', true);
    insert into public.proyecto_equipo (proyecto, user_id, rol, funcion, publico, by)
      values (new.proyecto, new."by", 'colaborador', new.categoria, new.aparecer, auth.uid())
      on conflict (proyecto, user_id) do nothing;
    perform set_config('hampatu.sistema', '', true);
  end if;
  return new;
end $$;
drop trigger if exists candidaturas_despues on public.candidaturas;
create trigger candidaturas_despues after update on public.candidaturas for each row execute function public.candidaturas_despues();

drop policy if exists "oportunidades: leer" on public.oportunidades;
drop policy if exists "oportunidades: crear" on public.oportunidades;
drop policy if exists "oportunidades: cambiar" on public.oportunidades;
drop policy if exists "oportunidades: borrar" on public.oportunidades;
create policy "oportunidades: leer" on public.oportunidades for select to anon, authenticated
  using ((publicado and (proyecto is null or public.proyecto_publicado(proyecto))) or by = auth.uid() or public.gestiona_oportunidad(id)
    or (proyecto is not null and public.gestiona_proyecto(proyecto)) or (comunidad is not null and public.representa(comunidad)));
create policy "oportunidades: crear" on public.oportunidades for insert to authenticated
  with check (public.con_cuenta() and (public.es_coordinador()
    or (proyecto is not null and public.gestiona_proyecto(proyecto))
    or (comunidad is not null and public.representa(comunidad))));
create policy "oportunidades: cambiar" on public.oportunidades for update to authenticated
  using (public.gestiona_oportunidad(id))
  with check (public.es_coordinador() or (proyecto is not null and public.gestiona_proyecto(proyecto))
    or (comunidad is not null and public.representa(comunidad)) or by = auth.uid());
create policy "oportunidades: borrar" on public.oportunidades for delete to authenticated using (public.gestiona_oportunidad(id));

drop policy if exists "candidaturas: leer" on public.candidaturas;
drop policy if exists "candidaturas: enviar" on public.candidaturas;
drop policy if exists "candidaturas: cambiar" on public.candidaturas;
drop policy if exists "candidaturas: borrar" on public.candidaturas;
create policy "candidaturas: leer" on public.candidaturas for select to authenticated
  using (by = auth.uid() or public.revisa_candidatura(oportunidad, proyecto, comunidad));
create policy "candidaturas: enviar" on public.candidaturas for insert to authenticated with check (public.con_cuenta());
create policy "candidaturas: cambiar" on public.candidaturas for update to authenticated
  using (by = auth.uid() or public.revisa_candidatura(oportunidad, proyecto, comunidad))
  with check (by = auth.uid() or public.revisa_candidatura(oportunidad, proyecto, comunidad));
create policy "candidaturas: borrar" on public.candidaturas for delete to authenticated using (public.es_coordinador());

-- 13. FINANCIACIÓN: donaciones (pasarela de pago), ingresos y gastos
-- Aquí NUNCA se guardan datos de tarjeta: los cobra el proveedor de pagos (Stripe).
-- Las donaciones solo las escribe el servidor (api/donaciones/*) con la clave secreta, al confirmarlas el webhook.
create table if not exists public.donaciones (
  id uuid primary key default gen_random_uuid(),
  proyecto uuid references public.proyectos (id) on delete set null,          -- vacío = fondo general
  donante uuid references auth.users (id) on delete set null,                -- solo si tenía cuenta y aceptó asociarla
  cantidad integer not null check (cantidad > 0),                             -- en céntimos
  moneda text not null default 'eur' check (moneda in ('eur','usd','pen')),
  frecuencia text not null check (frecuencia in ('puntual','mensual')),
  estado text not null default 'iniciada'
    check (estado in ('iniciada','procesando','pagada','fallida','cancelada','reembolsada')),
  proveedor text not null check (proveedor in ('stripe')),
  proveedor_ref text not null check (char_length(proveedor_ref) between 1 and 255), -- sesión de pago o factura
  pago_ref text,                                                              -- PaymentIntent (para reembolsos)
  suscripcion_ref text,
  suscripcion_estado text,
  cliente_ref text,                                                           -- para contar colaboradores sin datos personales
  email text check (email is null or char_length(email) <= 320),             -- solo si aceptó recibir noticias
  consentimientos jsonb not null default '{}'::jsonb check (pg_column_size(consentimientos) < 2000),
  origen uuid references public.donaciones (id) on delete set null,          -- cuotas mensuales: enlaza con la primera
  pagada_en timestamptz,
  created_at timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  unique (proveedor, proveedor_ref)
);
create index if not exists donaciones_pago_idx on public.donaciones (pago_ref);
create index if not exists donaciones_susc_idx on public.donaciones (suscripcion_ref);
create index if not exists donaciones_proyecto_idx on public.donaciones (proyecto);
alter table public.donaciones enable row level security;
revoke insert, update, delete on public.donaciones from anon, authenticated;
drop policy if exists "donaciones: leer" on public.donaciones;
create policy "donaciones: leer" on public.donaciones for select to authenticated
  using ((donante is not null and donante = auth.uid()) or public.es_coordinador());

create or replace function public.tocar() returns trigger language plpgsql as $$
begin new.actualizado = now(); return new; end $$;
drop trigger if exists donaciones_tocar on public.donaciones;
create trigger donaciones_tocar before update on public.donaciones for each row execute function public.tocar();

-- Avisos del proveedor ya procesados: si Stripe repite un aviso, no se cuenta dos veces
create table if not exists public.donaciones_eventos (
  id text primary key,
  tipo text not null,
  recibido timestamptz not null default now()
);
alter table public.donaciones_eventos enable row level security;
revoke all on public.donaciones_eventos from anon, authenticated;

-- Ingresos (convenios, subvenciones, donaciones por transferencia o Yape) y gastos.
-- Los registran la coordinación o los responsables del proyecto. No se borran ni se cambian:
-- la coordinación los verifica y, si hay un error, se anulan con un motivo y se registran de nuevo.
create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso','gasto')),
  proyecto uuid references public.proyectos (id) on delete restrict,          -- vacío = fondo general
  concepto text not null check (char_length(concepto) between 3 and 200),
  categoria text not null check (categoria in ('material','equipamiento','transporte','formacion','alimentacion',
    'servicios','comunicacion','tecnologia','administracion','donacion','subvencion','convenio','otro')),
  importe integer not null check (importe > 0),                               -- en céntimos
  moneda text not null check (moneda in ('eur','usd','pen')),
  fecha date not null,
  contraparte text check (contraparte is null or char_length(contraparte) <= 160), -- proveedor o entidad (no personas)
  justificante text check (justificante is null or char_length(justificante) <= 300), -- ruta en el bucket privado
  estado text not null default 'registrado' check (estado in ('registrado','verificado','anulado')),
  motivo_anulacion text check (motivo_anulacion is null or char_length(motivo_anulacion) <= 500),
  registrado_por uuid default auth.uid(),
  created_at timestamptz not null default now(),
  verificado_por uuid,
  verificado_en timestamptz,
  anulado_por uuid,
  anulado_en timestamptz
);
create index if not exists movimientos_proyecto_idx on public.movimientos (proyecto);
alter table public.movimientos enable row level security;
revoke delete on public.movimientos from anon, authenticated;

create or replace function public.movimientos_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_servidor() then return new; end if;
  if tg_op = 'INSERT' then
    new.registrado_por := auth.uid(); new.created_at := now(); new.estado := 'registrado';
    new.verificado_por := null; new.verificado_en := null; new.anulado_por := null; new.anulado_en := null; new.motivo_anulacion := null;
    if new.justificante is not null and split_part(new.justificante, '/', 1) <> auth.uid()::text then
      raise exception 'Justificante no válido' using errcode = '42501';
    end if;
    return new;
  end if;
  if (new.tipo, new.proyecto, new.concepto, new.categoria, new.importe, new.moneda, new.fecha, new.contraparte, new.registrado_por, new.created_at)
      is distinct from (old.tipo, old.proyecto, old.concepto, old.categoria, old.importe, old.moneda, old.fecha, old.contraparte, old.registrado_por, old.created_at) then
    raise exception 'Un movimiento registrado no se cambia: anúlalo con un motivo y regístralo de nuevo' using errcode = '42501';
  end if;
  if new.justificante is distinct from old.justificante and (old.justificante is not null or old.estado <> 'registrado'
      or split_part(coalesce(new.justificante, ''), '/', 1) <> auth.uid()::text) then
    raise exception 'El justificante solo se puede añadir una vez, antes de verificar' using errcode = '42501';
  end if;
  if new.estado is distinct from old.estado then
    if old.estado = 'registrado' and new.estado = 'verificado' and public.es_coordinador() then
      new.verificado_por := auth.uid(); new.verificado_en := now();
      new.anulado_por := old.anulado_por; new.anulado_en := old.anulado_en; new.motivo_anulacion := old.motivo_anulacion;
    elsif old.estado <> 'anulado' and new.estado = 'anulado' and coalesce(btrim(new.motivo_anulacion), '') <> ''
        and (public.es_coordinador() or (old.estado = 'registrado' and old.registrado_por = auth.uid())) then
      new.anulado_por := auth.uid(); new.anulado_en := now();
      new.verificado_por := old.verificado_por; new.verificado_en := old.verificado_en;
    else
      raise exception 'Cambio de estado no permitido' using errcode = '42501';
    end if;
  else
    new.verificado_por := old.verificado_por; new.verificado_en := old.verificado_en;
    new.anulado_por := old.anulado_por; new.anulado_en := old.anulado_en; new.motivo_anulacion := old.motivo_anulacion;
  end if;
  return new;
end $$;
drop trigger if exists movimientos_antes on public.movimientos;
create trigger movimientos_antes before insert or update on public.movimientos for each row execute function public.movimientos_antes();

drop policy if exists "movimientos: leer" on public.movimientos;
drop policy if exists "movimientos: registrar" on public.movimientos;
drop policy if exists "movimientos: cambiar" on public.movimientos;
create policy "movimientos: leer" on public.movimientos for select to authenticated
  using (public.es_coordinador() or (proyecto is not null and public.gestiona_proyecto(proyecto)));
create policy "movimientos: registrar" on public.movimientos for insert to authenticated
  with check (public.con_cuenta() and (public.es_coordinador() or (proyecto is not null and public.gestiona_proyecto(proyecto))));
create policy "movimientos: cambiar" on public.movimientos for update to authenticated
  using (public.es_coordinador() or registrado_por = auth.uid())
  with check (public.es_coordinador() or registrado_por = auth.uid());

-- Justificantes de gastos: carpeta PRIVADA (se ven con enlaces que caducan)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('justificantes', 'justificantes', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false;
drop policy if exists "justificantes: subir" on storage.objects;
drop policy if exists "justificantes: ver" on storage.objects;
create policy "justificantes: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'justificantes' and public.con_cuenta() and (storage.foldername(name))[1] = auth.uid()::text
    and (public.es_coordinador() or public.gestiona_alguno()));
create policy "justificantes: ver" on storage.objects for select to authenticated
  using (bucket_id = 'justificantes' and (public.es_coordinador() or (storage.foldername(name))[1] = auth.uid()::text));

-- 14. TRANSPARENCIA E IMPACTO
create table if not exists public.informes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 3 and 160),
  resumen text check (resumen is null or char_length(resumen) <= 4000),
  tipo text not null default 'actividad' check (tipo in ('actividad','informe','financiero','resultado')),
  proyecto uuid references public.proyectos (id) on delete set null,
  comunidad text,
  fecha date not null default current_date,
  archivos jsonb not null default '[]'::jsonb check (jsonb_typeof(archivos) = 'array' and jsonb_array_length(archivos) <= 10),
  publicado boolean not null default false,                                    -- lo publica la coordinación
  by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  publicado_por uuid,
  publicado_en timestamptz
);
alter table public.informes enable row level security;

create or replace function public.informes_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_servidor() then return new; end if;
  if tg_op = 'INSERT' then new."by" := auth.uid(); new.created_at := now();
  else new."by" := old."by"; new.created_at := old.created_at; end if;
  if not public.es_coordinador() then
    new.publicado := case when tg_op = 'INSERT' then false else old.publicado end;
  end if;
  if new.publicado and (tg_op = 'INSERT' or not old.publicado) then new.publicado_por := auth.uid(); new.publicado_en := now();
  elsif not new.publicado then new.publicado_por := null; new.publicado_en := null;
  else new.publicado_por := old.publicado_por; new.publicado_en := old.publicado_en; end if;
  return new;
end $$;
drop trigger if exists informes_antes on public.informes;
create trigger informes_antes before insert or update on public.informes for each row execute function public.informes_antes();

drop policy if exists "informes: leer" on public.informes;
drop policy if exists "informes: crear" on public.informes;
drop policy if exists "informes: cambiar" on public.informes;
drop policy if exists "informes: borrar" on public.informes;
create policy "informes: leer" on public.informes for select to anon, authenticated
  using (publicado or by = auth.uid() or public.es_coordinador() or (proyecto is not null and public.gestiona_proyecto(proyecto)));
create policy "informes: crear" on public.informes for insert to authenticated
  with check (public.con_cuenta() and (public.es_coordinador()
    or (proyecto is not null and public.participa_proyecto(proyecto)) or (comunidad is not null and public.representa(comunidad))));
create policy "informes: cambiar" on public.informes for update to authenticated
  using (public.es_coordinador() or (by = auth.uid() and not publicado))
  with check (public.es_coordinador() or by = auth.uid());
create policy "informes: borrar" on public.informes for delete to authenticated
  using (public.es_coordinador() or (by = auth.uid() and not publicado));

-- Documentos públicos (PDF e imágenes de proyectos e informes)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', true, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "documentos: subir" on storage.objects;
drop policy if exists "documentos: borrar" on storage.objects;
create policy "documentos: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.con_cuenta() and (storage.foldername(name))[1] = auth.uid()::text
    and (public.es_coordinador() or public.representa_alguna() or public.participa_alguno()));
create policy "documentos: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_coordinador()));

-- Cifras públicas: SOLO registros verificados y agregados (pagos confirmados por la pasarela,
-- ingresos y gastos verificados por la coordinación, actualizaciones validadas). Los ejemplos no cuentan.
create or replace function public.cifras_publicas() returns jsonb
language sql stable security definer set search_path = public as $$
  with
  p as (select * from public.proyectos where publicado and not ejemplo),
  don as (select * from public.donaciones where estado = 'pagada'),
  ing as (select * from public.movimientos where tipo = 'ingreso' and estado = 'verificado'),
  gas as (select * from public.movimientos where tipo = 'gasto' and estado = 'verificado'),
  act as (select a.* from public.proyecto_actualizaciones a join p on p.id = a.proyecto where a.validada),
  entradas as (
    select moneda, cantidad as importe, coalesce(pagada_en, created_at) as fecha, 'donacion' as via from don
    union all
    select moneda, importe, fecha::timestamptz, 'ingreso' from ing)
  select jsonb_build_object(
    'comunidades', (select count(*) from public.docs where col = 'comunidades' and coalesce(data ->> 'ejemplo', 'false') <> 'true'),
    'comunidades_participantes', (select count(distinct pc.comunidad) from public.proyecto_comunidades pc join p on p.id = pc.proyecto
       where pc.estado = 'aceptada' and pc.comunidad not like 'ej-%'),
    'proyectos', (select coalesce(jsonb_object_agg(estado, n), '{}'::jsonb) from (select estado, count(*) n from p group by estado) x),
    'actividades', (select count(*) from act where tipo = 'actividad'),
    'resultados', (select count(*) from act where tipo = 'resultado'),
    'informes', (select count(*) from public.informes where publicado),
    'colaboradores', (select count(distinct e.user_id) from public.proyecto_equipo e join p on p.id = e.proyecto where e.rol = 'colaborador'),
    'donantes', (select count(distinct coalesce(cliente_ref, donante::text, id::text)) from don),
    'fondos', (select coalesce(jsonb_agg(jsonb_build_object('moneda', moneda, 'donaciones', d, 'otros', o, 'aportaciones', n) order by moneda), '[]'::jsonb)
       from (select moneda, sum(case when via = 'donacion' then importe else 0 end) d,
                    sum(case when via = 'ingreso' then importe else 0 end) o, count(*) n from entradas group by moneda) x),
    'gastos', (select coalesce(jsonb_agg(jsonb_build_object('moneda', moneda, 'total', t, 'n', n) order by moneda), '[]'::jsonb)
       from (select moneda, sum(importe) t, count(*) n from gas group by moneda) x),
    'gastos_categoria', (select coalesce(jsonb_agg(jsonb_build_object('categoria', categoria, 'moneda', moneda, 'total', t, 'n', n) order by t desc), '[]'::jsonb)
       from (select categoria, moneda, sum(importe) t, count(*) n from gas group by categoria, moneda) x),
    'material', (select coalesce(jsonb_agg(jsonb_build_object('moneda', moneda, 'total', t, 'n', n) order by moneda), '[]'::jsonb)
       from (select moneda, sum(importe) t, count(*) n from gas where categoria in ('material','equipamiento') group by moneda) x),
    'fondos_mes', (select coalesce(jsonb_agg(jsonb_build_object('mes', mes, 'moneda', moneda, 'total', t) order by mes), '[]'::jsonb)
       from (select to_char(fecha, 'YYYY-MM') mes, moneda, sum(importe) t from entradas
             where fecha >= date_trunc('month', now()) - interval '23 months' group by 1, 2) x),
    'por_proyecto', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'moneda', p.moneda,
        'recaudado', coalesce((select sum(cantidad) from don where don.proyecto = p.id and don.moneda = p.moneda), 0)
                   + coalesce((select sum(importe) from ing where ing.proyecto = p.id and ing.moneda = p.moneda), 0),
        'aportaciones', (select count(*) from don where don.proyecto = p.id) + (select count(*) from ing where ing.proyecto = p.id),
        'gastado', coalesce((select sum(importe) from gas where gas.proyecto = p.id and gas.moneda = p.moneda), 0),
        'seguidores', (select count(*) from public.proyecto_seguidores s where s.proyecto = p.id))), '[]'::jsonb) from p),
    'seguidores', (select coalesce(jsonb_object_agg(proyecto, n), '{}'::jsonb)
       from (select proyecto, count(*) n from public.proyecto_seguidores group by proyecto) x)
  );
$$;
revoke execute on function public.cifras_publicas() from public;
grant execute on function public.cifras_publicas() to anon, authenticated;

-- 15. REGISTRO DE CAMBIOS (trazabilidad). Solo lo lee la coordinación; nadie lo puede cambiar.
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  tabla text not null,
  fila text,
  accion text not null,
  por uuid,
  cambios jsonb,
  created_at timestamptz not null default now()
);
create index if not exists auditoria_fecha_idx on public.auditoria (created_at desc);
alter table public.auditoria enable row level security;
revoke insert, update, delete on public.auditoria from anon, authenticated;
drop policy if exists "auditoria: leer" on public.auditoria;
create policy "auditoria: leer" on public.auditoria for select to authenticated using (public.es_coordinador());

create or replace function public.auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  antes jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  despues jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  cambios jsonb;
  fila text;
begin
  if tg_table_name = 'docs' then
    if coalesce(despues ->> 'col', antes ->> 'col') <> 'comunidades' then return null; end if;
  end if;
  fila := coalesce(despues ->> 'id', antes ->> 'id', despues ->> 'user_id', antes ->> 'user_id');
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(k, jsonb_build_array(antes -> k, despues -> k)), '{}'::jsonb) into cambios
      from jsonb_object_keys(despues) k
      where (antes -> k) is distinct from (despues -> k) and k not in ('actualizado', 'email');
    if cambios = '{}'::jsonb then return null; end if;
  elsif tg_op = 'INSERT' then cambios := despues - 'email';
  else cambios := antes - 'email'; end if;
  insert into public.auditoria (tabla, fila, accion, por, cambios) values (tg_table_name, fila, lower(tg_op), auth.uid(), cambios);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['docs','roles_usuario','comunidad_miembros','proyectos','proyecto_equipo','proyecto_comunidades',
    'proyecto_actualizaciones','oportunidades','candidaturas','donaciones','movimientos','informes']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_auditar', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.auditar()', t || '_auditar', t);
  end loop;
end $$;

-- 16. COMUNIDADES COMO CLANES: forma de entrar (abierta, con solicitud o cerrada) y número de miembros.
-- Si la base de datos ya existe, pega solo este bloque. Sustituye a miembros_antes() del bloque 10.
--   abierta   → quien pide ser miembro entra directamente (para representar siempre hace falta aprobación)
--   solicitud → deciden sus representantes o la coordinación (lo de siempre; es el valor por defecto)
--   cerrada   → no admite solicitudes nuevas (sus representantes sí pueden añadir gente)
--   Quien creó la ficha de la comunidad entra siempre directamente como representante (la coordinación puede quitárselo).
--   Los miembros aceptados salen siempre en la lista (publico = true); la comunidad puede hacer privada toda la lista (bloque 17).
create or replace function public.comunidad_ingreso(c text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select case when d.data ->> 'ingreso' in ('abierta','solicitud','cerrada') then d.data ->> 'ingreso' end
    from public.docs d where d.col = 'comunidades' and d.id = c), 'solicitud');
$$;
grant execute on function public.comunidad_ingreso(text) to anon, authenticated;

create or replace function public.miembros_antes() returns trigger
language plpgsql security definer set search_path = public as $$
declare decide boolean; ingreso text; creador boolean;
begin
  if public.es_servidor() then return new; end if;
  if tg_op = 'INSERT' then
    if not public.comunidad_existe(new.comunidad) then raise exception 'La comunidad no existe' using errcode = '23503'; end if;
    decide := public.es_coordinador() or public.representa(new.comunidad);
    creador := new.user_id = auth.uid() and public.con_cuenta() and exists (select 1 from public.docs d
      where d.col = 'comunidades' and d.id = new.comunidad and d.by = auth.uid());
    if creador then
      -- Quien creó la comunidad entra ya como representante, sin esperar a nadie
      new.rol := 'representante'; new.rol_pedido := 'representante'; new.estado := 'aceptada';
    elsif not decide then
      ingreso := public.comunidad_ingreso(new.comunidad);
      if ingreso = 'cerrada' then raise exception 'Esta comunidad no admite solicitudes' using errcode = '42501'; end if;
      new.user_id := auth.uid(); new.rol := 'miembro';
      new.estado := case when ingreso = 'abierta' and new.rol_pedido = 'miembro' then 'aceptada' else 'solicitada' end;
    end if;
    if new.estado <> 'solicitada' then new.decidido_por := auth.uid(); new.decidido_en := now();
    else new.decidido_por := null; new.decidido_en := null; end if;
    if new.user_id <> auth.uid() then new.mensaje := null; end if;
    new.publico := new.estado = 'aceptada';
    new.created_at := now();
  else
    decide := public.es_coordinador() or public.representa(old.comunidad);
    new.comunidad := old.comunidad; new.user_id := old.user_id; new.created_at := old.created_at;
    new.rol_pedido := old.rol_pedido; new.mensaje := old.mensaje;
    if not decide then
      new.estado := old.estado; new.rol := old.rol; new.decidido_por := old.decidido_por; new.decidido_en := old.decidido_en;
    elsif (new.estado, new.rol) is distinct from (old.estado, old.rol) then
      new.decidido_por := auth.uid(); new.decidido_en := now();
    else
      new.decidido_por := old.decidido_por; new.decidido_en := old.decidido_en;
    end if;
    new.publico := new.estado = 'aceptada';
  end if;
  return new;
end $$;

-- Quien forma parte de una comunidad sale siempre en su lista de miembros (si la comunidad no la hace privada)
update public.comunidad_miembros set publico = (estado = 'aceptada') where publico is distinct from (estado = 'aceptada');

-- Cuántos miembros tiene cada comunidad (solo el número, sin nombres)
create or replace function public.comunidad_cuentas() returns table (comunidad text, miembros int)
language sql stable security definer set search_path = public as $$
  select m.comunidad, count(*)::int from public.comunidad_miembros m where m.estado = 'aceptada' group by m.comunidad;
$$;
grant execute on function public.comunidad_cuentas() to anon, authenticated;

-- 17. CANDADO EN LAS COMUNIDADES: cada comunidad decide si sus miembros, sus proyectos, sus peticiones de ayuda
-- y sus avisos son públicos o solo para sus miembros. La ficha guarda privado = {miembros, proyectos, ayuda, avisos}.
-- Lo privado solo lo ven sus miembros aceptados y la coordinación (y cada autor lo suyo).
-- Si la base de datos ya existe, pega solo este bloque. Se puede ejecutar más de una vez.
create or replace function public.es_miembro(com text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.con_cuenta() and exists (select 1 from public.comunidad_miembros m
    where m.comunidad = com and m.user_id = auth.uid() and m.estado = 'aceptada');
$$;
grant execute on function public.es_miembro(text) to anon, authenticated;

create or replace function public.com_privado(com text, apartado text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (d.data -> 'privado' ->> apartado) = 'true'
    from public.docs d where d.col = 'comunidades' and d.id = com), false);
$$;
grant execute on function public.com_privado(text, text) to anon, authenticated;

-- ¿Lo puede ver quien pregunta? Lo público, todo el mundo; lo privado, sus miembros y la coordinación
create or replace function public.ve_comunidad(com text, apartado text) returns boolean
language sql stable security definer set search_path = public as $$
  select com is null or com = '' or not public.com_privado(com, apartado)
    or public.es_miembro(com) or public.es_coordinador();
$$;
grant execute on function public.ve_comunidad(text, text) to anon, authenticated;

-- Las respuestas, votos y apuntados de un aviso privado siguen a su aviso
create or replace function public.ve_aviso(aviso text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.ve_comunidad(d.data ->> 'com', 'avisos') or coalesce(d."by" = auth.uid(), false)
    from public.docs d where d.col = 'avisos' and d.id = aviso), true);
$$;
grant execute on function public.ve_aviso(text) to anon, authenticated;

-- Avisos (y lo que cuelga de ellos)
drop policy if exists "docs: leer" on public.docs;
create policy "docs: leer" on public.docs for select to anon, authenticated using (
  case
    when col = 'avisos' then coalesce("by" = auth.uid(), false) or public.ve_comunidad(data ->> 'com', 'avisos')
    when col in ('respuestas','votos','apuntes') then coalesce("by" = auth.uid(), false) or public.ve_aviso(data ->> 'aviso')
    else true
  end);

-- Miembros: quien los mira de fuera no ve a nadie si la lista es privada (el número sigue saliendo)
drop policy if exists "miembros: leer" on public.comunidad_miembros;
create policy "miembros: leer" on public.comunidad_miembros for select to anon, authenticated
  using ((estado = 'aceptada' and publico and public.ve_comunidad(comunidad, 'miembros'))
    or user_id = auth.uid() or public.representa(comunidad) or public.es_coordinador());

-- Proyectos en los que participa
drop policy if exists "vinculos: leer" on public.proyecto_comunidades;
create policy "vinculos: leer" on public.proyecto_comunidades for select to anon, authenticated
  using ((estado = 'aceptada' and public.proyecto_publicado(proyecto) and public.ve_comunidad(comunidad, 'proyectos'))
    or public.participa_proyecto(proyecto) or public.representa(comunidad));

-- Peticiones de ayuda (Colabora)
drop policy if exists "oportunidades: leer" on public.oportunidades;
create policy "oportunidades: leer" on public.oportunidades for select to anon, authenticated
  using ((publicado and (proyecto is null or public.proyecto_publicado(proyecto)) and public.ve_comunidad(comunidad, 'ayuda'))
    or by = auth.uid() or public.gestiona_oportunidad(id)
    or (proyecto is not null and public.gestiona_proyecto(proyecto)) or (comunidad is not null and public.representa(comunidad)));

-- 18. RANGOS, CALENDARIO Y ASISTENCIA EN LAS COMUNIDADES
-- Sus representantes (o la coordinación) crean rangos con nombre y color y se los asignan a sus miembros,
-- y publican las actividades de la comunidad (reuniones, faenas, talleres…). Sus miembros marcan «Asistiré».
-- El calendario lleva candado como los demás apartados (privado.calendario en la ficha).
-- Si la base de datos ya existe, pega solo este bloque. Se puede ejecutar más de una vez.
create table if not exists public.comunidad_rangos (
  id uuid primary key default gen_random_uuid(),
  comunidad text not null,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 40),
  color text not null default 'tierra' check (color in ('tierra','bosque','rio','achiote','flor','piedra')),
  orden int not null default 0,
  created_at timestamptz not null default now(),
  unique (comunidad, nombre)
);
create index if not exists comunidad_rangos_com_idx on public.comunidad_rangos (comunidad, orden);
alter table public.comunidad_rangos enable row level security;
alter table public.comunidad_miembros add column if not exists rango uuid references public.comunidad_rangos (id) on delete set null;

create or replace function public.rangos_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.comunidad_existe(new.comunidad) then raise exception 'La comunidad no existe' using errcode = '23503'; end if;
    if (select count(*) from public.comunidad_rangos r where r.comunidad = new.comunidad) >= 20 then
      raise exception 'Una comunidad puede tener como mucho 20 rangos' using errcode = '23514';
    end if;
    new.created_at := now();
  else
    new.comunidad := old.comunidad; new.created_at := old.created_at;
  end if;
  new.nombre := btrim(new.nombre);
  return new;
end $$;
drop trigger if exists rangos_antes on public.comunidad_rangos;
create trigger rangos_antes before insert or update on public.comunidad_rangos
  for each row execute function public.rangos_antes();

drop policy if exists "rangos: leer" on public.comunidad_rangos;
drop policy if exists "rangos: crear" on public.comunidad_rangos;
drop policy if exists "rangos: cambiar" on public.comunidad_rangos;
drop policy if exists "rangos: borrar" on public.comunidad_rangos;
create policy "rangos: leer" on public.comunidad_rangos for select to anon, authenticated
  using (public.ve_comunidad(comunidad, 'miembros') or public.representa(comunidad));
create policy "rangos: crear" on public.comunidad_rangos for insert to authenticated
  with check (public.representa(comunidad) or public.es_coordinador());
create policy "rangos: cambiar" on public.comunidad_rangos for update to authenticated
  using (public.representa(comunidad) or public.es_coordinador())
  with check (public.representa(comunidad) or public.es_coordinador());
create policy "rangos: borrar" on public.comunidad_rangos for delete to authenticated
  using (public.representa(comunidad) or public.es_coordinador());

-- El rango de cada miembro solo lo ponen sus representantes o la coordinación, y tiene que ser de su comunidad
create or replace function public.miembros_rango() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_servidor() then return new; end if;
  if not (public.es_coordinador() or public.representa(new.comunidad)) then
    new.rango := case when tg_op = 'UPDATE' then old.rango else null end;
  end if;
  if new.rango is not null and not exists (select 1 from public.comunidad_rangos r where r.id = new.rango and r.comunidad = new.comunidad) then
    raise exception 'Ese rango no es de esta comunidad' using errcode = '23503';
  end if;
  return new;
end $$;
drop trigger if exists miembros_rango on public.comunidad_miembros;
create trigger miembros_rango before insert or update on public.comunidad_miembros
  for each row execute function public.miembros_rango();

create table if not exists public.comunidad_eventos (
  id uuid primary key default gen_random_uuid(),
  comunidad text not null,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  tipo text not null default 'reunion' check (tipo in ('reunion','faena','taller','salida','fiesta','otro')),
  fecha date not null,
  hora text check (hora is null or hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  hora_fin text check (hora_fin is null or hora_fin ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  lugar text check (lugar is null or char_length(lugar) <= 160),
  descripcion text check (descripcion is null or char_length(descripcion) <= 2000),
  by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists comunidad_eventos_com_idx on public.comunidad_eventos (comunidad, fecha);
alter table public.comunidad_eventos enable row level security;

create or replace function public.eventos_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.comunidad_existe(new.comunidad) then raise exception 'La comunidad no existe' using errcode = '23503'; end if;
    if not public.es_servidor() then new."by" := auth.uid(); end if;
    new.created_at := now();
  else
    new.comunidad := old.comunidad; new."by" := old."by"; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists eventos_antes on public.comunidad_eventos;
create trigger eventos_antes before insert or update on public.comunidad_eventos
  for each row execute function public.eventos_antes();

drop policy if exists "eventos: leer" on public.comunidad_eventos;
drop policy if exists "eventos: crear" on public.comunidad_eventos;
drop policy if exists "eventos: cambiar" on public.comunidad_eventos;
drop policy if exists "eventos: borrar" on public.comunidad_eventos;
create policy "eventos: leer" on public.comunidad_eventos for select to anon, authenticated
  using (public.ve_comunidad(comunidad, 'calendario') or public.representa(comunidad));
create policy "eventos: crear" on public.comunidad_eventos for insert to authenticated
  with check (public.representa(comunidad) or public.es_coordinador());
create policy "eventos: cambiar" on public.comunidad_eventos for update to authenticated
  using (public.representa(comunidad) or public.es_coordinador())
  with check (public.representa(comunidad) or public.es_coordinador());
create policy "eventos: borrar" on public.comunidad_eventos for delete to authenticated
  using (public.representa(comunidad) or public.es_coordinador());

create table if not exists public.comunidad_asistencias (
  id uuid primary key default gen_random_uuid(),
  evento uuid not null references public.comunidad_eventos (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (evento, user_id)
);
alter table public.comunidad_asistencias enable row level security;

create or replace function public.evento_comunidad(e uuid) returns text
language sql stable security definer set search_path = public as $$
  select comunidad from public.comunidad_eventos where id = e;
$$;
grant execute on function public.evento_comunidad(uuid) to anon, authenticated;

drop policy if exists "asistencias: leer" on public.comunidad_asistencias;
drop policy if exists "asistencias: apuntarse" on public.comunidad_asistencias;
drop policy if exists "asistencias: quitar" on public.comunidad_asistencias;
create policy "asistencias: leer" on public.comunidad_asistencias for select to authenticated
  using (user_id = auth.uid() or public.es_miembro(public.evento_comunidad(evento)) or public.es_coordinador());
create policy "asistencias: apuntarse" on public.comunidad_asistencias for insert to authenticated
  with check (user_id = auth.uid() and public.es_miembro(public.evento_comunidad(evento)));
create policy "asistencias: quitar" on public.comunidad_asistencias for delete to authenticated
  using (user_id = auth.uid() or public.representa(public.evento_comunidad(evento)) or public.es_coordinador());

-- Al borrar una comunidad se van también sus rangos y sus actividades
create or replace function public.comunidad_borrar_extra() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.col = 'comunidades' then
    delete from public.comunidad_eventos where comunidad = old.id;
    delete from public.comunidad_rangos where comunidad = old.id;
  end if;
  return old;
end $$;
drop trigger if exists docs_comunidad_extra on public.docs;
create trigger docs_comunidad_extra after delete on public.docs for each row execute function public.comunidad_borrar_extra();
