// Ejecuta en orden todos los archivos .sql de la carpeta migraciones/
// Uso: npm run migrar
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const pool = require('../db');

const carpeta = path.join(__dirname, '..', 'migraciones');

(async () => {
  const archivos = fs.readdirSync(carpeta).filter((f) => f.endsWith('.sql')).sort();
  try {
    for (const archivo of archivos) {
      const sql = fs.readFileSync(path.join(carpeta, archivo), 'utf8');
      await pool.query(sql);
      console.log(`Migracion aplicada: ${archivo}`);
    }
  } catch (error) {
    console.error('Error aplicando migraciones:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
