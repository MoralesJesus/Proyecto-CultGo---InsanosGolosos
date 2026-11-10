// correos que pueden entrar al panel de admin (en minusculas)
export const correosAdmin: string[] = [
  'obedc060@gmail.com',
];

export const esAdmin = (correo: string | null | undefined) =>
  !!correo && correosAdmin.includes(correo.toLowerCase());
