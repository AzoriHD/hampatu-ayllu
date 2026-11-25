/*
 * Pruebas de permisos (RLS) de supabase.sql en un Postgres real (PGlite), imitando Supabase:
 * roles anon / authenticated / service_role, auth.uid(), auth.jwt() y Storage.
 * Ejecuta: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

async function nueva() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users (id uuid primary key, email text);
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), auth.jwt() ->> 'sub'), '')::uuid $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    create publication supabase_realtime;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);
  const sql = readFileSync(new URL("../supabase.sql", import.meta.url), "utf8");
  await db.exec(sql);
  return db;
}

test("supabase.sql se puede ejecutar dos veces seguidas", async () => {
  const db = await nueva();
  await db.exec(readFileSync(new URL("../supabase.sql", import.meta.url), "utf8"));
});

test("permisos: comunidades, proyectos, colabora, finanzas, informes, roles y auditoría", async () => {
  const db = await nueva();
  const fallosLista = [];
const U = {
  admin: "00000000-0000-0000-0000-00000000000a", coord: "00000000-0000-0000-0000-00000000000c",
  rep: "00000000-0000-0000-0000-000000000001", rep2: "00000000-0000-0000-0000-000000000002",
  u2: "00000000-0000-0000-0000-000000000003", u3: "00000000-0000-0000-0000-000000000004",
};
for (const [k, id] of Object.entries(U)) await db.query("insert into auth.users values ($1, $2)", [id, k + "@x.pe"]);
await db.query("insert into public.admin_emails values ('admin@x.pe')");
await db.query("insert into public.roles_usuario (user_id, rol) values ($1, 'coordinador')", [U.coord]);

let fallos = 0, ok = 0;
async function como(quien, q, p = []) {
  if (quien === "anon") await db.exec(`set role anon; select set_config('request.jwt.claims', '{"role":"anon"}', false);`);
  else if (quien === "server") await db.exec(`set role service_role; select set_config('request.jwt.claims', '{"role":"service_role"}', false);`);
  else await db.exec(`set role authenticated; select set_config('request.jwt.claims', '${JSON.stringify({ sub: U[quien], email: quien + "@x.pe", role: "authenticated", is_anonymous: false })}', false);`);
  try { return await db.query(q, p); } finally { await db.exec("reset role; select set_config('request.jwt.claims', '', false);"); }
}
async function espera(nombre, fn, debe) {
  let r, err = null;
  try { r = await fn(); } catch (e) { err = e; }
  const pasa = debe(r, err);
  if (pasa) ok++; else { fallos++; fallosLista.push(nombre + (err ? " → " + err.message : " → " + JSON.stringify(r && r.rows))); }
}
const bien = (r, e) => !e;
const error = (r, e) => !!e;
const filas = (n) => (r, e) => !e && r.rows.length === n;
const afect = (n) => (r, e) => !e && r.affectedRows === n;

// Comunidades (docs)
await espera("u3 crea C1", () => como("u3", `insert into docs (col,id,data) values ('comunidades','c1', $1)`, [{ nombre: "C1", by: U.u3 }]), bien);
await espera("u3 crea C2", () => como("u3", `insert into docs (col,id,data) values ('comunidades','c2', $1)`, [{ nombre: "C2", by: U.u3 }]), bien);
await espera("u3 crea C3", () => como("u3", `insert into docs (col,id,data) values ('comunidades','c3', $1)`, [{ nombre: "C3", by: U.u3 }]), bien);

// Miembros
await espera("rep pide ser representante de C1", () => como("rep", `insert into comunidad_miembros (comunidad, rol_pedido, rol, estado, publico) values ('c1','representante','representante','aceptada', true) returning rol, estado`), (r, e) => !e && r.rows[0].rol === "miembro" && r.rows[0].estado === "solicitada");
await espera("rep no se acepta a sí mismo", () => como("rep", `update comunidad_miembros set estado='aceptada', rol='representante' where comunidad='c1' returning estado, rol`), (r, e) => !e && r.rows[0].estado === "solicitada");
await espera("comunidad inexistente", () => como("rep", `insert into comunidad_miembros (comunidad) values ('nope')`), error);
await espera("coord acepta a rep", () => como("coord", `update comunidad_miembros set estado='aceptada', rol='representante' where comunidad='c1' returning estado, rol, decidido_por, publico`), (r, e) => !e && r.rows[0].estado === "aceptada" && r.rows[0].decidido_por === U.coord && r.rows[0].publico === true);
await espera("rep no puede ocultarse de la lista", () => como("rep", `update comunidad_miembros set publico = false, cargo='Presidente' where comunidad='c1' returning publico`), (r, e) => !e && r.rows[0].publico === true);
await espera("coord tampoco puede ocultar a un miembro", () => como("coord", `update comunidad_miembros set publico = false where comunidad='c1' returning publico`), (r, e) => !e && r.rows[0].publico === true);
await espera("rep2 pide C2", () => como("rep2", `insert into comunidad_miembros (comunidad, rol_pedido) values ('c2','representante')`), bien);
await espera("rep (C1) no puede aceptar en C2", () => como("rep", `update comunidad_miembros set estado='aceptada' where comunidad='c2'`), afect(0));
await espera("coord acepta rep2 en C2", () => como("coord", `update comunidad_miembros set estado='aceptada', rol='representante' where comunidad='c2'`), afect(1));
await espera("anon ve a los miembros aceptados", () => como("anon", `select * from comunidad_miembros`), filas(2));
await espera("u2 pide C1", () => como("u2", `insert into comunidad_miembros (comunidad, mensaje) values ('c1','hola')`), bien);
await espera("rep ve la solicitud de u2", () => como("rep", `select * from comunidad_miembros where comunidad='c1'`), filas(2));
await espera("rep2 no ve solicitudes de C1 (solo públicos)", () => como("rep2", `select * from comunidad_miembros where comunidad='c1'`), filas(1));
// Clanes: forma de entrar
await espera("C3 pasa a abierta", () => como("u3", `update docs set data = data || '{"ingreso":"abierta"}' where col='comunidades' and id='c3'`), afect(1));
await espera("u2 entra directo en C3 abierta", () => como("u2", `insert into comunidad_miembros (comunidad, publico) values ('c3', true) returning estado, rol, publico`), (r, e) => !e && r.rows[0].estado === "aceptada" && r.rows[0].rol === "miembro" && r.rows[0].publico === true);
await espera("en abierta, representar sigue pidiendo aprobación", () => como("rep2", `insert into comunidad_miembros (comunidad, rol_pedido, publico) values ('c3','representante', true) returning estado, rol, publico`), (r, e) => !e && r.rows[0].estado === "solicitada" && r.rows[0].rol === "miembro" && r.rows[0].publico === false);
await espera("anon ve cuántos miembros hay", () => como("anon", `select miembros from comunidad_cuentas() where comunidad='c3'`), (r, e) => !e && r.rows[0].miembros === 1);
await espera("C3 pasa a cerrada", () => como("u3", `update docs set data = data || '{"ingreso":"cerrada"}' where col='comunidades' and id='c3'`), afect(1));
await espera("cerrada no admite solicitudes", () => como("rep", `insert into comunidad_miembros (comunidad) values ('c3')`), error);
await espera("quien creó C3 entra directo como representante (aunque esté cerrada)", () => como("u3", `insert into comunidad_miembros (comunidad, rol_pedido, rol, estado) values ('c3','representante','representante','aceptada') returning estado, rol, decidido_por`), (r, e) => !e && r.rows[0].estado === "aceptada" && r.rows[0].rol === "representante" && r.rows[0].decidido_por === U.u3);
await espera("quien no la creó no puede colarse como representante", () => como("u2", `insert into comunidad_miembros (comunidad, rol_pedido, rol, estado) values ('c2','representante','representante','aceptada') returning estado, rol`), (r, e) => !e && r.rows[0].estado === "solicitada" && r.rows[0].rol === "miembro");
await espera("limpia C2 de u2", () => como("admin", `delete from comunidad_miembros where comunidad='c2' and user_id=$1`, [U.u2]), afect(1));
await espera("limpia C3", () => como("admin", `delete from comunidad_miembros where comunidad='c3'`), bien);
await espera("limpia C3 otra vez", () => como("admin", `delete from comunidad_miembros where comunidad='c3'`), bien);

// Ficha de comunidad por su representante
await espera("rep2 edita C2 (de u3)", () => como("rep2", `update docs set data = jsonb_set(data, '{presentacion}', '"hola"') where col='comunidades' and id='c2' returning by, data->>'by' as dby`), (r, e) => !e && r.rows[0].by === U.u3 && r.rows[0].dby === U.u3);
await espera("rep2 no puede cambiar el autor", () => como("rep2", `update docs set by = $1::uuid, data = jsonb_set(data, '{by}', to_jsonb($1::text)) where col='comunidades' and id='c2' returning by, data->>'by' as dby`, [U.rep2]), (r, e) => !e && r.rows[0].by === U.u3 && r.rows[0].dby === U.u3);
await espera("u2 no edita C2", () => como("u2", `update docs set data = '{}' where col='comunidades' and id='c2'`), afect(0));
await espera("rep2 no edita C1", () => como("rep2", `update docs set data = '{}' where col='comunidades' and id='c1'`), afect(0));
await espera("upsert de rep2 sobre C2: Postgres aplica la regla de crear (por eso la web usa update)", () => como("rep2", `insert into docs (col,id,data) values ('comunidades','c2', $1) on conflict (col,id) do update set data = excluded.data`, [{ nombre: "C2b", by: U.u3 }]), error);

// Proyectos
let P;
await espera("u2 (sin rol) no crea proyectos", () => como("u2", `insert into proyectos (nombre) values ('Nada')`), error);
await espera("rep crea proyecto (queda en borrador)", async () => { const r = await como("rep", `insert into proyectos (nombre, publicado, acepta_donaciones, ejemplo) values ('Quebradas vivas', true, true, true) returning id, publicado, acepta_donaciones, ejemplo, by`); P = r.rows[0].id; return r; },
  (r, e) => !e && r.rows[0].publicado === false && r.rows[0].acepta_donaciones === false && r.rows[0].ejemplo === false && r.rows[0].by === U.rep);
await espera("rep queda como responsable", () => como("rep", `select rol, publico from proyecto_equipo where proyecto=$1`, [P]), (r, e) => !e && r.rows[0].rol === "responsable" && r.rows[0].publico);
await espera("anon no ve el borrador", () => como("anon", `select * from proyectos`), filas(0));
await espera("u2 no ve el borrador", () => como("u2", `select * from proyectos`), filas(0));
await espera("rep no se publica solo", () => como("rep", `update proyectos set publicado = true, revision_pedida = true where id=$1 returning publicado, revision_pedida`, [P]), (r, e) => !e && r.rows[0].publicado === false && r.rows[0].revision_pedida === true);
await espera("rep vincula C1 (aceptada al instante)", () => como("rep", `insert into proyecto_comunidades (proyecto, comunidad, estado) values ($1,'c1','aceptada') returning estado, propuesta_por`, [P]), (r, e) => !e && r.rows[0].estado === "aceptada" && r.rows[0].propuesta_por === "proyecto");
await espera("rep propone C3 (queda propuesta)", () => como("rep", `insert into proyecto_comunidades (proyecto, comunidad, estado) values ($1,'c3','aceptada') returning estado`, [P]), (r, e) => !e && r.rows[0].estado === "propuesta");
await espera("rep2 ve el borrador? no (no hay propuesta a C2)", () => como("rep2", `select * from proyectos`), filas(0));
await espera("rep propone C2", () => como("rep", `insert into proyecto_comunidades (proyecto, comunidad) values ($1,'c2')`, [P]), bien);
await espera("rep2 ve ahora el borrador (propuesta a su comunidad)", () => como("rep2", `select * from proyectos`), filas(1));
await espera("rep no acepta en nombre de C2", () => como("rep", `update proyecto_comunidades set estado='aceptada' where proyecto=$1 and comunidad='c2'`, [P]), error);
await espera("rep2 acepta por C2", () => como("rep2", `update proyecto_comunidades set estado='aceptada', papel='Monitoreo' where proyecto=$1 and comunidad='c2' returning decidido_por`, [P]), (r, e) => !e && r.rows[0].decidido_por === U.rep2);
await espera("coord publica", () => como("coord", `update proyectos set publicado = true, acepta_donaciones = true, meta_fondos = 500000 where id=$1 returning publicado, revision_pedida`, [P]), (r, e) => !e && r.rows[0].publicado === true && r.rows[0].revision_pedida === false);
await espera("anon ve el proyecto", () => como("anon", `select * from proyectos`), filas(1));
await espera("anon ve 2 comunidades aceptadas", () => como("anon", `select * from proyecto_comunidades`), filas(2));
await espera("anon ve al responsable público", () => como("anon", `select * from proyecto_equipo`), filas(1));
await espera("rep no puede quitar donaciones activadas por coord", () => como("rep", `update proyectos set acepta_donaciones = false, nombre='Quebradas vivas 2' where id=$1 returning acepta_donaciones, nombre`, [P]), (r, e) => !e && r.rows[0].acepta_donaciones === true && r.rows[0].nombre === "Quebradas vivas 2");
await espera("u2 no edita el proyecto", () => como("u2", `update proyectos set nombre='x' where id=$1`, [P]), afect(0));
await espera("rep no borra un proyecto publicado", () => como("rep", `delete from proyectos where id=$1`, [P]), afect(0));

// Actualizaciones
let A;
await espera("rep2 (comunidad vinculada) publica avance como C2", async () => { const r = await como("rep2", `insert into proyecto_actualizaciones (proyecto, tipo, titulo, comunidad, validada) values ($1,'actividad','Faena de limpieza','c2', true) returning id, validada, comunidad`, [P]); A = r.rows[0].id; return r; }, (r, e) => !e && r.rows[0].validada === false && r.rows[0].comunidad === "c2");
await espera("u2 no publica actualizaciones", () => como("u2", `insert into proyecto_actualizaciones (proyecto, titulo) values ($1,'xx x')`, [P]), error);
await espera("coord valida", () => como("coord", `update proyecto_actualizaciones set validada = true where id=$1 returning validada, validada_por`, [A]), (r, e) => !e && r.rows[0].validada && r.rows[0].validada_por === U.coord);
await espera("rep2 cambia el texto → pierde validación", () => como("rep2", `update proyecto_actualizaciones set texto = 'otro' where id=$1 returning validada`, [A]), (r, e) => !e && r.rows[0].validada === false);
await espera("coord valida otra vez", () => como("coord", `update proyecto_actualizaciones set validada = true where id=$1`, [A]), afect(1));
await espera("anon ve la actualización", () => como("anon", `select * from proyecto_actualizaciones`), filas(1));

// Comentarios y seguir
await espera("u2 comenta", () => como("u2", `insert into proyecto_comentarios (proyecto, texto) values ($1, 'Ánimo')`, [P]), bien);
await espera("anon no comenta", () => como("anon", `insert into proyecto_comentarios (proyecto, texto) values ($1, 'x')`, [P]), error);
await espera("u2 sigue", () => como("u2", `insert into proyecto_seguidores (proyecto) values ($1)`, [P]), bien);
await espera("u3 sigue", () => como("u3", `insert into proyecto_seguidores (proyecto) values ($1)`, [P]), bien);
await espera("u2 solo ve su seguimiento", () => como("u2", `select * from proyecto_seguidores`), filas(1));
await espera("u2 no hace seguir a otro", () => como("u2", `insert into proyecto_seguidores (proyecto, user_id) values ($1, $2)`, [P, U.rep2]), error);

// Colabora
let O, C;
await espera("u2 no publica necesidades", () => como("u2", `insert into oportunidades (titulo, descripcion, categoria) values ('Necesito', 'descripcion larga', 'voluntariado')`), error);
await espera("rep publica necesidad del proyecto", async () => { const r = await como("rep", `insert into oportunidades (titulo, descripcion, categoria, proyecto) values ('Apoyo en monitoreo', 'Recorridos mensuales por la quebrada', 'herpetologia', $1) returning id`, [P]); O = r.rows[0].id; return r; }, bien);
await espera("rep2 publica necesidad de su comunidad", () => como("rep2", `insert into oportunidades (titulo, descripcion, categoria, comunidad) values ('Traducción quechua', 'Traducir láminas al quechua', 'traduccion', 'c2')`), bien);
await espera("rep2 no publica en C1", () => como("rep2", `insert into oportunidades (titulo, descripcion, categoria, comunidad) values ('Otra cosa', 'Descripción', 'traduccion', 'c1')`), error);
await espera("anon ve 2 necesidades", () => como("anon", `select * from oportunidades`), filas(2));
await espera("u2 se ofrece", async () => { const r = await como("u2", `insert into candidaturas (oportunidad, mensaje, contacto, aparecer, estado) values ($1, 'Soy bióloga y puedo ir', '999 111 222', true, 'aceptada') returning id, estado, proyecto, categoria`, [O]); C = r.rows[0].id; return r; }, (r, e) => !e && r.rows[0].estado === "enviada" && r.rows[0].proyecto === P && r.rows[0].categoria === "herpetologia");
await espera("anon no ve candidaturas", () => como("anon", `select * from candidaturas`), filas(0));
await espera("rep2 no ve candidaturas del proyecto de C1", () => como("rep2", `select * from candidaturas where id=$1`, [C]), filas(0));
await espera("rep ve la candidatura", () => como("rep", `select contacto from candidaturas where id=$1`, [C]), filas(1));
await espera("u2 no se acepta a sí misma", () => como("u2", `update candidaturas set estado='aceptada' where id=$1`, [C]), error);
await espera("u2 no cambia el mensaje", () => como("u2", `update candidaturas set mensaje='otro mensaje distinto' where id=$1 returning mensaje`, [C]), (r, e) => !e && r.rows[0].mensaje === "Soy bióloga y puedo ir");
await espera("rep acepta", () => como("rep", `update candidaturas set estado='aceptada', nota='¡Bienvenida!' where id=$1 returning decidido_por`, [C]), (r, e) => !e && r.rows[0].decidido_por === U.rep);
await espera("u2 entra al equipo, pública por consentimiento", () => como("anon", `select rol, publico from proyecto_equipo where user_id=$1`, [U.u2]), (r, e) => !e && r.rows.length === 1 && r.rows[0].rol === "colaborador" && r.rows[0].publico === true);
await espera("u2 ya no puede retirar una aceptada", () => como("u2", `update candidaturas set estado='retirada' where id=$1`, [C]), error);
await espera("u2 se oculta del equipo", () => como("u2", `update proyecto_equipo set publico=false where user_id=$1 returning publico`, [U.u2]), (r, e) => !e && r.rows[0].publico === false);
await espera("u2 no se hace responsable", () => como("u2", `update proyecto_equipo set rol='responsable' where user_id=$1 returning rol`, [U.u2]), (r, e) => !e && r.rows[0].rol === "colaborador");
await espera("u3 propone libremente al proyecto", () => como("u3", `insert into candidaturas (proyecto, tipo, organizacion, mensaje) values ($1, 'universidad', 'UNASAM', 'Podemos aportar estudiantes')`, [P]), bien);

// Finanzas
let M;
await espera("u2 (colaboradora) no registra gastos", () => como("u2", `insert into movimientos (tipo, proyecto, concepto, categoria, importe, moneda, fecha) values ('gasto', $1, 'Botas', 'material', 10000, 'pen', '2026-11-01')`, [P]), error);
await espera("rep registra gasto (queda registrado)", async () => { const r = await como("rep", `insert into movimientos (tipo, proyecto, concepto, categoria, importe, moneda, fecha, estado) values ('gasto', $1, 'Botas de jebe', 'material', 25000, 'pen', '2026-11-01', 'verificado') returning id, estado, registrado_por`, [P]); M = r.rows[0].id; return r; }, (r, e) => !e && r.rows[0].estado === "registrado" && r.rows[0].registrado_por === U.rep);
await espera("rep no verifica", () => como("rep", `update movimientos set estado='verificado' where id=$1`, [M]), error);
await espera("rep no cambia el importe", () => como("rep", `update movimientos set importe=1 where id=$1`, [M]), error);
await espera("rep no borra", () => como("rep", `delete from movimientos where id=$1`, [M]), error);
await espera("justificante en carpeta ajena: no", () => como("rep", `update movimientos set justificante=$2 where id=$1`, [M, U.u2 + "/x.pdf"]), error);
await espera("rep añade su justificante", () => como("rep", `update movimientos set justificante=$2 where id=$1`, [M, U.rep + "/x.pdf"]), afect(1));
await espera("coord verifica", () => como("coord", `update movimientos set estado='verificado' where id=$1 returning verificado_por`, [M]), (r, e) => !e && r.rows[0].verificado_por === U.coord);
await espera("anular sin motivo: no", () => como("coord", `update movimientos set estado='anulado' where id=$1`, [M]), error);
await espera("u2 no ve movimientos", () => como("u2", `select * from movimientos`), filas(0));
await espera("coord registra ingreso general", () => como("coord", `insert into movimientos (tipo, concepto, categoria, importe, moneda, fecha, contraparte) values ('ingreso', 'Convenio ONG', 'convenio', 100000, 'pen', '2026-10-15', 'ONG X')`), bien);
await espera("rep no ve el ingreso general", () => como("rep", `select * from movimientos where proyecto is null`), filas(0));

// Donaciones
await espera("u2 no inserta donaciones", () => como("u2", `insert into donaciones (cantidad, moneda, frecuencia, proveedor, proveedor_ref, estado) values (1000,'eur','puntual','stripe','x','pagada')`), error);
await espera("servidor registra iniciada", () => como("server", `insert into donaciones (proyecto, cantidad, moneda, frecuencia, proveedor, proveedor_ref, estado, donante) values ($1, 2000,'pen','puntual','stripe','cs_test_1','iniciada', $2)`, [P, U.u3]), bien);
await espera("servidor registra pagada", () => como("server", `insert into donaciones (proyecto, cantidad, moneda, frecuencia, proveedor, proveedor_ref, estado, pagada_en, cliente_ref) values ($1, 5000,'pen','puntual','stripe','cs_test_2','pagada', now(), 'cus_1')`, [P]), bien);
await espera("servidor: duplicado rechazado", () => como("server", `insert into donaciones (cantidad, moneda, frecuencia, proveedor, proveedor_ref) values (5000,'pen','puntual','stripe','cs_test_2')`), error);
await espera("anon no ve donaciones", () => como("anon", `select * from donaciones`), filas(0));
await espera("u3 ve solo la suya", () => como("u3", `select * from donaciones`), filas(1));
await espera("coord ve todas", () => como("coord", `select * from donaciones`), filas(2));

// Informes
let I;
await espera("rep crea informe (no publicado)", async () => { const r = await como("rep", `insert into informes (titulo, tipo, proyecto, publicado) values ('Primer recorrido', 'actividad', $1, true) returning id, publicado`, [P]); I = r.rows[0].id; return r; }, (r, e) => !e && r.rows[0].publicado === false);
await espera("anon no lo ve aún", () => como("anon", `select * from informes`), filas(0));
await espera("coord publica informe", () => como("coord", `update informes set publicado = true where id=$1 returning publicado_por`, [I]), (r, e) => !e && r.rows[0].publicado_por === U.coord);
await espera("rep ya no lo edita", () => como("rep", `update informes set titulo='x y z' where id=$1`, [I]), afect(0));
await espera("anon lo ve", () => como("anon", `select * from informes`), filas(1));

// Cifras públicas
await espera("cifras (anon): solo lo confirmado", () => como("anon", `select cifras_publicas() c`), (r, e) => {
  if (e) return false; const c = r.rows[0].c;
  const pp = c.por_proyecto.find((x) => x.id === P);
  const ok = c.comunidades === 3 && c.comunidades_participantes === 2 && c.proyectos.buscando === undefined && c.proyectos.preparacion === 1
    && c.actividades === 1 && c.informes === 1 && c.colaboradores === 1 && c.donantes === 1
    && pp.recaudado === 5000 && pp.aportaciones === 1 && pp.gastado === 25000 && pp.seguidores === 2
    && c.fondos.find((f) => f.moneda === "pen").donaciones === 5000 && c.fondos.find((f) => f.moneda === "pen").otros === 0
    && c.material[0].total === 25000;
  
  return ok;
});

await espera("ingreso verificado sí cuenta", async () => { await como("coord", `update movimientos set estado='verificado' where tipo='ingreso'`); return como("anon", `select cifras_publicas() c`); }, (r, e) => !e && r.rows[0].c.fondos.find((f) => f.moneda === "pen").otros === 100000);
await espera("el proyecto de ejemplo no cuenta", async () => { await como("coord", `insert into proyectos (nombre, publicado, ejemplo, estado) values ('Ejemplo', true, true, 'activo')`); return como("anon", `select cifras_publicas() c`); }, (r, e) => !e && r.rows[0].c.proyectos.activo === undefined);

// Roles y auditoría
await espera("coord no da roles", () => como("coord", `insert into roles_usuario (user_id, rol) values ($1, 'coordinador')`, [U.u2]), error);
await espera("admin da rol", () => como("admin", `insert into roles_usuario (user_id, rol) values ($1, 'coordinador')`, [U.u2]), bien);
await espera("u2 ahora es coordinadora", () => como("u2", `select es_coordinador() c`), (r, e) => !e && r.rows[0].c === true);
await espera("admin quita rol", () => como("admin", `delete from roles_usuario where user_id=$1`, [U.u2]), afect(1));
await espera("auditoría: coord la lee", () => como("coord", `select count(*)::int n from auditoria`), (r, e) => !e && r.rows[0].n > 20);
await espera("auditoría: rep no", () => como("rep", `select * from auditoria`), filas(0));
await espera("auditoría: nadie escribe", () => como("coord", `insert into auditoria (tabla, accion) values ('x','y')`), error);

// Storage
await espera("u3 (sin rol) no sube documentos", () => como("u3", `insert into storage.objects (bucket_id, name) values ('documentos', $1)`, [U.u3 + "/a.pdf"]), error);
await espera("rep sube documento a su carpeta", () => como("rep", `insert into storage.objects (bucket_id, name) values ('documentos', $1)`, [U.rep + "/a.pdf"]), bien);
await espera("rep no sube en carpeta ajena", () => como("rep", `insert into storage.objects (bucket_id, name) values ('documentos', $1)`, [U.u3 + "/a.pdf"]), error);
await espera("u2 (colaboradora) no sube justificantes", () => como("u2", `insert into storage.objects (bucket_id, name) values ('justificantes', $1)`, [U.u2 + "/a.pdf"]), error);
await espera("rep sube justificante", () => como("rep", `insert into storage.objects (bucket_id, name) values ('justificantes', $1)`, [U.rep + "/x.pdf"]), bien);
await espera("u3 no ve justificantes ajenos", () => como("u3", `select * from storage.objects where bucket_id='justificantes'`), filas(0));

// Lo que ya existía sigue igual
await espera("u2 publica un aviso", () => como("u2", `insert into docs (col,id,data) values ('avisos','a1', $1)`, [{ titulo: "Vi un sapo", by: U.u2 }]), bien);
await espera("u3 no edita el aviso de u2", () => como("u3", `update docs set data='{}' where col='avisos'`), afect(0));
await espera("coord (no admin) no modera avisos", () => como("coord", `delete from docs where col='avisos'`), afect(0));
await espera("admin borra el aviso", () => como("admin", `delete from docs where col='avisos'`), afect(1));
await espera("borrar C2 limpia vínculos y miembros", async () => { await como("admin", `delete from docs where col='comunidades' and id='c2'`); return como("admin", `select (select count(*) from proyecto_comunidades where comunidad='c2')::int a, (select count(*) from comunidad_miembros where comunidad='c2')::int b, (select count(*) from oportunidades where comunidad='c2')::int c`); }, (r, e) => !e && r.rows[0].a === 0 && r.rows[0].b === 0 && r.rows[0].c === 0);

  assert.equal(fallos, 0, "Fallan:\n" + fallosLista.join("\n"));
  assert.ok(ok > 100);
});

test("comunidades: rangos, calendario y asistencia", async () => {
  const db = await nueva();
  const U = { rep: "00000000-0000-0000-0000-000000000011", m1: "00000000-0000-0000-0000-000000000012",
    fuera: "00000000-0000-0000-0000-000000000013", rep2: "00000000-0000-0000-0000-000000000014", coord: "00000000-0000-0000-0000-00000000001c" };
  for (const [k, id] of Object.entries(U)) await db.query("insert into auth.users values ($1, $2)", [id, k + "@x.pe"]);
  await db.query("insert into public.roles_usuario (user_id, rol) values ($1, 'coordinador')", [U.coord]);
  async function como(quien, q, p = []) {
    if (quien === "anon") await db.exec(`set role anon; select set_config('request.jwt.claims', '{"role":"anon"}', false);`);
    else await db.exec(`set role authenticated; select set_config('request.jwt.claims', '${JSON.stringify({ sub: U[quien], email: quien + "@x.pe", role: "authenticated", is_anonymous: false })}', false);`);
    try { return await db.query(q, p); } finally { await db.exec("reset role; select set_config('request.jwt.claims', '', false);"); }
  }
  const fallosLista = [];
  async function espera(nombre, fn, debe) {
    let r, err = null;
    try { r = await fn(); } catch (e) { err = e; }
    if (!debe(r, err)) fallosLista.push(nombre + (err ? " → " + err.message : " → " + JSON.stringify(r && r.rows)));
  }
  const bien = (r, e) => !e, error = (r, e) => !!e;
  const filas = (n) => (r, e) => !e && r.rows.length === n;
  const afect = (n) => (r, e) => !e && r.affectedRows === n;

  await espera("rep crea K1", () => como("rep", `insert into docs (col,id,data) values ('comunidades','k1', $1)`, [{ nombre: "K1", by: U.rep, ingreso: "abierta" }]), bien);
  await espera("rep2 crea K2", () => como("rep2", `insert into docs (col,id,data) values ('comunidades','k2', $1)`, [{ nombre: "K2", by: U.rep2 }]), bien);
  await espera("rep entra en K1 como representante", () => como("rep", `insert into comunidad_miembros (comunidad) values ('k1') returning rol`), (r, e) => !e && r.rows[0].rol === "representante");
  await espera("rep2 entra en K2 como representante", () => como("rep2", `insert into comunidad_miembros (comunidad) values ('k2')`), bien);
  await espera("m1 entra en K1 (abierta)", () => como("m1", `insert into comunidad_miembros (comunidad) values ('k1') returning estado, rango`), (r, e) => !e && r.rows[0].estado === "aceptada" && r.rows[0].rango === null);

  // Rangos
  let R, R2;
  await espera("rep crea un rango en K1", async () => { const r = await como("rep", `insert into comunidad_rangos (comunidad, nombre, color, orden) values ('k1', '  Guardaparque ', 'bosque', 1) returning id, nombre`); R = r.rows[0].id; return r; }, (r, e) => !e && r.rows[0].nombre === "Guardaparque");
  await espera("rep2 crea un rango en K2", async () => { const r = await como("rep2", `insert into comunidad_rangos (comunidad, nombre) values ('k2', 'Vocal') returning id`); R2 = r.rows[0].id; return r; }, bien);
  await espera("m1 no crea rangos", () => como("m1", `insert into comunidad_rangos (comunidad, nombre) values ('k1', 'Jefe')`), error);
  await espera("rep no crea rangos en K2", () => como("rep", `insert into comunidad_rangos (comunidad, nombre) values ('k2', 'Jefe')`), error);
  await espera("color inventado: no", () => como("rep", `insert into comunidad_rangos (comunidad, nombre, color) values ('k1', 'Otro', 'neon')`), error);
  await espera("nombre repetido: no", () => como("rep", `insert into comunidad_rangos (comunidad, nombre) values ('k1', 'Guardaparque')`), error);
  await espera("rango en comunidad inexistente: no", () => como("coord", `insert into comunidad_rangos (comunidad, nombre) values ('nope', 'X')`), error);
  await espera("rep no mueve el rango a otra comunidad", () => como("rep", `update comunidad_rangos set comunidad='k2', nombre='Guardaparques' where id=$1 returning comunidad`, [R]), (r, e) => !e && r.rows[0].comunidad === "k1");
  await espera("m1 no se pone rango a sí misma", () => como("m1", `update comunidad_miembros set rango=$1 where user_id=$2 returning rango`, [R, U.m1]), (r, e) => !e && r.rows[0].rango === null);
  await espera("m1 no entra con rango puesto", async () => { await como("m1", `delete from comunidad_miembros where user_id=$1`, [U.m1]); return como("m1", `insert into comunidad_miembros (comunidad, rango) values ('k1', $1) returning rango`, [R]); }, (r, e) => !e && r.rows[0].rango === null);
  await espera("rep asigna el rango a m1", () => como("rep", `update comunidad_miembros set rango=$1 where user_id=$2 returning rango`, [R, U.m1]), (r, e) => !e && r.rows[0].rango === R);
  await espera("rep no asigna un rango de K2", () => como("rep", `update comunidad_miembros set rango=$1 where user_id=$2`, [R2, U.m1]), error);
  await espera("m1 cambia su cargo y conserva el rango", () => como("m1", `update comunidad_miembros set cargo='Docente' where user_id=$1 returning rango`, [U.m1]), (r, e) => !e && r.rows[0].rango === R);
  await espera("anon ve los rangos de K1", () => como("anon", `select * from comunidad_rangos where comunidad='k1'`), filas(1));

  // Calendario
  let E;
  await espera("rep crea una actividad", async () => { const r = await como("rep", `insert into comunidad_eventos (comunidad, titulo, tipo, fecha, hora, lugar, "by") values ('k1', 'Faena en la quebrada', 'faena', '2026-12-05', '08:00', 'Quebrada', $1) returning id, "by"`, [U.fuera]); E = r.rows[0].id; return r; }, (r, e) => !e && r.rows[0].by === U.rep);
  await espera("m1 no crea actividades", () => como("m1", `insert into comunidad_eventos (comunidad, titulo, fecha) values ('k1', 'X', '2026-12-06')`), error);
  await espera("rep2 no crea en K1", () => como("rep2", `insert into comunidad_eventos (comunidad, titulo, fecha) values ('k1', 'X', '2026-12-06')`), error);
  await espera("hora mal escrita: no", () => como("rep", `insert into comunidad_eventos (comunidad, titulo, fecha, hora) values ('k1', 'X', '2026-12-06', '25:00')`), error);
  await espera("tipo inventado: no", () => como("rep", `insert into comunidad_eventos (comunidad, titulo, fecha, tipo) values ('k1', 'X', '2026-12-06', 'rave')`), error);
  await espera("coord crea una actividad", () => como("coord", `insert into comunidad_eventos (comunidad, titulo, fecha) values ('k1', 'Visita', '2026-12-10')`), bien);
  await espera("anon ve el calendario público", () => como("anon", `select * from comunidad_eventos`), filas(2));
  await espera("rep edita la actividad", () => como("rep", `update comunidad_eventos set lugar='Escuela', comunidad='k2' where id=$1 returning lugar, comunidad`, [E]), (r, e) => !e && r.rows[0].lugar === "Escuela" && r.rows[0].comunidad === "k1");
  await espera("m1 no edita la actividad", () => como("m1", `update comunidad_eventos set titulo='x' where id=$1`, [E]), afect(0));

  // Asistencia
  await espera("m1 marca que asiste", () => como("m1", `insert into comunidad_asistencias (evento) values ($1)`, [E]), bien);
  await espera("m1 no asiste dos veces", () => como("m1", `insert into comunidad_asistencias (evento) values ($1)`, [E]), error);
  await espera("quien no es miembro no se apunta", () => como("fuera", `insert into comunidad_asistencias (evento) values ($1)`, [E]), error);
  await espera("m1 no apunta a otra persona", () => como("m1", `insert into comunidad_asistencias (evento, user_id) values ($1, $2)`, [E, U.rep]), error);
  await espera("rep ve quién asiste", () => como("rep", `select * from comunidad_asistencias`), filas(1));
  await espera("fuera no ve quién asiste", () => como("fuera", `select * from comunidad_asistencias`), filas(0));
  await espera("anon no ve quién asiste", () => como("anon", `select * from comunidad_asistencias`), filas(0));

  // Candado del calendario y de los miembros
  await espera("rep pone candado al calendario y a los miembros", () => como("rep", `update docs set data = data || '{"privado":{"calendario":true,"miembros":true}}' where col='comunidades' and id='k1'`), afect(1));
  await espera("anon ya no ve el calendario", () => como("anon", `select * from comunidad_eventos`), filas(0));
  await espera("fuera ya no ve el calendario", () => como("fuera", `select * from comunidad_eventos`), filas(0));
  await espera("m1 sí lo ve", () => como("m1", `select * from comunidad_eventos`), filas(2));
  await espera("anon ya no ve los rangos", () => como("anon", `select * from comunidad_rangos where comunidad='k1'`), filas(0));
  await espera("m1 sí ve los rangos", () => como("m1", `select * from comunidad_rangos where comunidad='k1'`), filas(1));

  // Borrar
  await espera("m1 deja de asistir", () => como("m1", `delete from comunidad_asistencias where user_id=$1`, [U.m1]), afect(1));
  await espera("borrar el rango deja al miembro sin rango", async () => { await como("rep", `delete from comunidad_rangos where id=$1`, [R]); return como("rep", `select rango from comunidad_miembros where user_id=$1`, [U.m1]); }, (r, e) => !e && r.rows[0].rango === null);
  await espera("m1 no borra actividades", () => como("m1", `delete from comunidad_eventos where id=$1`, [E]), afect(0));
  await espera("borrar la comunidad se lleva sus actividades y rangos", async () => {
    await como("m1", `insert into comunidad_asistencias (evento) values ($1)`, [E]);
    await db.query(`delete from docs where col='comunidades' and id='k1'`);
    return db.query(`select (select count(*) from comunidad_eventos where comunidad='k1')::int a, (select count(*) from comunidad_rangos where comunidad='k1')::int b, (select count(*) from comunidad_asistencias)::int c, (select count(*) from comunidad_rangos where comunidad='k2')::int d`);
  }, (r, e) => !e && r.rows[0].a === 0 && r.rows[0].b === 0 && r.rows[0].c === 0 && r.rows[0].d === 1);

  assert.equal(fallosLista.length, 0, "Fallan:\n" + fallosLista.join("\n"));
});
