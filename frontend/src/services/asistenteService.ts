import type { Evento } from "../types";

// el asistente vive en el backend (backend/asistente.js); la clave de la IA nunca llega al navegador
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface RespuestaAsistente {
  respuesta: string;
  eventos: Evento[];
}

export const preguntarAsistente = async (mensaje: string): Promise<RespuestaAsistente> => {
  const respuesta = await fetch(`${API_URL}/api/asistente`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje }),
  });
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(cuerpo?.error ?? "El asistente no está disponible en este momento.");
  }
  return cuerpo as RespuestaAsistente;
};
