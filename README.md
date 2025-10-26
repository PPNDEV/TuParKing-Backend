# TuParKing - Backend

Backend API para la aplicación TuParKing — Node.js + Express + PostgreSQL.

Resumen rápido
- Auth: JWT (middleware `verificarToken`)
- DB: PostgreSQL (pg) con enums y transacciones
- Funcionalidades: usuarios, cuentas, recargas, parqueaderos, reservas y transacciones

Estructura importante
- `src/config/database.js` — conexión a PostgreSQL
- `src/controllers/` — controladores (reservas, transacciones, vehiculos, etc.)
- `src/routes/` — rutas expuestas por la API
- `src/middleware/authMiddleware.js` — verificación JWT

Cómo preparar el entorno (local)
1. Copia `.env.example` a `.env` y ajusta variables (PGHOST, PGUSER, PGPASSWORD, PGDATABASE, JWT_SECRET, PORT)
2. `npm install`
3. `npm start` (o `npm run dev` si tienes nodemon)

Endpoints clave
- `POST /api/auth/login` — autenticación
- `GET /api/reservas` — listar reservas del usuario (autenticado)
- `POST /api/reservas` — crear reserva (autenticado)
- `PUT /api/reservas/:id/finalizar` — finalizar reserva
- `GET /api/transacciones` — historial de transacciones
- `POST /api/transacciones/recarga` — recargar saldo

Notas
- Usa `http://10.0.2.2:3000` en emulador Android para llamar al servidor local.
- No incluyas `.env` en el repo. Mantén `README.md` y `.env.example` actualizados.

Licencia
MIT
