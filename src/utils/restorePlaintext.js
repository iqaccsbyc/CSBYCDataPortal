import CryptoJS from 'crypto-js';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const SECRET_KEY = import.meta.env.VITE_DATA_ENCRYPTION_KEY || 'CSBYC_DATA_PORTAL_SECURE_KEY_2026';
const ENCRYPTION_PREFIX = 'ENC::';

export const isEncrypted = (val) => {
  return typeof val === 'string' && val.startsWith(ENCRYPTION_PREFIX);
};

export const decryptValue = (val) => {
  if (!isEncrypted(val)) return val;
  try {
    const ciphertext = val.slice(ENCRYPTION_PREFIX.length);
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedJson = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedJson) return val;
    return JSON.parse(decryptedJson);
  } catch (err) {
    console.error('Decryption error:', err);
    return val;
  }
};

export const decryptData = (data) => {
  if (data === null || data === undefined) return data;
  if (typeof data === 'object' && (data.seconds !== undefined || data instanceof Date)) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => decryptData(item));
  }
  if (typeof data === 'object') {
    const decryptedObj = {};
    for (const [key, value] of Object.entries(data)) {
      decryptedObj[key] = decryptData(value);
    }
    return decryptedObj;
  }
  if (typeof data === 'string') {
    return decryptValue(data);
  }
  return data;
};

export function hasAnyEncryptedField(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.seconds !== undefined || data instanceof Date) return false;
  if (Array.isArray(data)) return data.some(item => hasAnyEncryptedField(item));
  for (const val of Object.values(data)) {
    if (isEncrypted(val)) return true;
    if (typeof val === 'object' && hasAnyEncryptedField(val)) return true;
  }
  return false;
}

const ALL_COLLECTIONS = [
  'activities',
  'achievements',
  'publications',
  'presentations',
  'participations',
  'iprOutcomes',
  'projects',
  'consultancy',
  'incentives',
  'faculty',
  'users',
  'students',
  'alumni',
  'phdscholars',
  'placements',
  'departments',
  'programmes',
  'classes',
  'documents',
  'disciplinaryReports',
  'industryCollaborators',
  'researchCollaborators',
  'tasks',
];

let restorationRunning = false;

/**
 * Runs restoration of all collections to plain readable Firestore data.
 * Safe, idempotent, uses direct updateDoc.
 */
export async function restoreAllCollectionsToPlaintext() {
  if (restorationRunning) return;
  restorationRunning = true;

  console.log('[Plaintext Restoration] Checking collections for encrypted fields...');

  let totalRestored = 0;

  for (const colName of ALL_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName));
      if (snap.empty) continue;

      let colRestored = 0;
      for (const docSnap of snap.docs) {
        const rawData = docSnap.data();
        if (!hasAnyEncryptedField(rawData)) continue;

        const plainData = decryptData(rawData);
        if ('isEncrypted' in plainData) {
          delete plainData.isEncrypted;
        }

        await updateDoc(docSnap.ref, plainData);
        colRestored++;
        totalRestored++;
      }

      if (colRestored > 0) {
        console.log(`[Plaintext Restoration] Restored ${colRestored} document(s) in '${colName}'`);
      }
    } catch (err) {
      console.warn(`[Plaintext Restoration] Skipping '${colName}':`, err.message);
    }
  }

  restorationRunning = false;
  if (totalRestored > 0) {
    console.log(`[Plaintext Restoration] Done! Restored ${totalRestored} document(s) across all collections.`);
  } else {
    console.log('[Plaintext Restoration] All collections are already 100% clean plaintext.');
  }
}
