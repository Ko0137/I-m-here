import { CineUser } from '../types';

const STORAGE_KEY = 'cinesync_user_session';
const UID_KEY = 'cinesync_persistent_uid';

export function getOrCreatePersistentUid(): string {
  try {
    let uid = localStorage.getItem(UID_KEY);
    if (!uid) {
      uid = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
      localStorage.setItem(UID_KEY, uid);
    }
    return uid;
  } catch (e) {
    return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }
}

export function getStoredUser(): CineUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as CineUser;
    if (user && user.uid && user.displayName) {
      return user;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function saveStoredUser(user: CineUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    if (user.uid) {
      localStorage.setItem(UID_KEY, user.uid);
    }
  } catch (e) {
    console.warn('[Storage] Failed to save user session:', e);
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[Storage] Failed to clear user session:', e);
  }
}
