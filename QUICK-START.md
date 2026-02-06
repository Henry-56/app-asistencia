# ⚡ Quick Start - Deploy en 5 Pasos

**Tiempo total:** ~30 minutos

---

## 1️⃣ Generar JWT Secret (1 min)

```bash
cd backend
node scripts/generate-jwt-secret.js
```

✅ Copia UNO de los secrets y guárdalo

---

## 2️⃣ Deploy Backend en Render (10 min)

1. [Render Dashboard](https://dashboard.render.com/) → **New + → Web Service**
2. Conectar GitHub repo
3. Configurar:
   - Root: `backend`
   - Build: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start: `npm start`
4. Environment:
   ```
   DATABASE_URL=postgresql://[TU_URL_NEON]
   JWT_SECRET=[SECRET_GENERADO_ARRIBA]
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://TU-APP.vercel.app
   NODE_ENV=production
   GPS_ACCURACY_THRESHOLD_M=50
   LOG_LEVEL=info
   ```
5. Create → **Copiar URL** (ej: `https://asistencia-abc123.onrender.com`)

---

## 3️⃣ Deploy Frontend en Vercel (5 min)

1. Editar `frontend/.env.production`:
   ```
   VITE_API_BASE_URL=https://asistencia-abc123.onrender.com/api
   ```

2. Deploy:
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Copiar URL** (ej: `https://asistencia-xyz.vercel.app`)

---

## 4️⃣ Actualizar CORS (2 min)

1. Render Dashboard → Tu servicio → Environment
2. Editar `CORS_ORIGIN`:
   ```
   https://asistencia-xyz.vercel.app
   ```
3. Save (auto-redeploy)

---

## 5️⃣ Verificar (10 min)

### Test Rápido:
1. ✅ Abrir: `https://asistencia-abc123.onrender.com/health`
   - Debe responder: `{"status":"OK",...}`

2. ✅ Abrir tu app: `https://asistencia-xyz.vercel.app`
   - Login con código admin
   - DevTools → Application → Cookies
   - Verificar cookie `auth_token` con flag `HttpOnly` ✓

3. ✅ Escanear QR:
   - Móvil → `/scan`
   - Escanear QR de `/dashboard/fixed-qr`
   - Verificar registro exitoso

### Test Completo:
Seguir **PRE-LAUNCH-CHECKLIST.md**

---

## 🚨 Troubleshooting Rápido

**Error CORS:**
→ Verificar CORS_ORIGIN coincide EXACTAMENTE con URL de Vercel

**NO_TOKEN_PROVIDED:**
→ Verificar `withCredentials: true` en axios.js

**JWT error:**
→ Verificar JWT_SECRET tiene 128 caracteres

---

## 📚 Documentación Completa

- **`RESUMEN-IMPLEMENTACION.md`** - Qué se implementó
- **`DEPLOYMENT.md`** - Guía detallada paso a paso
- **`PRE-LAUNCH-CHECKLIST.md`** - Verificación exhaustiva

---

**¡Listo! Tu app está en producción 🚀**
