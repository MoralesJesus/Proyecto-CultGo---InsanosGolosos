import type { Evento } from "../types";

// el asistente vive en el backend (backend/asistente.js); la clave de la IA nunca llega al navegador
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Ubicacion {
  lat: number;
  lon: number;
}

// el backend agrega la distancia cuando el usuario compartio su ubicacion
export type EventoAsistente = Evento & { distanciaKm?: number };

export interface RespuestaAsistente {
  respuesta: string;
  eventos: EventoAsistente[];
  necesitaUbicacion?: boolean;
}

export const preguntarAsistente = async (
  mensaje: string,
  ubicacion?: Ubicacion | null
): Promise<RespuestaAsistente> => {
  const respuesta = await fetch(`${API_URL}/api/asistente`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje, ...(ubicacion ? { ubicacion } : {}) }),
  });
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(cuerpo?.error ?? "El asistente no está disponible en este momento.");
  }
  return cuerpo as RespuestaAsistente;
};

// pide la ubicacion al navegador (el usuario tiene que dar permiso)
export const obtenerUbicacion = (): Promise<Ubicacion> =>
  new Promise((resolver, rechazar) => {
    if (!navigator.geolocation) {
      rechazar(new Error("Tu navegador no permite compartir la ubicación."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicion) => resolver({ lat: posicion.coords.latitude, lon: posicion.coords.longitude }),
      (error) =>
        rechazar(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? "No diste permiso para usar tu ubicación. Puedes activarlo en el candado junto a la dirección de la página."
              : "No pude obtener tu ubicación. Intenta de nuevo."
          )
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
