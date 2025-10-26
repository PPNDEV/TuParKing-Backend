const db = require('../config/database');

exports.obtenerVehiculos = async (req, res) => {
  try {
    console.log('📥 Obteniendo vehículos para usuario:', req.usuario.id);
    
    const usuarioId = req.usuario.id;

    const result = await db.query(
      'SELECT * FROM vehiculos WHERE usuario_id = $1 ORDER BY created_at DESC',
      [usuarioId]
    );

    console.log('✅ Vehículos encontrados:', result.rows.length);

    res.json({ vehiculos: result.rows });
  } catch (error) {
    console.error('❌ Error al obtener vehículos:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ error: 'Error al obtener vehículos' });
  }
};

// ...existing code...
// Agregar un nuevo vehículo
exports.agregarVehiculo = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { placa, marca, color } = req.body;

    if (!placa) {
      return res.status(400).json({ error: 'La placa es obligatoria' });
    }

    // Verificar si ya existe un vehículo con esa placa para este usuario
    const existente = await db.query(
      'SELECT * FROM vehiculos WHERE usuario_id = $1 AND placa = $2',
      [usuarioId, placa]
    );

    if (existente.rows.length > 0) {
      return res.status(400).json({ error: 'Ya tienes un vehículo con esta placa' });
    }

    const resultado = await db.query(
      'INSERT INTO vehiculos (usuario_id, placa, marca, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [usuarioId, placa, marca || null, color || null]
    );

    res.status(201).json({
      mensaje: 'Vehículo agregado correctamente',
      vehiculo: resultado.rows[0]
    });
  } catch (error) {
    console.error('Error al agregar vehículo:', error);
    res.status(500).json({ error: 'Error al agregar vehículo' });
  }
};

// Eliminar un vehículo
exports.eliminarVehiculo = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { id } = req.params;

    const resultado = await db.query(
      'DELETE FROM vehiculos WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    res.json({ mensaje: 'Vehículo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar vehículo:', error);
    res.status(500).json({ error: 'Error al eliminar vehículo' });
  }
};