# TuParKing - Backend
Formato de respuesta

- Generalmente JSON. Algunas rutas devuelven `{ reservas: [...] }` mientras que otras devuelven un array directo; el frontend puede comprobar `data.reservas || data`.

Ejemplos (curl - PowerShell)

Recargar saldo
```powershell
curl.exe -X POST "http://localhost:3000/api/transacciones/recarga" \
	-H "Authorization: Bearer <TOKEN>" \
	-H "Content-Type: application/json" \
	-d '{"monto":100,"metodo_pago":"tarjeta","medio":"tarjeta_credito"}'
```

Crear reserva
```powershell
curl.exe -X POST "http://localhost:3000/api/reservas" \
	-H "Authorization: Bearer <TOKEN>" \
	-H "Content-Type: application/json" \
	-d '{"vehiculo_id":1,"parqueadero_id":5,"horas_reservadas":2}'
```

Listar reservas
```powershell
curl.exe -H "Authorization: Bearer <TOKEN>" "http://localhost:3000/api/reservas?estado=activa"
```

Decisiones de diseño importantes

- Atomicidad: utilice CTEs y `SELECT ... FOR UPDATE` para bloquear filas de `cuentas` cuando se modifica el saldo, evitando condiciones de carrera.
- En `transacciones` se usa `valor`, `saldo_anterior` y `saldo_posterior` (no `monto`).
- `recargas.medio` es un enum (`medio_pago`); el servidor valida y castea el valor:: `INSERT ... $4::medio_pago`.
- Constraint `chk_transaccion_fuente` en `transacciones` obliga a que exactamente uno de `recarga_id` o `parqueo_id` sea no nulo.

Debugging y troubleshooting

- Si obtienes errores sobre columnas que no existen (ej. `monto`), revisa los controladores para usar los nombres correctos (`valor`).
- Si recibes errores del enum (`la columna "medio" es de tipo medio_pago pero la expresión es de tipo text`), envía valores válidos del enum (ej. `tarjeta_credito`) o valida/castea en el servidor.
- En Android emulator usa `http://10.0.2.2:3000` para llamar al backend local; en iOS simulator usa `http://127.0.0.1:3000`.

Pruebas y calidad

- Añadir tests de integración para flujos críticos: recargas y creación de reservas.
- Validar límites y sanitización de entrada (ej. montos numéricos, horas reservadas > 0).

Contribuir

- Forkea el repo, crea una rama feature y abre un Pull Request contra `main`.
- Mantén commits pequeños y con mensajes claros. Añade tests cuando cambies lógica crítica.

Contacto

- Para preguntas sobre este repo: sherman.2003.a@gmail.com

---

Gracias por usar/colaborar en TuParKing.


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
