-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run.
-- Cambia la devolución de "sí/no" a un monto en CLP, para poder registrar
-- devoluciones parciales (no solo la venta completa).

alter table public.ventas add column if not exists monto_devuelto numeric(10, 2) not null default 0;

-- Si ya habías marcado ventas como "devuelta" con la versión anterior,
-- esto las pasa a devolución completa (monto = precio de venta).
update public.ventas set monto_devuelto = precio_venta where devuelta = true and monto_devuelto = 0;

alter table public.ventas drop column if exists devuelta;
