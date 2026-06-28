/**
 * firestore-error.ts
 *
 * Fuente única de verdad para el manejo de errores de Firestore.
 * Anteriormente duplicado en LeadService.ts y Dashboard.tsx (BUG-020).
 *
 * La interfaz FirestoreErrorInfo usa el superconjunto de campos authInfo
 * (versión Dashboard, más completa) y el formato de mensaje de error
 * legible para humanos (versión LeadService).
 */

import { auth } from '../lib/firebase';

// ---------------------------------------------------------------------------
// Enum
// ---------------------------------------------------------------------------

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST   = 'list',
  GET    = 'get',
  WRITE  = 'write',
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  /** Superconjunto de ambas versiones (LeadService + Dashboard). */
  authInfo: {
    userId?:       string | null;
    email?:        string | null;
    emailVerified?: boolean | null;
    isAnonymous?:  boolean | null;
    tenantId?:     string | null;
    providerInfo?: {
      providerId?: string | null;
      email?:      string | null;
    }[];
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Registra en consola los detalles del error de Firestore y lanza una
 * excepción con un mensaje legible para humanos.
 *
 * @param error         - El error capturado en el bloque catch.
 * @param operationType - Tipo de operación que falló (GET, WRITE, DELETE…).
 * @param path          - Ruta de la colección / documento afectado.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId:        auth.currentUser?.uid,
      email:         auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous:   auth.currentUser?.isAnonymous,
      tenantId:      auth.currentUser?.tenantId,
      providerInfo:  auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email:      provider.email,
      })) ?? [],
    },
    operationType,
    path,
  };

  console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
  throw new Error(
    `Error en Firestore (${operationType} en ${path}): ${errInfo.error}`
  );
}
