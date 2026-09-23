import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence 
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Initialize Auth with persistence optimized for mobile/web
// IndexedDB is preferred for mobile persistence
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
});

// Connection test as per skill guidelines + diagnostics
export async function checkConnectivity() {
  console.log('[Firebase] Diagnostic start...');
  console.log('[Firebase] Origin:', window.location.origin);
  console.log('[Firebase] Online status:', navigator.onLine);
  
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log('[Firebase] Connection: SUCCESS');
    return { success: true };
  } catch (error: any) {
    // If we get "Missing or insufficient permissions", it means the server IS reachable
    // but the rules are blocking the specific test document. 
    // This counts as "connected" for our purposes.
    if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
      console.log('[Firebase] Connection: SUCCESS (Permissions restricted but server reached)');
      return { success: true };
    }
    console.error('[Firebase] Connection: FAILED', error.message);
    return { success: false, error: error.message };
  }
}

// Initial check
checkConnectivity();
