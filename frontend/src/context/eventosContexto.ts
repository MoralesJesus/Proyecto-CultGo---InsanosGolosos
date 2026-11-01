import { createContext } from "react";
import type { Evento } from "../types";

export interface EventosContextType {
  eventos: Evento[];
  cargando: boolean;
  agregar: (datos: Omit<Evento, "id">) => Promise<void>;
  editar: (evento: Evento) => Promise<void>;
  borrar: (id: number) => Promise<void>;
  restablecer: () => Promise<void>;
}

export const EventosContext = createContext<EventosContextType>({
  eventos: [],
  cargando: true,
  agregar: async () => {},
  editar: async () => {},
  borrar: async () => {},
  restablecer: async () => {},
});
