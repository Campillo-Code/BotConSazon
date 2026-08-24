const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const sql = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf8');
  await conn.execute(sql);
  console.log('[Migrate] Tabla whatsapp_pedidos creada/verificada');
  await conn.end();
}

migrate().catch(e => { console.error(e); process.exit(1); });
