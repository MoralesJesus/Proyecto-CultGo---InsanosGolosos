import type { Evento } from "../types";

// en que grupo de la pagina principal va cada evento
export type Grupo = "semana" | "proximo" | "terminado";

export interface EventoEnAgenda {
  evento: Evento;
  grupo: Grupo;
  // dias que faltan (0 = hoy); negativo si ya paso
  dias: number;
  // texto corto para la tarjeta: "¡Hoy!", "Mañana", "En 3 días", "Finalizado", "Cancelado"...
  etiqueta?: string;
}

const DIA_MS = 24 * 60 * 60 * 1000;

const aFecha = (dma: string) => {
  const [dia, mes, anio] = dma.split("/").map(Number);
  return dia && mes && anio ? new Date(anio, mes - 1, dia) : null;
};

const hoySinHora = () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
};

// "8:00 PM" -> minutos desde medianoche, para ordenar dos eventos del mismo dia
const minutos = (hora: string) => {
  const m = hora?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3]?.toUpperCase() === "PM") h += 12;
  if (!m[3]) h = Number(m[1]);
  return h * 60 + Number(m[2]);
};

// fecha y hora exactas del evento ("20/10/2026" + "8:00 PM"), para la cuenta regresiva
export const fechaHora = (evento: Pick<Evento, "fecha" | "hora">): Date | null => {
  const fecha = aFecha(evento.fecha);
  if (!fecha) return null;
  const total = minutos(evento.hora);
  fecha.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return fecha;
};

export const clasificar = (evento: Evento, hoy = hoySinHora()): EventoEnAgenda => {
  const fecha = aFecha(evento.fecha);
  const dias = fecha ? Math.round((fecha.getTime() - hoy.getTime()) / DIA_MS) : -1;

  if (evento.estado === "cancelado") return { evento, grupo: "terminado", dias, etiqueta: "Cancelado" };
  if (dias < 0 || evento.estado === "finalizado") return { evento, grupo: "terminado", dias, etiqueta: "Finalizado" };

  const reprogramado = evento.estado === "reprogramado" ? " · Reprogramado" : "";
  if (dias <= 6) {
    const cuando = dias === 0 ? "¡Hoy!" : dias === 1 ? "Mañana" : `En ${dias} días`;
    return { evento, grupo: "semana", dias, etiqueta: cuando + reprogramado };
  }
  return { evento, grupo: "proximo", dias, etiqueta: reprogramado ? "Reprogramado" : undefined };
};

// ordena: esta semana y proximos del mas cercano en fecha al mas lejano;
// los terminados al final, del mas reciente al mas viejo
export const ordenarAgenda = (
  eventos: Evento[],
  distancia?: (e: Evento) => number
): Record<Grupo, EventoEnAgenda[]> => {
  const hoy = hoySinHora();
  const grupos: Record<Grupo, EventoEnAgenda[]> = { semana: [], proximo: [], terminado: [] };
  for (const evento of eventos) {
    const item = clasificar(evento, hoy);
    grupos[item.grupo].push(item);
  }
  const porFecha = (a: EventoEnAgenda, b: EventoEnAgenda) =>
    a.dias - b.dias || minutos(a.evento.hora) - minutos(b.evento.hora);
  const porCercania = (a: EventoEnAgenda, b: EventoEnAgenda) =>
    distancia ? distancia(a.evento) - distancia(b.evento) : porFecha(a, b);

  grupos.semana.sort(distancia ? porCercania : porFecha);
  grupos.proximo.sort(distancia ? porCercania : porFecha);
  grupos.terminado.sort((a, b) => b.dias - a.dias);
  return grupos;
};
