/* =============================================================
   MENTOR FINANCIERO — Bola de Nieve (Estrategia Híbrida)
   Hecho para Toño. Datos guardados localmente (localStorage).
   ============================================================= */

const STORAGE_KEY = 'mentor_financiero_v1';

// Estructura por defecto
const datosVacios = {
  perfil: { moneda: 'USD', estrategia: 'hibrida' },
  ingresos: [],
  gastosFijos: [],
  gastosVariables: [],
  deudas: [],
  fondo: { meta: 3, actual: 0 },
  pagos: [],
};

let state = cargar();

// ====== PERSISTENCIA ======
function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(datosVacios));
    return Object.assign(JSON.parse(JSON.stringify(datosVacios)), JSON.parse(raw));
  } catch (e) {
    return JSON.parse(JSON.stringify(datosVacios));
  }
}
function guardar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ====== UTILIDADES ======
const fmt = (n) =>
  '$' + (Math.round((n || 0) * 100) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const pct = (n) => (n * 100).toFixed(1) + '%';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// Mes actual en formato "YYYY-MM" — sirve para resetear los checks de pagado cada mes
const mesActual = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};
const estaPagado = (item) => item && item.pagadoEn === mesActual();

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ====== TOTALES ======
function totalIngresosMensual() {
  return state.ingresos.reduce((s, i) => s + Number(i.monto || 0), 0);
}
function totalGastosFijos() {
  return state.gastosFijos.reduce((s, g) => s + Number(g.monto || 0), 0);
}
function totalGastosVariables() {
  return state.gastosVariables.reduce((s, g) => s + Number(g.monto || 0), 0);
}
function totalGastos() {
  return totalGastosFijos() + totalGastosVariables();
}
function totalDeudas() {
  return state.deudas.reduce((s, d) => s + Number(d.montoActual || 0), 0);
}
function totalPagosMinimos() {
  return state.deudas.reduce((s, d) => s + Number(d.pagoMinimo || 0), 0);
}
function tasaPromedio() {
  const total = totalDeudas();
  if (total === 0) return 0;
  const ponderada = state.deudas.reduce(
    (s, d) => s + Number(d.montoActual || 0) * Number(d.tasaAnual || 0),
    0
  );
  return ponderada / total;
}
function flujoLibre() {
  return totalIngresosMensual() - totalGastos() - totalPagosMinimos();
}

// ====== ESTRATEGIA HÍBRIDA ======
// Una deuda es "atacable" si permite abonos/pagos extra. Las de cuota fija (algunos
// créditos bancarios) no — solo se paga la cuota, el extra se redirige a otras.
function esAtacable(d) {
  return d.permitePagoExtra !== false;
}

function ordenarDeudas() {
  const e = state.perfil.estrategia || 'hibrida';
  const deudas = [...state.deudas].filter((d) => Number(d.montoActual) > 0);
  const atacables = deudas.filter(esAtacable);
  const fijas = deudas.filter((d) => !esAtacable(d));

  let ordenadas;
  if (e === 'avalancha') {
    ordenadas = atacables.sort((a, b) => b.tasaAnual - a.tasaAnual);
  } else if (e === 'bola') {
    ordenadas = atacables.sort((a, b) => a.montoActual - b.montoActual);
  } else {
    const altas = atacables.filter((d) => Number(d.tasaAnual) > 25).sort((a, b) => b.tasaAnual - a.tasaAnual);
    const resto = atacables.filter((d) => Number(d.tasaAnual) <= 25).sort((a, b) => a.montoActual - b.montoActual);
    ordenadas = [...altas, ...resto];
  }
  // Las deudas de cuota fija van al final (no se atacan, solo se pagan)
  const ordenadasFijas = fijas.sort((a, b) => a.montoActual - b.montoActual);
  return [...ordenadas, ...ordenadasFijas];
}

// Solo las deudas que SÍ admiten pago extra, en orden de prioridad
function deudasAtacables() {
  return ordenarDeudas().filter(esAtacable);
}

// ====== SEMÁFORO MENTOR ======
function calcularSalud() {
  const ingreso = totalIngresosMensual();
  const fijos = totalGastosFijos();
  const variables = totalGastosVariables();
  const deuda = totalDeudas();
  const libre = flujoLibre();
  const tasaProm = tasaPromedio();
  const fondoMeses = ingreso > 0 ? state.fondo.actual / (fijos + variables || 1) : 0;
  const ind = [];

  const rFijos = ingreso > 0 ? fijos / ingreso : 0;
  ind.push({
    nombre: 'Gastos fijos vs ingresos',
    valor: pct(rFijos),
    color: rFijos < 0.5 ? 'green' : rFijos < 0.65 ? 'yellow' : 'red',
    ideal: '< 50%',
    consejo:
      rFijos >= 0.65
        ? 'Tus gastos fijos comen más del 65% de tu ingreso. Necesitas reducir alguno (renegociar renta, eliminar suscripciones, mover plan telefónico).'
        : rFijos >= 0.5
        ? 'Tus gastos fijos están en zona ajustada. Revisa qué fijos puedes recortar sin afectar tu calidad de vida.'
        : 'Tus gastos fijos están bajo control.',
  });

  const rLibre = ingreso > 0 ? libre / ingreso : 0;
  ind.push({
    nombre: 'Flujo libre (después de mínimos)',
    valor: pct(rLibre),
    color: rLibre > 0.2 ? 'green' : rLibre > 0.1 ? 'yellow' : 'red',
    ideal: '> 20%',
    consejo:
      rLibre <= 0.1
        ? 'Casi no te queda nada después de pagar mínimos. Esto es señal de alarma: cualquier imprevisto te empuja a más deuda. Reduce gastos antes que nada.'
        : rLibre <= 0.2
        ? 'Tienes un margen, pero ajustado. Cada dólar extra que liberes acelera tu salida de deudas.'
        : 'Excelente flujo libre — tienes munición para atacar deudas y ahorrar.',
  });

  const rDeuda = ingreso > 0 ? deuda / (ingreso * 12) : 0;
  ind.push({
    nombre: 'Deuda total vs ingreso anual',
    valor: pct(rDeuda),
    color: rDeuda < 0.3 ? 'green' : rDeuda < 0.5 ? 'yellow' : 'red',
    ideal: '< 30%',
    consejo:
      rDeuda >= 0.5
        ? 'Tu nivel de deuda es alto comparado con lo que ganas. Toma esto en serio: no más deudas nuevas hasta bajar este indicador.'
        : rDeuda >= 0.3
        ? 'Nivel de deuda manejable pero notable. Mantén el plan y verás cómo cae mes a mes.'
        : 'Tu carga de deuda está controlada.',
  });

  ind.push({
    nombre: 'Tasa promedio de tus deudas',
    valor: tasaProm.toFixed(1) + '% anual',
    color: tasaProm < 15 ? 'green' : tasaProm < 25 ? 'yellow' : 'red',
    ideal: '< 15%',
    consejo:
      tasaProm >= 25
        ? 'Tus deudas tienen tasas muy altas (tarjetas/chulqueros). La estrategia híbrida las pondrá primero. Cada mes que pasa cuestan caro.'
        : tasaProm >= 15
        ? 'Tasas de deuda intermedias. Considera consolidar si encuentras una opción a menor interés.'
        : 'Tus tasas de interés son razonables.',
  });

  ind.push({
    nombre: 'Fondo de emergencia',
    valor: fondoMeses.toFixed(1) + ' meses de gastos',
    color: fondoMeses >= 3 ? 'green' : fondoMeses >= 1 ? 'yellow' : 'red',
    ideal: '≥ 3 meses (mientras hay deudas, al menos $500–$1.000)',
    consejo:
      fondoMeses < 1
        ? 'Antes de pagar deuda agresivamente, junta al menos $500–$1.000 de emergencia. Sin colchón, cualquier imprevisto te endeuda más.'
        : fondoMeses < 3
        ? 'Buen avance. Llega a 3 meses de gastos. Mientras tanto, sigue con tu plan de deudas.'
        : 'Fondo de emergencia sólido.',
  });

  const reds = ind.filter((i) => i.color === 'red').length;
  const yellows = ind.filter((i) => i.color === 'yellow').length;
  let color, texto;
  if (reds >= 2) {
    color = 'red';
    texto = 'Crítico — Atención inmediata';
  } else if (reds === 1 || yellows >= 2) {
    color = 'yellow';
    texto = 'Atención — Hay alertas';
  } else {
    color = 'green';
    texto = 'Saludable — Buen camino';
  }
  return { color, texto, indicadores: ind, ingreso, libre, deuda, fondoMeses };
}

// ====== CONSEJOS PERSONALIZADOS ======
function generarConsejos(salud) {
  const out = [];
  const ingreso = totalIngresosMensual();
  const libre = flujoLibre();
  const deuda = totalDeudas();
  const fondoMeses = salud.fondoMeses;
  const ordenadas = ordenarDeudas();
  const tasasAltas = state.deudas.filter((d) => d.tasaAnual > 25 && d.montoActual > 0);

  if (ingreso === 0) {
    out.push({
      tipo: 'info',
      ico: '👋',
      titulo: 'Empieza por aquí',
      msg: 'Registra primero tus ingresos mensuales para que pueda analizarte. Ve a la pestaña Ingresos.',
    });
    return out;
  }

  if (libre < 0) {
    out.push({
      tipo: 'red',
      ico: '🚨',
      titulo: 'Estás gastando más de lo que ganas',
      msg: 'Tus gastos + pagos mínimos superan tus ingresos. Esto crea deuda nueva cada mes. Antes que nada, encuentra qué recortar — empieza por gastos variables.',
    });
  }
  if (fondoMeses < 0.5 && deuda > 0) {
    out.push({
      tipo: 'yellow',
      ico: '🛡️',
      titulo: 'Construye un mini-fondo primero',
      msg: 'Antes de poner todo el flujo libre en deudas, separa $500–$1.000 como colchón. Esto evita que un imprevisto te haga retomar tarjetas.',
    });
  }
  if (tasasAltas.length > 0) {
    out.push({
      tipo: 'red',
      ico: '🔥',
      titulo: 'Tienes deudas a tasas altas (>25% anual)',
      msg: `Estas deudas son las que más te cuestan: ${tasasAltas
        .map((d) => d.nombre)
        .join(', ')}. La estrategia híbrida las prioriza. Cada $10 extra que les pongas, te ahorra mucho a fin de año.`,
    });
  }
  if (ordenadas.length > 0 && libre > 0) {
    const prox = ordenadas[0];
    const extraSugerido = Math.max(0, libre * 0.7);
    out.push({
      tipo: 'info',
      ico: '🎯',
      titulo: `Tu próxima deuda a cerrar: ${prox.nombre}`,
      msg: `Sugiero que destines ${fmt(extraSugerido)} este mes a esta deuda además del pago mínimo. Eso es ~70% de tu flujo libre. El otro 30% al fondo de emergencia hasta llegar a $1.000.`,
    });
  }
  if (deuda === 0 && ingreso > 0) {
    out.push({
      tipo: 'green',
      ico: '🎉',
      titulo: '¡Libre de deudas!',
      msg: `Felicitaciones Toño. Ahora apunta a 6 meses de fondo de emergencia (${fmt(
        6 * totalGastos()
      )}) y luego empieza a invertir 15–20% de tus ingresos.`,
    });
  }
  const rFijos = ingreso > 0 ? totalGastosFijos() / ingreso : 0;
  if (rFijos > 0.65) {
    out.push({
      tipo: 'yellow',
      ico: '🏠',
      titulo: 'Tus gastos fijos son altos',
      msg: 'Si más del 65% de tu ingreso se va en gastos fijos, vas a tener poco margen sin importar cuánto recortes los variables. Considera renegociar renta, cambiar plan telefónico, eliminar suscripciones que no usas.',
    });
  }
  if (libre > ingreso * 0.3 && deuda > 0) {
    out.push({
      tipo: 'green',
      ico: '🚀',
      titulo: 'Tienes excelente flujo libre',
      msg: 'Si pones la mayoría a las deudas, vas a salir rápido. Considera incluso meses agresivos (80% a deuda) si tu fondo de emergencia ya está sólido.',
    });
  }
  if (out.length === 0) {
    out.push({
      tipo: 'green',
      ico: '👍',
      titulo: 'Estás en buen camino',
      msg: 'Sigue ejecutando el plan del mes. La constancia es la clave.',
    });
  }
  return out;
}

// ====== AMORTIZACIÓN / SIMULACIÓN ======
function mesesParaPagar(saldo, tasaAnual, pagoMensual) {
  if (pagoMensual <= 0) return Infinity;
  const r = tasaAnual / 100 / 12;
  if (r === 0) return Math.ceil(saldo / pagoMensual);
  const interesMensual = saldo * r;
  if (pagoMensual <= interesMensual) return Infinity;
  return Math.ceil(Math.log(pagoMensual / (pagoMensual - saldo * r)) / Math.log(1 + r));
}

function simularPagoTotal(extraMensual) {
  let deudas = ordenarDeudas().map((d) => ({ ...d }));
  let mes = 0;
  let interesAcumulado = 0;
  const MAX = 600;

  while (deudas.length > 0 && mes < MAX) {
    mes++;
    let extraPool = extraMensual;

    for (const d of deudas) {
      const r = (d.tasaAnual || 0) / 100 / 12;
      const interes = d.montoActual * r;
      interesAcumulado += interes;
      d.montoActual += interes;
    }
    for (const d of deudas) {
      const pago = Math.min(d.pagoMinimo || 0, d.montoActual);
      d.montoActual -= pago;
    }
    // El pago extra SOLO se distribuye entre deudas atacables (en orden de prioridad).
    // Las de cuota fija nunca reciben extra — solo su cuota mínima.
    const atacables = deudas.filter(esAtacable);
    let i = 0;
    while (extraPool > 0.01 && i < atacables.length) {
      const pago = Math.min(extraPool, atacables[i].montoActual);
      atacables[i].montoActual -= pago;
      extraPool -= pago;
      i++;
    }
    deudas = deudas.filter((d) => d.montoActual > 0.01);
  }
  return { meses: mes, interesPagado: interesAcumulado, terminado: deudas.length === 0 };
}

// ====== QUINCENAS ======
function montoEnQuincena(item, q, tipo) {
  const m = Number(item.monto || item.pagoMinimo || 0);
  if (m === 0) return 0;

  if (tipo === 'variable') {
    if (item.asignacion === 'q1') return q === 'q1' ? m : 0;
    if (item.asignacion === 'q2') return q === 'q2' ? m : 0;
    return m / 2;
  }
  if (!item.diaMes) return m / 2;
  if (q === 'q1' && item.diaMes <= 15) return m;
  if (q === 'q2' && item.diaMes >= 16) return m;
  return 0;
}

function resumenQuincena(q) {
  const ingresos = state.ingresos.reduce((s, i) => s + montoEnQuincena(i, q, 'ingreso'), 0);
  const fijos = state.gastosFijos.reduce((s, g) => s + montoEnQuincena(g, q, 'fijo'), 0);
  const variables = state.gastosVariables.reduce((s, g) => s + montoEnQuincena(g, q, 'variable'), 0);
  const deudasMin = state.deudas.reduce(
    (s, d) => s + montoEnQuincena({ monto: d.pagoMinimo, diaMes: d.diaMes }, q, 'deuda'),
    0
  );
  const flujo = ingresos - fijos - variables - deudasMin;

  const ingresosDet = state.ingresos
    .filter((i) => montoEnQuincena(i, q, 'ingreso') > 0)
    .map((i) => ({ nombre: i.nombre, monto: montoEnQuincena(i, q, 'ingreso'), dia: i.diaMes }));
  const fijosDet = state.gastosFijos
    .filter((g) => montoEnQuincena(g, q, 'fijo') > 0)
    .map((g) => ({ nombre: g.nombre, monto: montoEnQuincena(g, q, 'fijo'), dia: g.diaMes }));
  const variablesDet = state.gastosVariables
    .filter((g) => montoEnQuincena(g, q, 'variable') > 0)
    .map((g) => ({ nombre: g.nombre, monto: montoEnQuincena(g, q, 'variable') }));
  const deudasDet = state.deudas
    .filter((d) => montoEnQuincena({ monto: d.pagoMinimo, diaMes: d.diaMes }, q, 'deuda') > 0)
    .map((d) => ({
      nombre: d.nombre,
      monto: montoEnQuincena({ monto: d.pagoMinimo, diaMes: d.diaMes }, q, 'deuda'),
      dia: d.diaMes,
      tasa: d.tasaAnual,
    }));
  return { ingresos, fijos, variables, deudasMin, flujo, ingresosDet, fijosDet, variablesDet, deudasDet };
}

function renderQuincenas() {
  const q1 = resumenQuincena('q1');
  const q2 = resumenQuincena('q2');
  const el1 = document.getElementById('resumenQ1');
  const el2 = document.getElementById('resumenQ2');
  if (!el1 || !el2) return;
  el1.innerHTML = renderQuincenaCard(q1, 'q1');
  el2.innerHTML = renderQuincenaCard(q2, 'q2');

  const sinDia = [];
  state.ingresos.forEach((i) => {
    if (!i.diaMes && i.monto > 0) sinDia.push({ tipo: 'Ingreso', nombre: i.nombre, monto: i.monto });
  });
  state.gastosFijos.forEach((g) => {
    if (!g.diaMes && g.monto > 0) sinDia.push({ tipo: 'Gasto fijo', nombre: g.nombre, monto: g.monto });
  });
  state.deudas.forEach((d) => {
    if (!d.diaMes && d.pagoMinimo > 0) sinDia.push({ tipo: 'Deuda', nombre: d.nombre, monto: d.pagoMinimo });
  });

  const el = document.getElementById('sinDia');
  if (!el) return;
  if (sinDia.length === 0) {
    el.innerHTML = '<div class="empty" style="padding:14px 0;">✅ Todo asignado a una fecha.</div>';
  } else {
    el.innerHTML = sinDia
      .map(
        (x) => `
      <div class="card-row">
        <span class="label">${x.tipo} — ${escapar(x.nombre)}</span>
        <span class="value">${fmt(x.monto)}</span>
      </div>`
      )
      .join('');
  }
}

function renderQuincenaCard(r, q) {
  const colorFlujo = r.flujo < 0 ? 'red' : r.flujo < r.ingresos * 0.1 ? 'yellow' : 'green';
  const ingHTML = r.ingresosDet.length
    ? r.ingresosDet
        .map(
          (i) =>
            `<div class="q-line"><span class="lbl">+ ${escapar(i.nombre)}${
              i.dia ? ` <small style="color:var(--text-muted)">(día ${i.dia})</small>` : ''
            }</span><span class="val green">${fmt(i.monto)}</span></div>`
        )
        .join('')
    : '<div class="hint">— Sin ingresos en esta quincena —</div>';

  const fijHTML = r.fijosDet.length
    ? r.fijosDet
        .map(
          (i) =>
            `<div class="q-line"><span class="lbl">− ${escapar(i.nombre)}${
              i.dia ? ` <small style="color:var(--text-muted)">(día ${i.dia})</small>` : ''
            }</span><span class="val">${fmt(i.monto)}</span></div>`
        )
        .join('')
    : '<div class="hint">— Sin gastos fijos —</div>';

  const varHTML = r.variablesDet.length
    ? r.variablesDet
        .map(
          (i) =>
            `<div class="q-line"><span class="lbl">− ${escapar(i.nombre)}</span><span class="val">${fmt(
              i.monto
            )}</span></div>`
        )
        .join('')
    : '<div class="hint">— Sin variables —</div>';

  const deuHTML = r.deudasDet.length
    ? r.deudasDet
        .map(
          (i) =>
            `<div class="q-line"><span class="lbl">− ${escapar(i.nombre)}${
              i.tasa > 25 ? ' 🔥' : ''
            }${
              i.dia ? ` <small style="color:var(--text-muted)">(día ${i.dia})</small>` : ''
            }</span><span class="val">${fmt(i.monto)}</span></div>`
        )
        .join('')
    : '<div class="hint">— Sin pagos mínimos de deuda aquí —</div>';

  let planHTML = '';
  if (r.flujo > 0) {
    const ordenadas = ordenarDeudas();
    const gastoMensual = totalGastos();
    const fondoBase = Math.min(1000, state.fondo.meta * gastoMensual);
    let aDeuda, aFondo, aOcio;
    if (state.fondo.actual < fondoBase) {
      aFondo = r.flujo * 0.6;
      aDeuda = r.flujo * 0.3;
      aOcio = r.flujo * 0.1;
    } else if (ordenadas.length > 0) {
      aDeuda = r.flujo * 0.7;
      aFondo = r.flujo * 0.2;
      aOcio = r.flujo * 0.1;
    } else {
      aDeuda = 0;
      aFondo = r.flujo * 0.7;
      aOcio = r.flujo * 0.3;
    }
    planHTML = `
      <div class="q-plan">
        <div class="q-section-title">💡 Plan sugerido (${q.toUpperCase()})</div>
        ${
          aDeuda > 0 && ordenadas.length > 0
            ? `<div class="q-plan-item"><span class="lbl">🎯 Extra a ${escapar(ordenadas[0].nombre)}</span><span class="val">${fmt(aDeuda)}</span></div>`
            : ''
        }
        ${aFondo > 0 ? `<div class="q-plan-item"><span class="lbl">🛡️ Al fondo de emergencia</span><span class="val">${fmt(aFondo)}</span></div>` : ''}
        ${aOcio > 0 ? `<div class="q-plan-item"><span class="lbl">😌 Para ti / calidad de vida</span><span class="val">${fmt(aOcio)}</span></div>` : ''}
      </div>
    `;
  } else if (r.flujo < 0) {
    planHTML = `
      <div class="q-plan">
        <div class="advice red" style="margin-bottom:0;">
          <span class="ico">⚠️</span>
          <div class="msg">
            <strong>Déficit en esta quincena</strong>
            <span>Tus pagos + gastos superan los ingresos de la quincena por ${fmt(
              Math.abs(r.flujo)
            )}. Necesitas: (a) ahorrar de la otra quincena, (b) mover algún pago o ingreso, o (c) reducir gastos variables.</span>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="q-section">
      <div class="q-section-title">Ingresos</div>
      ${ingHTML}
      <div class="q-line" style="border-top:1px dashed var(--border);padding-top:6px;margin-top:6px;">
        <span class="lbl"><strong>Subtotal</strong></span>
        <span class="val green"><strong>${fmt(r.ingresos)}</strong></span>
      </div>
    </div>
    <div class="q-section">
      <div class="q-section-title">Gastos fijos</div>
      ${fijHTML}
      <div class="q-line" style="border-top:1px dashed var(--border);padding-top:6px;margin-top:6px;">
        <span class="lbl"><strong>Subtotal</strong></span>
        <span class="val"><strong>${fmt(r.fijos)}</strong></span>
      </div>
    </div>
    <div class="q-section">
      <div class="q-section-title">Pagos mínimos de deuda</div>
      ${deuHTML}
      <div class="q-line" style="border-top:1px dashed var(--border);padding-top:6px;margin-top:6px;">
        <span class="lbl"><strong>Subtotal</strong></span>
        <span class="val"><strong>${fmt(r.deudasMin)}</strong></span>
      </div>
    </div>
    <div class="q-section">
      <div class="q-section-title">Gastos variables (presup.)</div>
      ${varHTML}
      <div class="q-line" style="border-top:1px dashed var(--border);padding-top:6px;margin-top:6px;">
        <span class="lbl"><strong>Subtotal</strong></span>
        <span class="val"><strong>${fmt(r.variables)}</strong></span>
      </div>
    </div>

    <div class="q-flujo">
      <div class="q-flujo-label">Flujo libre ${q.toUpperCase()}</div>
      <div class="q-flujo-val ${colorFlujo}">${fmt(r.flujo)}</div>
    </div>

    ${planHTML}
  `;
}

// ====== RENDER PRINCIPAL ======
function render() {
  const salud = calcularSalud();
  renderHeader(salud);
  renderDashboard(salud);
  renderQuincenas();
  renderIngresos();
  renderGastos();
  renderDeudas();
  renderMentor(salud);
  recalcularSimulador();
  recalcularFondo();
}

function renderHeader(salud) {
  const pill = document.getElementById('saludGeneral');
  pill.innerHTML = `<span class="dot ${salud.color}"></span> <span>${salud.texto}</span>`;
}

function renderDashboard(salud) {
  const ingreso = totalIngresosMensual();
  const gasto = totalGastos();
  const deuda = totalDeudas();
  const libre = flujoLibre();

  document.getElementById('statIngresos').textContent = fmt(ingreso);
  document.getElementById('statGastos').textContent = fmt(gasto);
  document.getElementById('statDeudas').textContent = fmt(deuda);
  document.getElementById('statFlujo').textContent = fmt(libre);

  const flujoSub = document.getElementById('statFlujoSub');
  if (libre < 0) {
    flujoSub.textContent = '⚠️ Negativo — déficit';
    flujoSub.style.color = 'var(--red)';
  } else if (libre < ingreso * 0.1) {
    flujoSub.textContent = 'Ajustado';
    flujoSub.style.color = 'var(--yellow)';
  } else {
    flujoSub.textContent = 'Para deuda/ahorro';
    flujoSub.style.color = '';
  }

  document.getElementById('trafficLightContainer').innerHTML = `
    <div class="traffic-light">
      <div class="big-dot ${salud.color}"></div>
      <div class="info">
        <h3>${salud.texto}</h3>
        <p>Tu mentor calcula tu salud financiera con 5 indicadores. Mira el detalle en la pestaña Mentor.</p>
      </div>
    </div>
  `;

  const atacables = deudasAtacables();
  const hayDeudas = state.deudas.some((d) => Number(d.montoActual) > 0);
  const proxEl = document.getElementById('proximaDeuda');
  if (!hayDeudas) {
    proxEl.innerHTML = '<div class="empty"><div class="ico">🎉</div>No tienes deudas registradas. ¡Eso o aún no las has añadido!</div>';
  } else if (atacables.length === 0) {
    proxEl.innerHTML = `
      <div class="advice info">
        <span class="ico">🔒</span>
        <div class="msg">
          <strong>Todas tus deudas son de cuota fija</strong>
          <span>No admiten abonos extra, así que no hay una "deuda a atacar" — solo pagas sus cuotas cada mes. Usa tu flujo libre para el fondo de emergencia y ahorro.</span>
        </div>
      </div>
    `;
  } else {
    const p = atacables[0];
    proxEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div>
          <div style="font-weight:700;font-size:16px;">${escapar(p.nombre)}</div>
          <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">
            Tasa ${Number(p.tasaAnual).toFixed(1)}% anual • Mínimo ${fmt(p.pagoMinimo)}
          </div>
        </div>
        <span class="badge priority">Prioridad 1</span>
      </div>
      <div class="card-row">
        <span class="label">Saldo actual</span>
        <span class="value">${fmt(p.montoActual)}</span>
      </div>
      <div class="card-row">
        <span class="label">Pago sugerido este mes</span>
        <span class="value green">${fmt(Math.min(p.montoActual, (p.pagoMinimo || 0) + Math.max(0, libre * 0.7)))}</span>
      </div>
      <p class="hint">Mínimo ${fmt(p.pagoMinimo)} + extra de ${fmt(Math.max(0, libre * 0.7))} (70% de tu flujo libre).</p>
    `;
  }

  const gastoMensual = totalGastos();
  const metaMonto = state.fondo.meta * gastoMensual;
  const progreso = metaMonto > 0 ? Math.min(100, (state.fondo.actual / metaMonto) * 100) : 0;
  const colorBar = progreso >= 80 ? '' : progreso >= 40 ? 'yellow' : 'red';

  document.getElementById('fondoEmergenciaResumen').innerHTML = `
    <div class="card-row">
      <span class="label">Tengo ahorrado</span>
      <span class="value">${fmt(state.fondo.actual)}</span>
    </div>
    <div class="card-row">
      <span class="label">Meta (${state.fondo.meta} ${state.fondo.meta === 1 ? 'mes' : 'meses'} de gastos)</span>
      <span class="value">${fmt(metaMonto)}</span>
    </div>
    <div class="progress-bar"><div class="progress-fill ${colorBar}" style="width:${progreso}%"></div></div>
    <p class="hint" style="margin-top:8px;">${progreso.toFixed(0)}% completado. ${
    progreso < 40
      ? 'Prioriza llegar a $500–$1.000 mínimo.'
      : progreso < 100
      ? 'Sigue aportando poco a poco mientras pagas deudas.'
      : '¡Fondo completo! Ahora puedes ir 100% contra las deudas.'
  }</p>
  `;

  renderPlanMes(libre);
  renderResumenQuincenalDashboard();
}

function renderResumenQuincenalDashboard() {
  let cont = document.getElementById('miniQuincenas');
  const planCard = document.getElementById('planMes')?.closest('.card');
  if (!planCard) return;
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'miniQuincenas';
    cont.className = 'card';
    planCard.parentNode.insertBefore(cont, planCard);
  }
  const q1 = resumenQuincena('q1');
  const q2 = resumenQuincena('q2');
  const colorQ = (f) => (f < 0 ? 'red' : f < 50 ? 'yellow' : 'green');
  cont.innerHTML = `
    <h2>📅 Vista rápida por quincena</h2>
    <div class="card-row">
      <span class="label"><span class="dot ${colorQ(q1.flujo)}"></span> Q1 (días 1-15)</span>
      <span class="value ${colorQ(q1.flujo)}">${fmt(q1.flujo)} libre</span>
    </div>
    <div class="card-row">
      <span class="label"><span class="dot ${colorQ(q2.flujo)}"></span> Q2 (días 16-31)</span>
      <span class="value ${colorQ(q2.flujo)}">${fmt(q2.flujo)} libre</span>
    </div>
    <button class="btn btn-secondary btn-full" style="margin-top:10px;" onclick="cambiarVista('quincenas')">Ver detalle quincenal →</button>
  `;
}

function renderPlanMes(libre) {
  const cont = document.getElementById('planMes');
  if (totalIngresosMensual() === 0) {
    cont.innerHTML = '<div class="empty"><div class="ico">📝</div>Registra primero tus ingresos y gastos.</div>';
    return;
  }
  if (libre <= 0) {
    cont.innerHTML = `
      <div class="advice red">
        <span class="ico">⚠️</span>
        <div class="msg">
          <strong>Tu flujo libre es ${fmt(libre)}</strong>
          <span>No tienes nada después de gastos + mínimos. Antes de hacer un plan de ataque, necesitas recortar gastos. Empieza revisando los variables (comida, ocio, suscripciones).</span>
        </div>
      </div>
    `;
    return;
  }

  const gastoMensual = totalGastos();
  const fondoFaltante = Math.max(0, state.fondo.meta * gastoMensual - state.fondo.actual);
  const ordenadas = deudasAtacables();
  let aDeuda, aFondo, aOcio;
  const fondoBase = Math.min(1000, state.fondo.meta * gastoMensual);
  if (state.fondo.actual < fondoBase && fondoFaltante > 0) {
    aFondo = libre * 0.6;
    aDeuda = libre * 0.3;
    aOcio = libre * 0.1;
  } else if (fondoFaltante > 0 && ordenadas.length > 0) {
    aDeuda = libre * 0.7;
    aFondo = libre * 0.2;
    aOcio = libre * 0.1;
  } else if (ordenadas.length > 0) {
    aDeuda = libre * 0.85;
    aFondo = 0;
    aOcio = libre * 0.15;
  } else {
    aDeuda = 0;
    aFondo = libre * 0.7;
    aOcio = libre * 0.3;
  }

  cont.innerHTML = `
    ${aDeuda > 0 ? `
      <div class="advice info">
        <span class="ico">🎯</span>
        <div class="msg">
          <strong>${fmt(aDeuda)} → ${escapar(ordenadas[0]?.nombre || 'Deuda prioritaria')}</strong>
          <span>Esto es además del pago mínimo (${fmt(ordenadas[0]?.pagoMinimo || 0)}). Total a esa deuda: ${fmt(aDeuda + (ordenadas[0]?.pagoMinimo || 0))}.</span>
        </div>
      </div>` : ''}
    ${aFondo > 0 ? `
      <div class="advice yellow">
        <span class="ico">🛡️</span>
        <div class="msg">
          <strong>${fmt(aFondo)} → Fondo de emergencia</strong>
          <span>Acércate a tu meta de ${fmt(state.fondo.meta * gastoMensual)}. ${state.fondo.actual < fondoBase ? 'Aún no tienes colchón mínimo, por eso prioriza esto.' : 'Sigue alimentándolo poco a poco.'}</span>
        </div>
      </div>` : ''}
    ${aOcio > 0 ? `
      <div class="advice green">
        <span class="ico">😌</span>
        <div class="msg">
          <strong>${fmt(aOcio)} → Para ti / calidad de vida</strong>
          <span>Importante. Los planes que reprimen todo gusto fracasan. Date algo pequeño sin culpa.</span>
        </div>
      </div>` : ''}
    <p class="hint" style="margin-top:8px;">Total del plan: ${fmt(aDeuda + aFondo + aOcio)} (tu flujo libre completo). Tú decides si seguir esta repartición o ajustarla.</p>
  `;
}

// ====== INGRESOS ======
function renderIngresos() {
  const lista = document.getElementById('listaIngresos');
  if (state.ingresos.length === 0) {
    lista.innerHTML = '<div class="empty"><div class="ico">💵</div>Aún no has añadido ingresos.</div>';
  } else {
    lista.innerHTML = state.ingresos
      .map(
        (i) => `
      <li class="item">
        <div class="item-info">
          <div class="item-name">${escapar(i.nombre)}</div>
          <div class="item-meta">${i.tipo === 'fijo' ? 'Recurrente' : 'Variable'}${
            i.diaMes ? ` • Día ${i.diaMes} (${i.diaMes <= 15 ? 'Q1' : 'Q2'})` : ' • Sin día'
          }</div>
        </div>
        <div class="item-amount">${fmt(i.monto)}</div>
        <div class="item-actions">
          <button class="icon-btn" onclick="abrirModalIngreso('${i.id}')">✏️</button>
          <button class="icon-btn" onclick="eliminarIngreso('${i.id}')">🗑️</button>
        </div>
      </li>
    `
      )
      .join('');
  }
  document.getElementById('totalIngresos').textContent = fmt(totalIngresosMensual());
}

function abrirModalIngreso(id) {
  const ing = id ? state.ingresos.find((x) => x.id === id) : null;
  abrirModal(
    ing ? 'Editar ingreso' : 'Agregar ingreso',
    `
    <div class="field">
      <label>Nombre del ingreso</label>
      <input id="ingNombre" placeholder="Ej: Salario, Freelance" value="${ing ? escapar(ing.nombre) : ''}" />
    </div>
    <div class="field">
      <label>Monto (USD)</label>
      <input id="ingMonto" type="number" min="0" step="1" placeholder="0" value="${ing ? ing.monto : ''}" />
      <p class="hint">Si te pagan en 2 partes, crea 2 ingresos (uno por quincena).</p>
    </div>
    <div class="field">
      <label>Día del mes que lo recibes (1-31, opcional)</label>
      <input id="ingDia" type="number" min="1" max="31" placeholder="Ej: 15 o 30" value="${ing && ing.diaMes ? ing.diaMes : ''}" />
      <p class="hint">Para que aparezca en su quincena. Déjalo vacío si es variable / sin fecha fija.</p>
    </div>
    <div class="field">
      <label>Tipo</label>
      <select id="ingTipo">
        <option value="fijo"${ing && ing.tipo === 'fijo' ? ' selected' : ''}>Fijo (recurrente cada mes)</option>
        <option value="variable"${ing && ing.tipo === 'variable' ? ' selected' : ''}>Variable (ingreso ocasional)</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarIngreso('${id || ''}')">Guardar</button>
    </div>
  `
  );
}
function guardarIngreso(id) {
  const nombre = document.getElementById('ingNombre').value.trim();
  const monto = Number(document.getElementById('ingMonto').value);
  const tipo = document.getElementById('ingTipo').value;
  const diaRaw = document.getElementById('ingDia').value;
  const diaMes = diaRaw ? Math.min(31, Math.max(1, Number(diaRaw))) : null;
  if (!nombre || !monto) {
    toast('Completa nombre y monto');
    return;
  }
  if (id) {
    const ing = state.ingresos.find((x) => x.id === id);
    Object.assign(ing, { nombre, monto, tipo, diaMes });
  } else {
    state.ingresos.push({ id: uid(), nombre, monto, tipo, diaMes });
  }
  guardar();
  cerrarModal();
  toast(id ? 'Ingreso actualizado' : 'Ingreso agregado');
  render();
}
function eliminarIngreso(id) {
  if (!confirm('¿Eliminar este ingreso?')) return;
  state.ingresos = state.ingresos.filter((i) => i.id !== id);
  guardar();
  render();
  toast('Eliminado');
}

// ====== GASTOS ======
function renderGastos() {
  const fijos = state.gastosFijos;
  const vars = state.gastosVariables;
  const elF = document.getElementById('listaGastosFijos');
  const elV = document.getElementById('listaGastosVariables');

  elF.innerHTML = fijos.length
    ? fijos
        .map((g) => {
          const pagado = estaPagado(g);
          return `
    <li class="item ${pagado ? 'item-pagado' : ''}">
      <button class="check-btn ${pagado ? 'checked' : ''}" onclick="toggleGastoPagado('${g.id}')" title="${
        pagado ? 'Pagado este mes — clic para desmarcar' : 'Marcar como pagado este mes'
      }">${pagado ? '✓' : ''}</button>
      <div class="item-info">
        <div class="item-name">${escapar(g.nombre)}</div>
        <div class="item-meta">${escapar(g.categoria || 'Otro')}${
            g.diaMes ? ` • Día ${g.diaMes} (${g.diaMes <= 15 ? 'Q1' : 'Q2'})` : ' • Sin día'
          }${pagado ? ' • <span style="color:var(--green)">✅ Pagado</span>' : ''}</div>
      </div>
      <div class="item-amount">${fmt(g.monto)}</div>
      <div class="item-actions">
        <button class="icon-btn" onclick="abrirModalGasto('fijo','${g.id}')">✏️</button>
        <button class="icon-btn" onclick="eliminarGasto('fijo','${g.id}')">🗑️</button>
      </div>
    </li>
  `;
        })
        .join('')
    : '<div class="empty">Sin gastos fijos</div>';

  elV.innerHTML = vars.length
    ? vars
        .map(
          (g) => `
    <li class="item">
      <div class="item-info">
        <div class="item-name">${escapar(g.nombre)}</div>
        <div class="item-meta">${escapar(g.categoria || 'Otro')} • ${
            g.asignacion === 'q1' ? 'Q1' : g.asignacion === 'q2' ? 'Q2' : 'Mensual'
          }</div>
      </div>
      <div class="item-amount">${fmt(g.monto)}</div>
      <div class="item-actions">
        <button class="icon-btn" onclick="abrirModalGasto('variable','${g.id}')">✏️</button>
        <button class="icon-btn" onclick="eliminarGasto('variable','${g.id}')">🗑️</button>
      </div>
    </li>
  `
        )
        .join('')
    : '<div class="empty">Sin gastos variables</div>';

  document.getElementById('totalFijos').textContent = fmt(totalGastosFijos());
  document.getElementById('totalVariables').textContent = fmt(totalGastosVariables());

  // Resumen de progreso de pagos del mes (gastos fijos)
  const elProg = document.getElementById('progresoFijos');
  if (elProg) {
    const pagadosCount = fijos.filter(estaPagado).length;
    const montoPagado = fijos.filter(estaPagado).reduce((s, g) => s + Number(g.monto || 0), 0);
    if (fijos.length === 0) {
      elProg.innerHTML = '';
    } else {
      const pctPagado = (pagadosCount / fijos.length) * 100;
      elProg.innerHTML = `
        <div class="card-row">
          <span class="label">Pagados este mes</span>
          <span class="value ${pagadosCount === fijos.length ? 'green' : ''}">${pagadosCount} de ${fijos.length} — ${fmt(montoPagado)}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${pctPagado >= 100 ? '' : pctPagado >= 50 ? 'yellow' : 'red'}" style="width:${pctPagado}%"></div></div>
        <p class="hint" style="margin-top:6px;">${
          pagadosCount === fijos.length
            ? '✅ ¡Todos tus gastos fijos del mes están pagados!'
            : `Te faltan ${fmt(totalGastosFijos() - montoPagado)} en gastos fijos por pagar este mes.`
        }</p>
      `;
    }
  }
}

const CATEGORIAS_FIJOS = ['Vivienda', 'Servicios', 'Internet/Telefonía', 'Transporte', 'Suscripciones', 'Educación', 'Salud', 'Seguros', 'Otro'];
const CATEGORIAS_VARIABLES = ['Comida', 'Transporte', 'Ocio', 'Ropa', 'Salud', 'Regalos', 'Otro'];

function abrirModalGasto(tipo, id) {
  // Si viene id, buscamos el gasto (puede estar en fijos o variables)
  let g = null;
  if (id) {
    g = state.gastosFijos.find((x) => x.id === id) || state.gastosVariables.find((x) => x.id === id);
    if (g) tipo = state.gastosFijos.includes(g) ? 'fijo' : 'variable';
  }
  const cats = tipo === 'fijo' ? CATEGORIAS_FIJOS : CATEGORIAS_VARIABLES;
  const campoFecha = tipo === 'fijo'
    ? `
    <div class="field">
      <label>Día del mes que pagas (1-31, opcional)</label>
      <input id="gDia" type="number" min="1" max="31" placeholder="Ej: 5 (a inicio) o 25 (a fin)" value="${g && g.diaMes ? g.diaMes : ''}" />
      <p class="hint">Para que aparezca en su quincena. Déjalo vacío si no tiene fecha fija.</p>
    </div>`
    : `
    <div class="field">
      <label>Asignación quincenal</label>
      <select id="gAsig">
        <option value="mes"${g && (!g.asignacion || g.asignacion === 'mes') ? ' selected' : ''}>Reparto mensual (se divide en mitades)</option>
        <option value="q1"${g && g.asignacion === 'q1' ? ' selected' : ''}>Solo primera quincena (días 1-15)</option>
        <option value="q2"${g && g.asignacion === 'q2' ? ' selected' : ''}>Solo segunda quincena (días 16-31)</option>
      </select>
      <p class="hint">Los gastos variables suelen ser parejos en el mes. Si uno se concentra en una quincena, selecciónalo aquí.</p>
    </div>`;

  abrirModal(
    g ? `Editar gasto ${tipo}` : `Agregar gasto ${tipo}`,
    `
    <div class="field">
      <label>Nombre / descripción</label>
      <input id="gNombre" placeholder="${tipo === 'fijo' ? 'Ej: Renta, Internet' : 'Ej: Comida, Gasolina'}" value="${g ? escapar(g.nombre) : ''}" />
    </div>
    <div class="field">
      <label>Monto mensual (USD)</label>
      <input id="gMonto" type="number" min="0" step="1" placeholder="0" value="${g ? g.monto : ''}" />
    </div>
    <div class="field">
      <label>Categoría</label>
      <select id="gCategoria">${cats
        .map((c) => `<option value="${c}"${g && g.categoria === c ? ' selected' : ''}>${c}</option>`)
        .join('')}</select>
    </div>
    ${campoFecha}
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarGasto('${tipo}','${id || ''}')">Guardar</button>
    </div>
  `
  );
}
function guardarGasto(tipo, id) {
  const nombre = document.getElementById('gNombre').value.trim();
  const monto = Number(document.getElementById('gMonto').value);
  const categoria = document.getElementById('gCategoria').value;
  if (!nombre || !monto) {
    toast('Completa nombre y monto');
    return;
  }
  const datos = { nombre, monto, categoria };
  if (tipo === 'fijo') {
    const diaRaw = document.getElementById('gDia').value;
    datos.diaMes = diaRaw ? Math.min(31, Math.max(1, Number(diaRaw))) : null;
  } else {
    datos.asignacion = document.getElementById('gAsig').value || 'mes';
  }
  if (id) {
    const g = state.gastosFijos.find((x) => x.id === id) || state.gastosVariables.find((x) => x.id === id);
    if (g) Object.assign(g, datos);
  } else {
    const item = Object.assign({ id: uid() }, datos);
    if (tipo === 'fijo') state.gastosFijos.push(item);
    else state.gastosVariables.push(item);
  }
  guardar();
  cerrarModal();
  toast(id ? 'Gasto actualizado' : 'Gasto agregado');
  render();
}
// Marca / desmarca un gasto fijo como pagado este mes
function toggleGastoPagado(id) {
  const g = state.gastosFijos.find((x) => x.id === id);
  if (!g) return;
  g.pagadoEn = estaPagado(g) ? null : mesActual();
  guardar();
  render();
  toast(estaPagado(g) ? 'Marcado como pagado ✅' : 'Desmarcado');
}
function eliminarGasto(tipo, id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  if (tipo === 'fijo') state.gastosFijos = state.gastosFijos.filter((g) => g.id !== id);
  else state.gastosVariables = state.gastosVariables.filter((g) => g.id !== id);
  guardar();
  render();
  toast('Eliminado');
}

// ====== DEUDAS ======
function renderDeudas() {
  const ordenadas = ordenarDeudas();
  const atacables = ordenadas.filter(esAtacable);
  const lista = document.getElementById('listaDeudas');
  if (state.deudas.length === 0) {
    lista.innerHTML = '<div class="empty"><div class="ico">🎉</div>No tienes deudas registradas.</div>';
  } else {
    lista.innerHTML = ordenadas
      .map((d) => {
        const progreso = d.montoOriginal > 0 ? ((d.montoOriginal - d.montoActual) / d.montoOriginal) * 100 : 0;
        const esFija = !esAtacable(d);
        const idxAtaque = atacables.indexOf(d);
        let badge;
        if (esFija) {
          badge = '<span class="badge fija">🔒 Cuota fija</span>';
        } else if (idxAtaque === 0) {
          badge = '<span class="badge priority">Prioridad 1</span>';
        } else if (idxAtaque === 1) {
          badge = '<span class="badge next">Siguiente</span>';
        } else {
          badge = '<span class="badge queue">En fila</span>';
        }
        const altaTasa = Number(d.tasaAnual) > 25 ? ' 🔥' : '';
        const pagado = estaPagado(d);
        return `
        <li class="item ${pagado ? 'item-pagado' : ''}" style="flex-direction:column;align-items:stretch;">
          <div style="display:flex;justify-content:space-between;align-items:center;width:100%;gap:10px;">
            <button class="check-btn ${pagado ? 'checked' : ''}" onclick="toggleDeudaPagada('${d.id}')" title="${
          pagado ? 'Cuota de este mes pagada — clic para desmarcar' : 'Marcar cuota de este mes como pagada'
        }">${pagado ? '✓' : ''}</button>
            <div class="item-info">
              <div class="item-name">${escapar(d.nombre)}${altaTasa}</div>
              <div class="item-meta">Tasa ${Number(d.tasaAnual).toFixed(1)}% • Mín ${fmt(d.pagoMinimo)}${
          d.diaMes ? ` • Día ${d.diaMes} (${d.diaMes <= 15 ? 'Q1' : 'Q2'})` : ''
        }${pagado ? ' • <span style="color:var(--green)">✅ Cuota pagada</span>' : ''}</div>
            </div>
            <div style="text-align:right;">
              <div class="item-amount">${fmt(d.montoActual)}</div>
              ${badge}
            </div>
          </div>
          <div class="progress-bar" style="margin-top:8px;"><div class="progress-fill" style="width:${progreso}%"></div></div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
            <span class="hint">${progreso.toFixed(0)}% pagado de ${fmt(d.montoOriginal)}</span>
            <div class="item-actions">
              <button class="icon-btn" onclick="editarDeuda('${d.id}')">✏️</button>
              <button class="icon-btn" onclick="eliminarDeuda('${d.id}')">🗑️</button>
            </div>
          </div>
        </li>
      `;
      })
      .join('');
  }
  document.getElementById('resumenDeudaTotal').textContent = fmt(totalDeudas());
  document.getElementById('resumenMinimos').textContent = fmt(totalPagosMinimos());
  document.getElementById('resumenTasa').textContent = tasaPromedio().toFixed(1) + '%';
}
// Marca / desmarca la cuota mensual de una deuda como pagada
function toggleDeudaPagada(id) {
  const d = state.deudas.find((x) => x.id === id);
  if (!d) return;
  d.pagadoEn = estaPagado(d) ? null : mesActual();
  guardar();
  render();
  toast(estaPagado(d) ? 'Cuota marcada como pagada ✅' : 'Desmarcado');
}

function abrirModalDeuda(deudaId) {
  const d = deudaId ? state.deudas.find((x) => x.id === deudaId) : null;
  abrirModal(
    d ? 'Editar deuda' : 'Agregar deuda',
    `
    <div class="field">
      <label>Nombre de la deuda</label>
      <input id="dNombre" placeholder="Ej: Tarjeta Diners, Préstamo banco" value="${d ? escapar(d.nombre) : ''}" />
    </div>
    <div class="field">
      <label>Saldo actual pendiente (USD)</label>
      <input id="dMontoActual" type="number" min="0" step="0.01" placeholder="0" value="${d ? d.montoActual : ''}" />
    </div>
    <div class="field">
      <label>Monto original (al iniciar la deuda)</label>
      <input id="dMontoOriginal" type="number" min="0" step="0.01" placeholder="0" value="${d ? d.montoOriginal : ''}" />
      <p class="hint">Si no recuerdas el original, pon el mismo que el saldo actual.</p>
    </div>
    <div class="field">
      <label>Tasa de interés anual (%)</label>
      <input id="dTasa" type="number" min="0" step="0.1" placeholder="Ej: 18.5" value="${d ? d.tasaAnual : ''}" />
      <p class="hint">Si es de un amigo o familiar sin interés, pon 0.</p>
    </div>
    <div class="field">
      <label>Pago mínimo / cuota mensual (USD)</label>
      <input id="dMinimo" type="number" min="0" step="0.01" placeholder="0" value="${d ? d.pagoMinimo : ''}" />
    </div>
    <div class="field">
      <label>¿Puedes abonar o pagar de más a esta deuda?</label>
      <select id="dExtra">
        <option value="si"${d && d.permitePagoExtra === false ? '' : ' selected'}>Sí — acepta pagos extra (tarjetas, préstamos informales)</option>
        <option value="no"${d && d.permitePagoExtra === false ? ' selected' : ''}>No — cuota fija (algunos créditos bancarios)</option>
      </select>
      <p class="hint">Si es de cuota fija, el mentor NO le sugerirá pago extra: solo pagas la cuota y el dinero extra se reparte entre las deudas que sí lo permiten.</p>
    </div>
    <div class="field">
      <label>Día del mes que pagas (1-31, opcional)</label>
      <input id="dDia" type="number" min="1" max="31" placeholder="Ej: 12, 25" value="${d && d.diaMes ? d.diaMes : ''}" />
      <p class="hint">Para ubicarla en su quincena. Si tiene varias fechas (corte y vence), usa la fecha de pago.</p>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarDeuda('${deudaId || ''}')">Guardar</button>
    </div>
  `
  );
}
function guardarDeuda(id) {
  const nombre = document.getElementById('dNombre').value.trim();
  const montoActual = Number(document.getElementById('dMontoActual').value);
  const montoOriginal = Number(document.getElementById('dMontoOriginal').value) || montoActual;
  const tasaAnual = Number(document.getElementById('dTasa').value) || 0;
  const pagoMinimo = Number(document.getElementById('dMinimo').value) || 0;
  const permitePagoExtra = document.getElementById('dExtra').value !== 'no';
  const diaRaw = document.getElementById('dDia').value;
  const diaMes = diaRaw ? Math.min(31, Math.max(1, Number(diaRaw))) : null;

  if (!nombre || montoActual <= 0) {
    toast('Completa nombre y saldo');
    return;
  }
  if (id) {
    const d = state.deudas.find((x) => x.id === id);
    Object.assign(d, { nombre, montoActual, montoOriginal, tasaAnual, pagoMinimo, diaMes, permitePagoExtra });
  } else {
    state.deudas.push({
      id: uid(),
      nombre,
      montoActual,
      montoOriginal,
      tasaAnual,
      pagoMinimo,
      diaMes,
      permitePagoExtra,
      creada: Date.now(),
    });
  }
  guardar();
  cerrarModal();
  toast(id ? 'Deuda actualizada' : 'Deuda agregada');
  render();
}
function editarDeuda(id) {
  abrirModalDeuda(id);
}
function eliminarDeuda(id) {
  if (!confirm('¿Eliminar esta deuda? (Solo hazlo si fue pagada o cargada por error)')) return;
  state.deudas = state.deudas.filter((d) => d.id !== id);
  guardar();
  render();
  toast('Deuda eliminada');
}

