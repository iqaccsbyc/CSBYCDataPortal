import { 
  getDocs as firestoreGetDocs, 
  getDoc as firestoreGetDoc, 
  addDoc as firestoreAddDoc, 
  setDoc as firestoreSetDoc, 
  updateDoc as firestoreUpdateDoc, 
  onSnapshot as firestoreOnSnapshot 
} from 'firebase/firestore';
import { encryptData, decryptData, isEncrypted } from '../utils/encryption';

/**
 * Encrypts and writes document using setDoc, automatically encrypting the data payload
 */
export const setDocEncrypted = async (docRef, data, options) => {
  const encryptedPayload = encryptData(data);
  return firestoreSetDoc(docRef, encryptedPayload, options);
};

/**
 * Encrypts and adds document using addDoc
 */
export const addDocEncrypted = async (collectionRef, data) => {
  const encryptedPayload = encryptData(data);
  return firestoreAddDoc(collectionRef, encryptedPayload);
};

/**
 * Encrypts and updates document using updateDoc
 */
export const updateDocEncrypted = async (docRef, data) => {
  const encryptedPayload = encryptData(data);
  return firestoreUpdateDoc(docRef, encryptedPayload);
};

/**
 * Helper to check if a snapshot/doc contains unencrypted fields and update Firebase in the background
 */
const autoMigrateDocIfNeeded = async (docSnap) => {
  if (!docSnap || !docSnap.exists || !docSnap.exists()) return;
  const rawData = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data;
  if (!rawData) return;
  
  // Excluded keys that stay plaintext for querying/routing
  const EXCLUDED = new Set([
    'id', 'docId', 'uid', 'createdAt', 'updatedAt', 'timestamp', 
    'date', 'startDate', 'endDate', 'status', 'role', 'department', 
    'academicYear', 'type', 'category', 'createdBy', 'stage'
  ]);

  let hasUnencryptedField = false;

  const checkUnencrypted = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, val] of Object.entries(obj)) {
      if (EXCLUDED.has(key)) continue;
      if (typeof val === 'string' && val.trim().length > 0 && !isEncrypted(val)) {
        hasUnencryptedField = true;
        return;
      } else if (typeof val === 'object' && val !== null && !(val.seconds !== undefined) && !(val instanceof Date)) {
        checkUnencrypted(val);
        if (hasUnencryptedField) return;
      }
    }
  };

  checkUnencrypted(rawData);

  // If old unencrypted data is detected, re-save it encrypted in the background!
  if (hasUnencryptedField) {
    try {
      const encryptedPayload = encryptData(rawData);
      await firestoreUpdateDoc(docSnap.ref, encryptedPayload);
      console.log(`[Auto-Encryption] Automatically encrypted legacy document in Firebase: ${docSnap.id}`);
    } catch (e) {
      console.warn(`[Auto-Encryption] Skip background auto-encrypt for ${docSnap.id}:`, e);
    }
  }
};

/**
 * Gets documents and automatically decrypts results. Also silently migrates unencrypted old data in background.
 */
export const getDocsEncrypted = async (queryRef) => {
  const snapshot = await firestoreGetDocs(queryRef);
  
  // Decrypt each document
  const docs = snapshot.docs.map(doc => {
    const rawData = doc.data();
    // Background lazy-migration of old data
    autoMigrateDocIfNeeded(doc);
    
    return {
      id: doc.id,
      ...decryptData(rawData)
    };
  });

  return {
    ...snapshot,
    docs,
    forEach: (callback) => docs.forEach(callback)
  };
};

/**
 * Gets a single document, decrypts it, and auto-encrypts old data in background if needed
 */
export const getDocEncrypted = async (docRef) => {
  const docSnap = await firestoreGetDoc(docRef);
  if (!docSnap.exists()) return docSnap;

  autoMigrateDocIfNeeded(docSnap);

  const decrypted = decryptData(docSnap.data());
  return {
    ...docSnap,
    data: () => decrypted,
    exists: () => true,
    id: docSnap.id
  };
};

/**
 * Realtime snapshot listener with transparent decryption & background auto-encryption of old data
 */
export const onSnapshotEncrypted = (queryOrDocRef, onNext, onError) => {
  return firestoreOnSnapshot(queryOrDocRef, (snapshot) => {
    // If it's a document snapshot
    if (snapshot.data && !snapshot.docs) {
      if (snapshot.exists()) {
        autoMigrateDocIfNeeded(snapshot);
        const decrypted = decryptData(snapshot.data());
        onNext({
          ...snapshot,
          data: () => decrypted,
          id: snapshot.id
        });
      } else {
        onNext(snapshot);
      }
      return;
    }

    // If it's a query snapshot
    const docs = snapshot.docs.map(doc => {
      autoMigrateDocIfNeeded(doc);
      return {
        id: doc.id,
        ...decryptData(doc.data()),
        data: () => decryptData(doc.data())
      };
    });

    onNext({
      ...snapshot,
      docs,
      forEach: (callback) => docs.forEach(callback)
    });
  }, onError);
};
