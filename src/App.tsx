/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { 
  signInAnonymously,
  onAuthStateChanged, 
  updateProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { 
  Play, 
  Pause, 
  MessageSquare, 
  Users, 
  Volume2, 
  VolumeX, 
  Send, 
  Vibrate, 
  Smile, 
  LogOut, 
  MonitorPlay,
  Copy,
  Check,
  Phone
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import Peer from 'peerjs';
import { cn } from './lib/utils';
import { Room, Message, Member } from './types';

// Components
import VideoPlayer from './components/room/VideoPlayer';
import Chat from './components/room/Chat';
import RoomList from './components/room/RoomList';
import Landing from './components/auth/Landing';
import RoomView from './components/room/RoomView';
import Profile from './components/profile/Profile';
import { PWAInstallButton } from './components/ui/PWAInstallButton';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'profile'>('home');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (nickname: string) => {
    console.log('[Auth] Start login process for:', nickname);
    const loginToast = toast.loading('Входим в CineSync...');
    try {
      console.log('[Auth] Calling signInAnonymously...');
      const result = await signInAnonymously(auth);
      console.log('[Auth] Signed in as:', result.user.uid);
      
      console.log('[Auth] Updating profile...');
      await updateProfile(result.user, {
        displayName: nickname
      });
      console.log('[Auth] Profile updated.');

      console.log('[Auth] Setting user state...');
      setUser({
        ...result.user,
        displayName: nickname
      });
      
      toast.success(`Добро пожаловать, ${nickname}!`, { id: loginToast });
    } catch (error: any) {
      console.error('[Auth] Error during login:', error);
      toast.error(`Ошибка входа: ${error.message || 'Проверьте соединение'}`, { id: loginToast });
      
      if (error.code === 'auth/operation-not-allowed') {
        console.error('[Auth] Anonymous Auth is NOT enabled in Firebase Console!');
        toast.error('Анонимный вход отключен. Включите его в консоли Firebase (Authentication > Sign-in method).', { duration: 10000 });
      }
    }
  };

  const handleLogout = () => auth.signOut();

  const navigateTo = (tab: 'home' | 'profile') => {
    setCurrentRoomId(null);
    setActiveTab(tab);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-pulse flex flex-col items-center">
          <MonitorPlay className="w-12 h-12 text-rose-500 mb-4" />
          <div className="h-4 w-32 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing onLogin={handleLogin} />;
  }

  return (
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

      <Toaster position="bottom-right" />
    </div>
  );
}
