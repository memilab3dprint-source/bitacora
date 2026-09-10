-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run.
-- Agrega el campo "área" a productos y órdenes para poder separar
-- Impresión 3D, Ecommerce MercadoLibre y Dropshipping.
-- Los registros que ya existían quedan asignados a 'ecommerce_meli' por
-- defecto -- puedes editarlos manualmente en la tabla si corresponden a otra área.

alter table public.productos add column if not exists area text;
update public.productos set area = 'ecommerce_meli' where area is null;
alter table public.productos alter column area set not null;
alter table public.productos drop constraint if exists productos_area_check;
alter table public.productos add constraint productos_area_check
  check (area in ('impresion_3d', 'ecommerce_meli', 'dropshipping'));

alter table public.ordenes add column if not exists area text;
update public.ordenes set area = 'ecommerce_meli' where area is null;
alter table public.ordenes alter column area set not null;
alter table public.ordenes drop constraint if exists ordenes_area_check;
alter table public.ordenes add constraint ordenes_area_check
  check (area in ('impresion_3d', 'ecommerce_meli', 'dropshipping'));
