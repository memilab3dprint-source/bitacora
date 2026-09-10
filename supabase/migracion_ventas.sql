-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run.
-- Agrega la tabla de ventas que usan las áreas Ecommerce MercadoLibre y
-- Dropshipping en "Banco de Trabajo" (gestión de ventas del día, facturación
-- y beneficios del mes) y en "Reporte del Mes" (gráficas + historial).

create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('ecommerce_meli', 'dropshipping')),
  fecha date not null default current_date,
  descripcion text not null,
  cantidad integer not null default 1,
  precio_venta numeric(10, 2) not null default 0,
  costo numeric(10, 2) not null default 0,
  creado_por uuid references auth.users (id),
  creado_en timestamptz not null default now()
);

alter table public.ventas enable row level security;

create policy "ventas: lectura para todos los autenticados" on public.ventas
  for select to authenticated using (true);
create policy "ventas: cualquier encargado puede agregar" on public.ventas
  for insert to authenticated with check (auth.uid() = creado_por);
create policy "ventas: cualquier encargado puede editar" on public.ventas
  for update to authenticated using (true);
create policy "ventas: cualquier encargado puede eliminar" on public.ventas
  for delete to authenticated using (true);

alter publication supabase_realtime add table public.ventas;
