# Dashboard — Bitácora del taller

Panel interno estático (HTML/CSS/JS, sin build) para gestionar el trabajo del
taller entre varios encargados, sincronizado en tiempo real con
[Supabase](https://supabase.com). Se organiza en un módulo general (Mi
Jornada, Usuario) y tres áreas de trabajo:

- **Impresión 3D** — Agregar Producto, Inventario, Banco de Trabajo (órdenes
  de trabajo) y Reporte del Mes.
- **Ecommerce MercadoLibre** y **Dropshipping** — Agregar Producto,
  Inventario, Banco de Trabajo (gestión de ventas del día, facturación y
  beneficios) y Reporte del Mes (gráficas + historial de venta).

## Configurar Supabase (una sola vez)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, corre en este orden:
   1. [`supabase/schema.sql`](supabase/schema.sql) — tablas, seguridad (RLS) y
      tiempo real.
   2. Si el proyecto es nuevo no hace falta nada más. Si vienes de una
      versión anterior sin el campo "área" o sin ventas, corre además
      [`supabase/migracion_areas.sql`](supabase/migracion_areas.sql) y
      [`supabase/migracion_ventas.sql`](supabase/migracion_ventas.sql).
3. En **Project Settings → API**, copia el *Project URL* y la clave *anon
   public* a [`config.js`](config.js).
4. En **Authentication → Providers → Email**, desactiva "Confirm email".
5. En **Authentication → Users → Add user**, crea una cuenta por encargado
   (opcional: metadata `{"nombre": "Juan Pérez"}` para su nombre visible).

La `anon key` en `config.js` es pública a propósito — Supabase la protege con
las reglas de seguridad (RLS) del `schema.sql`, así que es seguro publicar
este archivo tal cual en un repositorio público.

## Ejecutar en local

No necesita instalación ni build. Sirve la carpeta con cualquier servidor
estático, por ejemplo:

```bash
python3 -m http.server 4173
```

Y abre `http://localhost:4173`.

## Publicar en GitHub Pages

```bash
git push -u origin main
```

Luego, en GitHub: **Settings → Pages → Source: Deploy from a branch → main /
(root)**. El sitio queda disponible en `https://<usuario>.github.io/<repo>/`.
