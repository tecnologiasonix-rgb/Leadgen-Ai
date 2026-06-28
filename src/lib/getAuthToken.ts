import { auth } from './firebase';

/**
 * Obtiene el Firebase ID Token del usuario autenticado actualmente.
 * El token es válido durante 1 hora; Firebase lo renueva automáticamente
 * cuando se llama con force=false (comportamiento por defecto).
 *
 * Lanza un Error si no hay ningún usuario con sesión iniciada.
 */
export async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No hay usuario autenticado. Inicia sesión antes de usar esta función.');
  }
  // getIdToken(false) usa la caché si el token aún es válido;
  // si ha expirado Firebase lo renueva automáticamente.
  return user.getIdToken(false);
}
