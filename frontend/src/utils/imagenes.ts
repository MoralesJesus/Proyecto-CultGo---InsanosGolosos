const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// las fotos subidas desde el panel se guardan en el backend ("/uploads/abc.jpg");
// las de ejemplo viven en el frontend ("/eventos/rock.jpg") y los links externos se usan tal cual
export const urlImagen = (imagen?: string) => {
  if (!imagen) return undefined;
  return imagen.startsWith("/uploads/") ? `${API_URL}${imagen}` : imagen;
};

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const LADO_MAXIMO = 1600; // px
const MB = 1024 * 1024;

// achica la foto en el navegador antes de subirla (una foto del celular puede pesar 8 MB;
// asi queda en unos cientos de KB) y la regresa como "data:image/jpeg;base64,..."
export const prepararImagen = async (archivo: File): Promise<string> => {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    throw new Error("Elige una imagen JPG, PNG o WEBP.");
  }
  if (archivo.size > 20 * MB) {
    throw new Error("La imagen pesa más de 20 MB. Elige una más ligera.");
  }

  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const imagen = new Image();
      imagen.onload = () => resolver(imagen);
      imagen.onerror = () => rechazar(new Error("No se pudo leer la imagen."));
      imagen.src = url;
    });

    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(img.naturalWidth * escala);
    lienzo.height = Math.round(img.naturalHeight * escala);
    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("Tu navegador no pudo procesar la imagen.");
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);

    // PNG con transparencia se queda en PNG; lo demas se vuelve JPG (pesa mucho menos)
    const tipo = archivo.type === "image/png" ? "image/png" : "image/jpeg";
    const datos = lienzo.toDataURL(tipo, 0.85);
    if (datos.length > 3.9 * MB) {
      throw new Error("La imagen sigue pesando demasiado. Prueba con otra.");
    }
    return datos;
  } finally {
    URL.revokeObjectURL(url);
  }
};
