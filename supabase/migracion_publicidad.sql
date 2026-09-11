-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run.
-- Agrega los gastos de publicidad de Ecommerce MercadoLibre, para poder
-- descontarlos del beneficio del mes en el Reporte del Mes.

create table if not exists public.publicidad (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area = 'ecommerce_meli'),
  fecha date not null default current_date,
  descripcion text not null,
  monto numeric(10, 2) not null default 0,
  creado_por uuid references auth.users (id),
  creado_en timestamptz not null default now()
);

alter table public.publicidad enable row level security;

create policy "publicidad: lectura para todos los autenticados" on public.publicidad
  for select to authenticated using (true);
create policy "publicidad: cualquier encargado puede agregar" on public.publicidad
  for insert to authenticated with check (auth.uid() = creado_por);
create policy "publicidad: cualquier encargado puede eliminar" on public.publicidad
  for delete to authenticated using (true);

alter publication supabase_realtime add table public.publicidad;
