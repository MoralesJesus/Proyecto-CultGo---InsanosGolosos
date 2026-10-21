// esta función va antes del 'return' en tu componente Home
const migrarDatosABD = async () => {
  for (const evento of eventosPrueba) {
    try {
      const respuesta = await fetch('http://localhost:3000/api/eventos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Enviamos el evento excluyendo el 'id' local, ya que Postgres generará uno nuevo con SERIAL
        body: JSON.stringify({
          nombre: evento.nombre,
          artista: evento.artista,
          genero: evento.genero,
          fecha: evento.fecha,
          hora: evento.hora,
          lugar: evento.lugar,
          direccion: evento.direccion,
          latitud: evento.latitud,
          longitud: evento.longitud,
          descripcion: evento.descripcion
        }),
      });

      if (respuesta.ok) {
        console.log(`Evento "${evento.nombre}" guardado con éxito.`);
      } else {
        console.error(`Error al guardar "${evento.nombre}".`);
      }
    } catch (error) {
      console.error('Error de red al conectar con el backend:', error);
    }
  }
  alert('Proceso de guardado finalizado. Revisa la consola.');
};
