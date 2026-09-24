/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import { 
  signInAnonymously,
  onAuthStateChanged, 
  updateProfile
} from 'firebase/auth';
import { 
  MonitorPlay,
  LogOut
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { cn } from './lib/utils';
import { CineUser } from './types';
import { getStoredUser, saveStoredUser, clearStoredUser, getOrCreatePersistentUid } from './lib/userStorage';

// Components
import RoomList from './components/room/RoomList';
import Landing from './components/auth/Landing';
import RoomView from './components/room/RoomView';
import Profile from './components/profile/Profile';
import { PWAInstallButton } from './components/ui/PWAInstallButton';

export default function App() {
  const [user, setUser] = useState<CineUser | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'profile'>('home');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Immediately restore local session if present (instant load on mobile)
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      setIsLoading(false);
    }

    // 2. Also listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        const updatedUser: CineUser = {
          uid: u.uid,
          displayName: u.displayName || stored?.displayName || 'Киноман',
          metadata: {
            creationTime: u.metadata?.creationTime || stored?.metadata?.creationTime || new Date().toISOString(),
            lastSignInTime: u.metadata?.lastSignInTime || new Date().toISOString()
          }
        };
        setUser(updatedUser);
        saveStoredUser(updatedUser);
      }
      setIsLoading(false);
    }, (error) => {
      console.warn('[Auth] Firebase auth state check warning:', error);
      setIsLoading(false);
    });

    // Fallback: don't let loading screen stay more than 1.5s
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleLogin = async (nickname: string) => {
    const trimmed = nickname.trim();
    if (!trimmed) return;

    let userUid: string | null = null;
    let creationTime = new Date().toISOString();

    try {
      // Attempt Firebase anonymous auth with quick 3s timeout
      const loginPromise = signInAnonymously(auth);
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 3000)
      );

      const result = await Promise.race([loginPromise, timeoutPromise]) as any;
      if (result?.user) {
        userUid = result.user.uid;
        if (result.user.metadata?.creationTime) {
          creationTime = result.user.metadata.creationTime;
        }
        await updateProfile(result.user, { displayName: trimmed }).catch(() => {});
      }
    } catch (err: any) {
      console.log('[Auth] Proceeding with persistent device profile:', err?.message || err);
    }

    // If Firebase Auth is disabled or restricted in APK/Web, seamlessly use persistent UID
    if (!userUid) {
      userUid = getOrCreatePersistentUid();
    }

    const appUser: CineUser = {
      uid: userUid,
      displayName: trimmed,
      metadata: {
        creationTime,
        lastSignInTime: new Date().toISOString()
      }
    };

    saveStoredUser(appUser);
    setUser(appUser);
    toast.success(`Добро пожаловать, ${trimmed}!`);
  };

  const handleLogout = async () => {
    clearStoredUser();
    try {
      await auth.signOut();
    } catch (e) {
      // Ignore signOut errors
    }
    setUser(null);
    setCurrentRoomId(null);
    setActiveTab('home');
    toast.success('Вы вышли из профиля');
  };

  const navigateTo = (tab: 'home' | 'profile') => {
    setCurrentRoomId(null);
    setActiveTab(tab);
  };

  return (
    <>
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          duration: 3500,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #1e293b'
          }
        }} 
      />

      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
          <div className="animate-pulse flex flex-col items-center">
            <MonitorPlay className="w-12 h-12 text-rose-500 mb-4" />
            <div className="h-4 w-32 bg-slate-800 rounded"></div>
          </div>
        </div>
      ) : !user ? (
        <Landing onLogin={handleLogin} />
      ) : (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
          <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center gap-2 cursor-pointer" 
                onClick={() => setCurrentRoomId(null)}
              >
                <MonitorPlay className="w-8 h-8 text-rose-500" />
                <span className="text-lg font-bold tracking-tight">CineSync</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <PWAInstallButton />
              </div>
              <div 
                onClick={() => navigateTo('profile')}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-full border transition-all cursor-pointer",
                  activeTab === 'profile' && !currentRoomId 
                    ? "bg-rose-500/10 border-rose-500/50 text-rose-400" 
                    : "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-slate-600"
                )}
              >
                <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  {user.displayName?.charAt(0) || '?'}
                </div>
                <span className="hidden md:inline text-sm font-medium">{user.displayName}</span>
              </div>
              <button 
                onClick={handleLogout}
                title="Выйти"
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-rose-400"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </header>

          <main className="flex-1 flex flex-col relative overflow-y-auto">
            {currentRoomId ? (
              <RoomView 
                roomId={currentRoomId} 
                user={user} 
                onLeave={() => setCurrentRoomId(null)} 
              />
            ) : activeTab === 'profile' ? (
              <Profile user={user} />
            ) : (
              <RoomList onJoinRoom={setCurrentRoomId} user={user} />
            )}
          </main>
        </div>
      )}
    </>
  );
}
