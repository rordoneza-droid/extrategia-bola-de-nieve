/* =============================================================
   MENTOR FINANCIERO — sync.js
   Sincronización en la nube con Firebase (Auth + Firestore).
   Si Firebase no está configurado, la app sigue en modo LOCAL.
   ============================================================= */

let firebaseListo = false;
let usuarioActual = null;
let aplicandoCambioRemoto = false;   // evita bucles cuando llegan datos remotos
let unsubscribeSnapshot = null;
let modoAuth = 'login';              // 'login' o 'registro'
let _syncTimer = null;

// ¿El usuario ya pegó sus claves de Firebase?
function firebaseConfigurado() {
  return (
    typeof firebaseConfig !== 'undefined' &&
    firebaseConfig.apiKey &&
    !String(firebaseConfig.apiKey).includes('PEGA_AQUI') &&
    firebaseConfig.projectId &&
    !String(firebaseConfig.projectId).includes('PEGA_AQUI')
  );
}

// ====== INICIALIZACIÓN ======
function iniciarSync() {
  if (!firebaseConfigurado()) {
    actualizarEstadoSync('local');
    return; // Modo local — la app funciona normal sin nube
  }
  if (typeof firebase === 'undefined') {
    actualizarEstadoSync('sinSDK');
    return; // No cargó el SDK (sin internet en la primera carga)
  }
  try {
    firebase.initializeApp(firebaseConfig);
    firebaseListo = true;
    actualizarEstadoSync('conectando');

    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        usuarioActual = user;
        ocultarLogin();
        escucharDatos();
        actualizarEstadoSync('conectando');
      } else {
        usuarioActual = null;
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
        mostrarLogin();
        actualizarEstadoSync('sinSesion');
      }
    });
  } catch (e) {
    console.warn('Error iniciando Firebase:', e);
    actualizarEstadoSync('error');
  }
}

// ====== ESCUCHAR DATOS (tiempo real) ======
function escucharDatos() {
  if (!usuarioActual) return;
  const ref = firebase.firestore().collection('usuarios').doc(usuarioActual.uid);
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  unsubscribeSnapshot = ref.onSnapshot(
    (doc) => {
      // Si es nuestra propia escritura aún sin confirmar, no hacemos nada
      if (doc.metadata.hasPendingWrites) return;

      if (doc.exists && doc.data() && doc.data().datos) {
        const remoto = doc.data().datos;
        aplicandoCambioRemoto = true;
        state = Object.assign(JSON.parse(JSON.stringify(datosVacios)), remoto);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {}
        sincronizarSelectsUI();
        render();
        aplicandoCambioRemoto = false;
        actualizarEstadoSync('ok');
      } else {
        // El documento aún no existe: subimos lo que haya en este dispositivo
        subirANube(true);
      }
    },
    (err) => {
      console.warn('Error escuchando datos:', err);
      actualizarEstadoSync('error');
    }
  );
}

// ====== SUBIR DATOS A LA NUBE ======
function subirANube(inmediato) {
  if (!firebaseListo || !usuarioActual || aplicandoCambioRemoto) return;
  clearTimeout(_syncTimer);
  const hacer = () => {
    firebase
      .firestore()
      .collection('usuarios')
      .doc(usuarioActual.uid)
      .set({ datos: state, actualizadoEn: Date.now() })
      .then(() => actualizarEstadoSync('ok'))
      .catch((e) => {
        console.warn('Error subiendo:', e);
        actualizarEstadoSync('error');
      });
  };
  if (inmediato) hacer();
  else _syncTimer = setTimeout(hacer, 600); // agrupa cambios seguidos
}

// ====== AUTENTICACIÓN ======
function enviarFormularioAuth() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  if (!email || !pass) {
    errEl.textContent = 'Escribe tu correo y contraseña.';
    return;
  }
  if (modoAuth === 'registro' && pass.length < 6) {
    errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Un momento…';

  const promesa =
    modoAuth === 'registro'
      ? firebase.auth().createUserWithEmailAndPassword(email, pass)
      : firebase.auth().signInWithEmailAndPassword(email, pass);

  promesa
    .then(() => {
      // onAuthStateChanged se encarga del resto
      document.getElementById('loginPass').value = '';
    })
    .catch((e) => {
      errEl.textContent = mensajeErrorAuth(e.code);
      btn.disabled = false;
      btn.textContent = modoAuth === 'registro' ? 'Crear cuenta' : 'Iniciar sesión';
    });
}

function mensajeErrorAuth(code) {
  const m = {
    'auth/invalid-email': 'El correo no tiene un formato válido.',
    'auth/user-not-found': 'No existe una cuenta con ese correo. ¿Quieres crearla?',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/network-request-failed': 'Sin conexión a internet. Revisa tu red.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
    'auth/operation-not-allowed': 'El inicio de sesión por correo no está habilitado en Firebase.',
  };
  return m[code] || 'Ocurrió un error. Intenta de nuevo.';
}

function alternarModoAuth() {
  modoAuth = modoAuth === 'login' ? 'registro' : 'login';
  actualizarTextosLogin();
  document.getElementById('loginError').textContent = '';
}

function actualizarTextosLogin() {
  const esRegistro = modoAuth === 'registro';
  document.getElementById('loginTitulo').textContent = esRegistro ? 'Crear cuenta' : 'Iniciar sesión';
  document.getElementById('loginSubtitulo').textContent = esRegistro
    ? 'Crea tu cuenta para sincronizar tus datos entre todos tus dispositivos.'
    : 'Entra con tu cuenta para ver tus datos sincronizados.';
  const btn = document.getElementById('loginBtn');
  btn.disabled = false;
  btn.textContent = esRegistro ? 'Crear cuenta' : 'Iniciar sesión';
  document.getElementById('loginToggleTexto').textContent = esRegistro
    ? '¿Ya tienes cuenta?'
    : '¿Primera vez?';
  document.getElementById('loginToggleLink').textContent = esRegistro
    ? 'Inicia sesión'
    : 'Crea una cuenta';
}

function cerrarSesion() {
  if (!firebaseListo) return;
  if (!confirm('¿Cerrar sesión en este dispositivo? Tus datos quedan guardados en la nube.')) return;
  firebase
    .auth()
    .signOut()
    .then(() => {
      toast('Sesión cerrada');
    });
}

// ====== UI LOGIN ======
function mostrarLogin() {
  const ov = document.getElementById('loginOverlay');
  if (ov) {
    ov.classList.add('active');
    actualizarTextosLogin();
  }
}
function ocultarLogin() {
  const ov = document.getElementById('loginOverlay');
  if (ov) ov.classList.remove('active');
}

// Permite usar la app sin cuenta (modo local) aunque Firebase esté configurado
function usarSinCuenta() {
  if (
    !confirm(
      'Vas a usar la app SOLO en este dispositivo, sin sincronización. ' +
        'Tus datos no se compartirán con tu celular/PC. ¿Continuar?'
    )
  )
    return;
  ocultarLogin();
  actualizarEstadoSync('local');
}

// ====== ESTADO DE SINCRONIZACIÓN ======
function actualizarEstadoSync(estado) {
  const el = document.getElementById('estadoSync');
  const headerEl = document.getElementById('syncMini');
  let texto, icono, color;
  switch (estado) {
    case 'ok':
      texto = 'Sincronizado con la nube';
      icono = '☁️';
      color = 'var(--green)';
      break;
    case 'conectando':
      texto = 'Conectando…';
      icono = '🔄';
      color = 'var(--yellow)';
      break;
    case 'error':
      texto = 'Error de sincronización (se reintenta solo)';
      icono = '⚠️';
      color = 'var(--red)';
      break;
    case 'sinSesion':
      texto = 'Sin sesión iniciada';
      icono = '🔑';
      color = 'var(--text-dim)';
      break;
    case 'sinSDK':
      texto = 'Sin conexión — modo local temporal';
      icono = '📴';
      color = 'var(--yellow)';
      break;
    case 'local':
    default:
      texto = 'Modo local (sin sincronización)';
      icono = '💾';
      color = 'var(--text-dim)';
      break;
  }
  if (el) {
    el.innerHTML = `<span style="font-size:18px;">${icono}</span> <span style="color:${color};font-weight:600;">${texto}</span>`;
  }
  if (headerEl) headerEl.textContent = icono;

  // Mostrar/ocultar el bloque de cuenta según haya sesión
  const cuentaInfo = document.getElementById('cuentaInfo');
  const cuentaSinSesion = document.getElementById('cuentaSinSesion');
  if (cuentaInfo && cuentaSinSesion) {
    if (usuarioActual) {
      cuentaInfo.style.display = 'block';
      cuentaSinSesion.style.display = 'none';
      const emailEl = document.getElementById('cuentaEmail');
      if (emailEl) emailEl.textContent = usuarioActual.email || '';
    } else {
      cuentaInfo.style.display = 'none';
      cuentaSinSesion.style.display = 'block';
    }
  }
}

// Reaplica los valores de los selects de Ajustes tras cargar datos remotos
function sincronizarSelectsUI() {
  const est = document.getElementById('estrategia');
  const meta = document.getElementById('metaFondo');
  const fa = document.getElementById('fondoActual');
  if (est) est.value = (state.perfil && state.perfil.estrategia) || 'hibrida';
  if (meta) meta.value = (state.fondo && state.fondo.meta) || 3;
  if (fa) fa.value = (state.fondo && state.fondo.actual) || 0;
}

// Botón "volver a iniciar sesión" desde Ajustes (modo local → login)
function abrirLoginDesdeAjustes() {
  if (!firebaseConfigurado()) {
    toast('Primero configura Firebase (ver guía)');
    return;
  }
  if (typeof firebase === 'undefined') {
    toast('Sin conexión para iniciar sesión');
    return;
  }
  mostrarLogin();
}

// ====== ARRANQUE ======
window.addEventListener('DOMContentLoaded', () => {
  // Se ejecuta después del init de forms.js (que ya hizo el primer render local)
  iniciarSync();
});
