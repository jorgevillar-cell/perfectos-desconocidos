alter table public.users
  add column if not exists "stripeAccountId" text unique;

alter table public.pisos
  add column if not exists direccion text;

alter table public.mensajes
  add column if not exists tipo text not null default 'text',
  add column if not exists payload jsonb;

alter table public.pagos
  add column if not exists "pisoId" uuid references public.pisos(id) on delete set null;

alter table public.incidencias
  add column if not exists fotos text[] not null default '{}'::text[],
  add column if not exists resolucion text,
  add column if not exists "resueltaEn" timestamptz;