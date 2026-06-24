// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Firebase Configuration
// ═══════════════════════════════════════════════════════
// Project: crm-production (faa-test-guide-v2)
// Firestore Database: db-aerosphere
// ═══════════════════════════════════════════════════════

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAUvzDIKoTvtbMEWaP1pDSyNfqpS3_11wI',
  authDomain: 'faa-test-guide-v2.firebaseapp.com',
  projectId: 'faa-test-guide-v2',
  storageBucket: 'faa-test-guide-v2.firebasestorage.app',
  messagingSenderId: '492280162134',
  appId: '1:492280162134:web:d0cdc39920840fcb2d98f7',
} as const;

// Firestore uses a named database (not the default)
export const FIRESTORE_DATABASE_ID = 'db-aerosphere';

// Firestore collection names
export const COLLECTIONS = {
  PROFILES: 'profiles',
  USERS: 'users',
  RATINGS: 'ratings',
  REPORTS: 'reports',
} as const;

// Firebase Auth providers to enable
export const AUTH_PROVIDERS = {
  GOOGLE: true,
  MICROSOFT: true,
  DISCORD: false, // Requires custom OAuth — enable later
} as const;
