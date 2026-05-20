/* =============================================================
   MENTOR FINANCIERO — forms.js
   Modales, simulador, ajustes, navegación, init.
   Continúa desde app.js
   ============================================================= */

// ====== MODAL PAGO ======
function abrirModalPago() {
  if (state.deudas.length === 0) {
    toast('No tienes deudas registradas');
    return;
  }
  abrirModal(
    'Registrar pago',
    `
    <div class="field">
      <label>Deuda</label>
      <select id="pDeuda">${state.deudas
        .map((d) => `<option value="${d.id}">${escapar(d.nombre)} — saldo ${fmt(d.montoActual)}</option>`)
        .join('')}</select>
    </div>
    <div class="field">
      <label>Monto pagado (USD)</label>
      <input id="pMonto" type="number" min="0" step="0.01" placeholder="0" />
    </div>
    <div class="field">
      <label>Nota (opcional)</label>
      <input id="pNota" placeholder="Ej: pago mínimo + extra" />
    </div>
    <p class="hint">Esto reduce el saldo de la deuda. Si tu deuda genera interés, ten en cuenta que parte del pago va a intereses (se refleja en el saldo).</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarPago()">Registrar</button>
    </div>
  `
  );
}
function guardarPago() {
  const id = document.getElementById('pDeuda').value;
  const monto = Number(document.getElementById('pMonto').value);
  const nota = document.getElementById('pNota').value.trim();
  if (!monto) {
    toast('Ingresa el monto');
    return;
  }
  const d = state.deudas.find((x) => x.id === id);
  d.montoActual = Math.max(0, d.montoActual - monto);
  state.pagos.push({ id: uid(), deudaId: id, monto, nota, fecha: Date.now() });
  if (d.montoActual === 0) {
    toast(`¡Felicitaciones! Cerraste ${d.nombre} 🎉`);
  } else {
    toast('Pago registrado');
  }
  guardar();
  cerrarModal();
  render();
}

// ====== MENTOR ======
function renderMentor(salud) {
  const cont = document.getElementById('trafficLightMentor');
  cont.innerHTML = `
    <div class="traffic-light">
      <div class="big-dot ${salud.color}"></div>
      <div class="info">
        <h3>${salud.texto}</h3>
        <p>${
          salud.color === 'green'
            ? 'Tus números cuadran. Mantén la disciplina y acelera lo que puedas.'
            : salud.color === 'yellow'
            ? 'Hay señales de atención. Revisa los indicadores en amarillo/rojo abajo.'
            : 'Necesitas tomar acción ahora. Empieza por los indicadores en rojo.'
        }</p>
      </div>
    </div>
  `;

  document.getElementById('indicadoresMentor').innerHTML = salud.indicadores
    .map(
      (i) => `
    <div class="card-row" style="flex-direction:column;align-items:flex-start;gap:6px;">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <span class="label">${i.nombre}</span>
        <span class="value ${i.color}"><span class="dot ${i.color}"></span> ${i.valor}</span>
      </div>
      <span class="hint">Ideal: ${i.ideal}. ${i.consejo}</span>
    </div>
  `
    )
    .join('');

  const consejos = generarConsejos(salud);
  document.getElementById('consejosMentor').innerHTML = consejos
    .map(
      (c) => `
    <div class="advice ${c.tipo}">
      <span class="ico">${c.ico}</span>
      <div class="msg">
        <strong>${c.titulo}</strong>
        <span>${c.msg}</span>
      </div>
    </div>
  `
    )
    .join('');

  const ingreso = totalIngresosMensual();
  const gastoMensual = totalGastos();
  const fondoMin = Math.min(1000, gastoMensual);
  const pasos = [
    {
      n: 1,
      t: 'Mini-fondo de emergencia',
      desc: `Ahorra entre $500 y $1.000 (o un mes de gastos: ${fmt(gastoMensual)}) antes de atacar deudas a fondo.`,
      ok: state.fondo.actual >= fondoMin && fondoMin > 0,
    },
    {
      n: 2,
      t: 'Salir de deudas con estrategia híbrida',
      desc: `Tasas altas (>25%) primero, luego de menor a mayor monto. Hoy tienes ${fmt(totalDeudas())} en deudas.`,
      ok: totalDeudas() === 0,
    },
    {
      n: 3,
      t: 'Fondo de emergencia completo',
      desc: `Llegar a 3–6 meses de gastos (${fmt(3 * gastoMensual)} a ${fmt(6 * gastoMensual)}).`,
      ok: state.fondo.actual >= 3 * gastoMensual && gastoMensual > 0,
    },
    {
      n: 4,
      t: 'Ahorro / inversión',
      desc: `Apunta a invertir 15–20% de tu ingreso (${fmt(0.175 * ingreso)} mensual).`,
      ok: false,
    },
    {
      n: 5,
      t: 'Independencia financiera',
      desc: 'Patrimonio que genere ingresos pasivos suficientes para cubrir tus gastos.',
      ok: false,
    },
  ];

  document.getElementById('caminoFinanciero').innerHTML = pasos
    .map((p) => {
      const estado = p.ok ? '✅' : p.n === pasoActual(pasos) ? '🎯' : '⬜';
      const opacity = p.ok ? 0.6 : 1;
      return `
        <div class="card-row" style="opacity:${opacity}">
          <div style="display:flex;align-items:flex-start;gap:10px;">
            <span style="font-size:18px;">${estado}</span>
            <div>
              <div style="font-weight:600;font-size:14px;">Paso ${p.n} — ${p.t}</div>
              <div class="hint">${p.desc}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}
function pasoActual(pasos) {
  for (const p of pasos) if (!p.ok) return p.n;
  return 99;
}

// ====== SIMULADOR ======
function recalcularSimulador() {
  const extraEl = document.getElementById('pagoExtra');
  if (!extraEl) return;
  const extra = Number(extraEl.value) || 0;
  const conExtra = simularPagoTotal(extra);
  const sinExtra = simularPagoTotal(0);
  const res = document.getElementById('resultadoSimulador');

  if (state.deudas.length === 0) {
    res.innerHTML = '<div class="empty">No tienes deudas. ¡Pasa al simulador de ahorro!</div>';
    return;
  }
  let html = '';
  if (!sinExtra.terminado) {
    html += `
      <div class="advice red">
        <span class="ico">⚠️</span>
        <div class="msg">
          <strong>Solo con pagos mínimos no sales</strong>
          <span>Tus pagos mínimos no alcanzan a cubrir los intereses generados. Necesitas pagar más para que el saldo realmente baje.</span>
        </div>
      </div>
    `;
  }

  const anios = (m) => (m / 12).toFixed(1);
  const ahorroIntereses = sinExtra.terminado ? Math.max(0, sinExtra.interesPagado - conExtra.interesPagado) : 0;
  const mesesAhorrados = sinExtra.terminado ? sinExtra.meses - conExtra.meses : 0;

  html += `
    <div class="card-row">
      <span class="label">Con pagos mínimos solo</span>
      <span class="value">${sinExtra.terminado ? `${sinExtra.meses} meses (${anios(sinExtra.meses)} años)` : 'Nunca terminas'}</span>
    </div>
    <div class="card-row">
      <span class="label">Con ${fmt(extra)} extra/mes</span>
      <span class="value green">${conExtra.terminado ? `${conExtra.meses} meses (${anios(conExtra.meses)} años)` : 'Nunca terminas'}</span>
    </div>
    ${mesesAhorrados > 0 ? `
    <div class="card-row">
      <span class="label">Sales antes</span>
      <span class="value green">${mesesAhorrados} meses (${anios(mesesAhorrados)} años)</span>
    </div>` : ''}
    ${ahorroIntereses > 0 ? `
    <div class="card-row">
      <span class="label">Te ahorras en intereses</span>
      <span class="value green">${fmt(ahorroIntereses)}</span>
    </div>` : ''}
    <p class="hint" style="margin-top:8px;">Mientras más extra pongas, más rápido sales y menos intereses pagas. La estrategia híbrida prioriza primero las deudas más caras.</p>
  `;
  res.innerHTML = html;
}

function recalcularFondo() {
  const metaEl = document.getElementById('metaFondo');
  const actualEl = document.getElementById('fondoActual');
  if (!metaEl || !actualEl) return;
  const meses = Number(metaEl.value) || 3;
  const actual = Number(actualEl.value) || 0;
  state.fondo.meta = meses;
  state.fondo.actual = actual;
  guardar();

  const gastoMensual = totalGastos();
  const metaMonto = meses * gastoMensual;
  const faltante = Math.max(0, metaMonto - actual);
  const libre = flujoLibre();
  const aporte = Math.max(0, libre * 0.2);
  const mesesParaCompletar = aporte > 0 ? Math.ceil(faltante / aporte) : Infinity;

  const res = document.getElementById('resultadoFondo');
  res.innerHTML = `
    <div class="card-row">
      <span class="label">Meta total</span>
      <span class="value">${fmt(metaMonto)}</span>
    </div>
    <div class="card-row">
      <span class="label">Te falta</span>
      <span class="value ${faltante > 0 ? 'yellow' : 'green'}">${fmt(faltante)}</span>
    </div>
    <div class="card-row">
      <span class="label">Aporte sugerido / mes</span>
      <span class="value">${fmt(aporte)} <span class="hint">(20% del flujo libre)</span></span>
    </div>
    <div class="card-row">
      <span class="label">Tiempo para completarlo</span>
      <span class="value">${mesesParaCompletar === Infinity ? 'Necesitas flujo libre primero' : `${mesesParaCompletar} meses`}</span>
    </div>
  `;
  if (document.getElementById('view-dashboard').classList.contains('active')) {
    const salud = calcularSalud();
    renderDashboard(salud);
    renderHeader(salud);
  }
}

// ====== AJUSTES ======
function cambiarEstrategia() {
  state.perfil.estrategia = document.getElementById('estrategia').value;
  guardar();
  toast('Estrategia actualizada');
  render();
}
function exportarDatos() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mentor-financiero-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Respaldo descargado');
}
function importarDatos(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const datos = JSON.parse(e.target.result);
      if (!datos.ingresos || !datos.deudas) {
        toast('Archivo no válido');
        return;
      }
      if (!confirm('Esto sobrescribirá tus datos actuales. ¿Continuar?')) return;
      state = Object.assign(JSON.parse(JSON.stringify(datosVacios)), datos);
      guardar();
      render();
      toast('Datos importados ✅');
    } catch (err) {
      toast('Error al leer el archivo');
    }
  };
  reader.readAsText(file);
  ev.target.value = '';
}
function reiniciarTodo() {
  if (!confirm('¿Borrar TODOS tus datos? Esto no se puede deshacer.')) return;
  if (!confirm('Última oportunidad. ¿Seguro?')) return;
  state = JSON.parse(JSON.stringify(datosVacios));
  guardar();
  render();
  toast('Datos reiniciados');
}

// ====== MODAL ======
function abrirModal(titulo, contenido) {
  document.getElementById('modalTitulo').textContent = titulo;
  document.getElementById('modalContenido').innerHTML = contenido;
  document.getElementById('modalOverlay').classList.add('active');
}
function cerrarModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

// ====== NAV ======
function cambiarVista(v) {
  document.querySelectorAll('.view').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  document.querySelector(`.nav-btn[data-view="${v}"]`).classList.add('active');
  window.scrollTo(0, 0);
}

// ====== HELPERS ======
function escapar(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ====== INIT ======
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) cerrarModal();
  });
  document.getElementById('estrategia').value = state.perfil.estrategia || 'hibrida';
  document.getElementById('metaFondo').value = state.fondo.meta || 3;
  document.getElementById('fondoActual').value = state.fondo.actual || 0;
  render();
});
