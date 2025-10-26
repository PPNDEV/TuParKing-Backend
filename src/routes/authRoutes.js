const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/authMiddleware');
const { 
  registro, 
  login, 
  obtenerPerfil, 
  actualizarPerfil 
} = require('../controllers/authController');

// Rutas públicas (no requieren autenticación)
router.post('/registro', registro);
router.post('/login', login);

// Rutas protegidas (requieren token JWT)
router.get('/perfil', verificarToken, obtenerPerfil);
router.put('/perfil', verificarToken, actualizarPerfil);

module.exports = router;