# ☁️ Guía para activar la sincronización (Firebase)

Esta configuración se hace **una sola vez**. Después de esto, tus datos se sincronizan solos entre el celular y la PC para siempre. Es **gratis**.

Tómate 15 minutos con calma. Sigue los pasos en orden, sin saltarte ninguno.

---

## PARTE 1 — Crear el proyecto en Firebase

1. Entra a **https://console.firebase.google.com**
2. Inicia sesión con tu cuenta de Google (la misma del correo, Gmail, etc.).
3. Haz clic en **"Crear un proyecto"** (o "Add project").
4. Ponle un nombre, por ejemplo: `mentor-financiero`. Clic en **Continuar**.
5. Te preguntará por **Google Analytics** — **desactívalo** (mueve el interruptor a apagado). No lo necesitas. Clic en **Continuar** / **Crear proyecto**.
6. Espera unos segundos. Cuando diga "Tu proyecto está listo", clic en **Continuar**.

---

## PARTE 2 — Registrar la aplicación web

1. Ya dentro de tu proyecto, busca unos íconos en el centro o arriba. Haz clic en el ícono **`</>`** (que significa "web").
2. En "Apodo de la app" escribe: `Mentor Financiero`.
3. **NO marques** la casilla de "Firebase Hosting". Déjala vacía.
4. Clic en **"Registrar app"**.
5. Ahora te muestra un bloque de código. Busca la parte que dice **`const firebaseConfig = {`**. Se ve parecido a esto:

   ```
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXX",
     authDomain: "mentor-financiero.firebaseapp.com",
     projectId: "mentor-financiero",
     storageBucket: "mentor-financiero.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abc123def456"
   };
   ```

6. **NO cierres esta página todavía** — vas a copiar esos valores en el siguiente paso.

---

## PARTE 3 — Pegar las claves en la app

1. En la carpeta de la app, abre el archivo **`firebase-config.js`** con el Bloc de notas (clic derecho → Abrir con → Bloc de notas).
2. Verás un bloque con `"PEGA_AQUI_TU_API_KEY"` y similares.
3. Reemplaza **cada valor** por el que te dio Firebase. Copia y pega con cuidado, **respetando las comillas**. Debe quedar así (con TUS valores reales):

   ```
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXX",
     authDomain: "mentor-financiero.firebaseapp.com",
     projectId: "mentor-financiero",
     storageBucket: "mentor-financiero.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abc123def456"
   };
   ```

4. Guarda el archivo (Ctrl+S) y ciérralo.
5. Ya puedes cerrar la página de Firebase del paso anterior. Vuelve a la consola de Firebase (https://console.firebase.google.com, tu proyecto).

---

## PARTE 4 — Activar el inicio de sesión (Authentication)

1. En el menú de la izquierda, haz clic en **"Compilación"** (Build) → **"Authentication"**.
2. Clic en el botón **"Comenzar"** (Get started).
3. Te muestra una lista de métodos. Haz clic en **"Correo electrónico/contraseña"** (Email/Password).
4. Activa el **primer interruptor** ("Habilitar"). El segundo (enlace de correo) déjalo apagado.
5. Clic en **"Guardar"**.

### Autorizar tu sitio web (paso importante)

1. Dentro de Authentication, ve a la pestaña **"Settings"** (Configuración) → **"Authorized domains"** (Dominios autorizados).
2. Clic en **"Add domain"** (Agregar dominio).
3. Escribe el dominio de tu app en GitHub Pages, **sin `https://` y sin la barra final**. Para ti es:

   ```
   rordoneza-droid.github.io
   ```

4. Clic en **"Add"**. (`localhost` ya viene autorizado, no lo toques.)

---

## PARTE 5 — Crear la base de datos (Firestore)

1. En el menú de la izquierda: **"Compilación"** (Build) → **"Firestore Database"**.
2. Clic en **"Crear base de datos"**.
3. Te pregunta la ubicación. Elige una cercana, por ejemplo **`us-east1`** o **`southamerica-east1`**. Clic en **Siguiente**.
4. Te pregunta el modo. Elige **"Comenzar en modo de producción"** (production mode). Clic en **"Crear"** / **"Habilitar"**.
5. Espera a que se cree.

### Poner las reglas de seguridad (muy importante)

Esto hace que **solo tú** puedas ver tus datos.

1. Dentro de Firestore Database, ve a la pestaña **"Reglas"** (Rules).
2. Verás un cuadro de texto con reglas. **Borra todo** lo que haya y pega exactamente esto:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /usuarios/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

3. Clic en **"Publicar"** (Publish).

---

## PARTE 6 — Subir los archivos actualizados a GitHub

1. Entra a tu repositorio: `github.com/rordoneza-droid/extrategia-bola-de-nieve`
2. **"Add file"** → **"Upload files"**.
3. Arrastra TODOS estos archivos (los nuevos y los que cambiaron):
   - `index.html`
   - `app.js`
   - `forms.js`
   - `sync.js` ← **nuevo**
   - `firebase-config.js` ← **nuevo (con TUS claves ya pegadas)**
   - `sw.js`
4. Escribe un mensaje como `Activar sincronización Firebase` y clic en **"Commit changes"**.
5. Espera 1-2 minutos a que GitHub Pages republique.

---

## PARTE 7 — Probar

1. Abre la app en tu PC (la URL de GitHub Pages). Debería aparecer la **pantalla de inicio de sesión**.
2. Como es la primera vez, haz clic en **"Crea una cuenta"**.
3. Escribe tu correo y una contraseña (mínimo 6 caracteres — **anótala bien**). Clic en **"Crear cuenta"**.
4. Entras a la app. Carga tus datos (ingresos, gastos, deudas).
5. Ahora abre la app en tu **celular**. Aparece la pantalla de login.
6. Inicia sesión con **el mismo correo y contraseña**.
7. ✨ Tus datos aparecen ahí también. A partir de ahora, todo lo que registres en un dispositivo aparece en el otro automáticamente.

En **Ajustes → Cuenta y sincronización** puedes ver el estado (☁️ Sincronizado) y cerrar sesión si lo necesitas.

---

## ❓ Si algo falla

- **No aparece la pantalla de login:** revisa que `firebase-config.js` tenga tus claves reales (no los "PEGA_AQUI"). Revisa que subiste `sync.js` y `firebase-config.js` a GitHub.
- **Error "unauthorized-domain" al iniciar sesión:** te faltó la PARTE 4, autorizar el dominio `rordoneza-droid.github.io`.
- **Error "operation-not-allowed":** te faltó activar Correo/contraseña en Authentication (PARTE 4).
- **No guarda / error de sincronización:** revisa que publicaste las reglas de Firestore (PARTE 5).
- **Olvidaste la contraseña:** en la consola de Firebase → Authentication → pestaña Users, puedes borrar tu usuario y volver a crear la cuenta (pero perderías los datos de la nube; mejor anota bien la contraseña).

---

## 🔒 Sobre tu privacidad

- Solo tú, con tu correo y contraseña, puedes ver tus datos. Las reglas de seguridad lo garantizan.
- Firebase es de Google. Tus datos viajan cifrados.
- El plan gratuito es más que suficiente para uso personal (no vas a pagar nada).
- Si algún día quieres volver al modo sin nube, en la pantalla de login hay un enlace "Usar solo en este dispositivo".

¡Listo, Toño! Una vez hecho esto, nunca más tendrás que hacer export/import manual. 💪
