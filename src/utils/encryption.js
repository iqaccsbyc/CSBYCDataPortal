import CryptoJS from 'crypto-js';

// Fallback key derived from project ID if environment variable is not defined
const SECRET_KEY = import.meta.env.VITE_DATA_ENCRYPTION_KEY || 'CSBYC_DATA_PORTAL_SECURE_KEY_2026';

// Prefix to easily identify encrypted text and avoid double-encrypting
const ENCRYPTION_PREFIX = 'ENC::';

/**
 * Checks if a value is a string and starts with the ENCRYPTION_PREFIX
 */
export const isEncrypted = (val) => {
  return typeof val === 'string' && val.startsWith(ENCRYPTION_PREFIX);
};

/**
 * Encrypts a single primitive value (string, number, boolean)
 */
export const encryptValue = (val) => {
  if (val === null || val === undefined) return val;
  if (typeof val === 'function') return val;
  
  // If it's already an encrypted string, don't re-encrypt
  if (typeof val === 'string' && isEncrypted(val)) {
    return val;
  }

  try {
    const jsonStr = JSON.stringify(val);
    const ciphertext = CryptoJS.AES.encrypt(jsonStr, SECRET_KEY).toString();
    return `${ENCRYPTION_PREFIX}${ciphertext}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return val;
  }
};

/**
 * Decrypts a single value if it starts with the ENCRYPTION_PREFIX
 */
export const decryptValue = (val) => {
  if (typeof val !== 'string' || !isEncrypted(val)) {
    return val; // Return raw value if not encrypted (e.g. unencrypted old data or non-string)
  }

  try {
    const ciphertext = val.slice(ENCRYPTION_PREFIX.length);
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedJson = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedJson) return val;
    return JSON.parse(decryptedJson);
  } catch (err) {
    console.error('Decryption error:', err);
    return val; // Fallback to raw value on error
  }
};

// Fields that should NOT be encrypted to allow query filtering / dates / document links
const EXCLUDED_FIELDS = new Set([
  'id',
  'docId',
  'uid',
  'createdAt',
  'updatedAt',
  'timestamp',
  'date',
  'startDate',
  'endDate',
  'status',
  'role',
  'email', // optional: keep searchable if needed, or encrypt
  'department',
  'academicYear',
  'type',
  'category',
  'createdBy',
  'stage',
  'isEncrypted'
]);

/**
 * Recursively encrypts object/array data fields
 */
export const encryptData = (data) => {
  if (data === null || data === undefined) return data;
  
  // Handle Firestore Timestamp objects or Date objects
  if (typeof data === 'object' && (data.seconds !== undefined || data instanceof Date)) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => encryptData(item));
  }

  if (typeof data === 'object') {
    const encryptedObj = {};
    for (const [key, value] of Object.entries(data)) {
      if (EXCLUDED_FIELDS.has(key)) {
        encryptedObj[key] = value;
      } else {
        encryptedObj[key] = encryptData(value);
      }
    }
    return encryptedObj;
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return encryptValue(data);
  }

  return data;
};

/**
 * Recursively decrypts object/array data fields
 */
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
