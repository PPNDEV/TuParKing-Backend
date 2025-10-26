const express = require('express');
const router = express.Router();
const transaccionesController = require('../controllers/transaccionesController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Recargar saldo
router.post('/recarga', transaccionesController.recargarSaldo);

// Obtener historial de transacciones
router.get('/', transaccionesController.obtenerTransacciones);

module.exports = router;