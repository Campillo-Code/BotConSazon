const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
    });
    console.log('[DB] Conectado a MySQL');
  }
  return pool;
}

async function getCategorias() {
  const p = await getPool();
  const [rows] = await p.execute(
    'SELECT id, nombre, precio, plus FROM caja_categorias WHERE activa = 1 ORDER BY orden'
  );
  return rows;
}

async function getPlatosPorCategoria(categoriaId) {
  const p = await getPool();
  const [rows] = await p.execute(
    'SELECT cp.id, cp.nombre, cp.receta_id FROM caja_platos cp WHERE cp.categoria_id = ? AND cp.activo = 1 ORDER BY cp.nombre',
    [categoriaId]
  );
  return rows;
}

async function getTodosPlatos() {
  const p = await getPool();
  const [rows] = await p.execute(
    'SELECT cp.id, cp.nombre, cp.categoria_id, c.nombre AS categoria_nombre FROM caja_platos cp INNER JOIN caja_categorias c ON cp.categoria_id = c.id WHERE cp.activo = 1 ORDER BY c.orden, cp.nombre'
  );
  return rows;
}

async function crearPedido({ telefono, nombre, items, total, notas }) {
  const p = await getPool();
  const [result] = await p.execute(
    'INSERT INTO whatsapp_pedidos (telefono, nombre_cliente, items, total, notas, estado) VALUES (?, ?, ?, ?, ?, ?)',
    [telefono, nombre || null, JSON.stringify(items), total, notas || null, 'pendiente']
  );
  return result.insertId;
}

async function getPedido(id) {
  const p = await getPool();
  const [rows] = await p.execute(
    'SELECT * FROM whatsapp_pedidos WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function actualizarEstadoPedido(id, estado) {
  const p = await getPool();
  await p.execute(
    'UPDATE whatsapp_pedidos SET estado = ? WHERE id = ?',
    [estado, id]
  );
}

module.exports = {
  getPool,
  getCategorias,
  getPlatosPorCategoria,
  getTodosPlatos,
  crearPedido,
  getPedido,
  actualizarEstadoPedido,
};
