# ✅ Pre-Launch Checklist
## Sistema de Asistencias - Verificación Final

**Fecha:** _______________
**Responsable:** _______________

---

## 🔐 SEGURIDAD (BLOQUEANTE - NO LANZAR SIN COMPLETAR)

### Backend

- [ ] **JWT_SECRET único y seguro**
  - ✓ Generado con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
  - ✓ 128 caracteres hexadecimales
  - ✓ Configurado en Render Environment
  - ✓ NO es el mismo que en .env local
  - ✓ NO contiene la palabra "production" o "secret"

- [ ] **CORS configurado correctamente**
  - ✓ `CORS_ORIGIN` en Render = URL exacta de Vercel
  - ✓ NO es "*"
  - ✓ Incluye https://
  - ✓ Sin trailing slash
  - Ejemplo: `https://asistencia-fygrad.vercel.app`

- [ ] **httpOnly Cookie funciona**
  - ✓ Login en producción
  - ✓ Abrir DevTools → Application → Cookies
  - ✓ Cookie `auth_token` existe
  - ✓ Flag `HttpOnly` = ✓
  - ✓ Flag `Secure` = ✓ (en producción)
  - ✓ Flag `SameSite` = Strict

- [ ] **localStorage NO contiene tokens**
  - ✓ Abrir DevTools → Application → Local Storage
  - ✓ NO existe clave `auth_token`
  - ✓ Solo existe `auth-storage` con datos de usuario (sin token)

- [ ] **Error handling no expone detalles**
  - ✓ Forzar error (ej: endpoint inexistente)
  - ✓ Respuesta NO contiene stack trace
  - ✓ Mensaje genérico: "Error interno del servidor"

---

## 🌍 CONFIGURACIÓN (BLOQUEANTE)

### Variables de Entorno

- [ ] **Render - Backend configurado**
  - ✓ `DATABASE_URL` - PostgreSQL Neon
  - ✓ `JWT_SECRET` - 128 chars único
  - ✓ `JWT_EXPIRES_IN` - "7d"
  - ✓ `CORS_ORIGIN` - URL exacta de Vercel
  - ✓ `NODE_ENV` - "production"
  - ✓ `PORT` - 3000
  - ✓ `GPS_ACCURACY_THRESHOLD_M` - 50
  - ✓ `LOG_LEVEL` - "info"
  - ✓ `RATE_LIMIT_MAX` - 5
  - ✓ `RATE_LIMIT_WINDOW_MS` - 60000

- [ ] **Vercel - Frontend configurado**
  - ✓ `VITE_API_BASE_URL` - URL de Render + "/api"
  - Ejemplo: `https://asistencia-backend.onrender.com/api`

### Base de Datos

- [ ] **Locations configuradas correctamente**
  - ✓ Ejecutado: `node scripts/update-locations.js`
  - ✓ Todas las locations tienen `radiusMeters = 100` (NO 50000)
  - ✓ Coordenadas correctas (lat/lng de oficina real)
  - ✓ `isActive = true`

- [ ] **Prisma migrations aplicadas**
  - ✓ Ejecutado en Render: `npx prisma migrate deploy`
  - ✓ Sin errores en logs de Render

---

## 🧪 TESTING FUNCIONAL (IMPORTANTE)

### Test 1: Autenticación

- [ ] **Login exitoso**
  - ✓ Ir a URL de producción
  - ✓ Ingresar código de admin válido
  - ✓ Redirige correctamente a `/dashboard`
  - ✓ No hay errores en DevTools Console
  - Código probado: _______________

- [ ] **Login fallido**
  - ✓ Ingresar código inexistente "ZZZZ"
  - ✓ Muestra error: "Código de acceso inválido"
  - ✓ No crea cookie

### Test 2: Escaneo QR (Móvil + PC)

- [ ] **Generar QR Fijo**
  - ✓ Admin va a `/dashboard/fixed-qr`
  - ✓ Selecciona turno AM
  - ✓ QR se genera sin errores
  - ✓ Descarga o imprime QR

- [ ] **Escaneo exitoso - Puntual**
  - ✓ Usuario va a `/scan` en móvil
  - ✓ Permite GPS (accuracy < 50m)
  - ✓ Permite cámara
  - ✓ Escanea QR a hora exacta (ej: 09:00)
  - ✓ Mensaje: "Entrada registrada exitosamente"
  - ✓ En reportes: late_minutes = 0, discount = 0
  - Hora de escaneo: _______________

- [ ] **Escaneo con tardanza**
  - ✓ Escanear 15 min después de inicio (ej: 09:15)
  - ✓ Mensaje: "Entrada registrada (15 min tarde)"
  - ✓ Muestra descuento: "S/5.00"
  - ✓ En reportes: late_minutes = 15, discount = 5.00
  - Hora de escaneo: _______________

- [ ] **Escaneo duplicado bloqueado**
  - ✓ Intentar escanear entrada dos veces
  - ✓ Error: "Ya registró entrada en este turno"

- [ ] **Validación GPS**
  - ✓ Escanear desde ubicación lejana (>100m)
  - ✓ Error: "Está fuera del área permitida"
  - ✓ Muestra distancia en metros
  - Distancia mostrada: _______________m

### Test 3: Reportes y Exportación

- [ ] **Reportes funcionan**
  - ✓ Admin va a `/dashboard/reports`
  - ✓ Selecciona rango de 7 días
  - ✓ Gráfico muestra datos correctos
  - ✓ Totales coinciden con registros en BD

- [ ] **Detalle de día**
  - ✓ Click en día específico
  - ✓ Lista muestra todos los registros
  - ✓ Columnas: nombre, hora, tardanza, descuento

- [ ] **Exportar Excel**
  - ✓ Click "Exportar Excel"
  - ✓ Archivo .xlsx descarga
  - ✓ Abrir en Excel sin errores
  - ✓ Datos coinciden con vista web

### Test 4: Justificación

- [ ] **Justificar tardanza**
  - ✓ En detalle de día, buscar registro con tardanza
  - ✓ Click "Justificar"
  - ✓ Ingresar razón: "Problema de transporte"
  - ✓ Status cambia a "JUSTIFICADO"
  - ✓ Descuento = S/0.00
  - ✓ En BD verifica registro en `audit_logs`

---

## 🚀 PERFORMANCE (RECOMENDADO)

- [ ] **Health check responde rápido**
  - ✓ Abrir: `https://tu-backend.onrender.com/health`
  - ✓ Responde en <1 segundo
  - ✓ JSON: `{"status": "OK", "timestamp": "..."}`

- [ ] **Login rápido**
  - ✓ Tiempo desde submit hasta redirección: <2 segundos
  - Tiempo medido: _______________s

- [ ] **Escaneo QR rápido**
  - ✓ Tiempo desde escaneo hasta confirmación: <5 segundos
  - Tiempo medido: _______________s

- [ ] **Reportes cargan rápido**
  - ✓ Carga de gráfico 7 días: <5 segundos
  - Tiempo medido: _______________s

---

## 📱 UX/UI (RECOMENDADO)

### Móvil (iOS + Android)

- [ ] **Responsive design**
  - ✓ Layout se adapta a pantalla pequeña
  - ✓ Botones tienen tamaño mínimo 44x44px
  - ✓ Texto legible sin zoom (min 16px)

- [ ] **Permisos claros**
  - ✓ Mensaje GPS: "Necesitamos tu ubicación para validar..."
  - ✓ Mensaje Cámara: "Necesitamos la cámara para escanear..."
  - ✓ Si rechaza, muestra instrucciones para habilitar

- [ ] **Feedback visual**
  - ✓ Loading spinner durante validación
  - ✓ Éxito: Pantalla verde + checkmark
  - ✓ Error: Pantalla roja + X + mensaje claro
  - ✓ Toast no se superponen

### Desktop (Admin)

- [ ] **Dashboard navegable**
  - ✓ Sidebar funciona
  - ✓ Breadcrumbs claros
  - ✓ Logout accesible

- [ ] **Crear usuario fácil**
  - ✓ Formulario inline funciona
  - ✓ Muestra código de 4 dígitos grande y copiable
  - ✓ Actualiza lista automáticamente

---

## 📊 MONITOREO (POST-LAUNCH)

- [ ] **Configurar alertas**
  - ✓ Email/Slack para errores 500
  - ✓ Monitor de uptime (UptimeRobot, Pingdom)
  - Alertas configuradas en: _______________

- [ ] **Acceso a logs**
  - ✓ Render Dashboard → Logs
  - ✓ Saber cómo buscar errores específicos
  - ✓ Considerar Logtail/Papertrail para logs persistentes

---

## 🎯 CRITERIOS DE LANZAMIENTO

### MÍNIMO (Debe cumplir TODO):
- ✅ Todas las casillas de SEGURIDAD completadas
- ✅ Todas las casillas de CONFIGURACIÓN completadas
- ✅ Test 1 y Test 2 (Autenticación + Escaneo) exitosos

### RECOMENDADO (Ideal):
- ✅ Todo lo anterior
- ✅ Tests 3 y 4 (Reportes + Justificación) exitosos
- ✅ Performance <5 segundos
- ✅ Testing en 2+ dispositivos móviles reales

---

## 📝 Notas de Verificación

**Problemas encontrados durante testing:**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Soluciones aplicadas:**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Observaciones adicionales:**

_______________________________________________
_______________________________________________
_______________________________________________

---

## ✍️ Firma de Aprobación

**Verificado por:** _______________
**Fecha:** _______________
**Hora:** _______________

**Estado:**
- [ ] ✅ APROBADO PARA PRODUCCIÓN
- [ ] ⚠️ NECESITA CORRECCIONES
- [ ] ❌ NO LISTO - BLOQUEAR DEPLOY

**Próximo paso:**
- [ ] Iniciar Piloto con 5 usuarios
- [ ] Rollout 50%
- [ ] Rollout 100%

---

**Checklist creado:** 2026-02-06
**Versión:** 1.0
