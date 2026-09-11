-- Ejecuta este script completo en Supabase -> SQL Editor -> New query -> Run.
-- Crea las tablas compartidas, la sincronización en tiempo real y las reglas
-- de seguridad (RLS) para que solo los encargados con sesión iniciada puedan
-- leer y escribir datos.
--
-- Si tu proyecto de Supabase ya tenía estas tablas creadas ANTES de que
-- existiera el campo "area" (Impresión 3D / Ecommerce MercadoLibre /
-- Dropshipping), no vuelvas a correr este archivo -- corre en su lugar
-- supabase/migracion_areas.sql, que agrega el campo sin borrar tus datos.

-- 1) Perfiles: nombre visible de cada encargado (auth.users ya guarda el email)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  rol text not null default 'Encargado de taller',
  creado_en timestamptz not null default now()
);

-- Crea automáticamente un perfil cuando se crea un usuario nuevo en Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) Productos (inventario del taller, compartido entre todos)
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text,
  cantidad integer not null default 0,
  precio numeric(10, 2) not null default 0,
  area text not null check (area in ('impresion_3d', 'ecommerce_meli', 'dropshipping')),
  creado_por uuid references auth.users (id),
  creado_en timestamptz not null default now()
);

-- 3) Órdenes de trabajo (banco de trabajo, compartido entre todos)
create table if not exists public.ordenes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  cliente text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'terminado')),
  area text not null check (area in ('impresion_3d', 'ecommerce_meli', 'dropshipping')),
  creado_por uuid references auth.users (id),
  creado_en timestamptz not null default now()
);

-- 4) Ventas (usada por Ecommerce MercadoLibre y Dropshipping en vez de
-- órdenes de trabajo: gestión de ventas del día, facturación y beneficios)
create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('ecommerce_meli', 'dropshipping')),
  fecha date not null default current_date,
  descripcion text not null,
  cantidad integer not null default 1,
  precio_venta numeric(10, 2) not null default 0,
  costo numeric(10, 2) not null default 0,
  envio numeric(10, 2) not null default 0,
  monto_devuelto numeric(10, 2) not null default 0,
  cuenta text not null default '',
  creado_por uuid references auth.users (id),
  creado_en timestamptz not null default now()
);
-- "cuenta" es la cuenta de MercadoLibre (solo se usa en el área
-- ecommerce_meli, para separar cuánto se vendió en cada cuenta).
-- Nota: la comisión de MercadoLibre (17%) y el margen (%) no se guardan
-- como columnas -- se calculan siempre a partir de los demás campos
-- (ver COMISION_MELI y margenPct en script.js).

-- 5) Publicidad (gastos de publicidad de Ecommerce MercadoLibre, se
-- descuentan del beneficio del mes en el Reporte del Mes)
create table if not exists public.publicidad (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area = 'ecommerce_meli'),
  fecha date not null default current_date,
  descripcion text not null,
  monto numeric(10, 2) not null default 0,
  cuenta text not null default '',
  creado_por uuid references auth.users (id),
  creado_en timestamptz not null default now()
);

-- 6) Jornada (una fila por encargado y día)
create table if not exists public.jornada (
  id uuid primary key default gen_random_uuid(),
  encargado_id uuid not null references auth.users (id),
  fecha date not null default current_date,
  entrada time,
  salida time,
  unique (encargado_id, fecha)
);

-- ---------- Seguridad: solo usuarios con sesión iniciada pueden usar esto ----------

alter table public.profiles enable row level security;
alter table public.productos enable row level security;
alter table public.ordenes enable row level security;
alter table public.ventas enable row level security;
alter table public.publicidad enable row level security;
alter table public.jornada enable row level security;

-- Perfiles: todos los encargados pueden verse entre sí, pero cada uno solo edita el suyo
create policy "perfiles: lectura para todos los autenticados" on public.profiles
  for select to authenticated using (true);
create policy "perfiles: cada encargado edita su propio perfil" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Productos: inventario compartido, cualquier encargado puede ver/agregar/editar/borrar
create policy "productos: lectura para todos los autenticados" on public.productos
  for select to authenticated using (true);
create policy "productos: cualquier encargado puede agregar" on public.productos
  for insert to authenticated with check (auth.uid() = creado_por);
create policy "productos: cualquier encargado puede editar" on public.productos
  for update to authenticated using (true);
create policy "productos: cualquier encargado puede eliminar" on public.productos
  for delete to authenticated using (true);

-- Órdenes: mismo criterio que productos (banco de trabajo compartido)
create policy "ordenes: lectura para todos los autenticados" on public.ordenes
  for select to authenticated using (true);
create policy "ordenes: cualquier encargado puede agregar" on public.ordenes
  for insert to authenticated with check (auth.uid() = creado_por);
create policy "ordenes: cualquier encargado puede editar" on public.ordenes
  for update to authenticated using (true);
create policy "ordenes: cualquier encargado puede eliminar" on public.ordenes
  for delete to authenticated using (true);

-- Ventas: mismo criterio que productos/órdenes (Ecommerce y Dropshipping)
create policy "ventas: lectura para todos los autenticados" on public.ventas
  for select to authenticated using (true);
create policy "ventas: cualquier encargado puede agregar" on public.ventas
  for insert to authenticated with check (auth.uid() = creado_por);
create policy "ventas: cualquier encargado puede editar" on public.ventas
  for update to authenticated using (true);
create policy "ventas: cualquier encargado puede eliminar" on public.ventas
  for delete to authenticated using (true);

-- Publicidad: lectura para todos, cualquier encargado agrega/elimina
create policy "publicidad: lectura para todos los autenticados" on public.publicidad
  for select to authenticated using (true);
create policy "publicidad: cualquier encargado puede agregar" on public.publicidad
  for insert to authenticated with check (auth.uid() = creado_por);
create policy "publicidad: cualquier encargado puede eliminar" on public.publicidad
  for delete to authenticated using (true);

-- Jornada: todos pueden ver el historial (para el reporte del mes),
-- pero cada encargado solo puede marcar/editar su propia jornada
create policy "jornada: lectura para todos los autenticados" on public.jornada
  for select to authenticated using (true);
create policy "jornada: cada encargado marca su propia jornada" on public.jornada
  for insert to authenticated with check (auth.uid() = encargado_id);
create policy "jornada: cada encargado edita su propia jornada" on public.jornada
  for update to authenticated using (auth.uid() = encargado_id);

-- ---------- Tiempo real: para que los cambios se vean en todos los dispositivos ----------

alter publication supabase_realtime add table public.productos, public.ordenes, public.ventas, public.publicidad, public.jornada, public.profiles;
