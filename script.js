// ---------- Utilidades comunes ----------

function pad(n) {
  return String(n).padStart(2, "0");
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowHM() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hhmm(t) {
  return t ? t.slice(0, 5) : "--:--";
}

function horasEntre(entrada, salida) {
  const [eh, em] = entrada.split(":").map(Number);
  const [sh, sm] = salida.split(":").map(Number);
  return Math.max(sh * 60 + sm - (eh * 60 + em), 0) / 60;
}

function formatCurrency(n) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Number(n) || 0);
}

const COMISION_MELI = 0.17;

function comisionMeli(precioVenta, area) {
  return area === "ecommerce_meli" ? Number(precioVenta) * COMISION_MELI : 0;
}

function calcularBeneficio(v, area) {
  return (
    Number(v.precio_venta) -
    Number(v.costo) -
    Number(v.envio || 0) -
    comisionMeli(v.precio_venta, area) -
    Number(v.monto_devuelto || 0)
  );
}

function facturacionNeta(v) {
  return Number(v.precio_venta) - Number(v.monto_devuelto || 0);
}

function inicioDeMes(offsetMeses = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMeses);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function mesActualStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function primerDiaDeMes(mesStr) {
  return `${mesStr}-01`;
}

function primerDiaMesSiguiente(mesStr) {
  const [y, m] = mesStr.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function diasEnMesStr(mesStr) {
  const [y, m] = mesStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function nombreDeMesStr(mesStr) {
  const [y, m] = mesStr.split("-").map(Number);
  const texto = new Date(y, m - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const AREAS = {
  impresion_3d: "Impresión 3D",
  ecommerce_meli: "Ecommerce MercadoLibre",
  dropshipping: "Dropshipping",
};

function getAreaFromQuery() {
  const area = new URLSearchParams(location.search).get("area");
  return AREAS[area] ? area : null;
}

// ---------- Encabezado: fecha de hoy (todas las páginas) ----------

const dateEl = document.getElementById("today-date");
if (dateEl) {
  const texto = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  dateEl.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
}

const page = document.body.dataset.page;

// ---------- Login ----------

function initLoginPage() {
  const form = document.getElementById("form-login");
  const errorEl = document.getElementById("login-error");
  const submitBtn = document.getElementById("login-submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Entrando...";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const { error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = "Email o contraseña incorrectos.";
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Entrar";
      return;
    }
    location.href = "index.html";
  });
}

// ---------- Encabezado de usuario + logout (todas las páginas salvo login) ----------

async function populateHeader(user) {
  const { data: profile } = await sb.from("profiles").select("nombre, rol").eq("id", user.id).maybeSingle();
  const nombre = profile?.nombre || user.email;

  const nombreEl = document.getElementById("user-nombre");
  const avatarEl = document.getElementById("user-avatar");
  if (nombreEl) nombreEl.textContent = nombre;
  if (avatarEl) avatarEl.textContent = nombre.slice(0, 2).toUpperCase();

  return profile;
}

function wireLogout() {
  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await sb.auth.signOut();
    location.href = "login.html";
  });
}

// ---------- Hub de área (Impresión 3D / Ecommerce MercadoLibre / Dropshipping) ----------

const AREAS_DE_VENTAS = ["ecommerce_meli", "dropshipping"];

function initArea(area) {
  document.getElementById("area-nombre").textContent = AREAS[area];
  document.title = `${AREAS[area]} — Dashboard`;

  if (AREAS_DE_VENTAS.includes(area)) {
    const cardBanco = document.getElementById("card-banco");
    cardBanco.dataset.target = "ventas.html";
    document.getElementById("card-banco-desc").textContent =
      "Gestión de ventas del día, facturación y beneficios del mes.";

    const cardReporte = document.getElementById("card-reporte");
    cardReporte.dataset.target = "reporte-ventas.html";
    document.getElementById("card-reporte-desc").textContent =
      "Gráficas de facturación, beneficios e historial de ventas.";
  }

  document.querySelectorAll(".card[data-target]").forEach((a) => {
    a.href = `${a.dataset.target}?area=${area}`;
  });
}

// Páginas de módulo que viven dentro de un área: fijan el título, la
// etiqueta y el botón "volver" según el área de la URL (?area=...).
function initAreaTag(area) {
  document.body.dataset.currentArea = area;
  const tagEl = document.getElementById("area-tag");
  if (tagEl) tagEl.textContent = AREAS[area];
  const backLink = document.getElementById("back-link");
  if (backLink) backLink.href = `area.html?area=${area}`;
}

// ---------- Mi Jornada ----------

async function initMiJornada(user) {
  const btnEntrada = document.getElementById("btn-entrada");
  const btnSalida = document.getElementById("btn-salida");
  const estadoEl = document.getElementById("estado-jornada");
  const entradaEl = document.getElementById("hora-entrada");
  const salidaEl = document.getElementById("hora-salida");
  const totalEl = document.getElementById("horas-trabajadas");
  const historialBody = document.getElementById("historial-jornada");

  async function render() {
    const { data: registro } = await sb
      .from("jornada")
      .select("*")
      .eq("encargado_id", user.id)
      .eq("fecha", todayKey())
      .maybeSingle();

    entradaEl.textContent = hhmm(registro?.entrada);
    salidaEl.textContent = hhmm(registro?.salida);

    if (!registro?.entrada) {
      estadoEl.textContent = "Sin marcar entrada";
      btnEntrada.disabled = false;
      btnSalida.disabled = true;
      totalEl.textContent = "--";
    } else if (!registro?.salida) {
      estadoEl.textContent = "En jornada";
      btnEntrada.disabled = true;
      btnSalida.disabled = false;
      totalEl.textContent = "--";
    } else {
      estadoEl.textContent = "Jornada finalizada";
      btnEntrada.disabled = true;
      btnSalida.disabled = true;
      totalEl.textContent = `${horasEntre(registro.entrada, registro.salida).toFixed(1)} h`;
    }

    const { data: historial } = await sb
      .from("jornada")
      .select("*")
      .eq("encargado_id", user.id)
      .order("fecha", { ascending: false })
      .limit(7);

    historialBody.innerHTML = historial?.length
      ? historial
          .map(
            (r) =>
              `<tr><td>${r.fecha}</td><td>${hhmm(r.entrada)}</td><td>${hhmm(r.salida)}</td><td>${
                r.entrada && r.salida ? `${horasEntre(r.entrada, r.salida).toFixed(1)} h` : "--"
              }</td></tr>`
          )
          .join("")
      : `<tr><td class="table-empty" colspan="4">Todavía no hay jornadas registradas.</td></tr>`;
  }

  btnEntrada.addEventListener("click", async () => {
    btnEntrada.disabled = true;
    const { error } = await sb
      .from("jornada")
      .upsert({ encargado_id: user.id, fecha: todayKey(), entrada: nowHM() }, { onConflict: "encargado_id,fecha" });
    if (error) alert("No se pudo guardar la entrada: " + error.message);
    await render();
  });

  btnSalida.addEventListener("click", async () => {
    btnSalida.disabled = true;
    const { error } = await sb
      .from("jornada")
      .update({ salida: nowHM() })
      .eq("encargado_id", user.id)
      .eq("fecha", todayKey());
    if (error) alert("No se pudo guardar la salida: " + error.message);
    await render();
  });

  await render();

  sb.channel("jornada-mia")
    .on("postgres_changes", { event: "*", schema: "public", table: "jornada", filter: `encargado_id=eq.${user.id}` }, render)
    .subscribe();
}

// ---------- Agregar Producto ----------

async function initAgregarProducto(user, area) {
  const form = document.getElementById("form-producto");
  const recientesBody = document.getElementById("productos-recientes");
  const linkInventario = document.getElementById("link-inventario");
  if (linkInventario) linkInventario.href = `inventario.html?area=${area}`;

  async function render() {
    const { data: productos } = await sb
      .from("productos")
      .select("*")
      .eq("area", area)
      .order("creado_en", { ascending: false })
      .limit(5);

    recientesBody.innerHTML = productos?.length
      ? productos
          .map(
            (p) =>
              `<tr><td>${p.nombre}</td><td>${p.categoria || "--"}</td><td>${p.cantidad}</td><td>${formatCurrency(p.precio)}</td></tr>`
          )
          .join("")
      : `<tr><td class="table-empty" colspan="4">Todavía no se agregó ningún producto.</td></tr>`;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nombre = document.getElementById("producto-nombre").value.trim();
    const categoria = document.getElementById("producto-categoria").value.trim();
    const cantidad = Number(document.getElementById("producto-cantidad").value);
    const precio = Number(document.getElementById("producto-precio").value) || 0;
    const stock_minimo = Number(document.getElementById("producto-stock-minimo").value) || 0;
    if (!nombre || !cantidad) return;

    const { error } = await sb
      .from("productos")
      .insert({ nombre, categoria, cantidad, precio, stock_minimo, area, creado_por: user.id });
    if (error) {
      alert("No se pudo guardar el producto: " + error.message);
      return;
    }
    form.reset();
    await render();
  });

  await render();

  sb.channel(`productos-recientes-${area}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "productos", filter: `area=eq.${area}` }, render)
    .subscribe();
}

// ---------- Inventario ----------

async function initInventario(area) {
  const body = document.getElementById("tabla-inventario");
  const totalUnidadesEl = document.getElementById("total-unidades");
  const totalValorEl = document.getElementById("total-valor");
  const linkAgregar = document.querySelector('a[href^="agregar-producto.html"]');
  if (linkAgregar) linkAgregar.href = `agregar-producto.html?area=${area}`;

  let productosCache = [];
  const alertaStockBajo = document.getElementById("alerta-stock-bajo");

  function stockBajo(p) {
    return Number(p.cantidad) <= Number(p.stock_minimo ?? 5);
  }

  function filaHTML(p) {
    const bajo = stockBajo(p);
    return `<tr data-id="${p.id}" class="${bajo ? "fila-stock-bajo" : ""}">
      <td>${p.nombre}${bajo ? '<span class="badge badge-stock-bajo">Stock bajo</span>' : ""}</td>
      <td>${p.categoria || "--"}</td>
      <td>${p.cantidad}</td>
      <td>${p.stock_minimo ?? 5}</td>
      <td>${formatCurrency(p.precio)}</td>
      <td>${formatCurrency(p.cantidad * p.precio)}</td>
      <td><div class="row-actions">
        <button class="btn btn-secondary btn-agregar-stock" data-id="${p.id}">+ Stock</button>
        <button class="btn btn-secondary btn-editar-producto" data-id="${p.id}">Editar</button>
        <button class="btn btn-danger" data-id="${p.id}">Eliminar</button>
      </div></td>
    </tr>`;
  }

  function filaEdicionHTML(p) {
    return `<tr data-id="${p.id}">
      <td><input type="text" class="edit-nombre" value="${p.nombre}" /></td>
      <td><input type="text" class="edit-categoria" value="${p.categoria || ""}" /></td>
      <td><input type="number" class="edit-cantidad" value="${p.cantidad}" min="0" step="1" /></td>
      <td><input type="number" class="edit-stock-minimo" value="${p.stock_minimo ?? 5}" min="0" step="1" /></td>
      <td><input type="number" class="edit-precio" value="${p.precio}" min="0" step="1" /></td>
      <td>--</td>
      <td><div class="row-actions">
        <button class="btn btn-primary btn-guardar-producto" data-id="${p.id}">Guardar</button>
        <button class="btn btn-secondary btn-cancelar-edicion" data-id="${p.id}">Cancelar</button>
      </div></td>
    </tr>`;
  }

  function wireFila() {
    body.querySelectorAll(".btn-danger[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await sb.from("productos").delete().eq("id", btn.dataset.id);
        if (error) alert("No se pudo eliminar: " + error.message);
        await render();
      });
    });

    body.querySelectorAll(".btn-agregar-stock[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const entrada = prompt("¿Cuántas unidades llegaron?", "");
        if (entrada === null) return;
        const cantidadAgregar = Number(entrada);
        if (!cantidadAgregar) return;
        const producto = productosCache.find((p) => p.id === btn.dataset.id);
        const nuevaCantidad = (producto?.cantidad || 0) + cantidadAgregar;
        const { error } = await sb.from("productos").update({ cantidad: nuevaCantidad }).eq("id", btn.dataset.id);
        if (error) alert("No se pudo actualizar el stock: " + error.message);
        await render();
      });
    });

    body.querySelectorAll(".btn-editar-producto[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const producto = productosCache.find((p) => p.id === btn.dataset.id);
        if (!producto) return;
        body.querySelector(`tr[data-id="${producto.id}"]`).outerHTML = filaEdicionHTML(producto);
        wireFila();
      });
    });

    body.querySelectorAll(".btn-cancelar-edicion[data-id]").forEach((btn) => {
      btn.addEventListener("click", render);
    });

    body.querySelectorAll(".btn-guardar-producto[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fila = body.querySelector(`tr[data-id="${btn.dataset.id}"]`);
        const nombre = fila.querySelector(".edit-nombre").value.trim();
        const categoria = fila.querySelector(".edit-categoria").value.trim();
        const cantidad = Number(fila.querySelector(".edit-cantidad").value) || 0;
        const stock_minimo = Number(fila.querySelector(".edit-stock-minimo").value) || 0;
        const precio = Number(fila.querySelector(".edit-precio").value) || 0;
        if (!nombre) return;

        const { error } = await sb
          .from("productos")
          .update({ nombre, categoria, cantidad, stock_minimo, precio })
          .eq("id", btn.dataset.id);
        if (error) {
          alert("No se pudo guardar: " + error.message);
          return;
        }
        await render();
      });
    });
  }

  async function render() {
    const { data: productos } = await sb
      .from("productos")
      .select("*")
      .eq("area", area)
      .order("nombre", { ascending: true });
    productosCache = productos || [];

    body.innerHTML = productosCache.length
      ? productosCache.map(filaHTML).join("")
      : `<tr><td class="table-empty" colspan="7">No hay productos en el inventario todavía. <a href="agregar-producto.html?area=${area}">Agrega el primero</a>.</td></tr>`;

    const totalUnidades = productosCache.reduce((sum, p) => sum + Number(p.cantidad), 0);
    const totalValor = productosCache.reduce((sum, p) => sum + Number(p.cantidad) * Number(p.precio), 0);
    totalUnidadesEl.textContent = totalUnidades;
    totalValorEl.textContent = formatCurrency(totalValor);

    if (alertaStockBajo) {
      const bajos = productosCache.filter(stockBajo);
      if (bajos.length) {
        const nombres = bajos.map((p) => p.nombre).join(", ");
        alertaStockBajo.textContent = `⚠ ${bajos.length} producto${bajos.length > 1 ? "s" : ""} con stock bajo: ${nombres}`;
        alertaStockBajo.hidden = false;
      } else {
        alertaStockBajo.hidden = true;
      }
    }

    wireFila();
  }

  await render();

  sb.channel(`productos-inventario-${area}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "productos", filter: `area=eq.${area}` }, render)
    .subscribe();
}

// ---------- Banco de Trabajo ----------

async function initBancoDeTrabajo(user, area) {
  const form = document.getElementById("form-orden");
  const columnas = {
    pendiente: document.getElementById("columna-pendiente"),
    en_proceso: document.getElementById("columna-en_proceso"),
    terminado: document.getElementById("columna-terminado"),
  };
  const etiquetas = { pendiente: "Pendiente", en_proceso: "En proceso", terminado: "Terminado" };

  function ordenCardHTML(orden) {
    return `<div class="orden-card">
      <div class="orden-titulo">${orden.titulo}</div>
      <div class="orden-cliente">${orden.cliente || "Sin cliente asignado"}</div>
      <div class="orden-card-actions">
        <select data-id="${orden.id}" class="cambiar-estado">
          <option value="pendiente" ${orden.estado === "pendiente" ? "selected" : ""}>Pendiente</option>
          <option value="en_proceso" ${orden.estado === "en_proceso" ? "selected" : ""}>En proceso</option>
          <option value="terminado" ${orden.estado === "terminado" ? "selected" : ""}>Terminado</option>
        </select>
        <button class="btn btn-danger" data-id="${orden.id}">Eliminar</button>
      </div>
    </div>`;
  }

  async function render() {
    const { data: ordenes } = await sb
      .from("ordenes")
      .select("*")
      .eq("area", area)
      .order("creado_en", { ascending: true });

    Object.entries(columnas).forEach(([estado, columna]) => {
      const delEstado = (ordenes || []).filter((o) => o.estado === estado);
      columna.innerHTML =
        `<h3>${etiquetas[estado]} (${delEstado.length})</h3>` +
        (delEstado.length ? delEstado.map(ordenCardHTML).join("") : `<p class="form-hint">Sin órdenes aquí.</p>`);
    });

    document.querySelectorAll(".cambiar-estado").forEach((select) => {
      select.addEventListener("change", async () => {
        const { error } = await sb.from("ordenes").update({ estado: select.value }).eq("id", select.dataset.id);
        if (error) alert("No se pudo actualizar: " + error.message);
        await render();
      });
    });

    document.querySelectorAll(".btn-danger[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await sb.from("ordenes").delete().eq("id", btn.dataset.id);
        if (error) alert("No se pudo eliminar: " + error.message);
        await render();
      });
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const titulo = document.getElementById("orden-titulo").value.trim();
    const cliente = document.getElementById("orden-cliente").value.trim();
    if (!titulo) return;

    const { error } = await sb
      .from("ordenes")
      .insert({ titulo, cliente, estado: "pendiente", area, creado_por: user.id });
    if (error) {
      alert("No se pudo crear la orden: " + error.message);
      return;
    }
    form.reset();
    await render();
  });

  await render();

  sb.channel(`ordenes-banco-${area}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "ordenes", filter: `area=eq.${area}` }, render)
    .subscribe();
}

// ---------- Ventas (Banco de Trabajo de Ecommerce MercadoLibre / Dropshipping) ----------

function margenPct(v, area) {
  const precio = Number(v.precio_venta);
  return precio ? (calcularBeneficio(v, area) / precio) * 100 : 0;
}

async function poblarCuentas(area, selectCuenta, datalistCuentas) {
  const [{ data: dv }, { data: dp }] = await Promise.all([
    sb.from("ventas").select("cuenta").eq("area", area),
    sb.from("publicidad").select("cuenta").eq("area", area),
  ]);
  const set = new Set();
  (dv || []).forEach((r) => r.cuenta && set.add(r.cuenta));
  (dp || []).forEach((r) => r.cuenta && set.add(r.cuenta));
  const cuentas = [...set].sort();

  if (datalistCuentas) {
    datalistCuentas.innerHTML = cuentas.map((c) => `<option value="${c}"></option>`).join("");
  }
  if (selectCuenta) {
    const actual = selectCuenta.value;
    const etiquetaTodas = area === "ecommerce_meli" ? "Todas las cuentas" : "Todos los proveedores";
    selectCuenta.innerHTML =
      `<option value="">${etiquetaTodas}</option>` +
      cuentas.map((c) => `<option value="${c}">${c}</option>`).join("");
    selectCuenta.value = cuentas.includes(actual) ? actual : "";
  }
  return cuentas;
}

function ventaRowHTML(v, area, { conFecha = false, conAcciones = true } = {}) {
  const beneficio = calcularBeneficio(v, area);
  const devuelta = Number(v.monto_devuelto) > 0;
  return `<tr class="${devuelta ? "fila-devuelta" : ""}" data-id="${v.id}">
    ${conFecha ? `<td>${v.fecha}</td>` : ""}
    <td>${v.cuenta || "—"}</td>
    <td>${v.descripcion}${devuelta ? '<span class="badge badge-devuelta">Devuelta</span>' : ""}</td>
    <td>${v.cantidad}</td>
    <td>${formatCurrency(v.precio_venta)}</td>
    <td>${formatCurrency(v.costo)}</td>
    <td class="solo-meli">${formatCurrency(v.envio)}</td>
    <td class="solo-meli">${formatCurrency(comisionMeli(v.precio_venta, area))}</td>
    <td>${devuelta ? formatCurrency(v.monto_devuelto) : "—"}</td>
    <td>${margenPct(v, area).toFixed(0)}%</td>
    <td>${formatCurrency(beneficio)}</td>
    ${
      conAcciones
        ? `<td><div class="row-actions">
            <button class="btn btn-secondary btn-editar-venta" data-id="${v.id}">Editar</button>
            <button class="btn btn-secondary btn-editar-devolucion" data-id="${v.id}" data-precio="${v.precio_venta}" data-monto="${v.monto_devuelto || 0}">${devuelta ? "Editar devolución" : "Registrar devolución"}</button>
            <button class="btn btn-danger" data-id="${v.id}">Eliminar</button>
          </div></td>`
        : ""
    }
  </tr>`;
}

function ventaEdicionHTML(v, area) {
  return `<tr data-id="${v.id}">
    <td><input type="date" class="edit-fecha" value="${v.fecha}" /></td>
    <td><input type="text" class="edit-cuenta" value="${v.cuenta || ""}" list="lista-cuentas" /></td>
    <td><input type="text" class="edit-descripcion" value="${v.descripcion}" /></td>
    <td><input type="number" class="edit-cantidad" value="${v.cantidad}" min="1" step="1" /></td>
    <td><input type="number" class="edit-precio" value="${v.precio_venta}" min="0" step="1" /></td>
    <td><input type="number" class="edit-costo" value="${v.costo}" min="0" step="1" /></td>
    <td class="solo-meli"><input type="number" class="edit-envio" value="${v.envio}" min="0" step="1" /></td>
    <td class="solo-meli">--</td>
    <td><input type="number" class="edit-devolucion" value="${v.monto_devuelto}" min="0" step="1" /></td>
    <td>--</td>
    <td>--</td>
    <td><div class="row-actions">
      <button class="btn btn-primary btn-guardar-venta" data-id="${v.id}">Guardar</button>
      <button class="btn btn-secondary btn-cancelar-venta" data-id="${v.id}">Cancelar</button>
    </div></td>
  </tr>`;
}

async function initVentas(user, area) {
  const form = document.getElementById("form-venta");
  const ventasHoyBody = document.getElementById("ventas-hoy");
  const ventasMesBody = document.getElementById("ventas-mes");
  const statFacturacion = document.getElementById("stat-facturacion");
  const statBeneficio = document.getElementById("stat-beneficio");
  const statMargen = document.getElementById("stat-margen");
  const statPublicidad = document.getElementById("stat-publicidad");
  const selectorMes = document.getElementById("selector-mes");
  selectorMes.value = mesActualStr();
  const selectorCuenta = document.getElementById("selector-cuenta");
  const listaCuentas = document.getElementById("lista-cuentas");
  const cuentaInput = document.getElementById("venta-cuenta");
  const publicidadCuentaInput = document.getElementById("publicidad-cuenta");

  const formPublicidad = document.getElementById("form-publicidad");
  const publicidadFechaInput = document.getElementById("publicidad-fecha");
  const publicidadBody = document.getElementById("publicidad-lista");
  const totalPublicidadEl = document.getElementById("total-publicidad");
  if (publicidadFechaInput) publicidadFechaInput.value = todayKey();

  const etiquetaCuenta = area === "ecommerce_meli" ? "Cuenta de MercadoLibre" : "Proveedor";
  const placeholderCuenta = area === "ecommerce_meli" ? "Ej. Cuenta principal" : "Ej. Proveedor XYZ";
  document.getElementById("label-venta-cuenta")?.replaceChildren(etiquetaCuenta);
  const etiquetaSelectorCuenta = area === "ecommerce_meli" ? "Cuenta" : "Proveedor";
  document.getElementById("label-selector-cuenta")?.replaceChildren(etiquetaSelectorCuenta);
  document.querySelectorAll(".th-cuenta").forEach((th) => (th.textContent = etiquetaSelectorCuenta));
  if (cuentaInput) cuentaInput.placeholder = placeholderCuenta;

  await poblarCuentas(area, selectorCuenta, listaCuentas);

  const notaComision = document.getElementById("nota-comision");
  if (notaComision) notaComision.textContent = `Se descuenta automáticamente la comisión de MercadoLibre (${(COMISION_MELI * 100).toFixed(0)}% del precio de venta).`;

  const descripcionInput = document.getElementById("venta-descripcion");
  const precioInput = document.getElementById("venta-precio");
  const fechaInput = document.getElementById("venta-fecha");
  const listaInventario = document.getElementById("lista-inventario");
  const productosPorNombre = new Map();
  fechaInput.value = todayKey();

  const { data: productosInventario } = await sb
    .from("productos")
    .select("id, nombre, precio")
    .eq("area", area)
    .order("nombre", { ascending: true });

  (productosInventario || []).forEach((p) => productosPorNombre.set(p.nombre, p));
  listaInventario.innerHTML = (productosInventario || [])
    .map((p) => `<option value="${p.nombre}"></option>`)
    .join("");

  descripcionInput.addEventListener("input", () => {
    const producto = productosPorNombre.get(descripcionInput.value);
    if (producto) precioInput.value = producto.precio;
  });

  function wireRow(container, onDone) {
    container.querySelectorAll(".btn-danger[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await sb.from("ventas").delete().eq("id", btn.dataset.id);
        if (error) alert("No se pudo eliminar: " + error.message);
        await onDone();
      });
    });
    container.querySelectorAll(".btn-editar-devolucion[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const actual = Number(btn.dataset.monto) || 0;
        const entrada = prompt(
          `¿Cuánto se devolvió de esta venta (de ${formatCurrency(btn.dataset.precio)})? Escribe 0 para quitar la devolución.`,
          actual || btn.dataset.precio
        );
        if (entrada === null) return;
        const monto_devuelto = Number(entrada) || 0;
        const { error } = await sb.from("ventas").update({ monto_devuelto }).eq("id", btn.dataset.id);
        if (error) alert("No se pudo actualizar: " + error.message);
        await onDone();
      });
    });
    container.querySelectorAll(".btn-editar-venta[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { data: venta } = await sb.from("ventas").select("*").eq("id", btn.dataset.id).maybeSingle();
        if (!venta) return;
        const fila = container.querySelector(`tr[data-id="${venta.id}"]`);
        fila.outerHTML = ventaEdicionHTML(venta, area);
        const filaEdicion = container.querySelector(`tr[data-id="${venta.id}"]`);

        filaEdicion.querySelector(".btn-cancelar-venta").addEventListener("click", onDone);
        filaEdicion.querySelector(".btn-guardar-venta").addEventListener("click", async () => {
          const fecha = filaEdicion.querySelector(".edit-fecha").value || todayKey();
          const cuenta = filaEdicion.querySelector(".edit-cuenta").value.trim();
          const descripcion = filaEdicion.querySelector(".edit-descripcion").value.trim();
          const cantidad = Number(filaEdicion.querySelector(".edit-cantidad").value) || 1;
          const precio_venta = Number(filaEdicion.querySelector(".edit-precio").value) || 0;
          const costo = Number(filaEdicion.querySelector(".edit-costo").value) || 0;
          const envioInput = filaEdicion.querySelector(".edit-envio");
          const envio = area === "ecommerce_meli" ? Number(envioInput?.value) || 0 : 0;
          const monto_devuelto = Number(filaEdicion.querySelector(".edit-devolucion").value) || 0;
          if (!descripcion || !precio_venta) return;

          const { error } = await sb
            .from("ventas")
            .update({ fecha, cuenta, descripcion, cantidad, precio_venta, costo, envio, monto_devuelto })
            .eq("id", venta.id);
          if (error) {
            alert("No se pudo guardar: " + error.message);
            return;
          }
          await poblarCuentas(area, selectorCuenta, listaCuentas);
          await onDone();
        });
      });
    });
  }

  function cuentaSeleccionada() {
    return selectorCuenta?.value || "";
  }

  async function renderHoy() {
    let query = sb.from("ventas").select("*").eq("area", area).eq("fecha", todayKey());
    if (cuentaSeleccionada()) query = query.eq("cuenta", cuentaSeleccionada());
    const { data: hoy } = await query.order("creado_en", { ascending: true });

    ventasHoyBody.innerHTML = hoy?.length
      ? hoy.map((v) => ventaRowHTML(v, area, { conFecha: true })).join("")
      : `<tr><td class="table-empty" colspan="12">Todavía no hay ventas registradas hoy.</td></tr>`;
    wireRow(ventasHoyBody, renderHoy);
  }

  async function renderPublicidad(mesStr) {
    const inicioMes = primerDiaDeMes(mesStr);
    const inicioMesSiguiente = primerDiaMesSiguiente(mesStr);

    let query = sb
      .from("publicidad")
      .select("*")
      .eq("area", area)
      .gte("fecha", inicioMes)
      .lt("fecha", inicioMesSiguiente);
    if (cuentaSeleccionada()) query = query.eq("cuenta", cuentaSeleccionada());
    const { data } = await query.order("fecha", { ascending: false });

    const lista = data || [];
    const total = lista.reduce((sum, g) => sum + Number(g.monto), 0);

    if (publicidadBody) {
      publicidadBody.innerHTML = lista.length
        ? lista
            .map(
              (g) =>
                `<tr><td>${g.fecha}</td><td>${g.cuenta || "—"}</td><td>${g.descripcion}</td><td>${formatCurrency(g.monto)}</td><td><button class="btn btn-danger" data-id="${g.id}">Eliminar</button></td></tr>`
            )
            .join("")
        : `<tr><td class="table-empty" colspan="5">Sin gastos de publicidad este mes.</td></tr>`;

      publicidadBody.querySelectorAll(".btn-danger[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await sb.from("publicidad").delete().eq("id", btn.dataset.id);
          if (error) alert("No se pudo eliminar: " + error.message);
          await renderMes(selectorMes.value);
        });
      });
    }

    if (totalPublicidadEl) totalPublicidadEl.textContent = formatCurrency(total);
    if (statPublicidad) statPublicidad.textContent = formatCurrency(total);

    return total;
  }

  async function renderMes(mesStr) {
    const totalPublicidad = await renderPublicidad(mesStr);

    const inicioMes = primerDiaDeMes(mesStr);
    const inicioMesSiguiente = primerDiaMesSiguiente(mesStr);

    let queryMes = sb
      .from("ventas")
      .select("*")
      .eq("area", area)
      .gte("fecha", inicioMes)
      .lt("fecha", inicioMesSiguiente);
    if (cuentaSeleccionada()) queryMes = queryMes.eq("cuenta", cuentaSeleccionada());
    const { data: delMes } = await queryMes.order("fecha", { ascending: false });

    ventasMesBody.innerHTML = delMes?.length
      ? delMes.map((v) => ventaRowHTML(v, area, { conFecha: true })).join("")
      : `<tr><td class="table-empty" colspan="12">Todavía no hay ventas ese mes.</td></tr>`;
    wireRow(ventasMesBody, () => renderMes(selectorMes.value));

    const lista = delMes || [];
    const facturacion = lista.reduce((sum, v) => sum + facturacionNeta(v), 0);
    const beneficio = lista.reduce((sum, v) => sum + calcularBeneficio(v, area), 0) - totalPublicidad;
    statFacturacion.textContent = formatCurrency(facturacion);
    statBeneficio.textContent = formatCurrency(beneficio);
    statMargen.textContent = facturacion ? `${((beneficio / facturacion) * 100).toFixed(0)}%` : "--";
  }

  formPublicidad?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const descripcion = document.getElementById("publicidad-descripcion").value.trim();
    const fecha = publicidadFechaInput.value || todayKey();
    const monto = Number(document.getElementById("publicidad-monto").value) || 0;
    const cuenta = publicidadCuentaInput?.value.trim() || "";
    if (!descripcion || !monto) return;

    const { error } = await sb
      .from("publicidad")
      .insert({ area, descripcion, monto, cuenta, fecha, creado_por: user.id });
    if (error) {
      alert("No se pudo registrar el gasto: " + error.message);
      return;
    }
    formPublicidad.reset();
    publicidadFechaInput.value = todayKey();
    await poblarCuentas(area, selectorCuenta, listaCuentas);
    await renderMes(selectorMes.value);
  });

  selectorMes.addEventListener("change", () => renderMes(selectorMes.value));
  selectorCuenta?.addEventListener("change", () => Promise.all([renderHoy(), renderMes(selectorMes.value)]));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const descripcion = document.getElementById("venta-descripcion").value.trim();
    const fecha = fechaInput.value || todayKey();
    const cantidad = Number(document.getElementById("venta-cantidad").value) || 1;
    const precio_venta = Number(document.getElementById("venta-precio").value);
    const costo = Number(document.getElementById("venta-costo").value) || 0;
    const envio = area === "ecommerce_meli" ? Number(document.getElementById("venta-envio").value) || 0 : 0;
    const monto_devuelto = Number(document.getElementById("venta-devolucion").value) || 0;
    const cuenta = cuentaInput?.value.trim() || "";
    if (!descripcion || !precio_venta) return;

    const { error } = await sb.from("ventas").insert({
      area,
      descripcion,
      cantidad,
      precio_venta,
      costo,
      envio,
      monto_devuelto,
      cuenta,
      fecha,
      creado_por: user.id,
    });
    if (error) {
      alert("No se pudo registrar la venta: " + error.message);
      return;
    }
    if (area === "ecommerce_meli") await poblarCuentas(area, selectorCuenta, listaCuentas);

    const producto = productosPorNombre.get(descripcion);
    if (producto) {
      const { data: actual } = await sb.from("productos").select("cantidad").eq("id", producto.id).maybeSingle();
      if (actual) {
        const nuevaCantidad = actual.cantidad - cantidad;
        await sb.from("productos").update({ cantidad: nuevaCantidad }).eq("id", producto.id);
        producto.cantidad = nuevaCantidad;
      }
    }

    form.reset();
    document.getElementById("venta-cantidad").value = 1;
    fechaInput.value = todayKey();
    await Promise.all([renderHoy(), renderMes(selectorMes.value)]);
  });

  await Promise.all([renderHoy(), renderMes(selectorMes.value)]);

  sb.channel(`ventas-${area}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ventas", filter: `area=eq.${area}` },
      () => Promise.all([renderHoy(), renderMes(selectorMes.value)])
    )
    .subscribe();

  if (area === "ecommerce_meli") {
    sb.channel(`publicidad-${area}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "publicidad", filter: `area=eq.${area}` },
        () => renderMes(selectorMes.value)
      )
      .subscribe();
  }
}

// ---------- Reporte de Ventas (Reporte del Mes de Ecommerce MercadoLibre / Dropshipping) ----------

async function initReporteVentas(area) {
  const selectorMes = document.getElementById("selector-mes");
  selectorMes.value = mesActualStr();
  const selectorCuenta = document.getElementById("selector-cuenta");
  let chart = null;
  let ultimaLista = [];
  let ultimoResumen = {};

  const etiquetaSelectorCuenta = area === "ecommerce_meli" ? "Cuenta" : "Proveedor";
  document.getElementById("label-selector-cuenta")?.replaceChildren(etiquetaSelectorCuenta);
  document.querySelectorAll(".th-cuenta").forEach((th) => (th.textContent = etiquetaSelectorCuenta));

  await poblarCuentas(area, selectorCuenta, null);

  async function renderMes(mesStr) {
    const inicioMes = primerDiaDeMes(mesStr);
    const inicioMesSiguiente = primerDiaMesSiguiente(mesStr);
    const diasEnMes = diasEnMesStr(mesStr);
    const cuenta = selectorCuenta?.value || "";

    document.getElementById("mes-nombre").textContent = nombreDeMesStr(mesStr);

    let queryVentas = sb
      .from("ventas")
      .select("*")
      .eq("area", area)
      .gte("fecha", inicioMes)
      .lt("fecha", inicioMesSiguiente);
    let queryPublicidad = sb
      .from("publicidad")
      .select("monto")
      .eq("area", area)
      .gte("fecha", inicioMes)
      .lt("fecha", inicioMesSiguiente);
    if (cuenta) {
      queryVentas = queryVentas.eq("cuenta", cuenta);
      queryPublicidad = queryPublicidad.eq("cuenta", cuenta);
    }

    const [{ data: ventas }, { data: gastosPublicidad }] = await Promise.all([
      queryVentas.order("fecha", { ascending: false }),
      queryPublicidad,
    ]);

    const lista = ventas || [];
    const totalPublicidad = (gastosPublicidad || []).reduce((sum, g) => sum + Number(g.monto), 0);
    const facturacion = lista.reduce((sum, v) => sum + facturacionNeta(v), 0);
    const beneficio = lista.reduce((sum, v) => sum + calcularBeneficio(v, area), 0) - totalPublicidad;

    document.getElementById("stat-facturacion").textContent = formatCurrency(facturacion);
    document.getElementById("stat-beneficio").textContent = formatCurrency(beneficio);
    document.getElementById("stat-ventas").textContent = lista.length;
    document.getElementById("stat-margen").textContent = facturacion ? `${((beneficio / facturacion) * 100).toFixed(0)}%` : "--";
    const statPublicidadEl = document.getElementById("stat-publicidad");
    if (statPublicidadEl) statPublicidadEl.textContent = formatCurrency(totalPublicidad);

    document.getElementById("historial-ventas").innerHTML = lista.length
      ? lista.map((v) => ventaRowHTML(v, area, { conFecha: true, conAcciones: false })).join("")
      : `<tr><td class="table-empty" colspan="11">Todavía no hay ventas ese mes.</td></tr>`;

    ultimaLista = lista;
    ultimoResumen = {
      mesStr,
      facturacion,
      beneficio,
      totalPublicidad,
      margen: facturacion ? (beneficio / facturacion) * 100 : 0,
      ventas: lista.length,
    };

    const porDia = Array.from({ length: diasEnMes }, () => ({ facturacion: 0, beneficio: 0 }));
    lista.forEach((v) => {
      const dia = Number(v.fecha.slice(8, 10)) - 1;
      if (porDia[dia]) {
        porDia[dia].facturacion += facturacionNeta(v);
        porDia[dia].beneficio += calcularBeneficio(v, area);
      }
    });

    if (chart) chart.destroy();
    chart = new Chart(document.getElementById("grafica-ventas"), {
      type: "bar",
      data: {
        labels: porDia.map((_, i) => i + 1),
        datasets: [
          { label: "Facturación", data: porDia.map((d) => d.facturacion.toFixed(2)), backgroundColor: "#2563eb" },
          { label: "Beneficio", data: porDia.map((d) => d.beneficio.toFixed(2)), backgroundColor: "#16a34a" },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { title: { display: true, text: "Día del mes" } } },
      },
    });
  }

  document.getElementById("btn-exportar-excel")?.addEventListener("click", () => {
    if (typeof XLSX === "undefined") return;
    const etiquetaCuenta = area === "ecommerce_meli" ? "Cuenta" : "Proveedor";

    const resumen = [
      ["Reporte del Mes", nombreDeMesStr(ultimoResumen.mesStr)],
      ["Área", AREAS[area]],
      [],
      ["Facturación del mes", ultimoResumen.facturacion],
    ];
    if (area === "ecommerce_meli") resumen.push(["Publicidad del mes", ultimoResumen.totalPublicidad]);
    resumen.push(
      ["Beneficio del mes", ultimoResumen.beneficio],
      ["Margen promedio (%)", Number(ultimoResumen.margen.toFixed(1))],
      ["Ventas registradas", ultimoResumen.ventas]
    );

    const detalle = [
      ["Fecha", etiquetaCuenta, "Producto", "Cantidad", "Precio", "Costo", "Envío", "Comisión", "Devolución", "Margen %", "Beneficio"],
      ...ultimaLista.map((v) => [
        v.fecha,
        v.cuenta || "",
        v.descripcion,
        v.cantidad,
        Number(v.precio_venta),
        Number(v.costo),
        Number(v.envio || 0),
        Number(comisionMeli(v.precio_venta, area).toFixed(2)),
        Number(v.monto_devuelto || 0),
        Number(margenPct(v, area).toFixed(1)),
        Number(calcularBeneficio(v, area).toFixed(2)),
      ]),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), "Resumen");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detalle), "Detalle");
    XLSX.writeFile(wb, `reporte-${area}-${ultimoResumen.mesStr}.xlsx`);
  });

  document.getElementById("btn-imprimir")?.addEventListener("click", () => window.print());

  selectorMes.addEventListener("change", () => renderMes(selectorMes.value));
  selectorCuenta?.addEventListener("change", () => renderMes(selectorMes.value));
  await renderMes(selectorMes.value);
}

// ---------- Reporte del Mes ----------

async function initReporteDelMes(area) {
  const inicioMes = inicioDeMes(0);
  const inicioMesSiguiente = inicioDeMes(1);

  document.getElementById("mes-nombre").textContent = new Date().toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  const [{ data: productos }, { data: ordenes }] = await Promise.all([
    sb.from("productos").select("*").eq("area", area).gte("creado_en", inicioMes).lt("creado_en", inicioMesSiguiente),
    sb.from("ordenes").select("*").eq("area", area).gte("creado_en", inicioMes).lt("creado_en", inicioMesSiguiente),
  ]);

  const valorInventarioMes = (productos || []).reduce((sum, p) => sum + Number(p.cantidad) * Number(p.precio), 0);
  const ordenesTerminadas = (ordenes || []).filter((o) => o.estado === "terminado").length;

  document.getElementById("stat-productos").textContent = (productos || []).length;
  document.getElementById("stat-valor").textContent = formatCurrency(valorInventarioMes);
  document.getElementById("stat-ordenes").textContent = `${ordenesTerminadas} / ${(ordenes || []).length}`;

  document.getElementById("btn-exportar-excel")?.addEventListener("click", () => {
    if (typeof XLSX === "undefined") return;
    const listaProductos = productos || [];
    const listaOrdenes = ordenes || [];

    const resumen = [
      ["Reporte del Mes", document.getElementById("mes-nombre").textContent],
      ["Área", AREAS[area]],
      [],
      ["Productos agregados", listaProductos.length],
      ["Valor agregado al inventario", valorInventarioMes],
      ["Órdenes terminadas", ordenesTerminadas],
      ["Órdenes totales", listaOrdenes.length],
    ];
    const hojaProductos = [
      ["Nombre", "Categoría", "Cantidad", "Precio"],
      ...listaProductos.map((p) => [p.nombre, p.categoria || "", p.cantidad, Number(p.precio)]),
    ];
    const hojaOrdenes = [
      ["Título", "Cliente", "Estado"],
      ...listaOrdenes.map((o) => [o.titulo, o.cliente || "", o.estado]),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), "Resumen");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hojaProductos), "Productos");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hojaOrdenes), "Órdenes");
    XLSX.writeFile(wb, `reporte-${area}.xlsx`);
  });

  document.getElementById("btn-imprimir")?.addEventListener("click", () => window.print());
}

// ---------- Usuario ----------

async function initUsuario(user) {
  const nombreInput = document.getElementById("usuario-nombre");
  const form = document.getElementById("form-usuario");
  const guardadoMsg = document.getElementById("usuario-guardado");

  const { data: profile } = await sb.from("profiles").select("nombre").eq("id", user.id).maybeSingle();
  nombreInput.value = profile?.nombre || "";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nombre = nombreInput.value.trim();
    const { error } = await sb.from("profiles").update({ nombre }).eq("id", user.id);
    if (error) {
      alert("No se pudo guardar: " + error.message);
      return;
    }
    document.getElementById("user-nombre").textContent = nombre;
    document.getElementById("user-avatar").textContent = nombre.slice(0, 2).toUpperCase();
    guardadoMsg.hidden = false;
    setTimeout(() => (guardadoMsg.hidden = true), 2000);
  });

  const [{ data: registroHoy }, { count: productosCount }, { count: ordenesActivasCount }] = await Promise.all([
    sb.from("jornada").select("*").eq("encargado_id", user.id).eq("fecha", todayKey()).maybeSingle(),
    sb.from("productos").select("*", { count: "exact", head: true }).eq("creado_por", user.id),
    sb.from("ordenes").select("*", { count: "exact", head: true }).eq("creado_por", user.id).neq("estado", "terminado"),
  ]);

  document.getElementById("resumen-estado-hoy").textContent = !registroHoy?.entrada
    ? "Sin marcar entrada"
    : !registroHoy?.salida
    ? "En jornada"
    : "Jornada finalizada";
  document.getElementById("resumen-productos").textContent = productosCount ?? 0;
  document.getElementById("resumen-ordenes").textContent = ordenesActivasCount ?? 0;
}

// ---------- Arranque ----------

async function main() {
  if (page === "login") {
    const { data: { session } } = await sb.auth.getSession();
    if (session) location.href = "index.html";
    else initLoginPage();
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    location.href = "login.html";
    return;
  }

  await populateHeader(session.user);
  wireLogout();

  sb.auth.onAuthStateChange((_event, nuevaSession) => {
    if (!nuevaSession) location.href = "login.html";
  });

  const paginasConArea = [
    "agregar-producto",
    "inventario",
    "banco-de-trabajo",
    "reporte-del-mes",
    "ventas",
    "reporte-ventas",
  ];
  let area = null;
  if (page === "area" || paginasConArea.includes(page)) {
    area = getAreaFromQuery();
    if (!area) {
      location.href = "index.html";
      return;
    }
  }

  if (page === "area") initArea(area);
  else if (page === "mi-jornada") await initMiJornada(session.user);
  else if (page === "usuario") await initUsuario(session.user);
  else if (paginasConArea.includes(page)) {
    initAreaTag(area);
    if (page === "agregar-producto") await initAgregarProducto(session.user, area);
    else if (page === "inventario") await initInventario(area);
    else if (page === "banco-de-trabajo") await initBancoDeTrabajo(session.user, area);
    else if (page === "reporte-del-mes") await initReporteDelMes(area);
    else if (page === "ventas") await initVentas(session.user, area);
    else if (page === "reporte-ventas") await initReporteVentas(area);
  }
}

main();
