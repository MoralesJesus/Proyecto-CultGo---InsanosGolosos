import type { Evento } from "../types";
import { auth } from "./firebase";

// los eventos se guardan en PostgreSQL a traves del backend (backend/server.js)
// la URL se puede cambiar con VITE_API_URL en frontend/.env
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// para crear, editar o eliminar se manda el token del usuario de Firebase;
// el backend revisa que sea uno de los correos de administrador
const encabezados = async (): Promise<HeadersInit> => {
  const token = await auth.currentUser?.getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const pedir = async <T>(ruta: string, opciones: RequestInit = {}): Promise<T> => {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: await encabezados(),
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.error ?? `Error ${respuesta.status} en el servidor`);
  }
  return (respuesta.status === 204 ? undefined : await respuesta.json()) as T;
};

export const obtenerEventos = (): Promise<Evento[]> => pedir<Evento[]>("/api/eventos");

export const crearEvento = (datos: Omit<Evento, "id">): Promise<Evento> =>
  pedir<Evento>("/api/eventos", { method: "POST", body: JSON.stringify(datos) });

export const actualizarEvento = ({ id, ...datos }: Evento): Promise<Evento> =>
  pedir<Evento>(`/api/eventos/${id}`, { method: "PUT", body: JSON.stringify(datos) });

export const eliminarEvento = (id: number): Promise<void> =>
  pedir<void>(`/api/eventos/${id}`, { method: "DELETE" });
