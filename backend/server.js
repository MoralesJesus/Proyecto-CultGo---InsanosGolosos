require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Endpoint para guardar un evento
app.post('/api/eventos', async (req, res) => {
  const { nombre, artista, genero, fecha, hora, lugar, direccion, latitud, longitud, descripcion } = req.body;

  const query = `
    INSERT INTO eventos_cultgo
    (nombre, artista, genero, fecha, hora, lugar, direccion, latitud, longitud, descripcion)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const values = [nombre, artista, genero, fecha, hora, lugar, direccion, latitud, longitud, descripcion];

  try {
    const resultado = await pool.query(query, values);
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error('Error insertando el evento:', error);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
});

app.listen(3000, () => console.log('Servidor corriendo en el puerto 3000'));