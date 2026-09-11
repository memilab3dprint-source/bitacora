-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run.
-- Agrega el campo "cuenta" (cuenta de MercadoLibre) a ventas y publicidad,
-- para poder separar cuánto se vendió/gastó en cada cuenta.

alter table public.ventas add column if not exists cuenta text not null default '';
alter table public.publicidad add column if not exists cuenta text not null default '';
