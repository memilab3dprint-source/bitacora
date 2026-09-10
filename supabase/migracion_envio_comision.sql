-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run.
-- Agrega el campo "envío" a las ventas. La comisión de MercadoLibre (17%)
-- no se guarda como columna -- se calcula siempre sobre el precio de venta,
-- así que si el % cambia en el futuro no hay que migrar datos.

alter table public.ventas add column if not exists envio numeric(10, 2) not null default 0;
