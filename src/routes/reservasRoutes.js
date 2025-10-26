const express = require('express');
const router = express.Router();
const reservasController = require('../controllers/reservasController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Crear una nueva reserva
router.post('/', reservasController.crearReserva);

// Obtener reservas del usuario
router.get('/', reservasController.obtenerReservas);

// Finalizar una reserva
router.put('/:id/finalizar', reservasController.finalizarReserva);

module.exports = router;