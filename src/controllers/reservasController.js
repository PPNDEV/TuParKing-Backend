const { pool } = require('../config/database');

// Crear una nueva reserva
exports.crearReserva = async (req, res) => {
  const client = await pool.connect();

  try {
    const usuarioId = req.usuario.id;
    const { vehiculo_id, parqueadero_id, horas_reservadas, duracion_horas } = req.body;

    // Aceptar tanto 'horas_reservadas' como 'duracion_horas'
    const horasReservadas = horas_reservadas || duracion_horas;

    console.log('📥 Datos recibidos:', { usuarioId, vehiculo_id, parqueadero_id, horasReservadas });

    if (!vehiculo_id || !parqueadero_id || !horasReservadas) {
      return res.status(400).json({
        error: 'Faltan datos requeridos',
        recibido: { vehiculo_id, parqueadero_id, horasReservadas }
      });
    }

    const horasInt = parseInt(horasReservadas, 10);
    if (!Number.isFinite(horasInt) || horasInt <= 0) {
      return res.status(400).json({ error: 'horas_reservadas inválidas' });
    }

    await client.query('BEGIN');

    // Verificar que el parqueadero existe y tiene espacios
    const parqueadero = await client.query(
      'SELECT * FROM parqueaderos WHERE id = $1 AND activo = true',
      [parqueadero_id]
    );
    if (parqueadero.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Parqueadero no encontrado' });
    }

    // Calcular costo
    const precioHora = parseFloat(parqueadero.rows[0].precio_por_hora);
    const costoTotal = precioHora * horasInt;
    console.log('💰 Costo calculado:', costoTotal);

    // Obtener cuenta y bloquear fila para evitar condiciones de carrera
    const cuentaRes = await client.query(
      'SELECT id, saldo FROM cuentas WHERE usuario_id = $1 FOR UPDATE',
      [usuarioId]
    );

    if (cuentaRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    const cuentaId = cuentaRes.rows[0].id;
    const saldoAnterior = parseFloat(cuentaRes.rows[0].saldo);

    if (saldoAnterior < costoTotal) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Saldo insuficiente',
        saldo_actual: saldoAnterior,
        costo_reserva: costoTotal
      });
    }

    // Crear reserva
    const fechaInicio = new Date();
    const reserva = await client.query(
      `INSERT INTO reservas (usuario_id, vehiculo_id, parqueadero_id, fecha_inicio, horas_reservadas, costo_total, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'activa')
       RETURNING *`,
      [usuarioId, vehiculo_id, parqueadero_id, fechaInicio, horasInt, costoTotal]
    );

    console.log('✅ Reserva creada:', reserva.rows[0].id);

    // Crear registro en parqueos para asociarlo a la transacción (cumple constraint)
    const duracionMin = horasInt * 60;
    const parqueoIns = await client.query(
      `INSERT INTO parqueos (vehiculo_id, costo, duracion_minutos)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [vehiculo_id, costoTotal, duracionMin]
    );
    const parqueoId = parqueoIns.rows[0].id;

    // Descontar saldo y obtener nuevo saldo
    const nuevoSaldo = saldoAnterior - costoTotal;
    await client.query(
      'UPDATE cuentas SET saldo = $1, updated_at = NOW() WHERE usuario_id = $2',
      [nuevoSaldo, usuarioId]
    );

    // Registrar transacción (tipo enum: 'parqueo', usa valor y saldos correctos)
    await client.query(
      `INSERT INTO transacciones (cuenta_id, parqueo_id, tipo, valor, saldo_anterior, saldo_posterior)
       VALUES ($1, $2, $3::tipo_transaccion, $4, $5, $6)`,
      [cuentaId, parqueoId, 'parqueo', costoTotal, saldoAnterior, nuevoSaldo]
    );

    // Reducir espacios disponibles (seguro)
    const updEspacios = await client.query(
      `UPDATE parqueaderos
       SET espacios_disponibles = espacios_disponibles - 1
       WHERE id = $1 AND espacios_disponibles > 0
       RETURNING espacios_disponibles`,
      [parqueadero_id]
    );

    if (updEspacios.rows.length === 0) {
      // No había cupo al momento de actualizar; revertir todo
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No hay espacios disponibles' });
    }

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Reserva creada exitosamente',
      reserva: reserva.rows[0],
      saldo_posterior: nuevoSaldo
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear reserva:', error);
    res.status(500).json({ error: 'Error al crear reserva' });
  } finally {
    client.release();
  }
};

// Obtener reservas del usuario
exports.obtenerReservas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { estado } = req.query;

    let query = `
      SELECT r.*, p.nombre as parqueadero_nombre, p.direccion as parqueadero_direccion,
             v.placa as vehiculo_placa
      FROM reservas r
      JOIN parqueaderos p ON r.parqueadero_id = p.id
      JOIN vehiculos v ON r.vehiculo_id = v.id
      WHERE r.usuario_id = $1
    `;

    const params = [usuarioId];

    if (estado) {
      query += ' AND r.estado = $2';
      params.push(estado);
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ reservas: result.rows });
  } catch (error) {
    console.error('❌ Error al obtener reservas:', error);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
};

// Finalizar reserva
exports.finalizarReserva = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    await client.query('BEGIN');

    const reserva = await client.query(
      'SELECT * FROM reservas WHERE id = $1 AND usuario_id = $2 AND estado = $3',
      [id, usuarioId, 'activa']
    );

    if (reserva.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Actualizar reserva
    await client.query(
      'UPDATE reservas SET estado = $1, fecha_fin = NOW(), updated_at = NOW() WHERE id = $2',
      ['completada', id]
    );

    // Liberar espacio
    await client.query(
      'UPDATE parqueaderos SET espacios_disponibles = espacios_disponibles + 1 WHERE id = $1',
      [reserva.rows[0].parqueadero_id]
    );

    await client.query('COMMIT');

    res.json({ mensaje: 'Reserva finalizada exitosamente' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al finalizar reserva:', error);
    res.status(500).json({ error: 'Error al finalizar reserva' });
  } finally {
    client.release();
  }
};

module.exports = exports;