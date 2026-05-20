# 💰 Mentor Financiero — Bola de Nieve

App personal para Toño. Te ayuda a salir de deudas con **estrategia híbrida** y a construir tu fondo de emergencia + ahorros, paso a paso.

---

## 🚀 Cómo abrirla la primera vez

### En tu PC
1. Abre la carpeta `extrategia bola de nieve`.
2. Haz doble clic en `index.html` — se abre en tu navegador.
3. Listo. Empieza a registrar tus datos.

**Mejor opción (recomendada para PC):** Abre la app con Chrome o Edge y luego:
- Chrome: ícono de "Instalar" en la barra de direcciones (derecha) → "Instalar Mentor Financiero".
- Edge: menú (...) → Apps → "Instalar esta aplicación".

Eso la convierte en una app de escritorio con su propio ícono, sin barra de navegador.

### En tu celular (Android / iPhone)

La forma más fácil de usarla en el celular es:

**Opción A — Servirla local en tu casa (mismo WiFi que tu PC):**
1. En tu PC, abre una terminal en la carpeta `extrategia bola de nieve`.
2. Ejecuta: `python -m http.server 8080` (necesitas Python instalado).
3. Mira la IP local de tu PC (en Windows: `ipconfig`, busca "IPv4").
4. En tu celular, abre el navegador y entra a `http://TU-IP:8080` (ej: `http://192.168.1.10:8080`).
5. En el navegador del celular, menú → "Agregar a pantalla de inicio" / "Instalar app".

**Opción B — Subirla a un hosting gratis (recomendada):**
Sube los archivos a [Netlify Drop](https://app.netlify.com/drop) (gratis, sin cuenta para probar). Arrastra la carpeta completa, te da una URL pública. Abres esa URL desde cualquier dispositivo y la instalas como app.

**Opción C — Usar GitHub Pages o Cloudflare Pages** (gratis y permanente). Si quieres, te puedo ayudar a configurarlo.

---

## 📲 Cómo instalar como app

Una vez que la app esté abierta en el navegador:

- **Android (Chrome):** menú (⋮) → "Instalar app" o "Agregar a pantalla principal".
- **iPhone (Safari):** botón de compartir → "Agregar a pantalla de inicio".
- **Windows (Chrome/Edge):** ícono "Instalar" en la barra de direcciones.

Una vez instalada, funciona **offline** (sin internet) y guarda los datos en el dispositivo.

---

## 🔄 Cómo sincronizar entre celular y PC

La app NO usa servidores ni nube — tus datos viven solo en cada dispositivo. Para mover datos entre celular y PC:

1. En el dispositivo origen: ve a **Ajustes → Exportar respaldo (JSON)**.
2. Guarda el archivo (se descarga como `mentor-financiero-backup-2026-05-19.json`).
3. Envíatelo por WhatsApp / Email / lo que sea.
4. En el otro dispositivo: **Ajustes → Importar respaldo** → selecciona ese archivo.

Recomiendo hacer respaldo cada semana o después de cargar mucha información nueva. Esto también te protege si cambias de teléfono.

---

## 🧠 Cómo usar el Mentor (orden recomendado)

1. **Registra tus ingresos** → pestaña 💵 Ingresos. Pon tu salario y cualquier ingreso recurrente. **Anota el día del mes que lo recibes** (ej: día 15 y día 30 si te pagan quincenal — créalos como 2 ingresos).
2. **Registra tus gastos fijos** → pestaña 💸 Gastos → Fijos. Renta, servicios, internet, suscripciones. **Anota el día que pagas cada uno** (renta día 5, internet día 10, etc.).
3. **Registra tus gastos variables** → presupuesto mensual estimado de comida, ocio, transporte. Si alguno se concentra en una quincena, marca su asignación (Q1 o Q2).
4. **Registra tus deudas** → pestaña 🔗 Deudas. Pon nombre, saldo actual, tasa de interés anual, pago mínimo y **día de pago/corte**.
5. **Actualiza el fondo de emergencia** → pestaña 🔮 Simulador → escribe cuánto tienes ahorrado.
6. **Ve a la pestaña 📅 Quincena** → ve cómo se reparten tus ingresos/gastos en Q1 (días 1-15) y Q2 (días 16-31), con flujo libre por quincena y plan sugerido.
7. **Ve a la pestaña 🧠 Mentor** → revisa el semáforo y los consejos personalizados.

## 📅 Plan Quincenal — cómo funciona

La app divide tu mes en dos quincenas:
- **Q1**: días 1 al 15
- **Q2**: días 16 al 31

Cada ingreso, gasto fijo y deuda cae en la quincena que corresponde a su día del mes. Los gastos variables se reparten mitad/mitad por defecto (puedes asignarlos a una quincena específica al crearlos).

**Por qué importa:** muchas veces el flujo libre mensual se ve sano, pero al separar por quincena descubres que una quincena tiene déficit (ej: cae la renta + dos deudas en Q2). El Plan Quincenal te muestra eso para que reserves dinero de la Q1 hacia la Q2 antes de gastártelo.

---

## 🚦 Cómo leer el semáforo

El mentor evalúa 5 indicadores:

| Indicador | Verde | Amarillo | Rojo |
|---|---|---|---|
| Gastos fijos / ingresos | < 50% | 50–65% | > 65% |
| Flujo libre / ingresos | > 20% | 10–20% | < 10% |
| Deuda total / ingreso anual | < 30% | 30–50% | > 50% |
| Tasa promedio de deudas | < 15% | 15–25% | > 25% |
| Fondo emergencia (meses de gasto) | ≥ 3 | 1–3 | < 1 |

**Color global:** si tienes 2+ indicadores rojos = 🔴 Rojo. 1 rojo o 2+ amarillos = 🟡 Amarillo. Lo demás = 🟢 Verde.

---

## 🎯 Estrategia Híbrida (la que usa la app por defecto)

1. Si tienes deudas con **tasa > 25% anual** (tipo tarjetas de crédito), esas van primero, ordenadas por tasa descendente. Cuesta demasiado dinero dejarlas crecer.
2. Las demás deudas van **de menor a mayor saldo** (bola de nieve clásica). Esto te da victorias rápidas y motivación.

Puedes cambiar a Bola Pura o Avalancha Pura en **Ajustes → Estrategia de pago**.

---

## 🪜 El camino financiero (orden ideal)

1. **Mini-fondo de emergencia** ($500–$1.000 o 1 mes de gastos).
2. **Salir de deudas** con estrategia híbrida.
3. **Fondo de emergencia completo** (3–6 meses de gastos).
4. **Ahorro / inversión** (15–20% del ingreso).
5. **Independencia financiera** (ingresos pasivos que cubran tus gastos).

No saltes pasos. Sin fondo mínimo, cualquier imprevisto te devuelve a las tarjetas.

---

## 🛡️ Privacidad

- Tus datos viven **solo** en el dispositivo donde abriste la app (en `localStorage` del navegador).
- No hay servidores, no hay cuentas, no hay nadie que vea tus números.
- Si borras los datos del navegador o desinstalas la app, **pierdes la info** — por eso los respaldos JSON son importantes.

---

## 🐛 Si algo no funciona

- **No se ven los íconos / la app se ve fea:** asegúrate de abrir `index.html`, no otro archivo. Los archivos deben estar todos en la misma carpeta.
- **No se guarda nada:** revisa que tu navegador no esté en modo incógnito (no guarda localStorage al cerrar).
- **No se instala como app:** algunos navegadores antiguos no soportan PWA. Usa Chrome, Edge, Safari o Firefox actualizados.

---

Hecho con ❤️ para que salgas de deudas más rápido de lo que crees, Toño. Tú decides — yo solo aconsejo.
