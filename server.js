const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARES GLOBALES
// =============================================================================

// Permitir peticiones desde cualquier origen (CORS)
app.use(cors());

// Parsear body de las peticiones en formato JSON
app.use(express.json());

// Parsear body de las peticiones en formato URL-encoded
app.use(express.urlencoded({ extended: true }));

// Middleware de logging - registra todas las peticiones
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// RUTAS BÁSICAS
// =============================================================================

// Ruta principal - Información de la API
app.get('/', (req, res) => {
  res.json({
    message: '🚗 TuParKing API',
    version: '1.0.0',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      vehiculos: '/api/vehiculos',
      parqueaderos: '/api/parqueaderos',
      reservas: '/api/reservas',
      transacciones: '/api/transacciones'
    }
  });
});

// Ruta de health check - Verificar que el servidor está funcionando
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// IMPORTAR Y USAR RUTAS
// =============================================================================

const authRoutes = require('./src/routes/authRoutes');
const vehiculosRoutes = require('./src/routes/vehiculosRoutes');
const parqueaderosRoutes = require('./src/routes/parqueaderosRoutes');
const reservasRoutes = require('./src/routes/reservasRoutes');
const transaccionesRoutes = require('./src/routes/transaccionesRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/parqueaderos', parqueaderosRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/transacciones', transaccionesRoutes);

// =============================================================================
// MANEJO DE ERRORES
// =============================================================================

// Ruta no encontrada (404)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// Error interno del servidor (500)
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// =============================================================================
// INICIAR SERVIDOR
// =============================================================================

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Servidor TuParKing corriendo`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📝 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Base de datos: ${process.env.DB_NAME || 'tuparking'}`);
  console.log('='.repeat(60));
  console.log('📡 Rutas disponibles:');
  console.log('   - POST   /api/auth/registro');
  console.log('   - POST   /api/auth/login');
  console.log('   - GET    /api/auth/perfil');
  console.log('   - GET    /api/vehiculos');
  console.log('   - POST   /api/vehiculos');
  console.log('   - DELETE /api/vehiculos/:id');
  console.log('   - GET    /api/parqueaderos');
  console.log('   - GET    /api/parqueaderos/:id');
  console.log('   - GET    /api/reservas');
  console.log('   - POST   /api/reservas');
  console.log('   - PUT    /api/reservas/:id/finalizar');
  console.log('   - GET    /api/transacciones');
  console.log('   - POST   /api/transacciones/recarga');
  console.log('='.repeat(60));
});

// =============================================================================
// MANEJO DE CIERRE GRACEFUL
// =============================================================================

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT recibido (Ctrl+C), cerrando servidor...');
  process.exit(0);
});