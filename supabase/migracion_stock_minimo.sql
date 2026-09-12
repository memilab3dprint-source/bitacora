-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run.
-- Agrega el stock mínimo por producto, para mostrar avisos de stock bajo
-- en Inventario cuando la cantidad cae a ese nivel o menos.

alter table public.productos add column if not exists stock_minimo integer not null default 5;
