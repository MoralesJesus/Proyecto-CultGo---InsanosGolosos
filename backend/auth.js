// Autenticacion de administradores usando el mismo login de Firebase que el frontend.
// El frontend manda "Authorization: Bearer <ID token de Firebase>" y aqui se verifica
// la firma del token y que el correo este en la lista de administradores.
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const projectId = process.env.FIREBASE_PROJECT_ID || 'cultgo';

// Para verificar ID tokens solo se necesita el id del proyecto (no hace falta cuenta de servicio)
initializeApp({ projectId });

// Lista de correos admin separada por comas, igual que frontend/src/config/admins.ts
const correosAdmin = (process.env.ADMIN_CORREOS || '')
  .split(',')
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);

if (!correosAdmin.length) {
  console.warn('Aviso: ADMIN_CORREOS esta vacio en backend/.env; nadie podra modificar eventos.');
}

const requiereAdmin = async (req, res, next) => {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Se requiere iniciar sesion' });
  }

  let datos;
  try {
    datos = await getAuth().verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: 'Sesion invalida o expirada' });
  }

  const correo = (datos.email || '').toLowerCase();
  if (!correosAdmin.includes(correo)) {
    return res.status(403).json({ error: 'No tienes permisos de administrador' });
  }
  // las cuentas de correo y contrasena deben haber verificado su correo
  if (!datos.email_verified) {
    return res.status(403).json({ error: 'Verifica tu correo antes de administrar eventos' });
  }

  req.admin = { uid: datos.uid, correo };
  next();
};

module.exports = { requiereAdmin };
