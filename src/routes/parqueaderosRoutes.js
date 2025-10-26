const express = require('express');
const router = express.Router();
const parqueaderosController = require('../controllers/parqueaderosController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Obtener todos los parqueaderos
router.get('/', parqueaderosController.obtenerParqueaderos);

// Obtener detalle de un parqueadero
router.get('/:id', parqueaderosController.obtenerParqueadero);

module.exports = router;