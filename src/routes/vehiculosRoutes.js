const express = require('express');
const router = express.Router();
const vehiculosController = require('../controllers/vehiculosController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/vehiculos - Obtener todos los vehículos del usuario
router.get('/', vehiculosController.obtenerVehiculos);

// POST /api/vehiculos - Agregar un nuevo vehículo
router.post('/', vehiculosController.agregarVehiculo);

// DELETE /api/vehiculos/:id - Eliminar un vehículo
router.delete('/:id', vehiculosController.eliminarVehiculo);

module.exports = router;