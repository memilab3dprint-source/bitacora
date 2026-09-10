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
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
}

function inicioDeMes(offsetMeses = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMeses);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
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
    if (!nombre || !cantidad) return;

    const { error } = await sb.from("productos").insert({ nombre, categoria, cantidad, precio, area, creado_por: user.id });
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

  async function render() {
    const { data: productos } = await sb
      .from("productos")
      .select("*")
      .eq("area", area)
      .order("nombre", { ascending: true });

    body.innerHTML = productos?.length
      ? productos
          .map(
            (p) => `<tr>
              <td>${p.nombre}</td>
              <td>${p.categoria || "--"}</td>
              <td>${p.cantidad}</td>
              <td>${formatCurrency(p.precio)}</td>
              <td>${formatCurrency(p.cantidad * p.precio)}</td>
              <td><button class="btn btn-danger" data-id="${p.id}">Eliminar</button></td>
            </tr>`
          )
          .join("")
      : `<tr><td class="table-empty" colspan="6">No hay productos en el inventario todavía. <a href="agregar-producto.html?area=${area}">Agrega el primero</a>.</td></tr>`;

    const totalUnidades = (productos || []).reduce((sum, p) => sum + Number(p.cantidad), 0);
    const totalValor = (productos || []).reduce((sum, p) => sum + Number(p.cantidad) * Number(p.precio), 0);
    totalUnidadesEl.textContent = totalUnidades;
    totalValorEl.textContent = formatCurrency(totalValor);

    body.querySelectorAll("[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await sb.from("productos").delete().eq("id", btn.dataset.id);
        if (error) alert("No se pudo eliminar: " + error.message);
        await render();
      });
    });
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

function ventaRowHTML(v, { conFecha = false, conAcciones = true } = {}) {
  const beneficio = Number(v.precio_venta) - Number(v.costo);
  return `<tr>
    ${conFecha ? `<td>${v.fecha}</td>` : ""}
    <td>${v.descripcion}</td>
    <td>${v.cantidad}</td>
    <td>${formatCurrency(v.precio_venta)}</td>
    <td>${formatCurrency(v.costo)}</td>
    <td>${formatCurrency(beneficio)}</td>
    ${conAcciones ? `<td><button class="btn btn-danger" data-id="${v.id}">Eliminar</button></td>` : ""}
  </tr>`;
}

async function initVentas(user, area) {
  const form = document.getElementById("form-venta");
  const ventasHoyBody = document.getElementById("ventas-hoy");
  const ventasMesBody = document.getElementById("ventas-mes");
  const statFacturacion = document.getElementById("stat-facturacion");
  const statBeneficio = document.getElementById("stat-beneficio");
  const inicioMes = inicioDeMes(0);
  const inicioMesSiguiente = inicioDeMes(1);

  function wireDelete(container) {
    container.querySelectorAll("[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await sb.from("ventas").delete().eq("id", btn.dataset.id);
        if (error) alert("No se pudo eliminar: " + error.message);
        await render();
      });
    });
  }

  async function render() {
    const { data: hoy } = await sb
      .from("ventas")
      .select("*")
      .eq("area", area)
      .eq("fecha", todayKey())
      .order("creado_en", { ascending: true });

    ventasHoyBody.innerHTML = hoy?.length
      ? hoy.map((v) => ventaRowHTML(v)).join("")
      : `<tr><td class="table-empty" colspan="6">Todavía no hay ventas registradas hoy.</td></tr>`;
    wireDelete(ventasHoyBody);

    const { data: delMes } = await sb
      .from("ventas")
      .select("*")
      .eq("area", area)
      .gte("fecha", inicioMes)
      .lt("fecha", inicioMesSiguiente)
      .order("fecha", { ascending: false });

    ventasMesBody.innerHTML = delMes?.length
      ? delMes.map((v) => ventaRowHTML(v, { conFecha: true })).join("")
      : `<tr><td class="table-empty" colspan="7">Todavía no hay ventas este mes.</td></tr>`;
    wireDelete(ventasMesBody);

    const facturacion = (delMes || []).reduce((sum, v) => sum + Number(v.precio_venta), 0);
    const beneficio = (delMes || []).reduce((sum, v) => sum + (Number(v.precio_venta) - Number(v.costo)), 0);
    statFacturacion.textContent = formatCurrency(facturacion);
    statBeneficio.textContent = formatCurrency(beneficio);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const descripcion = document.getElementById("venta-descripcion").value.trim();
    const cantidad = Number(document.getElementById("venta-cantidad").value) || 1;
    const precio_venta = Number(document.getElementById("venta-precio").value);
    const costo = Number(document.getElementById("venta-costo").value) || 0;
    if (!descripcion || !precio_venta) return;

    const { error } = await sb
      .from("ventas")
      .insert({ area, descripcion, cantidad, precio_venta, costo, fecha: todayKey(), creado_por: user.id });
    if (error) {
      alert("No se pudo registrar la venta: " + error.message);
      return;
    }
    form.reset();
    document.getElementById("venta-cantidad").value = 1;
    await render();
  });

  await render();

  sb.channel(`ventas-${area}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "ventas", filter: `area=eq.${area}` }, render)
    .subscribe();
}

// ---------- Reporte de Ventas (Reporte del Mes de Ecommerce MercadoLibre / Dropshipping) ----------

async function initReporteVentas(area) {
  const inicioMes = inicioDeMes(0);
  const inicioMesSiguiente = inicioDeMes(1);
  const ahora = new Date();
  const diasEnMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();

  document.getElementById("mes-nombre").textContent = new Date().toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  const { data: ventas } = await sb
    .from("ventas")
    .select("*")
    .eq("area", area)
    .gte("fecha", inicioMes)
    .lt("fecha", inicioMesSiguiente)
    .order("fecha", { ascending: false });

  const lista = ventas || [];
  const facturacion = lista.reduce((sum, v) => sum + Number(v.precio_venta), 0);
  const beneficio = lista.reduce((sum, v) => sum + (Number(v.precio_venta) - Number(v.costo)), 0);

  document.getElementById("stat-facturacion").textContent = formatCurrency(facturacion);
  document.getElementById("stat-beneficio").textContent = formatCurrency(beneficio);
  document.getElementById("stat-ventas").textContent = lista.length;

  document.getElementById("historial-ventas").innerHTML = lista.length
    ? lista.map((v) => ventaRowHTML(v, { conFecha: true, conAcciones: false })).join("")
    : `<tr><td class="table-empty" colspan="6">Todavía no hay ventas este mes.</td></tr>`;

  const porDia = Array.from({ length: diasEnMes }, () => ({ facturacion: 0, beneficio: 0 }));
  lista.forEach((v) => {
    const dia = Number(v.fecha.slice(8, 10)) - 1;
    if (porDia[dia]) {
      porDia[dia].facturacion += Number(v.precio_venta);
      porDia[dia].beneficio += Number(v.precio_venta) - Number(v.costo);
    }
  });

  new Chart(document.getElementById("grafica-ventas"), {
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
