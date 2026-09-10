-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run.
-- Agrega la marca de "devuelta" a las ventas. El margen (%) no se guarda
-- como columna -- se calcula siempre a partir del precio de venta y el
-- beneficio (ver margenPct en script.js).

alter table public.ventas add column if not exists devuelta boolean not null default false;
