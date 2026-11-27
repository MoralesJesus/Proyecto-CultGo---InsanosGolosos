// Asistente de CultGo!: el usuario escribe como habla ("quiero rock este fin de semana",
// "¿que me queda cerca?", "¿como llego al segundo?") y recibe eventos REALES de la base.
//
// Como funciona:
//   1. ENTENDER el mensaje. Se combinan dos cosas:
//      - la IA (Ollama u otra API) convierte el mensaje en filtros JSON;
//      - un lector de palabras clave (generos, fechas, "cerca", "el segundo"...) que
//        corrige a la IA cuando se equivoca y la REEMPLAZA si no esta disponible.
//      Asi el asistente sigue funcionando aunque Ollama este apagado.
//   2. BUSCAR en PostgreSQL con esos filtros. Las fechas y distancias las calcula
//      este archivo, nunca la IA.
//   3. RESPONDER. Casi todas las respuestas las arma el backend con los datos reales
//      (busquedas, cercania, hora, lugar, de que trata). La IA solo redacta cuando
//      preguntan algo abierto sobre un evento, y solo con los datos de ese evento.
//
// Proveedor de IA: cualquiera con formato de OpenAI. Se cambia en backend/.env:
//   IA_URL=http://localhost:11434/v1   IA_MODELO=qwen2.5:7b   IA_CLAVE=   (Ollama)

const IA_URL = (process.env.IA_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
const IA_MODELO = process.env.IA_MODELO || 'qwen2.5:7b';
const IA_CLAVE = process.env.IA_CLAVE || '';
const IA_TIEMPO_MAX = Number(process.env.IA_TIEMPO_MAX_MS) || 60000;

const MAX_MENSAJE = 300; // caracteres
const MAX_EVENTOS_RESPUESTA = 6;
const MAX_EVENTOS_DETALLE = 2;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const PERIODOS = [
  'hoy', 'manana', 'fin_de_semana', 'proximo_fin_de_semana', 'esta_semana',
  'proxima_semana', 'este_mes', 'proximo_mes', 'mes', 'fecha', 'rango', 'pasados', 'cualquiera',
];

// ======================================================================
// utilidades de texto y fechas
// ======================================================================

// minusculas y sin acentos, para comparar "Electrónica" con "electronica"
const normalizar = (texto) =>
  String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// sin signos al inicio: "¿y en enero?" -> "y en enero?"
const sinSignos = (texto) => normalizar(texto).replace(/^[¿?¡!\s.,]+/, '');

const inicioDelDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
const sumarDias = (fecha, dias) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
const aDma = (fecha) =>
  `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
const deDma = (texto) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(texto ?? '').trim());
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
};

// "5/12" o "05/12/2026": si no trae año, se toma la proxima vez que caiga esa fecha
const fechaFlexible = (texto, hoy) => {
  const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(String(texto ?? '').trim());
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]) - 1;
  if (mes < 0 || mes > 11 || dia < 1 || dia > 31) return null;
  // "31/02" no existe: sin esto JavaScript lo pasa al 3 de marzo
  const real = (anio) => {
    const fecha = new Date(anio, mes, dia);
    return fecha.getMonth() === mes ? fecha : null;
  };
  if (m[3]) return real(m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]));
  const esteAnio = real(hoy.getFullYear());
  // si ya paso (o no existe este año, como un 29/02), se busca la siguiente vez que caiga
  if (esteAnio && esteAnio >= hoy) return esteAnio;
  for (let anio = hoy.getFullYear() + 1; anio <= hoy.getFullYear() + 4; anio++) {
    const fecha = real(anio);
    if (fecha) return fecha;
  }
  return null;
};

const yaPaso = (evento, hoy) => {
  const fecha = deDma(evento.fecha);
  return evento.estado === 'finalizado' || (fecha !== null && fecha < hoy);
};

const diaYFecha = (evento) => {
  const fecha = deDma(evento.fecha);
  return fecha ? `${DIAS[fecha.getDay()]} ${evento.fecha}` : evento.fecha;
};

// texto corto para mostrar: "350 m" o "2.4 km"
const formatoDistancia = (km) =>
  km < 0.05 ? 'menos de 50 m' : km < 1 ? `${Math.round(km * 20) * 50} m` : `${km.toFixed(1)} km`;

// distancia en km entre dos puntos (formula de Haversine, la misma de utils/distancia.ts)
const distanciaKm = (lat1, lon1, lat2, lon2) => {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ======================================================================
// rango de fechas de cada "periodo"
// ======================================================================

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
      const exacta = fechaFlexible(fecha, hoy);
      return exacta ? [exacta, exacta] : [hoy, null];
    }
    case 'rango': {
      // "DD/MM/YYYY|DD/MM/YYYY" (por ejemplo, el primer fin de semana de diciembre)
      const [inicio, fin] = String(fecha ?? '').split('|').map((f) => fechaFlexible(f, hoy));
      return inicio && fin ? [inicio, fin] : [hoy, null];
    }
    case 'pasados': return [null, sumarDias(hoy, -1)];
    default: return [hoy, null]; // "cualquiera": de hoy en adelante
  }
};

const describirPeriodo = ({ periodo, mes, fecha }, hoy) => {
  switch (periodo) {
    case 'hoy': return ' para hoy';
    case 'manana': return ' para mañana';
    case 'fin_de_semana': return ' para este fin de semana';
    case 'proximo_fin_de_semana': return ' para el próximo fin de semana';
    case 'esta_semana': return ' para esta semana';
    case 'proxima_semana': return ' para la próxima semana';
    case 'este_mes': return ' para lo que queda del mes';
    case 'proximo_mes': return ' para el próximo mes';
    case 'mes': return Number(mes) >= 1 && Number(mes) <= 12 ? ` en ${MESES[Number(mes) - 1]}` : '';
    case 'fecha': {
      const exacta = fechaFlexible(fecha, hoy);
      return exacta ? ` para el ${DIAS[exacta.getDay()]} ${aDma(exacta)}` : '';
    }
    case 'rango': {
      const [inicio, fin] = String(fecha ?? '').split('|').map((f) => fechaFlexible(f, hoy));
      return inicio && fin ? ` del ${DIAS[inicio.getDay()]} ${aDma(inicio)} al ${DIAS[fin.getDay()]} ${aDma(fin)}` : '';
    }
    case 'pasados': return ' que ya pasaron';
    default: return '';
  }
};

// ======================================================================
// lector de palabras clave (corrige a la IA y la reemplaza si no responde)
// ======================================================================

// palabras genericas que NO sirven para buscar por texto
const GENERICAS = new Set([
  'concierto', 'conciertos', 'evento', 'eventos', 'musica', 'show', 'shows', 'tocada', 'tocadas',
  'oaxaca', 'cerca', 'algo', 'hay', 'que', 'quiero', 'busco', 'ver', 'todos', 'todo', 'otros', 'otro', 'mas',
]);

// palabras de una pregunta que no dicen DE QUE evento se habla
const VACIAS = new Set([
  ...GENERICAS, 'para', 'como', 'donde', 'cuando', 'hora', 'horas', 'este', 'esta', 'llego', 'llegar', 'queda',
  'trata', 'sera', 'fecha', 'direccion', 'lugar', 'cuanto', 'cuesta', 'precio', 'gratis', 'boletos', 'boleto',
  'entrada', 'entradas', 'tocan', 'toca', 'quien', 'quienes', 'primero', 'primera', 'segundo', 'segunda',
  'tercero', 'tercera', 'cuarto', 'cuarta', 'quinto', 'sexto', 'sexta', 'ultimo', 'ultima', 'evento', 'puedo',
  'hacer', 'dime', 'sabes', 'favor', 'gracias', 'hola', 'bueno', 'pues', 'entonces', 'tambien', 'mejor', 'ahora',
  // tiempo y lugar (eso lo leen otras funciones, no es texto de busqueda)
  'semana', 'finde', 'proximo', 'proxima', 'siguiente', 'manana', 'noche', 'tarde', 'pasado', 'pasados',
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'setiembre',
  'octubre', 'noviembre', 'diciembre', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
  'quedan', 'cercano', 'cercanos', 'cercana', 'cercanas', 'cercania', 'alrededor', 'aqui', 'ubicacion',
  'quiero', 'busco', 'buscar', 'escuchar', 'gustaria', 'tienes', 'tienen', 'habra', 'habia', 'puede', 'podria',
]);

// pide ver eventos en general ("¿que hay?", "¿que conciertos hay?"): se listan todos los proximos
const PIDE_TODO = /\b(eventos?|conciertos?|tocadas?|shows?|que hay|hay algo|musica|todo|todos|otros|recomienda\w*|algo|planes?|agenda|cartelera|ver|mostrar|muestrame|ensename|lista)\b/;

// "¿el de jazz es para niños?": pregunta abierta sobre un evento
const PREGUNTA_DE_UN_EVENTO = /\b(el|la)\s+(de|del)\s+\w+.*\b(es|sera|son|tiene|hay|incluye|acepta|permite|dejan|puedo|se puede)\b/;

const palabrasDe = (texto) =>
  normalizar(texto)
    .split(/[^a-z0-9ñ]+/)
    .filter((p) => p.length >= 4 && !VACIAS.has(p));

// "sones" es palabra del genero "Son istmeño"; "rock" del genero "Rock"
const esDelGenero = (palabra, genero) =>
  Boolean(genero) &&
  normalizar(genero).split(/[^a-z0-9ñ]+/).filter((g) => g.length >= 3).some((g) => palabra.startsWith(g) || g.startsWith(palabra));

// genero de la base mencionado en el mensaje ("sones istmeños" -> "Son istmeño")
const generoMencionado = (mensaje, generos) => {
  const palabras = normalizar(mensaje).split(/[^a-z0-9ñ]+/).filter(Boolean);
  let mejor = null;
  for (const genero of generos) {
    const partes = normalizar(genero).split(/[^a-z0-9ñ]+/).filter((p) => p.length >= 3 && p !== 'del');
    if (!partes.length) continue;
    // cada palabra del genero debe aparecer como inicio de alguna palabra del mensaje
    const aparece = (parte) => palabras.some((p) => p.startsWith(parte) || (parte.length >= 5 && parte.startsWith(p) && p.length >= 4));
    // todas las palabras del genero = coincidencia completa; solo la primera ("banda", "sones") = parcial
    const puntos = partes.every(aparece) ? 10 + partes.length : aparece(partes[0]) ? 1 : 0;
    if (puntos && (!mejor || puntos > mejor.puntos)) mejor = { genero, puntos };
  }
  return mejor?.genero ?? null;
};

const DIAS_SEMANA = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };

// periodo de tiempo mencionado en el mensaje
const periodoMencionado = (mensaje, hoy) => {
  const t = normalizar(mensaje);
  // "del 1 al 10 de diciembre"
  const rango = /\b(?:del?\s+)?(\d{1,2})\s+(?:al|a)\s+(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.exec(t);
  if (rango) {
    const mes = MESES.indexOf(rango[3]) + 1;
    return { periodo: 'rango', fecha: `${rango[1]}/${mes}|${rango[2]}/${mes}` };
  }
  // "el 5 de diciembre", "5 de dic"
  const conMes = /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.exec(t);
  if (conMes) {
    const mes = conMes[2] === 'setiembre' ? 8 : MESES.indexOf(conMes[2]);
    return { periodo: 'fecha', fecha: `${conMes[1]}/${mes + 1}` };
  }
  // "el primer fin de semana de diciembre", "el ultimo fin de semana de enero", "fin de semana de diciembre"
  const finDeMes = /\b(?:(primer|primero|segundo|tercer|tercero|cuarto|ultimo)\s+)?(?:fin de semana|finde)\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.exec(t);
  if (finDeMes) {
    const mes = MESES.indexOf(finDeMes[2]);
    const anio = mes < hoy.getMonth() ? hoy.getFullYear() + 1 : hoy.getFullYear();
    const sabados = [];
    for (let d = new Date(anio, mes, 1); d.getMonth() === mes; d = sumarDias(d, 1)) if (d.getDay() === 6) sabados.push(d);
    const cual = { segundo: 1, tercer: 2, tercero: 2, cuarto: 3, ultimo: sabados.length - 1 }[finDeMes[1]] ?? 0;
    const sabado = sabados[Math.min(cual, sabados.length - 1)];
    return { periodo: 'rango', fecha: `${aDma(sabado)}|${aDma(sumarDias(sabado, 1))}` };
  }
  // "5/12"
  const corta = /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/.exec(t);
  if (corta) return { periodo: 'fecha', fecha: corta[1] };
  if (/\bpasado manana\b/.test(t)) return { periodo: 'fecha', fecha: aDma(sumarDias(hoy, 2)) };
  if (/\b(hoy|esta noche|hoy en la noche)\b/.test(t)) return { periodo: 'hoy' };
  if (/\bmanana\b/.test(t)) return { periodo: 'manana' };
  if (/\b(proximo|siguiente|otro)\s+(fin de semana|finde|fin)\b/.test(t)) return { periodo: 'proximo_fin_de_semana' };
  if (/\b(fin de semana|finde)\b/.test(t)) return { periodo: 'fin_de_semana' };
  if (/\b(proxima|siguiente)\s+semana\b/.test(t)) return { periodo: 'proxima_semana' };
  if (/\b(esta semana|en la semana|entre semana)\b/.test(t)) return { periodo: 'esta_semana' };
  if (/\b(proximo|siguiente)\s+mes\b/.test(t)) return { periodo: 'proximo_mes' };
  if (/\b(este mes|en el mes|lo que queda del mes)\b/.test(t)) return { periodo: 'este_mes' };
  if (/\b(ya pasaron|pasados|anteriores|que paso|que fueron)\b/.test(t)) return { periodo: 'pasados' };
  for (let i = 0; i < MESES.length; i++) {
    if (new RegExp(`\\b${MESES[i]}\\b`).test(t) || (i === 8 && /\bsetiembre\b/.test(t))) return { periodo: 'mes', mes: i + 1 };
  }
  // "el sabado", "este viernes": el proximo dia con ese nombre (hoy incluido)
  for (const [nombre, numero] of Object.entries(DIAS_SEMANA)) {
    // ("santo domingo" es un lugar, no un dia)
    if (new RegExp(`(?<!santo )\\b${nombre}\\b`).test(t)) {
      const faltan = (numero - hoy.getDay() + 7) % 7;
      const extra = /\b(proximo|siguiente)\b/.test(t) && faltan === 0 ? 7 : 0;
      return { periodo: 'fecha', fecha: aDma(sumarDias(hoy, faltan + extra)) };
    }
  }
  return null;
};

// lugares conocidos del centro de Oaxaca, para "¿que hay cerca del Zocalo?"
const LUGARES = [
  { claves: ['zocalo', 'plaza de la constitucion'], etiqueta: 'del Zócalo', lat: 17.0606, lon: -96.7253 },
  { claves: ['santo domingo'], etiqueta: 'de Santo Domingo', lat: 17.0659, lon: -96.7228 },
  { claves: ['llano', 'paseo juarez'], etiqueta: 'de El Llano', lat: 17.0682, lon: -96.7206 },
  { claves: ['auditorio guelaguetza', 'cerro del fortin', 'fortin'], etiqueta: 'del Auditorio Guelaguetza', lat: 17.07, lon: -96.733 },
  { claves: ['basilica', 'soledad', 'plaza de la danza'], etiqueta: 'de la Basílica de la Soledad', lat: 17.0618, lon: -96.73 },
  { claves: ['alameda'], etiqueta: 'de la Alameda de León', lat: 17.0613, lon: -96.7256 },
  { claves: ['mercado 20 de noviembre', '20 de noviembre', 'benito juarez'], etiqueta: 'del Mercado 20 de Noviembre', lat: 17.0583, lon: -96.7262 },
  { claves: ['andador', 'macedonio alcala', 'alcala'], etiqueta: 'del andador Macedonio Alcalá', lat: 17.0638, lon: -96.7236 },
  { claves: ['san pablo'], etiqueta: 'de San Pablo', lat: 17.0604, lon: -96.7243 },
  { claves: ['catedral'], etiqueta: 'de la Catedral', lat: 17.0614, lon: -96.7254 },
];

// "cerca de mi", "cerca del zocalo", "lo mas cercano"...
// devuelve null (no pidio cercania), { usuario: true } o { lugar: texto } con lo que dijo despues de "cerca de"
const PALABRAS_CERCA = /\b(cerca|cercan[oa]s?|cercania|alrededor|por aqui|a mi lado|mi ubicacion|donde estoy)\b/;
const cercaniaMencionada = (mensaje) => {
  const t = normalizar(mensaje);
  if (!PALABRAS_CERCA.test(t)) return null;
  const m = /\b(?:cerca|cercan[oa]s?)\s+(?:de\s+la|del|de|a\s+la|al|a)\s+(.+)$/.exec(t);
  if (!m) return { usuario: true };
  const lugar = m[1].replace(/[?¿!¡.,]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!lugar || /^(mi|mi\b|aqui|ti|nosotros|donde estoy|mi ubicacion|mi casa)/.test(lugar)) return { usuario: true };
  return { lugar };
};

// busca las coordenadas de un lugar: primero los conocidos, luego los lugares de los eventos
const buscarLugar = (texto, eventos) => {
  const t = normalizar(texto);
  const conocido = LUGARES.find((l) => l.claves.some((c) => t.includes(c)));
  if (conocido) return { lat: conocido.lat, lon: conocido.lon, etiqueta: conocido.etiqueta };
  const buscadas = palabrasDe(t).filter((p) => !['plaza', 'centro', 'calle', 'teatro'].includes(p) || palabrasDe(t).length === 1);
  if (!buscadas.length) return null;
  const evento = eventos.find((e) => {
    const lugar = palabrasDe(`${e.lugar} ${e.direccion}`);
    return Number.isFinite(e.latitud) && Number.isFinite(e.longitud) && buscadas.every((b) => lugar.some((p) => p.startsWith(b)));
  });
  return evento ? { lat: evento.latitud, lon: evento.longitud, etiqueta: `de ${evento.lugar}` } : null;
};

// "el primero", "el segundo", "el ultimo"... de la lista anterior -> posicion (0, 1, ..., -1 = el ultimo).
// No cuenta si va seguido de algo como "semana" o "fin" ("el primer fin de semana de diciembre")
const ORDINALES = [
  ['(?:primer|primero|primera|1ro|1o)', 0],
  ['(?:segundo|segunda|2do|2o)', 1],
  ['(?:tercer|tercero|tercera|3ro|3o)', 2],
  ['(?:cuarto|cuarta|4to|4o)', 3],
  ['(?:quinto|5to|5o)', 4],
  ['(?:sexto|sexta|6to|6o)', 5],
  ['(?:ultimo|ultima)', -1],
];
const NO_ORDINAL_DESPUES = '(?!\\s+(?:fin|finde|semana|dia|mes|quincena|sabado|domingo|viernes|jueves|lunes|martes|miercoles|de\\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)))';
const posicionMencionada = (mensaje) => {
  const t = normalizar(mensaje);
  for (const [patron, posicion] of ORDINALES) {
    if (new RegExp(`\\b${patron}\\b${NO_ORDINAL_DESPUES}`).test(t)) return posicion;
  }
  return null;
};

// tipo de pregunta sobre un evento
const tipoDePregunta = (mensaje) => {
  const t = normalizar(mensaje);
  if (/\b(como llego|como llegar|como le hago para llegar|como me voy|ruta|direccion|donde es|donde queda|en donde|en que lugar|donde sera|donde esta|ubicacion del)\b/.test(t)) return 'lugar';
  if (/\b(cuanto cuesta|cuanto vale|precio|cuesta|gratis|boletos?|entradas?|cover|cobran)\b/.test(t)) return 'precio';
  if (/\b(a que hora|que hora|cuando es|cuando sera|cuando fue|que dia|que fecha|a que horas|a q hora)\b/.test(t)) return 'hora';
  if (/\b(de que trata|que es|como sera|como es|que tocan|de que va|quien toca|quienes tocan|quien se presenta|que onda con|informacion|info|mas datos|cuentame)\b/.test(t)) return 'descripcion';
  return null;
};

const SALUDO = /^(hola|holi|ola|buenas|buenos dias|buenas tardes|buenas noches|que tal|hey|saludos|que onda)\b/;
const GRACIAS = /\b(gracias|grax|muchas gracias|te agradezco|ok gracias|perfecto|genial|excelente)\b/;
const DESPEDIDA = /\b(adios|bye|hasta luego|nos vemos)\b/;

// "¿y en enero?", "¿y de rock?", "mejor el sabado": continuacion de la busqueda anterior
const CONTINUACION = /^(y|e|mejor|ahora|tambien|y si|y que tal|y para|y el|y la|y los|y las|y de|y en)\b/;
const esContinuacion = (mensaje) => CONTINUACION.test(sinSignos(mensaje));

// texto de busqueda util: se descartan palabras genericas o el propio genero
const limpiarTexto = (texto, genero) => {
  if (!texto) return null;
  const palabras = palabrasDe(texto).filter((p) => !esDelGenero(p, genero));
  return palabras.length ? palabras.join(' ') : null;
};

// ======================================================================
// IA
// ======================================================================

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

const FILTROS_VACIOS = { genero: null, texto: null, periodo: 'cualquiera', mes: null, fecha: null, cerca: false, intencion: 'buscar' };

// la IA convierte el mensaje en filtros
const interpretarConIA = async (mensaje, generos, hoy, contexto) => {
  const anterior = contexto?.pregunta
    ? `\nBusqueda anterior del usuario: "${contexto.pregunta}" -> ${JSON.stringify(contexto.filtros)}
Si el mensaje nuevo es una continuacion (empieza con "y", "mejor", "ahora", o solo cambia una cosa, como "¿y en enero?" o "¿y de rock?"),
copia los filtros anteriores y cambia SOLO lo que el usuario pide. Si es una busqueda nueva, ignora la anterior.\n`
    : '';

  const instrucciones = `Eres el asistente de CultGo!, una pagina de eventos musicales en Oaxaca de Juárez.
Tu unico trabajo es convertir el mensaje del usuario en filtros de busqueda. No contestes la pregunta.
Hoy es ${DIAS[hoy.getDay()]} ${aDma(hoy)}.
Generos que existen en la base de datos: ${generos.join(', ') || '(ninguno)'}.
${anterior}
Responde SOLO con un objeto JSON con estas claves:
- "genero": uno de los generos de la lista tal como esta escrito, o null si no pide un genero o no se parece a ninguno.
- "texto": nombre de un artista, evento o lugar que mencione (ej. "zocalo", "Xquenda"), o null. Nunca pongas palabras como "conciertos" o "eventos".
- "periodo": uno de ${PERIODOS.map((p) => `"${p}"`).join(', ')}.
   "fin_de_semana" = este fin de semana; "mes" = un mes con nombre; "fecha" = un dia exacto; "pasados" = eventos que ya pasaron; "cualquiera" = no dice cuando.
- "mes": numero del 1 al 12 si periodo es "mes", si no null.
- "fecha": "DD/MM/YYYY" si periodo es "fecha", si no null.
- "intencion": "detalle" si pregunta algo de UN evento (hora, lugar, como llegar, de que trata, precio),
   "otro" si es un saludo, un agradecimiento o algo que no tiene que ver con eventos o musica, o "buscar" si quiere ver que eventos hay.
- "cerca": true si pide eventos cercanos ("cerca de mi", "lo mas cercano", "que me queda cerca"), si no false.

Ejemplos:
"quiero rock este fin de semana" -> {"genero":"Rock","texto":null,"periodo":"fin_de_semana","mes":null,"fecha":null,"cerca":false,"intencion":"buscar"}
"algo de jazz en diciembre" -> {"genero":"Jazz","texto":null,"periodo":"mes","mes":12,"fecha":null,"cerca":false,"intencion":"buscar"}
"que hay en el zocalo?" -> {"genero":null,"texto":"zocalo","periodo":"cualquiera","mes":null,"fecha":null,"cerca":false,"intencion":"buscar"}
"que conciertos me quedan cerca?" -> {"genero":null,"texto":null,"periodo":"cualquiera","mes":null,"fecha":null,"cerca":true,"intencion":"buscar"}
"a que hora es el de jazz?" -> {"genero":"Jazz","texto":null,"periodo":"cualquiera","mes":null,"fecha":null,"cerca":false,"intencion":"detalle"}
"como llego al festival guelaguetza?" -> {"genero":null,"texto":"guelaguetza","periodo":"cualquiera","mes":null,"fecha":null,"cerca":false,"intencion":"detalle"}
"hola" -> {"genero":null,"texto":null,"periodo":"cualquiera","mes":null,"fecha":null,"cerca":false,"intencion":"otro"}`;

  const texto = await preguntarIA(
    [
      { role: 'system', content: instrucciones },
      { role: 'user', content: mensaje },
    ],
    { json: true, temperatura: 0 }
  );
  const f = leerJSON(texto);
  return {
    genero: typeof f.genero === 'string' && f.genero.trim() ? f.genero : null,
    texto: typeof f.texto === 'string' && f.texto.trim() ? f.texto : null,
    periodo: PERIODOS.includes(f.periodo) ? f.periodo : 'cualquiera',
    mes: f.mes ?? null,
    fecha: f.fecha ?? null,
    cerca: f.cerca === true || f.cerca === 'true',
    intencion: ['detalle', 'otro'].includes(f.intencion) ? f.intencion : 'buscar',
  };
};

// paso final: entender el mensaje combinando IA + palabras clave
const entender = async (mensaje, generos, hoy, contexto) => {
  const genero = generoMencionado(mensaje, generos);
  const periodo = periodoMencionado(mensaje, hoy);
  const cercania = cercaniaMencionada(mensaje);
  const tipo = tipoDePregunta(mensaje);
  const posicion = contexto?.idsLista.length ? posicionMencionada(mensaje) : null;
  const t = sinSignos(mensaje);
  const palabrasUtiles = palabrasDe(mensaje).filter((p) => !esDelGenero(p, genero));

  // ---- atajos: casos claros que no necesitan IA (mas rapido y sin errores) ----
  // saludo / gracias / despedida corto
  if (!genero && !periodo && !cercania && !tipo && (SALUDO.test(t) || GRACIAS.test(t) || DESPEDIDA.test(t)) && t.split(/\s+/).length <= 5) {
    return { ...FILTROS_VACIOS, intencion: 'otro', fuente: 'atajo' };
  }
  // "¿como llego al segundo?", "¿y el ultimo?"
  if (posicion !== null) {
    return { ...FILTROS_VACIOS, intencion: 'detalle', posicion, fuente: 'atajo' };
  }
  // dijo "el segundo" pero no hay ninguna lista antes
  if (posicionMencionada(mensaje) !== null && !genero && !palabrasUtiles.length) {
    return { ...FILTROS_VACIOS, intencion: 'detalle', sinLista: true, fuente: 'atajo' };
  }
  // "¿como llego?", "¿a que hora es?" sin decir cual: habla del evento anterior
  if (tipo && !genero && !palabrasUtiles.length && contexto?.ids.length) {
    return { ...FILTROS_VACIOS, intencion: 'detalle', usarAnterior: true, fuente: 'atajo' };
  }

  // ---- IA (si falla, se usan solo las palabras clave) ----
  let filtros;
  let fuente = 'ia';
  try {
    filtros = await interpretarConIA(mensaje, generos, hoy, contexto);
  } catch (error) {
    console.warn('Asistente: la IA no respondio, se usan palabras clave:', error.message);
    // sin IA el texto de busqueda lo decide la ruta (solo si esas palabras aparecen en algun evento)
    filtros = { ...FILTROS_VACIOS };
    fuente = 'palabras';
  }
  const continuacion = Boolean(contexto?.filtros) && esContinuacion(mensaje);

  // ---- correcciones con las palabras clave ----
  if (genero) filtros.genero = genero; // el genero escrito es mas confiable que el que adivina la IA
  if (filtros.genero && !generos.some((g) => normalizar(g) === normalizar(filtros.genero))) {
    // la IA invento un genero que no existe: se intenta acomodar al mas parecido
    filtros.genero = generoMencionado(filtros.genero, generos) ?? filtros.genero;
  }
  if (periodo) Object.assign(filtros, { mes: null, fecha: null }, periodo);
  if (!periodo && filtros.periodo !== 'cualquiera' && fuente === 'ia' && !continuacion) {
    // la IA puso una fecha que el usuario no dijo (pasa cuando copia la busqueda anterior)
    const dijoAlgoDeTiempo = /\b(semana|mes|hoy|manana|noche|dia|fecha|pasad|proxim|siguiente)\b/.test(normalizar(mensaje));
    if (!dijoAlgoDeTiempo) Object.assign(filtros, { periodo: 'cualquiera', mes: null, fecha: null });
  }
  filtros.texto = limpiarTexto(filtros.texto, filtros.genero);
  if (fuente === 'palabras' && filtros.texto && genero) filtros.texto = null;

  filtros.cerca = Boolean(cercania) || (filtros.cerca && !cercania?.lugar);
  if (cercania?.lugar) {
    filtros.lugarReferencia = cercania.lugar;
    // "cerca del zocalo": el lugar no es texto de busqueda
    filtros.texto = null;
  }

  if (tipo && !filtros.cerca) filtros.intencion = 'detalle';
  if (!tipo && !filtros.cerca && PREGUNTA_DE_UN_EVENTO.test(normalizar(mensaje))) filtros.intencion = 'detalle';
  // pregunta de un evento y la IA no dijo cual: se buscan las palabras que escribio ("los fieles difuntos")
  if (filtros.intencion === 'detalle' && !filtros.genero && !filtros.texto && palabrasUtiles.length) {
    filtros.texto = palabrasUtiles.join(' ');
  }
  if (filtros.intencion === 'otro' && (filtros.genero || filtros.texto || filtros.periodo !== 'cualquiera' || filtros.cerca)) {
    filtros.intencion = 'buscar'; // la IA dijo "otro" pero si pidio algo
  }
  // no pidio nada reconocible ni "eventos en general": es otro tema ("¿quien gano el partido?")
  // (si escribio un nombre que si existe, como "xquenda", la ruta lo busca antes de decidir)
  const nadaReconocible = !filtros.genero && !filtros.texto && filtros.periodo === 'cualquiera' && !filtros.cerca;
  if (filtros.intencion === 'buscar' && nadaReconocible && !continuacion && !PIDE_TODO.test(normalizar(mensaje))) {
    filtros.intencion = palabrasUtiles.length ? 'buscar_o_otro' : 'otro';
  }

  // continuacion ("¿y de jazz?", "¿y en enero?"): lo que el usuario dijo cambia, lo demas se queda igual.
  // Aqui NO se usa la fecha de la IA: los modelos chicos copian fechas viejas o las inventan.
  if (continuacion) {
    const a = contexto.filtros;
    filtros.genero = genero ?? (filtros.genero && normalizar(filtros.genero) !== normalizar(a.genero) ? filtros.genero : null) ?? a.genero;
    filtros.texto = filtros.texto ?? (filtros.genero && filtros.genero !== a.genero ? null : a.texto);
    if (periodo) Object.assign(filtros, { mes: null, fecha: null }, periodo);
    else Object.assign(filtros, { periodo: a.periodo, mes: a.mes, fecha: a.fecha });
    if (!filtros.cerca && a.cerca) {
      filtros.cerca = true;
      if (a.lugarReferencia && !filtros.lugarReferencia) filtros.lugarReferencia = a.lugarReferencia;
    }
    if (filtros.intencion === 'otro') filtros.intencion = 'buscar';
  }

  return { ...filtros, fuente };
};

// redacta la respuesta a una pregunta ABIERTA sobre un evento (solo con los datos de ese evento)
const redactarDetalle = async (mensaje, eventos, hoy) => {
  const lista = eventos
    .map((e) =>
      `- ${e.nombre} | artista: ${e.artista} | genero: ${e.genero} | ${diaYFecha(e)} ${e.hora} | ` +
      `${e.lugar}, ${e.direccion} | estado: ${e.estado === 'cancelado' ? 'cancelado' : yaPaso(e, hoy) ? 'ya paso' : e.estado ?? 'activo'} | ${e.descripcion}`
    )
    .join('\n');

  const instrucciones = `Eres el asistente de CultGo!, una pagina de eventos musicales en Oaxaca de Juárez.
Hoy es ${DIAS[hoy.getDay()]} ${aDma(hoy)}.
El usuario pregunta por este evento:
${lista}

Responde en español, amable, en maximo 2 oraciones, SOLO con esos datos.
- Si la respuesta no esta en los datos (precio, edad, estacionamiento, comida...), di que no tienes esa informacion y que puede consultarlo con los organizadores.
- No inventes nada y no ofrezcas cosas que no puedes hacer.`;

  return (await preguntarIA(
    [
      { role: 'system', content: instrucciones },
      { role: 'user', content: mensaje },
    ],
    { temperatura: 0.3 }
  )).trim();
};

// ======================================================================
// busqueda
// ======================================================================

const coincideGenero = (evento, genero) => {
  if (!genero) return true;
  const delEvento = normalizar(evento.genero);
  const buscado = normalizar(genero);
  if (!delEvento) return false; // eventos sin genero no coinciden con ningun genero
  return delEvento.includes(buscado) || buscado.includes(delEvento);
};

const coincideTexto = (evento, texto) => {
  if (!texto) return true;
  const donde = normalizar([evento.nombre, evento.artista, evento.lugar, evento.direccion, evento.descripcion].join(' '));
  if (donde.includes(normalizar(texto))) return true;
  // todas las palabras importantes aparecen (aunque sea al inicio de otra: "sones" -> "son")
  const buscadas = palabrasDe(texto);
  const palabras = donde.split(/[^a-z0-9ñ]+/);
  return buscadas.length > 0 && buscadas.every((b) => palabras.some((p) => p.startsWith(b) || b.startsWith(p) && p.length >= 4));
};

const filtrarEventos = (eventos, filtros, hoy, { todasLasFechas = false } = {}) => {
  const [desde, hasta] = todasLasFechas ? [null, null] : rangoDeFechas(filtros, hoy);
  return eventos
    .filter((evento) => {
      const fecha = deDma(evento.fecha);
      if (!fecha) return false;
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      return coincideGenero(evento, filtros.genero) && coincideTexto(evento, filtros.texto);
    })
    .sort((a, b) => deDma(a.fecha) - deDma(b.fecha));
};

// si varios eventos coinciden, se queda con los que mas se parecen a lo que escribio el usuario
// ("sones istmeños" -> "Noche de Sones Istmeños" gana a "Sones para los Fieles Difuntos")
const losQueMasCoinciden = (mensaje, eventos) => {
  if (eventos.length < 2) return eventos;
  const buscadas = palabrasDe(mensaje);
  const puntos = eventos.map((e) => {
    const palabras = palabrasDe(`${e.nombre} ${e.artista} ${e.lugar}`);
    return buscadas.filter((b) => palabras.some((p) => p.startsWith(b) || b.startsWith(p))).length;
  });
  const mejor = Math.max(...puntos);
  return mejor > 0 ? eventos.filter((_, i) => puntos[i] === mejor) : eventos;
};

// ======================================================================
// respuestas armadas por el backend
// ======================================================================

const respuestaOtroTema = (mensaje) => {
  const t = sinSignos(mensaje);
  if (GRACIAS.test(t)) return '¡De nada! Si quieres buscar otro evento, aquí estoy.';
  if (DESPEDIDA.test(t)) return '¡Hasta luego! Que disfrutes la música en Oaxaca.';
  if (SALUDO.test(t)) {
    return '¡Hola! Puedo ayudarte a encontrar conciertos y eventos musicales en Oaxaca de Juárez. ¿Qué música te gustaría escuchar?';
  }
  return 'Solo puedo ayudarte con eventos musicales en Oaxaca de Juárez. Prueba preguntándome por un género, una fecha o qué te queda cerca.';
};

const respuestaBusqueda = (filtros, total, mostrados, hoy, referencia) => {
  const genero = filtros.genero ? ` de ${filtros.genero.toLowerCase()}` : '';
  const relacionado = (n) => (filtros.texto ? ` relacionado${n === 1 ? '' : 's'} con "${filtros.texto}"` : '');
  const cerca = referencia ? (referencia.usuario ? ' cerca de ti' : ` cerca ${referencia.etiqueta}`) : '';
  const cuando = describirPeriodo(filtros, hoy);
  if (!total) {
    return `No encontré eventos${genero}${relacionado(2)}${cerca}${cuando}. Prueba con otra fecha o género, o toca una de las sugerencias.`;
  }
  const cuantos = total === 1 ? 'un evento' : `${total} eventos`;
  const extra = total > mostrados ? ` Aquí tienes los ${mostrados} más ${referencia ? 'cercanos' : 'próximos'}:` : '';
  return `Encontré ${cuantos}${genero}${relacionado(total)}${cerca}${cuando}.${extra}`;
};

const respuestaCercania = (mostrar, total, referencia, filtros, hoy) => {
  const [primero] = mostrar;
  const desde = referencia.usuario ? 'de ti' : referencia.etiqueta;
  const intro = referencia.usuario ? '' : `Cerca ${referencia.etiqueta}: `;
  const genero = filtros.genero ? ` de ${filtros.genero.toLowerCase()}` : '';
  const cuando = describirPeriodo(filtros, hoy);
  let texto =
    `${intro}el evento${genero} más cercano${cuando} es "${primero.nombre}" en ${primero.lugar}, ` +
    `a ${formatoDistancia(primero.distanciaKm)} ${desde} (${diaYFecha(primero)}${primero.hora ? `, ${primero.hora}` : ''}).`;
  texto = texto.charAt(0).toUpperCase() + texto.slice(1);
  if (mostrar.length > 1) texto += ' Aquí tienes los demás, del más cercano al más lejano:';
  if (total > mostrar.length) texto = texto.replace('los demás', `los siguientes ${mostrar.length - 1}`);
  return texto;
};

// respuestas fijas para preguntas sobre un evento
const respuestaDetalle = (tipo, evento, hoy) => {
  const nombre = `"${evento.nombre}"`;
  const cuando = `el ${diaYFecha(evento)}${evento.hora ? ` a las ${evento.hora}` : ''}`;
  if (evento.estado === 'cancelado') {
    return `${nombre} fue cancelado (estaba programado para ${cuando} en ${evento.lugar}).`;
  }
  const paso = yaPaso(evento, hoy);
  const nota = evento.estado === 'reprogramado' ? ' Ojo: este evento fue reprogramado.' : '';
  switch (tipo) {
    case 'lugar': {
      const direccion = evento.direccion ? ` (${evento.direccion})` : '';
      return `${nombre} ${paso ? 'fue' : 'es'} en ${evento.lugar}${direccion}. Toca la flechita junto a la tarjeta y se abre la ruta en Google Maps desde donde estás.${nota}`;
    }
    case 'hora':
      return `${nombre} ${paso ? 'fue' : 'es'} ${cuando}, en ${evento.lugar}.${paso ? ' Ese evento ya pasó.' : ''}${nota}`;
    case 'descripcion': {
      const quien = evento.artista ? ` con ${evento.artista}` : '';
      const de = evento.descripcion ? ` ${evento.descripcion}` : '';
      return `${nombre}${quien}:${de || ' no tengo más descripción de este evento.'} ${paso ? 'Fue' : 'Es'} ${cuando} en ${evento.lugar}.${nota}`;
    }
    case 'precio':
      return `No tengo el precio de ${nombre}. Te recomiendo consultarlo con los organizadores. ${paso ? 'Fue' : 'Es'} ${cuando} en ${evento.lugar}.${nota}`;
    default:
      return `${nombre} ${paso ? 'fue' : 'es'} ${cuando} en ${evento.lugar}.${nota}`;
  }
};

// botones con preguntas para seguir la conversacion
const SUGERENCIAS_INICIO = ['¿Qué hay este fin de semana?', '¿Qué conciertos me quedan cerca?', '¿Qué eventos hay este mes?'];

const armarSugerencias = ({ eventos, filtros, detalle, porCercania, tipo }) => {
  if (!eventos.length) return SUGERENCIAS_INICIO;
  const s = [];
  if (detalle) {
    if (tipo !== 'lugar') s.push('¿Cómo llego?');
    if (tipo !== 'hora') s.push('¿A qué hora es?');
    s.push('¿Qué otros eventos hay?');
    return s.slice(0, 3);
  }
  s.push(eventos.length === 1 ? '¿Cómo llego?' : '¿Cómo llego al primero?');
  if (!porCercania) s.push('¿Qué me queda cerca?');
  else if (eventos.length > 1) s.push('¿A qué hora es el segundo?');
  s.push(filtros.periodo === 'proximo_fin_de_semana' ? '¿Y el próximo mes?' : '¿Y el próximo fin de semana?');
  return s.slice(0, 3);
};

// ======================================================================
// validacion de lo que manda el navegador
// ======================================================================

const leerUbicacion = (ubicacion) => {
  const lat = Number(ubicacion?.lat);
  const lon = Number(ubicacion?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
};

const leerContexto = (contexto) => {
  if (!contexto || typeof contexto !== 'object') return null;
  const leerIds = (lista) =>
    Array.isArray(lista) ? lista.map(Number).filter(Number.isInteger).slice(0, MAX_EVENTOS_RESPUESTA) : [];
  const ids = leerIds(contexto.ids);
  const idsLista = leerIds(contexto.idsLista).length ? leerIds(contexto.idsLista) : ids;
  const f = contexto.filtros && typeof contexto.filtros === 'object' ? contexto.filtros : {};
  return {
    pregunta: typeof contexto.pregunta === 'string' ? contexto.pregunta.slice(0, MAX_MENSAJE) : '',
    ids,
    idsLista,
    filtros: {
      genero: typeof f.genero === 'string' ? f.genero : null,
      texto: typeof f.texto === 'string' ? f.texto : null,
      periodo: PERIODOS.includes(f.periodo) ? f.periodo : 'cualquiera',
      mes: f.mes ?? null,
      fecha: f.fecha ?? null,
      cerca: f.cerca === true,
      lugarReferencia: typeof f.lugarReferencia === 'string' ? f.lugarReferencia.slice(0, 80) : null,
    },
  };
};

// ======================================================================
// limite de mensajes (para no saturar la laptop)
// ======================================================================

const LIMITE_POR_MINUTO = 60;
const historial = new Map(); // ip -> [tiempos]

const excedioLimite = (ip) => {
  const ahora = Date.now();
  const recientes = (historial.get(ip) ?? []).filter((t) => ahora - t < 60000);
  recientes.push(ahora);
  historial.set(ip, recientes);
  if (historial.size > 500) historial.clear(); // que no crezca sin limite
  return recientes.length > LIMITE_POR_MINUTO;
};

// ======================================================================
// ruta
// ======================================================================

// se registra desde server.js:  require('./asistente')(app, pool, aEvento);
module.exports = (app, pool, aEvento) => {
  app.post('/api/asistente', async (req, res) => {
    const mensaje = String(req.body?.mensaje ?? '').trim();
    if (!mensaje) return res.status(400).json({ error: 'Escribe un mensaje' });
    if (mensaje.length > MAX_MENSAJE) {
      return res.status(400).json({ error: `El mensaje es muy largo (máximo ${MAX_MENSAJE} caracteres)` });
    }
    if (excedioLimite(req.ip)) {
      return res.status(429).json({ error: 'Vas muy rápido, espera un momento y vuelve a intentar' });
    }

    let eventos;
    try {
      const { rows } = await pool.query('SELECT * FROM eventos_cultgo ORDER BY id;');
      eventos = rows.map(aEvento);
    } catch (error) {
      console.error('Asistente: error consultando eventos:', error);
      return res.status(500).json({ error: 'No pude consultar los eventos. Intenta de nuevo en un momento.' });
    }

    const hoy = inicioDelDia(new Date());
    // los cancelados no salen en las busquedas, pero si se puede preguntar por ellos
    const activos = eventos.filter((e) => e.estado !== 'cancelado');
    const generos = [...new Set(activos.map((e) => e.genero).filter(Boolean))];
    const ubicacion = leerUbicacion(req.body?.ubicacion);
    const contexto = leerContexto(req.body?.contexto);

    let filtros;
    try {
      filtros = await entender(mensaje, generos, hoy, contexto);
    } catch (error) {
      console.error('Asistente: error entendiendo el mensaje:', error);
      return res.status(500).json({ error: 'No entendí tu mensaje. ¿Lo puedes escribir de otra forma?' });
    }

    // lo que se manda de vuelta para recordar la busqueda (sin datos internos)
    const filtrosPublicos = {
      genero: filtros.genero,
      texto: filtros.texto,
      periodo: filtros.periodo,
      mes: filtros.mes,
      fecha: filtros.fecha,
      cerca: filtros.cerca,
      lugarReferencia: filtros.lugarReferencia ?? null,
    };

    const responder = (respuesta, mostrados, { todos = mostrados, detalle = false, porCercania = false, tipo = null } = {}) =>
      res.json({
        respuesta,
        eventos: mostrados,
        filtros: filtrosPublicos,
        total: todos.length,
        idsTodos: todos.map((e) => e.id),
        sugerencias: armarSugerencias({ eventos: mostrados, filtros, detalle, porCercania, tipo }),
      });

    // ---- si escribio palabras que no son genero ni fecha, se ve si es el nombre de algo ("xquenda") ----
    if (!filtros.texto && !filtros.cerca && filtros.intencion !== 'otro' && filtros.intencion !== 'detalle') {
      const palabras = palabrasDe(mensaje).filter((p) => !esDelGenero(p, filtros.genero));
      const existe = palabras.length &&
        filtrarEventos(eventos, { ...filtros, texto: palabras.join(' ') }, hoy, { todasLasFechas: true }).length;
      if (existe) {
        filtros.texto = palabras.join(' ');
        filtrosPublicos.texto = filtros.texto;
      }
    }
    if (filtros.intencion === 'buscar_o_otro') filtros.intencion = filtros.texto ? 'buscar' : 'otro';

    // ---- saludo, gracias o tema que no es de eventos ----
    if (filtros.intencion === 'otro') {
      return res.json({ respuesta: respuestaOtroTema(mensaje), eventos: [], sugerencias: SUGERENCIAS_INICIO });
    }

    // ---- fecha escrita por el usuario que no existe ("31 de febrero") ----
    const escrito = periodoMencionado(mensaje, hoy);
    const fechasPedidas = escrito?.periodo === 'fecha' ? [escrito.fecha]
      : escrito?.periodo === 'rango' ? String(escrito.fecha ?? '').split('|') : [];
    if (fechasPedidas.some((f) => !fechaFlexible(f, hoy))) {
      return res.json({
        respuesta: 'Esa fecha no existe en el calendario. ¿Me la escribes de nuevo? Por ejemplo "20/12" o "20 de diciembre".',
        eventos: [],
        sugerencias: SUGERENCIAS_INICIO,
      });
    }

    // ---- punto de referencia para "cerca" ----
    let referencia = null;
    if (filtros.cerca) {
      if (filtros.lugarReferencia) {
        const lugar = buscarLugar(filtros.lugarReferencia, eventos);
        if (!lugar) {
          return res.json({
            respuesta: `No conozco "${filtros.lugarReferencia}". Prueba con "cerca de mí" o con un lugar como el Zócalo, Santo Domingo o El Llano.`,
            eventos: [],
            sugerencias: ['¿Qué hay cerca del Zócalo?', '¿Qué conciertos me quedan cerca?', '¿Qué hay este fin de semana?'],
          });
        }
        referencia = lugar;
      } else if (ubicacion) {
        referencia = { ...ubicacion, usuario: true };
      } else {
        // pidio "cerca de mi" pero el navegador no mando la ubicacion: se le pide
        return res.json({
          respuesta: 'Para decirte qué eventos te quedan cerca necesito tu ubicación. Toca el botón para compartirla (o pregúntame, por ejemplo, "¿qué hay cerca del Zócalo?").',
          eventos: [],
          necesitaUbicacion: true,
          filtros: filtrosPublicos,
        });
      }
    }

    const detalle = filtros.intencion === 'detalle';
    const tipo = detalle ? tipoDePregunta(mensaje) : null;
    let encontrados;

    if (detalle) {
      if (filtros.sinLista) {
        encontrados = [];
      } else if (filtros.posicion !== undefined) {
        // "el segundo": ese evento de la ultima lista, en el mismo orden en que se mostro
        const indice = filtros.posicion === -1 ? contexto.idsLista.length - 1 : filtros.posicion;
        const evento = eventos.find((e) => e.id === contexto.idsLista[indice]);
        if (!evento) {
          return responder(
            `En la lista anterior solo había ${contexto.idsLista.length} ${contexto.idsLista.length === 1 ? 'evento' : 'eventos'}. ¿Por cuál me preguntas?`,
            []
          );
        }
        encontrados = [evento];
      } else if (filtros.usarAnterior) {
        // "¿a que hora es?" sin decir cual: el evento del que se estaba hablando
        encontrados = contexto.ids.map((id) => eventos.find((e) => e.id === id)).filter(Boolean).slice(0, 1);
      } else {
        // pregunta por un evento: se busca en todas las fechas (puede ser uno que ya paso o se cancelo)
        const conFecha = filtros.periodo !== 'cualquiera';
        encontrados = filtros.genero || filtros.texto
          ? filtrarEventos(eventos, filtros, hoy, { todasLasFechas: !conFecha })
          : [];
        // no dijo de cual: se toma el de la respuesta anterior
        if (!encontrados.length && contexto?.ids.length && !palabrasDe(mensaje).length) {
          encontrados = contexto.ids.map((id) => eventos.find((e) => e.id === id)).filter(Boolean).slice(0, 1);
        }
        encontrados = losQueMasCoinciden(mensaje, encontrados);
        // primero los que no han pasado ni se cancelaron
        encontrados.sort((a, b) => (yaPaso(a, hoy) || a.estado === 'cancelado') - (yaPaso(b, hoy) || b.estado === 'cancelado'));
      }
    } else {
      encontrados = filtrarEventos(activos, filtros, hoy);
      // buscaba algo por nombre y solo hay eventos que ya pasaron: se muestran avisando
      if (!encontrados.length && filtros.texto && filtros.periodo === 'cualquiera') {
        const pasados = filtrarEventos(eventos, filtros, hoy, { todasLasFechas: true });
        if (pasados.length) {
          const mostrarPasados = pasados.slice(-MAX_EVENTOS_RESPUESTA).reverse();
          return responder(
            `Encontré ${pasados.length === 1 ? 'un evento' : `${pasados.length} eventos`} relacionado${pasados.length === 1 ? '' : 's'} con "${filtros.texto}", pero ya ${pasados.length === 1 ? 'pasó' : 'pasaron'} o no está${pasados.length === 1 ? '' : 'n'} disponible${pasados.length === 1 ? '' : 's'}.`,
            mostrarPasados,
            { todos: pasados }
          );
        }
      }
    }

    // distancia a cada evento (desde el usuario o el lugar de referencia)
    const origen = referencia ?? (ubicacion ? { ...ubicacion, usuario: true } : null);
    if (origen) {
      encontrados = encontrados.map((e) =>
        Number.isFinite(e.latitud) && Number.isFinite(e.longitud)
          ? { ...e, distanciaKm: Math.round(distanciaKm(origen.lat, origen.lon, e.latitud, e.longitud) * 100) / 100 }
          : e
      );
    }
    const porCercania = Boolean(referencia) && !detalle;
    if (porCercania) {
      encontrados = encontrados.filter((e) => e.distanciaKm !== undefined).sort((a, b) => a.distanciaKm - b.distanciaKm);
    }

    const mostrar = encontrados.slice(0, detalle ? MAX_EVENTOS_DETALLE : MAX_EVENTOS_RESPUESTA);

    // ---- busquedas ----
    if (!detalle) {
      const respuesta = porCercania && mostrar.length
        ? respuestaCercania(mostrar, encontrados.length, referencia, filtros, hoy)
        : respuestaBusqueda(filtros, encontrados.length, mostrar.length, hoy, referencia);
      return responder(respuesta, mostrar, { todos: encontrados, porCercania });
    }

    // ---- preguntas sobre un evento ----
    if (!mostrar.length) {
      const respuesta = posicionMencionada(mensaje) !== null
        ? 'No tengo una lista de eventos a la que referirme. Primero busca eventos (por ejemplo "¿qué hay este fin de semana?") y luego pregúntame por el primero, el segundo, etc.'
        : 'No encontré ese evento. ¿Me dices su nombre, el artista o el género?';
      return responder(respuesta, [], { detalle, tipo });
    }

    // varios eventos con el mismo nombre parecido: se muestran y se pregunta cual
    if (mostrar.length > 1 && tipo) {
      return responder(
        `Encontré ${mostrar.length} eventos que coinciden. ${mostrar.map((e, i) => `${i === 0 ? 'El primero' : 'el segundo'} es "${e.nombre}" (${diaYFecha(e)}${e.hora ? `, ${e.hora}` : ''})`).join(' y ')}. ¿Por cuál me preguntas?`,
        mostrar,
        { detalle, tipo }
      );
    }

    const [evento] = mostrar;
    if (tipo) return responder(respuestaDetalle(tipo, evento, hoy), [evento], { detalle, tipo });

    // "¿y el tercero?", "¿y el de jazz?": no pregunta nada en concreto, se da el resumen del evento
    const preguntaAbierta = /\b(es|son|hay|tiene|tienen|puedo|se puede|incluye|acepta|aceptan|dejan|habra|venden|necesito|llevar|recomiendas|vale la pena)\b/.test(normalizar(mensaje));
    if (!preguntaAbierta) return responder(respuestaDetalle('descripcion', evento, hoy), [evento], { detalle, tipo: 'descripcion' });

    // pregunta abierta sobre un evento: aqui si redacta la IA (con respaldo si falla)
    let respuesta;
    try {
      respuesta = await redactarDetalle(mensaje, [evento], hoy);
    } catch (error) {
      console.warn('Asistente: la IA no pudo redactar, se usa respuesta fija:', error.message);
    }
    if (!respuesta) respuesta = respuestaDetalle('descripcion', evento, hoy);
    return responder(respuesta, [evento], { detalle, tipo });
  });
};

// se exportan para poder probarlas sin IA
Object.assign(module.exports, {
  rangoDeFechas, filtrarEventos, distanciaKm, entender, periodoMencionado, generoMencionado,
  cercaniaMencionada, buscarLugar, posicionMencionada, tipoDePregunta, respuestaBusqueda,
  respuestaDetalle, respuestaCercania, armarSugerencias, losQueMasCoinciden, limpiarTexto,
});
