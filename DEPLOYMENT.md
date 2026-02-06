# 🚀 Guía de Deployment a Producción
## Sistema de Asistencias con QR + Geolocalización

---

## 📋 Pre-requisitos Completados

✅ **Correcciones de Seguridad Implementadas:**
- CORS restringido a dominios específicos
- JWT_SECRET sin fallback inseguro
- GPS threshold ajustado a 50m (configurable)
- Logging estructurado con Winston
- Token migrado a httpOnly cookie
- Error handling sanitizado
- Locations actualizadas a radiusMeters = 100m

---

## 🔧 Paso 1: Configurar Backend en Render

### 1.1 Crear Web Service en Render

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +" → "Web Service"**
3. Conecta tu repositorio de GitHub
4. Configura:
   - **Name**: `asistencia-backend`
   - **Region**: Oregon (USA)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (para empezar)

### 1.2 Configurar Variables de Entorno en Render

Ve a **Environment** y agrega estas variables:

```bash
# 1. Database (copiar de Neon.tech)
DATABASE_URL=postgresql://neondb_owner:npg_XXX@ep-XXX.aws.neon.tech/neondb?sslmode=require

# 2. JWT Secret (GENERAR NUEVO con el comando de abajo)
JWT_SECRET=<GENERAR_NUEVO>
JWT_EXPIRES_IN=7d

# 3. CORS (IMPORTANTE: usar URL real de Vercel)
CORS_ORIGIN=https://tu-app-asistencia.vercel.app

# 4. Server
NODE_ENV=production
PORT=3000

# 5. GPS
GPS_ACCURACY_THRESHOLD_M=50

# 6. Logging
LOG_LEVEL=info

# 7. Rate Limiting
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=60000
```

#### 🔐 Generar JWT_SECRET Seguro

En tu terminal local:
```bash
cd backend
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copia el resultado (128 caracteres) y úsalo como `JWT_SECRET`.

### 1.3 Deploy

1. Click **"Create Web Service"**
2. Render automáticamente desplegará
3. **Espera 5-10 minutos** para que complete el build
4. Copia la URL del backend (ej: `https://asistencia-backend.onrender.com`)

---

## 🌐 Paso 2: Configurar Frontend en Vercel

### 2.1 Actualizar .env.production

Edita `frontend/.env.production` con la URL real de Render:

```bash
VITE_API_BASE_URL=https://asistencia-backend.onrender.com/api
```

### 2.2 Deploy a Vercel

**Opción A - Desde CLI:**
```bash
cd frontend
npm install -g vercel
vercel --prod
```

**Opción B - Desde Dashboard:**
1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..." → "Project"**
3. Importa tu repositorio
4. Configura:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. En **Environment Variables**, agrega:
   ```
   VITE_API_BASE_URL=https://asistencia-backend.onrender.com/api
   ```
6. Click **"Deploy"**

### 2.3 Actualizar CORS en Render

1. Vuelve a Render Dashboard
2. Ve a tu servicio → **Environment**
3. Actualiza `CORS_ORIGIN` con la URL real de Vercel:
   ```
   CORS_ORIGIN=https://tu-app-asistencia.vercel.app
   ```
4. Click **"Save Changes"** (Render redesplegará automáticamente)

---

## ✅ Paso 3: Verificación Post-Deploy

### 3.1 Health Check del Backend

Abre en el navegador:
```
https://asistencia-backend.onrender.com/health
```

Debe responder:
```json
{
  "status": "OK",
  "timestamp": "2026-02-06T..."
}
```

### 3.2 Verificar CORS

Abre tu frontend en Vercel y abre DevTools → Console. No debe haber errores de CORS.

### 3.3 Verificar httpOnly Cookie

1. Abre tu frontend: `https://tu-app-asistencia.vercel.app`
2. Haz login con un código de prueba
3. Abre DevTools → Application → Cookies → `tu-app-asistencia.vercel.app`
4. Debe existir cookie `auth_token` con:
   - ✅ `HttpOnly`: true
   - ✅ `Secure`: true (en producción)
   - ✅ `SameSite`: Strict

### 3.4 Verificar localStorage NO tiene token

En DevTools → Application → Local Storage:
- ❌ NO debe existir `auth_token`
- ✅ Solo debe existir `auth-storage` con datos del usuario (sin token)

---

## 🧪 Paso 4: Testing Manual End-to-End

### Test 1: Login y Autenticación (2 min)

1. **Login válido:**
   - Ir a `/`
   - Ingresar código válido (ej: tu admin code)
   - Verificar redirección a `/dashboard` o `/scan`
   - Verificar cookie en DevTools ✅

2. **Login inválido:**
   - Ingresar código inexistente "ZZZZ"
   - Verificar error claro: "Código de acceso inválido"

### Test 2: Escaneo QR con GPS (5 min)

**Pre-requisito:** Generar QR fijo desde `/dashboard/fixed-qr` (turno AM o PM)

1. **Escaneo exitoso (dentro de área):**
   - Ir a `/scan` en móvil
   - Permitir GPS y Cámara
   - Escanear QR generado
   - Verificar mensaje: "Entrada registrada exitosamente"
   - Verificar en `/dashboard/reports` que aparece el registro

2. **Escaneo con tardanza:**
   - Escanear después de hora de inicio + 15 minutos
   - Verificar mensaje incluye: "15 min tarde" y "Descuento: S/5.00"

3. **Escaneo fuera de área (simulado):**
   - Usar coordenadas falsas o estar lejos de la oficina
   - Verificar error: "Está fuera del área permitida"
   - Debe mostrar distancia actual

### Test 3: Reportes (3 min)

1. Ir a `/dashboard/reports`
2. Seleccionar rango de fechas (últimos 7 días)
3. Verificar gráfico muestra datos correctos
4. Click en día específico → Ver detalle
5. Click "Exportar Excel" → Verificar descarga archivo .xlsx
6. Abrir Excel → Verificar estructura y datos

### Test 4: Justificación (2 min)

1. En detalle de día, buscar registro con tardanza
2. Click "Justificar" → Ingresar razón
3. Verificar status cambia a "JUSTIFICADO"
4. Verificar descuento = S/0.00

---

## 🎯 Checklist Final Pre-Launch

### Seguridad (CRÍTICO)
- [ ] JWT_SECRET único de 64 chars en Render (NO reutilizar el de .env local)
- [ ] CORS_ORIGIN con URL exacta de Vercel (NO "*")
- [ ] Cookie `auth_token` tiene flag `HttpOnly` (verificar en DevTools)
- [ ] localStorage NO contiene tokens
- [ ] GPS_ACCURACY_THRESHOLD_M = 50 metros
- [ ] Locations en BD con radiusMeters = 100 metros

### Funcionalidad (IMPORTANTE)
- [ ] Login funciona con códigos de 4 dígitos
- [ ] Escaneo QR registra entrada/salida correctamente
- [ ] Cálculo de descuentos correcto (15min → S/5, 25min → S/10)
- [ ] Geofencing rechaza escaneos fuera de 100m
- [ ] Reportes muestran datos correctos
- [ ] Exportar Excel descarga archivo válido

### Performance (RECOMENDADO)
- [ ] Health check responde en <1 segundo
- [ ] Login completa en <2 segundos
- [ ] Escaneo QR procesa en <3 segundos
- [ ] Reportes cargan en <5 segundos

---

## 🚨 Troubleshooting Común

### Error: "CORS policy: No 'Access-Control-Allow-Origin'"

**Causa:** CORS_ORIGIN en Render no coincide con URL de Vercel

**Solución:**
1. Copia URL exacta de Vercel (con https://)
2. Actualiza `CORS_ORIGIN` en Render Environment
3. Guarda y espera redeployment (~2 min)

### Error: "NO_TOKEN_PROVIDED" al hacer requests

**Causa:** Cookie no se está enviando (withCredentials faltante o CORS)

**Solución:**
1. Verificar `withCredentials: true` en `frontend/src/lib/axios.js`
2. Verificar CORS incluye `credentials: true` en backend
3. Verificar dominio de cookie coincide con frontend

### Error: "FATAL: JWT_SECRET no configurado"

**Causa:** Variable de entorno faltante en Render

**Solución:**
1. Render Dashboard → Environment
2. Agregar `JWT_SECRET` con valor generado
3. Guardar y esperar redeployment

### Logs no aparecen en Render

**Causa:** Carpeta `logs/` no persiste en Render (filesystem efímero)

**Solución (post-launch):**
- Integrar con servicio de logging externo (Logtail, Papertrail)
- Por ahora, usar Render Logs (Dashboard → Logs tab)

### GPS siempre rechaza escaneos

**Causa:** radiusMeters muy bajo o coordenadas incorrectas

**Solución:**
1. Verificar coordenadas de Location son correctas
2. Aumentar temporalmente `radiusMeters` a 200m para testing
3. Verificar señal GPS en móvil (accuracy < 50m)

---

## 📊 Monitoreo Post-Launch

### Día 1-3: Monitoreo Intensivo

1. **Revisar Render Logs cada 2 horas:**
   - Buscar errores 500
   - Verificar rate limiting no está bloqueando usuarios legítimos

2. **Verificar Neon Database:**
   - Dashboard → Metrics
   - Asegurar no excede límite de conexiones

3. **Feedback de Usuarios:**
   - Preguntar: "¿Tuviste algún problema?"
   - Documentar errores reportados

### Semana 1: Optimización

1. **Analizar tiempos de respuesta:**
   - Si >5 segundos, considerar:
     - Índices adicionales en BD
     - Caching de reportes
     - Upgrade de plan Render

2. **Revisar tasa de error:**
   - Objetivo: <5% en escaneos
   - Si >10%, investigar causa (GPS, QR expirados, etc.)

---

## 🎉 Rollout Completo

### Fase 1: Piloto (5 usuarios, 1 día)

Seleccionar:
- 2 colaboradores técnicos
- 2 practicantes
- 1 admin

**Criterio de éxito:**
- 0 errores 500
- Todos completan check-in/out exitosamente
- Tiempo promedio escaneo <10 segundos

### Fase 2: Rollout 50% (1 semana)

Si piloto exitoso:
- Registrar 50% de empleados
- Mantener sistema manual en paralelo como backup

### Fase 3: Rollout 100%

Después de semana exitosa:
- Migrar todos los usuarios
- Deshabilitar sistema manual
- Anuncio formal

---

## 📞 Soporte

**En caso de emergencia en producción:**

1. **Rollback rápido:**
   - Render: Dashboard → Deploys → Click deploy anterior → "Redeploy"
   - Vercel: Deployments → Click deploy anterior → Promote to Production

2. **Revisar logs:**
   - Render: Dashboard → Logs
   - Vercel: Deployments → Click deploy → Function Logs

3. **Desactivar temporalmente:**
   - Cambiar `isActive = false` en todas las Locations
   - Nadie podrá escanear hasta reactivar

---

## 🔄 Mejoras Post-Launch (Backlog)

### Semana 2-3:
- [ ] Implementar tests automatizados (Jest)
- [ ] Validación de entrada con Zod
- [ ] CRON jobs para marcar faltas automáticas

### Semana 4:
- [ ] Integrar Sentry para error tracking
- [ ] Dashboard de métricas (tiempo escaneo, tasa éxito)
- [ ] Notificaciones push para recordatorios

---

**Última actualización:** 2026-02-06
**Versión:** 1.0 - Production Ready 🚀
