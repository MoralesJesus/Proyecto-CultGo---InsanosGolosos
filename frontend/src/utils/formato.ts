// "2026-10-20" -> "20/10/2026"
export const isoADma = (iso: string) => {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
};

// "20/10/2026" -> "2026-10-20"
export const dmaAIso = (dma: string) => {
  const [dia, mes, anio] = dma.split("/");
  if (!dia || !mes || !anio) return "";
  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
};

// "20:00" -> "8:00 PM"
export const a12Horas = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const sufijo = h >= 12 ? "PM" : "AM";
  const hora = h % 12 === 0 ? 12 : h % 12;
  return `${hora}:${String(m).padStart(2, "0")} ${sufijo}`;
};

// "8:00 PM" -> "20:00"
export const a24Horas = (texto: string) => {
  const coincide = texto.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!coincide) return "";
  let h = Number(coincide[1]);
  const sufijo = coincide[3]?.toUpperCase();
  if (sufijo === "PM" && h < 12) h += 12;
  if (sufijo === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${coincide[2]}`;
};
