# Sistema de Asistencias con QR - Backend

Backend API REST para sistema de control de asistencias con códigos QR, geolocalización y cálculo automático de descuentos.

## Stack Tecnológico

- **Node.js** + **Express**: Framework web
- **Prisma ORM**: Gestión de base de datos
- **Neon PostgreSQL**: Base de datos serverless
- **JWT + bcrypt**: Autenticación
- **moment-timezone**: Manejo de zonas horarias (America/Lima)
- **qrcode**: Generación de códigos QR
- **node-cron**: Tareas programadas

## Instalación

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env` y configurar:

```env
DATABASE_URL="postgresql://neondb_owner:npg_MF7GyV4emNzv@ep-billowing-pine-aho4zd51-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="tu-clave-secreta-super-segura"
PORT=3000
```

### 3. Migrar base de datos

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. (Opcional) Insertar datos de prueba

```bash
# Ejecutar script de seed (crear después)
npm run seed
```

## Desarrollo

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

## Producción

```bash
npm start
```

## Scripts Disponibles

- `npm run dev`: Inicia servidor en modo desarrollo (nodemon)
- `npm start`: Inicia servidor en modo producción
- `npm run prisma:generate`: Genera cliente de Prisma
- `npm run prisma:migrate`: Ejecuta migraciones de BD
- `npm run prisma:studio`: Abre Prisma Studio (UI de BD)

## Estructura del Proyecto

```
backend/
├── prisma/
│   └── schema.prisma          # Schema de Prisma
├── src/
│   ├── config/
│   │   ├── prisma.js          # Cliente Prisma
│   │   └── constants.js       # Constantes del sistema
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── qrController.js
│   │   └── attendanceController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── qr.routes.js
│   │   └── attendance.routes.js
│   ├── services/
│   │   └── authService.js
│   ├── utils/
│   │   ├── calcLateAndDiscount.js
│   │   └── haversine.js
│   └── jobs/
│       └── absence-marker.js  # CRON jobs
├── .env
├── .env.example
├── package.json
└── server.js
```

## API Endpoints

### Autenticación

- `POST /api/auth/register`: Registrar usuario
- `POST /api/auth/login`: Iniciar sesión
- `GET /api/auth/me`: Obtener perfil (requiere auth)

### Códigos QR

- `POST /api/qr/generate-today`: Generar QRs del día (admin)
- `GET /api/qr/today`: Obtener QRs del día

### Asistencias

- `POST /api/attendance/scan`: Escanear QR y registrar
- `GET /api/attendance/my-records`: Mis registros

## Configuración

### Horarios de Turnos

Definidos en `src/config/constants.js`:

- **Turno AM**: 09:00 - 13:00
- **Turno PM**: 15:00 - 19:00 (L-V)

### Ventanas de Escaneo

- **Entrada AM**: 08:45 - 10:00
- **Salida AM**: 12:30 - 13:30
- **Entrada PM**: 14:45 - 16:00
- **Salida PM**: 18:30 - 19:30

### Descuentos

Ver `src/config/constants.js` para tabla completa de descuentos.

## Licencia

MIT
