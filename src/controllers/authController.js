const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// =============================================================================
// REGISTRO DE USUARIO
// =============================================================================
const registro = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { cedula, correo, nombre, telefono, clave } = req.body;

    // Validar que los campos requeridos existan
    if (!cedula || !correo || !nombre || !clave) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: cedula, correo, nombre, clave' 
      });
    }

    // Iniciar transacción
    await client.query('BEGIN');

    // Verificar si el usuario ya existe
    const usuarioExistente = await client.query(
      'SELECT id FROM usuarios WHERE cedula = $1 OR correo = $2',
      [cedula, correo]
    );

    if (usuarioExistente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'El usuario ya existe con esa cédula o correo' 
      });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const claveHash = await bcrypt.hash(clave, salt);

    // Insertar usuario
    const resultUsuario = await client.query(
      `INSERT INTO usuarios (cedula, correo, nombre, telefono, clave_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, cedula, correo, nombre, telefono, created_at`,
      [cedula, correo, nombre, telefono || null, claveHash]
    );

    const usuario = resultUsuario.rows[0];

    // Crear cuenta asociada con saldo inicial de 0
    const resultCuenta = await client.query(
      `INSERT INTO cuentas (usuario_id, saldo, created_at, updated_at)
       VALUES ($1, 0.00, NOW(), NOW())
       RETURNING id, saldo`,
      [usuario.id]
    );

    const cuenta = resultCuenta.rows[0];

    // Confirmar transacción
    await client.query('COMMIT');

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id, 
        correo: usuario.correo,
        nombre: usuario.nombre 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ Usuario registrado: ${usuario.correo}`);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      usuario: {
        id: usuario.id,
        cedula: usuario.cedula,
        correo: usuario.correo,
        nombre: usuario.nombre,
        telefono: usuario.telefono,
        cuenta_id: cuenta.id,
        saldo: parseFloat(cuenta.saldo)
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en registro:', error);
    res.status(500).json({ 
      error: 'Error al registrar usuario',
      detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// =============================================================================
// LOGIN DE USUARIO
// =============================================================================
const login = async (req, res) => {
  try {
    const { correo, clave } = req.body;

    // Validar campos requeridos
    if (!correo || !clave) {
      return res.status(400).json({ 
        error: 'Correo y contraseña son requeridos' 
      });
    }

    // Buscar usuario por correo
    const result = await pool.query(
      `SELECT u.*, c.id as cuenta_id, c.saldo 
       FROM usuarios u
       LEFT JOIN cuentas c ON u.id = c.usuario_id
       WHERE u.correo = $1`,
      [correo]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    const usuario = result.rows[0];

    // Verificar contraseña
    const claveValida = await bcrypt.compare(clave, usuario.clave_hash);

    if (!claveValida) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id, 
        correo: usuario.correo,
        nombre: usuario.nombre 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ Login exitoso: ${usuario.correo}`);

    res.json({
      message: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        cedula: usuario.cedula,
        correo: usuario.correo,
        nombre: usuario.nombre,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        fecha_nacimiento: usuario.fecha_nacimiento,
        foto_url: usuario.foto_url,
        cuenta_id: usuario.cuenta_id,
        saldo: parseFloat(usuario.saldo || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ 
      error: 'Error al iniciar sesión',
      detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =============================================================================
// OBTENER PERFIL DEL USUARIO
// =============================================================================
const obtenerPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const result = await pool.query(
      `SELECT u.id, u.cedula, u.correo, u.nombre, u.telefono, 
              u.direccion, u.fecha_nacimiento, u.foto_url,
              c.id as cuenta_id, c.saldo
       FROM usuarios u
       LEFT JOIN cuentas c ON u.id = c.usuario_id
       WHERE u.id = $1`,
      [usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = result.rows[0];

    res.json({
      usuario: {
        id: usuario.id,
        cedula: usuario.cedula,
        correo: usuario.correo,
        nombre: usuario.nombre,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        fecha_nacimiento: usuario.fecha_nacimiento,
        foto_url: usuario.foto_url,
        cuenta_id: usuario.cuenta_id,
        saldo: parseFloat(usuario.saldo || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

// =============================================================================
// ACTUALIZAR PERFIL
// =============================================================================
const actualizarPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { nombre, telefono, direccion, fecha_nacimiento } = req.body;

    const result = await pool.query(
      `UPDATE usuarios 
       SET nombre = COALESCE($1, nombre),
           telefono = COALESCE($2, telefono),
           direccion = COALESCE($3, direccion),
           fecha_nacimiento = COALESCE($4, fecha_nacimiento),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, cedula, correo, nombre, telefono, direccion, fecha_nacimiento`,
      [nombre, telefono, direccion, fecha_nacimiento, usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`✅ Perfil actualizado: ${result.rows[0].correo}`);

    res.json({
      message: 'Perfil actualizado exitosamente',
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

module.exports = {
  registro,
  login,
  obtenerPerfil,
  actualizarPerfil
};