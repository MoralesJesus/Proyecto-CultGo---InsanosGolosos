require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { requiereAdmin } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

// Campos del evento: nombre en la API (frontend) -> columna en PostgreSQL
const CAMPOS = {
  nombre: 'nombre',
  artista: 'artista',
  genero: 'genero',
  fecha: 'fecha',
  hora: 'hora',
  lugar: 'lugar',
  direccion: 'direccion',
  latitud: 'latitud',
  longitud: 'longitud',
  descripcion: 'descripcion',
  estado: 'estado',
  enlaceSpotify: 'enlace_spotify',
  enlaceYoutube: 'enlace_youtube',
  imagen: 'imagen',
};
const OBLIGATORIOS = ['nombre', 'artista', 'fecha'];
const ESTADOS_VALIDOS = ['activo', 'reprogramado', 'cancelado', 'finalizado'];

// Fila de PostgreSQL -> objeto que espera el frontend
const aEvento = (fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  artista: fila.artista,
  genero: fila.genero ?? '',
  fecha: fila.fecha,
  hora: fila.hora ?? '',
  lugar: fila.lugar ?? '',
  direccion: fila.direccion ?? '',
  latitud: fila.latitud === null ? null : Number(fila.latitud),
  longitud: fila.longitud === null ? null : Number(fila.longitud),
  descripcion: fila.descripcion ?? '',
  estado: fila.estado,
  enlaceSpotify: fila.enlace_spotify ?? undefined,
  enlaceYoutube: fila.enlace_youtube ?? undefined,
  imagen: fila.imagen ?? undefined,
  actualizadoEn: fila.actualizado_en,
});

const fechaValida = (texto) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto ?? '');
  if (!m) return false;
  const fecha = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return fecha.getDate() === Number(m[1]) && fecha.getMonth() === Number(m[2]) - 1;
};

// Revisa los datos de un evento. Ojo: NO se rechazan fechas pasadas,
// los administradores necesitan poder editar y reprogramar eventos expirados.
const validarEvento = (datos) => {
  const errores = [];
  for (const campo of OBLIGATORIOS) {
    if (campo in datos && !String(datos[campo] ?? '').trim()) errores.push(`El campo ${campo} es obligatorio`);
  }
  if ('fecha' in datos && datos.fecha && !fechaValida(datos.fecha)) {
    errores.push('La fecha debe tener el formato DD/MM/YYYY');
  }
  // acepta "20:00" o "8:00 PM" (el panel guarda la hora en formato de 12 horas)
  if ('hora' in datos && datos.hora && !/^\d{1,2}:\d{2}(\s?(AM|PM))?$/i.test(datos.hora)) {
    errores.push('La hora debe ser como "20:00" o "8:00 PM"');
  }
  if ('estado' in datos && !ESTADOS_VALIDOS.includes(datos.estado)) {
    errores.push(`El estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);
  }
  for (const [campo, limite] of [['latitud', 90], ['longitud', 180]]) {
    if (campo in datos && datos[campo] !== null) {
      const valor = Number(datos[campo]);
      if (Number.isNaN(valor) || Math.abs(valor) > limite) errores.push(`${campo} invalida`);
    }
  }
  return errores;
};

const errorBD = (res, contexto, error) => {
  console.error(`Error ${contexto}:`, error);
  res.status(500).json({ error: 'Error en la base de datos' });
};

const leerId = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Id de evento invalido' });
    return null;
  }
  return id;
};

// ---------- Eventos ----------

// Listar eventos (publico)
app.get('/api/eventos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM eventos_cultgo ORDER BY id;');
    res.json(rows.map(aEvento));
  } catch (error) {
    errorBD(res, 'consultando los eventos', error);
  }
});

// Crear un evento (solo administradores)
app.post('/api/eventos', requiereAdmin, async (req, res) => {
  const datos = req.body ?? {};
  const faltantes = OBLIGATORIOS.filter((c) => !(c in datos));
  const errores = [...faltantes.map((c) => `El campo ${c} es obligatorio`), ...validarEvento(datos)];
  if (errores.length) return res.status(400).json({ error: errores.join('. ') });

  const campos = Object.keys(CAMPOS).filter((c) => datos[c] !== undefined);
  const query = `
    INSERT INTO eventos_cultgo (${campos.map((c) => CAMPOS[c]).join(', ')})
    VALUES (${campos.map((_, i) => `$${i + 1}`).join(', ')})
    RETURNING *;
  `;
  try {
    const { rows } = await pool.query(query, campos.map((c) => datos[c]));
    res.status(201).json(aEvento(rows[0]));
  } catch (error) {
    errorBD(res, 'insertando el evento', error);
  }
});

// Editar un evento (solo administradores), incluso si su fecha ya paso.
// PUT reemplaza el evento completo (los campos opcionales que no vengan quedan vacios);
// PATCH solo cambia los campos que se envien.
const actualizarEvento = (reemplazar) => async (req, res) => {
  const id = leerId(req, res);
  if (id === null) return;

  const datos = { ...(req.body ?? {}) };
  if (reemplazar) {
    const faltantes = OBLIGATORIOS.filter((c) => !(c in datos));
    if (faltantes.length) return res.status(400).json({ error: `Faltan campos: ${faltantes.join(', ')}` });
    for (const campo of Object.keys(CAMPOS)) {
      if (datos[campo] === undefined && campo !== 'estado') datos[campo] = null;
    }
  }

  const campos = Object.keys(CAMPOS).filter((c) => datos[c] !== undefined);
  if (!campos.length) return res.status(400).json({ error: 'No se envio ningun campo para actualizar' });

  const errores = validarEvento(datos);
  if (errores.length) return res.status(400).json({ error: errores.join('. ') });

  const query = `
    UPDATE eventos_cultgo
    SET ${campos.map((c, i) => `${CAMPOS[c]} = $${i + 1}`).join(', ')}, actualizado_en = NOW()
    WHERE id = $${campos.length + 1}
    RETURNING *;
  `;
  try {
    const { rows } = await pool.query(query, [...campos.map((c) => datos[c]), id]);
    if (!rows.length) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(aEvento(rows[0]));
  } catch (error) {
    errorBD(res, 'actualizando el evento', error);
  }
};

// Eliminar un evento (solo administradores)
const eliminarEvento = async (req, res) => {
  const id = leerId(req, res);
  if (id === null) return;
  try {
    const { rowCount } = await pool.query('DELETE FROM eventos_cultgo WHERE id = $1;', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Evento no encontrado' });
    res.status(204).end();
  } catch (error) {
    errorBD(res, 'eliminando el evento', error);
  }
};

// /api/eventos es la ruta del proyecto; /api/events es un alias en ingles
for (const ruta of ['/api/eventos/:id', '/api/events/:id']) {
  app.put(ruta, requiereAdmin, actualizarEvento(true));
  app.patch(ruta, requiereAdmin, actualizarEvento(false));
  app.delete(ruta, requiereAdmin, eliminarEvento);
}

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => console.log(`Servidor corriendo en el puerto ${PUERTO}`));
