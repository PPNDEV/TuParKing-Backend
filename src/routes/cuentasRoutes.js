const express = require('express');
const router = express.Router();
const cuentasController = require('../controllers/cuentasController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Obtener cuenta del usuario
router.get('/', cuentasController.obtenerCuenta);

// TEMPORAL: Recargar saldo (solo para desarrollo)
router.post('/recargar', cuentasController.recargarSaldo);

// Obtener historial de transacciones
router.get('/transacciones', cuentasController.obtenerTransacciones);

module.exports = router;