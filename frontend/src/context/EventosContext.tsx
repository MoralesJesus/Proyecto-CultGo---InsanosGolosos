import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Evento } from "../types";
import { EventosContext } from "./eventosContexto";
import {
  obtenerEventos,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
} from "../services/eventosService";

export function EventosProvider({ children }: { children: ReactNode }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerEventos()
      .then(setEventos)
      .catch((err) => {
        console.error("Error al cargar eventos:", err);
        setError("No se pudieron cargar los eventos. Revisa que el servidor esté encendido.");
      })
      .finally(() => setCargando(false));
  }, []);

  const agregar = async (datos: Omit<Evento, "id">) => {
    await crearEvento(datos);
    setEventos(await obtenerEventos());
  };

  const editar = async (evento: Evento) => {
    await actualizarEvento(evento);
    setEventos(await obtenerEventos());
  };

  const borrar = async (id: number) => {
    await eliminarEvento(id);
    setEventos(await obtenerEventos());
  };

  return (
    <EventosContext.Provider value={{ eventos, cargando, error, agregar, editar, borrar }}>
      {children}
    </EventosContext.Provider>
  );
}
