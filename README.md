markdown
// filepath: d:\Documents\Visual Studio Works\TuParKing-Full\TuParKing-Backend\README.md
# TuParKing Backend

API REST construída con **Node.js + Express + PostgreSQL** que soporta autenticación JWT, gestión de vehículos, parqueaderos, reservas, transacciones y recargas.

---

## ⚙️ Requisitos

- **Node.js** 18+
- **npm** 9+
- **PostgreSQL** 13+
- Cuenta / token JWT para probar endpoints protegidos

Archivo `.env` (ejemplo):

```
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=TuParkingBD
DB_USER=postgres
DB_PASSWORD=tu_clave_segura

JWT_SECRET=una_clave_super_segura
```

---

## 📦 Dependencias clave

| Paquete            | Uso                                                 |
|--------------------|------------------------------------------------------|
| express            | Servidor HTTP y enrutamiento                         |
| cors               | CORS global                                         |
| dotenv             | Carga de variables de entorno                       |
| pg / pg-pool       | Conexión y pool PostgreSQL                          |
| bcrypt             | Hash de contraseñas                                 |
| jsonwebtoken       | Emisión/verificación de JWT                         |
| nodemon (dev)      | Recarga automática en desarrollo                    |

Instalación:

```
npm install
```

---

## 🗂️ Estructura

```
src/
 ├── config/database.js
 ├── controllers/
 │    ├── authController.js
 │    ├── vehiculosController.js
 │    ├── parqueaderosController.js
 │    ├── reservasController.js
 │    └── transaccionesController.js
 ├── middleware/authMiddleware.js
 └── routes/
      ├── authRoutes.js
      ├── vehiculosRoutes.js
      ├── parqueaderosRoutes.js
      ├── reservasRoutes.js
      └── transaccionesRoutes.js
server.js
```

`server.js` registra middlewares (JSON, urlencoded, logging), rutas y manejo de errores.

---

## 🚀 Ejecución

```bash
npm run dev   # nodemon, http://localhost:3000
npm start     # modo producción
```

### Salud / Ping
`GET /health` → `{ status: "ok", uptime, timestamp }`

---

## 🔐 Endpoints principales

| Método | Ruta                                   | Descripción                      | Auth |
|--------|----------------------------------------|----------------------------------|------|
| POST   | `/api/auth/registro`                   | Registro de usuario              | No   |
| POST   | `/api/auth/login`                      | Login (retorna JWT)              | No   |
| GET    | `/api/auth/perfil`                     | Perfil del usuario               | Sí   |
| GET    | `/api/vehiculos`                       | Lista vehículos del usuario      | Sí   |
| POST   | `/api/vehiculos`                       | Crea vehículo                    | Sí   |
| DELETE | `/api/vehiculos/:id`                   | Elimina vehículo                 | Sí   |
| GET    | `/api/parqueaderos`                    | Lista parqueaderos disponibles   | No   |
| GET    | `/api/parqueaderos/:id`                | Detalle de parqueadero          | No   |
| GET    | `/api/reservas`                        | Lista reservas del usuario       | Sí   |
| POST   | `/api/reservas`                        | Crea reserva                     | Sí   |
| PUT    | `/api/reservas/:id/finalizar`          | Finaliza reserva                 | Sí   |
| GET    | `/api/transacciones`                   | Historial de transacciones       | Sí   |
| POST   | `/api/transacciones/recarga`           | Recarga de saldo                 | Sí   |

Formato general: JSON. Algunos controladores devuelven `{ reservas: [...] }`; el frontend puede usar `data.reservas ?? data`.

---

## 🧪 Ejemplos (PowerShell / curl)

```powershell
# Login
curl.exe -X POST "http://localhost:3000/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"test@tuparking.com","password":"123456"}'

# Crear reserva
curl.exe -X POST "http://localhost:3000/api/reservas" `
  -H "Authorization: Bearer <TOKEN>" `
  -H "Content-Type: application/json" `
  -d '{"vehiculo_id":1,"parqueadero_id":5,"horas_reservadas":2}'

# Recargar saldo
curl.exe -X POST "http://localhost:3000/api/transacciones/recarga" `
  -H "Authorization: Bearer <TOKEN>" `
  -H "Content-Type: application/json" `
  -d '{"monto":100,"metodo_pago":"tarjeta","medio":"tarjeta_credito"}'
```

En emulador Android usa `http://10.0.2.2:3000`, en iOS simulator `http://127.0.0.1:3000`.

---

## 🧱 Notas de diseño

- Transacciones monetarias usan CTE + `SELECT ... FOR UPDATE` para evitar race conditions.
- Tabla `transacciones` maneja `valor`, `saldo_anterior`, `saldo_posterior`; constraint `chk_transaccion_fuente` asegura que el origen sea único (recarga o parqueo).
- Enum `medio_pago` para `recargas.medio`, validar valores antes de insertar.

---

## 🧰 Debug & Tips

- “Network request failed” en emulador → usa `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api` en el frontend.
- Errores de enum → enviar valores válidos (`tarjeta_credito`, `nequi`, etc.) o castear en SQL.
- Mantén `.env` fuera del repo; usa `.env.example`.

---

## ✅ Roadmap / Microservicios

- Separar módulos (vehículos, reservas, transacciones) en servicios independientes.
- Orquestación futura con Docker Compose/Kubernetes y proxy inverso (Nginx/Traefik).
- Observabilidad centralizada y mensajería (RabbitMQ/Kafka) para eventos de reservas/transacciones.

---

## 🤝 Contribuir

1. Haz fork y crea rama (`feature/...`).
2. `npm test` (cuando haya tests) antes de abrir PR.
3. Describe claramente los cambios y añade pruebas para lógica crítica.

Contacto: **sherman.2003.a@gmail.com**

---

MIT License