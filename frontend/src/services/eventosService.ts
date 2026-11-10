import type { Evento } from "../types";
import { eventosPrueba } from "../data/eventosPrueba";

// por ahora los eventos se guardan en el navegador
// cuando este el backend, solo se cambia este archivo por llamadas con axios
const CLAVE = "cultgo_eventos_v1";

const leer = (): Evento[] => {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado) return JSON.parse(guardado) as Evento[];
  } catch {
    // si falla, se usan los de prueba
  }
  return eventosPrueba;
};

const guardar = (eventos: Evento[]) => {
  localStorage.setItem(CLAVE, JSON.stringify(eventos));
};

export const obtenerEventos = async (): Promise<Evento[]> => leer();

export const crearEvento = async (datos: Omit<Evento, "id">): Promise<Evento> => {
  const eventos = leer();
  const nuevoId = eventos.reduce((mayor, e) => Math.max(mayor, e.id), 0) + 1;
  const nuevo: Evento = { ...datos, id: nuevoId };
  guardar([...eventos, nuevo]);
  return nuevo;
};

export const actualizarEvento = async (evento: Evento): Promise<Evento> => {
  guardar(leer().map((e) => (e.id === evento.id ? evento : e)));
  return evento;
};

export const eliminarEvento = async (id: number): Promise<void> => {
  guardar(leer().filter((e) => e.id !== id));
};

export const restablecerEventos = async (): Promise<Evento[]> => {
  localStorage.removeItem(CLAVE);
  return eventosPrueba;
};
