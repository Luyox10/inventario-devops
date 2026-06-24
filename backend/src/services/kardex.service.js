const { pool } = require('../config/db');

async function getKardex({ productoId, desde, hasta }) {
  const [productoRows] = await pool.query(
    `SELECT id, nombre, sku, unidad, precio, stock_actual, stock_minimo, expiry_date
     FROM productos WHERE id = ? AND activo = 1`,
    [productoId]
  );
  if (!productoRows.length) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
  const producto = productoRows[0];

  const params = [productoId];
  let whereFecha = '';

  if (desde) {
    whereFecha += ' AND m.created_at >= ?';
    params.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    whereFecha += ' AND m.created_at <= ?';
    params.push(`${hasta} 23:59:59`);
  }

  let saldoInicial = 0;
  if (desde) {
    const [siRows] = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN cantidad ELSE -cantidad END), 0) AS saldo
       FROM movimientos
       WHERE producto_id = ? AND created_at < ?`,
      [productoId, `${desde} 00:00:00`]
    );
    saldoInicial = Number(siRows[0]?.saldo || 0);
  }

  const [rows] = await pool.query(
    `SELECT
       m.id,
       m.created_at,
       m.tipo,
       m.cantidad,
       m.motivo,
       u.nombre AS usuario,
       m.venta_id
     FROM movimientos m
     LEFT JOIN usuarios u ON u.id = m.usuario_id
     WHERE m.producto_id = ?${whereFecha}
     ORDER BY m.created_at ASC, m.id ASC`,
    params
  );

  let saldo = saldoInicial;
  const movimientos = rows.map((r) => {
    if (r.tipo === 'ENTRADA') {
      saldo += Number(r.cantidad);
    } else {
      saldo -= Number(r.cantidad);
    }
    return {
      id: r.id,
      fecha: r.created_at,
      tipo: r.tipo,
      cantidad: Number(r.cantidad),
      saldo,
      usuario: r.usuario || '—',
      motivo: r.motivo || '—',
      venta_id: r.venta_id || null,
    };
  });

  const totalEntradas = movimientos
    .filter((m) => m.tipo === 'ENTRADA')
    .reduce((s, m) => s + m.cantidad, 0);
  const totalSalidas = movimientos
    .filter((m) => m.tipo === 'SALIDA')
    .reduce((s, m) => s + m.cantidad, 0);

  return {
    producto,
    saldo_inicial: saldoInicial,
    movimientos,
    resumen: {
      total_entradas: totalEntradas,
      total_salidas: totalSalidas,
      total_movimientos: movimientos.length,
      saldo_actual: Number(producto.stock_actual),
    },
  };
}

module.exports = { getKardex };
