const { pool } = require('../config/database');

// Obtener todos los parqueaderos activos
exports.obtenerParqueaderos = async (req, res) => {
  try {
    const { latitud, longitud } = req.query;

    let query = `
      SELECT 
        id, 
        nombre, 
        direccion, 
        latitud, 
        longitud, 
        telefono,
        horario_apertura, 
        horario_cierre, 
        precio_por_hora,
        espacios_totales, 
        espacios_disponibles, 
        imagen_url, 
        descripcion
      FROM parqueaderos
      WHERE activo = true
    `;

    // Si se proporcionan coordenadas, ordenar por distancia
    if (latitud && longitud) {
      query += `
        ORDER BY (
          6371 * acos(
            cos(radians(${latitud})) * cos(radians(latitud)) *
            cos(radians(longitud) - radians(${longitud})) +
            sin(radians(${latitud})) * sin(radians(latitud))
          )
        ) ASC
      `;
    } else {
      query += ' ORDER BY nombre ASC';
    }

    const result = await pool.query(query);

    res.json({ parqueaderos: result.rows });
  } catch (error) {
    console.error('❌ Error al obtener parqueaderos:', error);
    res.status(500).json({ error: 'Error al obtener parqueaderos' });
  }
};

// Obtener detalle de un parqueadero
exports.obtenerParqueadero = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        id,
        nombre,
        direccion,
        latitud,
        longitud,
        telefono,
        horario_apertura,
        horario_cierre,
        precio_por_hora,
        espacios_totales,
        espacios_disponibles,
        imagen_url,
        descripcion
       FROM parqueaderos 
       WHERE id = $1 AND activo = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parqueadero no encontrado' });
    }

    // 👇 CAMBIO: Devolver envuelto en 'parqueadero' para mantener consistencia con el frontend
    res.json({ parqueadero: result.rows[0] });
  } catch (error) {
    console.error('❌ Error al obtener parqueadero:', error);
    res.status(500).json({ error: 'Error al obtener parqueadero' });
  }
};

module.exports = exports;