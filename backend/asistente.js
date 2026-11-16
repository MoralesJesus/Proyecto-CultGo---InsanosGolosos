// Asistente con IA: el usuario escribe algo como "quiero rock este fin de semana"
// y el asistente le contesta con eventos REALES de la base de datos.
//
// Como funciona (2 pasos):
//   1. La IA solo INTERPRETA el mensaje y devuelve filtros en JSON
//      (genero, texto, periodo). Las fechas las calcula este archivo, no la IA,
//      porque los modelos chicos se equivocan haciendo cuentas de dias.
//   2. Se buscan los eventos en PostgreSQL con esos filtros y la IA redacta
//      una respuesta corta usando SOLO esos eventos (asi no inventa nada).
//
// Proveedor de IA: cualquiera que hable el formato de OpenAI (Ollama, Groq,
// Gemini, OpenRouter...). Se cambia en backend/.env sin tocar codigo:
//   IA_URL=http://localhost:11434/v1   (Ollama en la misma laptop)
//   IA_MODELO=qwen2.5:7b
//   IA_CLAVE=                         (Ollama no necesita clave)

const IA_URL = (process.env.IA_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
const IA_MODELO = process.env.IA_MODELO || 'qwen2.5:7b';
const IA_CLAVE = process.env.IA_CLAVE || '';
const IA_TIEMPO_MAX = Number(process.env.IA_TIEMPO_MAX_MS) || 60000;

const MAX_MENSAJE = 300; // caracteres
const MAX_EVENTOS_RESPUESTA = 6;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const PERIODOS = [
  'hoy', 'manana', 'fin_de_semana', 'proximo_fin_de_semana', 'esta_semana',
  'proxima_semana', 'este_mes', 'proximo_mes', 'mes', 'fecha', 'pasados', 'cualquiera',
];

// ---------- fechas ----------

const inicioDelDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
const sumarDias = (fecha, dias) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
const aDma = (fecha) =>
  `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
const deDma = (texto) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(texto ?? '').trim());
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
};

// convierte el "periodo" que eligio la IA en un rango de fechas [desde, hasta]
const rangoDeFechas = ({ periodo, fecha, mes }, hoy) => {
  const dia = hoy.getDay(); // 0 = domingo
  // sabado de esta semana (si hoy es domingo, el fin de semana es hoy mismo)
  const sabado = dia === 0 ? sumarDias(hoy, -1) : sumarDias(hoy, 6 - dia);
  const lunes = sumarDias(hoy, dia === 0 ? -6 : 1 - dia);

  switch (periodo) {
    case 'hoy': return [hoy, hoy];
    case 'manana': return [sumarDias(hoy, 1), sumarDias(hoy, 1)];
    case 'fin_de_semana': return [dia === 0 ? hoy : sabado, sumarDias(sabado, 1)];
    case 'proximo_fin_de_semana': return [sumarDias(sabado, 7), sumarDias(sabado, 8)];
    case 'esta_semana': return [hoy, sumarDias(lunes, 6)];
    case 'proxima_semana': return [sumarDias(lunes, 7), sumarDias(lunes, 13)];
    case 'este_mes': return [hoy, new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)];
    case 'proximo_mes': return [
      new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1),
      new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0),
    ];
    case 'mes': {
      const numero = Number(mes);
      if (!Number.isInteger(numero) || numero < 1 || numero > 12) return [hoy, null];
      // si el mes ya paso este año, se toma el del año que viene
      const anio = numero - 1 < hoy.getMonth() ? hoy.getFullYear() + 1 : hoy.getFullYear();
      const inicio = new Date(anio, numero - 1, 1);
      // si es el mes actual, solo de hoy en adelante
      return [inicio < hoy ? hoy : inicio, new Date(anio, numero, 0)];
    }
    case 'fecha': {
      const exacta = deDma(fecha);
      return exacta ? [exacta, exacta] : [hoy, null];
    }
    case 'pasados': return [null, sumarDias(hoy, -1)];
    default: return [hoy, null]; // "cualquiera": solo eventos de hoy en adelante
  }
};

// ---------- distancia ----------

// distancia en km entre dos puntos (formula de Haversine, la misma de utils/distancia.ts)
const distanciaKm = (lat1, lon1, lat2, lon2) => {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// la ubicacion llega del navegador; se valida que sean numeros con sentido
const leerUbicacion = (ubicacion) => {
  const lat = Number(ubicacion?.lat);
  const lon = Number(ubicacion?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
};

// texto corto para mostrar: "350 m" o "2.4 km"
const formatoDistancia = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

// los modelos chicos a veces no marcan "cerca", asi que tambien se detecta con palabras clave
const PALABRAS_CERCA = /\b(cerca|cercan[oa]s?|cercania|alrededor|por aqui|a mi lado|mi ubicacion|donde estoy)\b/;
const pideCercania = (mensaje) => PALABRAS_CERCA.test(normalizar(mensaje));

// ---------- texto ----------

// minusculas y sin acentos, para comparar "Electrónica" con "electronica"
const normalizar = (texto) =>
  String(texto ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// ---------- llamada a la IA ----------

const preguntarIA = async (mensajes, { json = false, temperatura = 0.2 } = {}) => {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), IA_TIEMPO_MAX);
  try {
    const respuesta = await fetch(`${IA_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(IA_CLAVE ? { Authorization: `Bearer ${IA_CLAVE}` } : {}),
      },
      body: JSON.stringify({
        model: IA_MODELO,
        messages: mensajes,
        temperature: temperatura,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controlador.signal,
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '');
      throw new Error(`La IA respondio ${respuesta.status}: ${detalle.slice(0, 200)}`);
    }
    const datos = await respuesta.json();
    return datos.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(temporizador);
  }
};

// algunos modelos envuelven el JSON en ```json ... ```; aqui se limpia
const leerJSON = (texto) => {
  const inicio = texto.indexOf('{');
  const fin = texto.lastIndexOf('}');
  if (inicio === -1 || fin === -1) throw new Error('La IA no devolvio JSON');
  return JSON.parse(texto.slice(inicio, fin + 1));
};

// paso 1: mensaje del usuario -> filtros
const interpretar = async (mensaje, generos, hoy) => {
  const instrucciones = `Eres el asistente de CultGo!, una pagina de eventos musicales en Oaxaca de Juárez.
Tu unico trabajo es convertir el mensaje del usuario en filtros de busqueda. No contestes la pregunta.
Hoy es ${DIAS[hoy.getDay()]} ${aDma(hoy)}.
Generos que existen en la base de datos: ${generos.join(', ') || '(ninguno)'}.

Responde SOLO con un objeto JSON con estas claves:
- "genero": uno de los generos de la lista tal como esta escrito, o null si no pide un genero o no se parece a ninguno.
- "texto": una palabra clave para buscar en nombre, artista o lugar (ej. "zocalo", "Xquenda"), o null.
- "periodo": uno de ${PERIODOS.map((p) => `"${p}"`).join(', ')}.
   "fin_de_semana" = este fin de semana; "mes" = un mes con nombre (usa "mes"); "fecha" = un dia exacto (usa "fecha");
   "pasados" = eventos que ya pasaron; "cualquiera" = no dice cuando.
- "mes": numero del 1 al 12 si periodo es "mes", si no null.
- "fecha": "DD/MM/YYYY" si periodo es "fecha", si no null.
- "cerca": true si pide eventos cercanos a el ("cerca de mi", "cerca de aqui", "lo mas cercano", "que me queda cerca"), si no false.

Ejemplos:
"quiero rock este fin de semana" -> {"genero":"Rock","texto":null,"periodo":"fin_de_semana","mes":null,"fecha":null,"cerca":false}
"algo de jazz en diciembre" -> {"genero":"Jazz","texto":null,"periodo":"mes","mes":12,"fecha":null,"cerca":false}
"que hay en el zocalo?" -> {"genero":null,"texto":"zocalo","periodo":"cualquiera","mes":null,"fecha":null,"cerca":false}
"que conciertos me quedan cerca?" -> {"genero":null,"texto":null,"periodo":"cualquiera","mes":null,"fecha":null,"cerca":true}
"jazz cerca de mi este mes" -> {"genero":"Jazz","texto":null,"periodo":"este_mes","mes":null,"fecha":null,"cerca":true}`;

  const texto = await preguntarIA(
    [
      { role: 'system', content: instrucciones },
      { role: 'user', content: mensaje },
    ],
    { json: true, temperatura: 0 }
  );
  const filtros = leerJSON(texto);
  return {
    genero: typeof filtros.genero === 'string' ? filtros.genero : null,
    texto: typeof filtros.texto === 'string' ? filtros.texto : null,
    periodo: PERIODOS.includes(filtros.periodo) ? filtros.periodo : 'cualquiera',
    mes: filtros.mes ?? null,
    fecha: filtros.fecha ?? null,
    cerca: filtros.cerca === true || filtros.cerca === 'true',
  };
};

// busca en la lista de eventos con los filtros (todo en JS: son pocos eventos)
const filtrarEventos = (eventos, filtros, hoy) => {
  const [desde, hasta] = rangoDeFechas(filtros, hoy);
  const genero = normalizar(filtros.genero);
  const texto = normalizar(filtros.texto);

  return eventos
    .filter((evento) => {
      const fecha = deDma(evento.fecha);
      if (!fecha) return false;
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      if (genero && !normalizar(evento.genero).includes(genero) && !genero.includes(normalizar(evento.genero))) {
        return false;
      }
      if (texto) {
        const dondeBuscar = normalizar(
          [evento.nombre, evento.artista, evento.lugar, evento.direccion, evento.descripcion].join(' ')
        );
        if (!dondeBuscar.includes(texto)) return false;
      }
      return true;
    })
    .sort((a, b) => deDma(a.fecha) - deDma(b.fecha));
};

// paso 2: redactar la respuesta usando solo los eventos encontrados
const redactar = async (mensaje, eventos, hoy, porCercania) => {
  const lista = eventos
    .map((e) =>
      `- ${e.nombre} | ${e.artista} | ${e.genero} | ${DIAS[deDma(e.fecha).getDay()]} ${e.fecha} ${e.hora} | ` +
      `${e.lugar}, ${e.direccion}` +
      (e.distanciaKm !== undefined ? ` | a ${formatoDistancia(e.distanciaKm)} del usuario` : '') +
      ` | estado: ${e.estado ?? 'activo'} | ${e.descripcion}`
    )
    .join('\n');

  const instrucciones = `Eres el asistente de CultGo!, una pagina de eventos musicales en Oaxaca de Juárez.
Hoy es ${DIAS[hoy.getDay()]} ${aDma(hoy)}.
Contesta en español, amable y en maximo 3 oraciones, usando UNICAMENTE estos eventos:
${lista || '(no se encontro ningun evento)'}

Reglas:
- No inventes eventos, precios, horarios ni datos que no esten en la lista.
- Si la lista esta vacia, dilo y sugiere probar con otro genero o fecha.
- Si preguntan algo que no esta en los datos (como el precio), di que no tienes esa informacion.
- Las tarjetas de los eventos se muestran debajo de tu respuesta, asi que no repitas todos los datos.${
    porCercania ? '\n- La lista esta ordenada del mas cercano al mas lejano; menciona el mas cercano y a que distancia esta.' : ''
  }`;

  return (await preguntarIA(
    [
      { role: 'system', content: instrucciones },
      { role: 'user', content: mensaje },
    ],
    { temperatura: 0.4 }
  )).trim();
};

// ---------- limite de mensajes por usuario (para no saturar la laptop) ----------

const LIMITE_POR_MINUTO = 10;
const historial = new Map(); // ip -> [tiempos]

const excedioLimite = (ip) => {
  const ahora = Date.now();
  const recientes = (historial.get(ip) ?? []).filter((t) => ahora - t < 60000);
  recientes.push(ahora);
  historial.set(ip, recientes);
  return recientes.length > LIMITE_POR_MINUTO;
};

// ---------- ruta ----------

// se registra desde server.js:  require('./asistente')(app, pool, aEvento);
module.exports = (app, pool, aEvento) => {
  app.post('/api/asistente', async (req, res) => {
    const mensaje = String(req.body?.mensaje ?? '').trim();
    if (!mensaje) return res.status(400).json({ error: 'Escribe un mensaje' });
    if (mensaje.length > MAX_MENSAJE) {
      return res.status(400).json({ error: `El mensaje es muy largo (maximo ${MAX_MENSAJE} caracteres)` });
    }
    if (excedioLimite(req.ip)) {
      return res.status(429).json({ error: 'Vas muy rapido, espera un momento y vuelve a intentar' });
    }

    let eventos;
    try {
      const { rows } = await pool.query('SELECT * FROM eventos_cultgo ORDER BY id;');
      eventos = rows.map(aEvento).filter((e) => e.estado !== 'cancelado');
    } catch (error) {
      console.error('Asistente: error consultando eventos:', error);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }

    const hoy = inicioDelDia(new Date());
    const generos = [...new Set(eventos.map((e) => e.genero).filter(Boolean))];

    const ubicacion = leerUbicacion(req.body?.ubicacion);

    let filtros;
    try {
      filtros = await interpretar(mensaje, generos, hoy);
      if (pideCercania(mensaje)) filtros.cerca = true;
    } catch (error) {
      console.error('Asistente: la IA no respondio:', error.message);
      return res.status(503).json({
        error: 'El asistente no está disponible en este momento. Puedes usar los filtros de la página.',
      });
    }

    // pidio "cerca de mi" pero el navegador no mando la ubicacion: se le pide al usuario
    if (filtros.cerca && !ubicacion) {
      return res.json({
        respuesta: 'Para decirte qué eventos te quedan cerca necesito tu ubicación. Toca el botón para compartirla.',
        eventos: [],
        necesitaUbicacion: true,
        filtros,
      });
    }

    let encontrados = filtrarEventos(eventos, filtros, hoy);

    // con ubicacion: se calcula la distancia a cada evento y, si pidio "cerca", se ordena por cercania
    const porCercania = Boolean(filtros.cerca && ubicacion);
    if (ubicacion) {
      encontrados = encontrados.map((e) =>
        Number.isFinite(e.latitud) && Number.isFinite(e.longitud)
          ? { ...e, distanciaKm: Math.round(distanciaKm(ubicacion.lat, ubicacion.lon, e.latitud, e.longitud) * 10) / 10 }
          : e
      );
      if (porCercania) {
        encontrados = encontrados
          .filter((e) => e.distanciaKm !== undefined)
          .sort((a, b) => a.distanciaKm - b.distanciaKm);
      }
    }
    const mostrar = encontrados.slice(0, MAX_EVENTOS_RESPUESTA);

    // por cercania la respuesta la arma el backend: el modelo a veces confunde cual esta mas cerca
    if (porCercania && mostrar.length) {
      const [primero] = mostrar;
      const respuesta =
        `El más cercano es "${primero.nombre}" en ${primero.lugar}, a ${formatoDistancia(primero.distanciaKm)} de ti` +
        ` (${DIAS[deDma(primero.fecha).getDay()]} ${primero.fecha}, ${primero.hora}).` +
        (mostrar.length > 1 ? ' Aquí tienes los demás, del más cercano al más lejano:' : '');
      return res.json({ respuesta, eventos: mostrar, filtros });
    }

    let respuesta;
    try {
      respuesta = await redactar(mensaje, mostrar, hoy, porCercania);
    } catch (error) {
      // si falla el segundo paso, igual se muestran los eventos encontrados
      console.error('Asistente: error redactando la respuesta:', error.message);
      respuesta = mostrar.length
        ? `Encontré ${encontrados.length} ${encontrados.length === 1 ? 'evento' : 'eventos'}:`
        : 'No encontré eventos con esa búsqueda. Prueba con otro género o fecha.';
    }

    res.json({ respuesta, eventos: mostrar, filtros });
  });
};

// se exportan para poder probarlas sin IA
module.exports.rangoDeFechas = rangoDeFechas;
module.exports.filtrarEventos = filtrarEventos;
module.exports.distanciaKm = distanciaKm;
module.exports.pideCercania = pideCercania;
