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

async function getPlatosPorCategoria(categoriaId, tipo) {
  const p = await getPool();
  const activoFilter = tipo === 'encargo' ? "AND COALESCE(cp.activo_encargo, TRUE) = 1" : "AND COALESCE(cp.activo_pedido, TRUE) = 1";
  const tipoFilter = tipo === 'encargo' ? "AND (r.tipo_receta = 'encargo' OR r.tipo_receta = 'ambos')" : "AND (r.tipo_receta = 'pedido' OR r.tipo_receta = 'ambos' OR r.tipo_receta IS NULL)";
  const [rows] = await p.execute(
    `SELECT cp.id, cp.nombre, cp.receta_id, r.precio_venta_entero FROM caja_platos cp LEFT JOIN recetas r ON cp.receta_id = r.id WHERE cp.categoria_id = ? AND cp.activo = 1 ${activoFilter} ${tipoFilter} ORDER BY cp.nombre`,
    [categoriaId]
  );
  return rows;
}

async function getTodosPlatos(tipo) {
  const p = await getPool();
  const activoFilter = tipo === 'encargo' ? "AND COALESCE(cp.activo_encargo, TRUE) = 1" : "AND COALESCE(cp.activo_pedido, TRUE) = 1";
  const tipoFilter = tipo === 'encargo' ? "AND (r.tipo_receta = 'encargo' OR r.tipo_receta = 'ambos')" : "AND (r.tipo_receta = 'pedido' OR r.tipo_receta = 'ambos' OR r.tipo_receta IS NULL)";
  const [rows] = await p.execute(
    `SELECT cp.id, cp.nombre, cp.categoria_id, c.nombre AS categoria_nombre, r.precio_venta_entero FROM caja_platos cp INNER JOIN caja_categorias c ON cp.categoria_id = c.id LEFT JOIN recetas r ON cp.receta_id = r.id WHERE cp.activo = 1 ${activoFilter} ${tipoFilter} ORDER BY c.orden, cp.nombre`
  );
  return rows;
}

async function crearPedido({ telefono, nombre, items, total, notas, tipo, fecha_entrega }) {
  const p = await getPool();
  const [result] = await p.execute(
    'INSERT INTO whatsapp_pedidos (telefono, nombre_cliente, items, total, notas, tipo, estado, fecha_entrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [telefono, nombre || null, JSON.stringify(items), total, notas || null, tipo || 'pedido', 'pendiente', fecha_entrega || null]
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

async function guardarMensaje(telefono, mensaje, direccion) {
  const p = await getPool();
  await p.execute(
    'INSERT INTO whatsapp_messages (telefono, mensaje, direccion) VALUES (?, ?, ?)',
    [telefono, mensaje, direccion]
  );
}

async function getMensajes(telefono, limite) {
  const p = await getPool();
  const [rows] = await p.execute(
    'SELECT id, telefono, mensaje, direccion, DATE_FORMAT(created_at, "%Y-%m-%d %H:%i") AS fecha FROM whatsapp_messages WHERE telefono = ? ORDER BY created_at ASC LIMIT ?',
    [telefono, limite || 50]
  );
  return rows;
}

async function getConversaciones() {
  const p = await getPool();
  const [rows] = await p.execute(
    `SELECT telefono, MAX(created_at) AS ultima_fecha, COUNT(*) AS total_mensajes
     FROM whatsapp_messages
     GROUP BY telefono
     ORDER BY ultima_fecha DESC`
  );
  return rows;
}

module.exports = {
  getPool,
  getCategorias,
  getPlatosPorCategoria,
  getTodosPlatos,
  crearPedido,
  getPedido,
  actualizarEstadoPedido,
  guardarMensaje,
  getMensajes,
  getConversaciones,
};
