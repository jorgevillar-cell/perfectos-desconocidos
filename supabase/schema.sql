create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nombre text not null,
  edad integer not null check (edad >= 0),
  pais text not null,
  ciudad text not null,
  idiomas text[] not null default '{}'::text[],
  "estadoCivil" text not null,
  "fotoUrl" text,
  bio text,
  verificado boolean not null default false,
  "stripeAccountId" text unique,
  "creadoEn" timestamptz not null default now()
);

create table if not exists public.perfil_convivencia (
  "userId" uuid primary key references public.users(id) on delete cascade,
  situacion text not null,
  "estudiaOTrabaja" text not null,
  carrera text,
  universidad text,
  trabajo text,
  presupuesto numeric(10,2) not null,
  zonas text[] not null default '{}'::text[],
  fumar boolean not null default false,
  mascotas boolean not null default false,
  horario text not null,
  ambiente text not null,
  orden text not null,
  deporte text not null,
  aficiones text[] not null default '{}'::text[]
);

create table if not exists public.pisos (
  id uuid primary key default gen_random_uuid(),
  "propietarioId" uuid not null references public.users(id) on delete cascade,
  precio numeric(10,2) not null,
  zona text not null,
  direccion text,
  descripcion text not null,
  "disponibleDesde" date not null,
  fotos text[] not null default '{}'::text[],
  "gastosIncluidos" boolean not null default false
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  "usuarioAId" uuid not null references public.users(id) on delete cascade,
  "usuarioBId" uuid not null references public.users(id) on delete cascade,
  "likeA" boolean not null default false,
  "likeB" boolean not null default false,
  "matchConfirmado" boolean not null default false,
  "creadoEn" timestamptz not null default now(),
  constraint matches_usuario_pair_unique unique ("usuarioAId", "usuarioBId"),
  constraint matches_distinct_users_check check ("usuarioAId" <> "usuarioBId")
);

create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  "matchId" uuid not null references public.matches(id) on delete cascade,
  "remitenteId" uuid not null references public.users(id) on delete cascade,
  contenido text not null,
  tipo text not null default 'text',
  payload jsonb,
  leido boolean not null default false,
  "creadoEn" timestamptz not null default now()
);

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  "matchId" uuid not null references public.matches(id) on delete cascade,
  "pisoId" uuid references public.pisos(id) on delete set null,
  "inquilinoId" uuid not null references public.users(id) on delete cascade,
  "propietarioId" uuid not null references public.users(id) on delete cascade,
  cantidad numeric(10,2) not null,
  estado text not null,
  "stripePaymentIntentId" text unique,
  "liberadoEn" timestamptz,
  "creadoEn" timestamptz not null default now(),
  constraint pagos_distinct_users_check check ("inquilinoId" <> "propietarioId")
);

create table if not exists public.incidencias (
  id uuid primary key default gen_random_uuid(),
  "pagoId" uuid not null references public.pagos(id) on delete cascade,
  descripcion text not null,
  estado text not null,
  fotos text[] not null default '{}'::text[],
  resolucion text,
  "resueltaEn" timestamptz,
  "creadoEn" timestamptz not null default now()
);

create index if not exists pisos_propietario_id_idx on public.pisos ("propietarioId");
create index if not exists matches_usuario_a_id_idx on public.matches ("usuarioAId");
create index if not exists matches_usuario_b_id_idx on public.matches ("usuarioBId");
create index if not exists mensajes_match_id_idx on public.mensajes ("matchId");
create index if not exists mensajes_remitente_id_idx on public.mensajes ("remitenteId");
create index if not exists pagos_match_id_idx on public.pagos ("matchId");
create index if not exists pagos_inquilino_id_idx on public.pagos ("inquilinoId");
create index if not exists pagos_propietario_id_idx on public.pagos ("propietarioId");
create index if not exists incidencias_pago_id_idx on public.incidencias ("pagoId");
