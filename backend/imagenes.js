// Fotos de los eventos subidas desde el panel de administracion.
//
// El navegador achica la foto antes de mandarla (maximo 1600 px de ancho) y la
// envia como texto base64 ("data:image/jpeg;base64,...") con el token del admin.
// Aqui se revisa que sea de verdad una imagen JPG, PNG o WEBP, se guarda en
// backend/uploads/ con un nombre al azar y se responde con su direccion:
//   { "url": "/uploads/3f2c....jpg" }
// Esa direccion es la que se guarda en el campo "imagen" del evento.
//
// Las fotos quedan en la computadora donde corre el backend (igual que la base
// de datos), por eso backend/uploads/ esta en el .gitignore.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const CARPETA = path.join(__dirname, 'uploads');
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB ya decodificada

// tipo de imagen -> extension y los primeros bytes que debe tener el archivo
const TIPOS = {
  'image/jpeg': { ext: 'jpg', esValido: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', esValido: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: 'webp', esValido: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
};

// se registra desde server.js ANTES de express.json(), porque esta ruta
// necesita aceptar un cuerpo mas grande que las demas
module.exports = (app, requiereAdmin) => {
  fs.mkdirSync(CARPETA, { recursive: true });

  // las fotos se sirven como archivos normales: http://localhost:3000/uploads/<nombre>
  app.use(
    '/uploads',
    express.static(CARPETA, {
      maxAge: '7d',
      index: false,
      setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff'),
    })
  );

  app.post('/api/imagenes', express.json({ limit: '5mb' }), requiereAdmin, async (req, res) => {
    const datos = String(req.body?.datos ?? '');
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(datos);
    if (!m) {
      return res.status(400).json({ error: 'Manda una imagen JPG, PNG o WEBP' });
    }

    const tipo = TIPOS[m[1]];
    const bytes = Buffer.from(m[2], 'base64');
    if (bytes.length > MAX_BYTES) {
      return res.status(413).json({ error: 'La imagen pesa más de 3 MB' });
    }
    if (!tipo.esValido(bytes)) {
      return res.status(400).json({ error: 'El archivo no es una imagen válida' });
    }

    const nombre = `${crypto.randomUUID()}.${tipo.ext}`;
    try {
      await fs.promises.writeFile(path.join(CARPETA, nombre), bytes);
    } catch (error) {
      console.error('Error guardando la imagen:', error);
      return res.status(500).json({ error: 'No se pudo guardar la imagen' });
    }
    res.status(201).json({ url: `/uploads/${nombre}` });
  });

  // un archivo demasiado grande llega aqui antes de la ruta: se responde claro
  app.use('/api/imagenes', (error, req, res, next) => {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'La imagen es demasiado grande' });
    }
    next(error);
  });
};
