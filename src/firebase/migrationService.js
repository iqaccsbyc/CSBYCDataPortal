import {
  collection,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from './config';
import { encryptData, isEncrypted } from '../utils/encryption';

// All Firestore collections that store user data
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

// Fields that must stay as plaintext for Firestore querying to work
const PLAIN_FIELDS = new Set([
  'id', 'docId', 'uid',
  'createdAt', 'updatedAt', 'submittedAt', 'timestamp',
  'academicYear', 'status', 'isEncrypted',
]);

/**
 * Returns true if a document has at least one non-system string field
 * that is plaintext (not encrypted).
 */
function docNeedsEncryption(data) {
  const check = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    // Skip Firestore Timestamps
    if (obj.seconds !== undefined && obj.nanoseconds !== undefined) return false;
    if (Array.isArray(obj)) return obj.some(item => check(item));

    for (const [key, val] of Object.entries(obj)) {
      if (PLAIN_FIELDS.has(key)) continue;
      if (typeof val === 'string' && val.trim().length > 0 && !isEncrypted(val)) {
        return true;
      }
      if (val && typeof val === 'object') {
        if (check(val)) return true;
      }
    }
    return false;
  };
  return check(data);
}

/**
 * MIGRATION STATUS KEY stored in a special Firestore doc so we only run once per deployment.
 * We store the last migrated version/timestamp so repeat logins don't re-run.
 */
const MIGRATION_VERSION = 'v4'; // bump this to force re-migration
const MIGRATION_DOC = 'system/encryptionMigration';

let migrationRunning = false;
let migrationComplete = false;

/**
 * Runs full-database encryption migration.
 * Automatically called once when any user opens the app.
 * Encrypts ALL documents across ALL collections in batched Firestore writes.
 */
export async function runFullEncryptionMigration(onProgress) {
  // Prevent parallel runs
  if (migrationRunning || migrationComplete) return;
  migrationRunning = true;

  try {
    // Check if this version already ran
    const migRef = doc(db, 'system', 'encryptionMigration');
    let alreadyDone = false;
    try {
      const migSnap = await getDoc(migRef);
      if (migSnap.exists() && migSnap.data().version === MIGRATION_VERSION) {
        alreadyDone = true;
      }
    } catch (_) {
      // Ignore if system collection doesn't exist
    }

    if (alreadyDone) {
      migrationComplete = true;
      migrationRunning = false;
      console.log('[Migration] Encryption migration already completed for this version.');
      return;
    }

    console.log('[Migration] Starting full database encryption migration...');
    let totalEncrypted = 0;

    for (const collectionName of ALL_COLLECTIONS) {
      try {
        const snap = await getDocs(collection(db, collectionName));
        if (snap.empty) continue;

        // Process in batches of 400 (Firestore limit is 500 per batch)
        const BATCH_SIZE = 400;
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const docSnap of snap.docs) {
          const rawData = docSnap.data();

          // Only process documents that have unencrypted data
          if (!docNeedsEncryption(rawData)) continue;

          const encryptedPayload = encryptData(rawData);
          batch.update(docSnap.ref, encryptedPayload);
          batchCount++;
          totalEncrypted++;

          // Commit batch when it reaches the limit
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            console.log(`[Migration] Batch committed for '${collectionName}' (${batchCount} docs)`);
            batch = writeBatch(db);
            batchCount = 0;
          }
        }

        // Commit remaining items in last batch
        if (batchCount > 0) {
          await batch.commit();
          console.log(`[Migration] '${collectionName}': encrypted ${batchCount} documents`);
        }

        if (onProgress) onProgress(collectionName, totalEncrypted);

      } catch (err) {
        console.warn(`[Migration] Skipping collection '${collectionName}':`, err.message);
      }
    }

    // Mark migration as complete in Firestore so it doesn't run again
    try {
      await setDoc(migRef, {
        version: MIGRATION_VERSION,
        completedAt: new Date().toISOString(),
        totalDocumentsEncrypted: totalEncrypted,
      });
    } catch (_) {
      // Non-fatal if we can't write to system collection
    }

    migrationComplete = true;
    console.log(`[Migration] ✅ Full encryption migration complete. ${totalEncrypted} documents encrypted.`);

  } catch (err) {
    console.error('[Migration] Migration failed:', err);
  } finally {
    migrationRunning = false;
  }
}
