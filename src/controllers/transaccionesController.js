'use strict';

const pool = require('../config/database');

// Obtener cuenta del usuario autenticado
async function obtenerCuenta(req, res) {
  try {
    const usuario_id = req.usuario.id;

    const query = `
      SELECT c.*, u.nombre, u.correo AS email
      FROM cuentas c
      INNER JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.usuario_id = $1
    `;

    const result = await pool.query(query, [usuario_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    res.status(200).json({ cuenta: result.rows[0] });
  } catch (error) {
    console.error('❌ Error al obtener cuenta:', error);
    res.status(500).json({ error: 'Error al obtener información de la cuenta' });
  }
}

// Recargar saldo (CTE atómica, valida enum medio_pago)
async function recargarSaldo(req, res) {
  try {
    const usuario_id = req.usuario.id;
    const { monto, metodo_pago = 'tarjeta', medio } = req.body;

    const valor = Number(monto);
    if (!Number.isFinite(valor) || valor <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    // Cargar labels válidos del enum "medio_pago"
    const enumSql = `
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'medio_pago'
      ORDER BY e.enumsortorder
    `;
    const { rows: enumRows } = await pool.query(enumSql);
    const mediosValidos = enumRows.map(r => r.enumlabel);

    // Normalizar entrada (permitir alias simples)
    const alias = {
      tarjeta: 'tarjeta_credito',
      credito: 'tarjeta_credito',
      debito: 'tarjeta_debito'
    };
    const medioInput = typeof medio === 'string' ? medio.trim() : '';
    const medioNormalizado = alias[medioInput] || medioInput;

    // Elegir un valor válido del enum o usar fallback seguro
    const medioFinal = mediosValidos.includes(medioNormalizado)
      ? medioNormalizado
      : (mediosValidos.includes('tarjeta_credito') ? 'tarjeta_credito' : mediosValidos[0]);

    const sql = `
      WITH cuenta AS (
        SELECT id, saldo
        FROM cuentas
        WHERE usuario_id = $1
        FOR UPDATE
      ),
      updated AS (
        UPDATE cuentas c
        SET saldo = c.saldo + $2
        FROM cuenta
        WHERE c.id = cuenta.id
        RETURNING
          c.id AS cuenta_id,
          cuenta.saldo AS saldo_anterior,
          c.saldo AS saldo_posterior
      ),
      recarga AS (
        INSERT INTO recargas (cuenta_id, valor, metodo_pago, medio, estado)
        SELECT u.cuenta_id, $2, $3, $4::medio_pago, 'completada'
        FROM updated u
        RETURNING id
      ),
      trans AS (
        INSERT INTO transacciones (cuenta_id, recarga_id, tipo, valor, saldo_anterior, saldo_posterior)
        SELECT u.cuenta_id, r.id, 'recarga'::tipo_transaccion, $2, u.saldo_anterior, u.saldo_posterior
        FROM updated u
        CROSS JOIN recarga r
        RETURNING *
      )
      SELECT row_to_json(t) AS transaccion, u.saldo_posterior AS nuevo_saldo
      FROM trans t
      JOIN updated u ON u.cuenta_id = t.cuenta_id
    `;

    const { rows } = await pool.query(sql, [usuario_id, valor, metodo_pago, medioFinal]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    const { transaccion, nuevo_saldo } = rows[0];

    res.status(200).json({
      mensaje: 'Recarga exitosa',
      transaccion,
      nuevo_saldo: Number(nuevo_saldo)
    });
  } catch (error) {
    console.error('❌ Error al recargar saldo:', error);
    res.status(500).json({ error: error.message || 'Error al procesar la recarga' });
  }
}

// Obtener historial de transacciones
async function obtenerTransacciones(req, res) {
  try {
    const usuario_id = req.usuario.id;
    const { tipo, limite = 50 } = req.query;

    // Validar limite
    const limitNum = Math.min(Math.max(parseInt(limite, 10) || 50, 1), 1000);

    // Validar tipo (enum tipo_transaccion)
    const tiposValidos = ['recarga', 'parqueo'];
    let tipoFiltro = null;
    if (typeof tipo === 'string' && tipo.trim().length > 0) {
      const t = tipo.trim();
      if (!tiposValidos.includes(t)) {
        return res.status(400).json({ error: `Tipo inválido. Permitidos: ${tiposValidos.join(', ')}` });
      }
      tipoFiltro = t;
    }

    // Obtener cuenta_id del usuario
    const cuentaQuery = 'SELECT id FROM cuentas WHERE usuario_id = $1';
    const cuentaResult = await pool.query(cuentaQuery, [usuario_id]);

    if (cuentaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    const cuenta_id = cuentaResult.rows[0].id;

    let query = `
      SELECT
        t.*,
        r.estado AS estado_recarga,
        r.metodo_pago,
        r.medio
      FROM transacciones t
      LEFT JOIN recargas r ON t.recarga_id = r.id
      WHERE t.cuenta_id = $1
    `;

    const params = [cuenta_id];

    if (tipoFiltro) {
      query += ` AND t.tipo = $2::tipo_transaccion`;
      params.push(tipoFiltro);
    }

    query += ` ORDER BY t.fecha DESC LIMIT $${params.length + 1}`;
    params.push(limitNum);

    const result = await pool.query(query, params);

    res.status(200).json({ transacciones: result.rows });
  } catch (error) {
    console.error('❌ Error al obtener transacciones:', error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
}

module.exports = {
  obtenerCuenta,
  recargarSaldo,
  obtenerTransacciones
};