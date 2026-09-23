/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, checkConnectivity } from './lib/firebase';
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
    console.log('[Auth] Initializing auth listener...');
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log('[Auth] State changed:', u?.uid ? `Logged in (${u.uid})` : 'Not logged in');
      setUser(u);
      setIsLoading(false);
    }, (error) => {
      console.error('[Auth] Listener error:', error);
      setIsLoading(false);
    });
    
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[Auth] Auth state check timed out. Forcing loading to false.');
        setIsLoading(false);
      }
    }, 8000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleLogin = async (nickname: string) => {
    console.log('[Auth] Starting handleLogin for:', nickname);
    const loginToast = toast.loading('Инициализация...');
    
    try {
      // Step 1: Check connectivity
      toast.loading('Проверка соединения...', { id: loginToast });
      const connection = await checkConnectivity();
      if (!connection.success) {
        throw new Error(`Нет связи с сервером: ${connection.error}`);
      }

      // Step 2: Sign in
      toast.loading('Вход в систему...', { id: loginToast });
      const loginPromise = signInAnonymously(auth);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Время ожидания входа истекло. Проверьте интернет.')), 20000)
      );

      const result = (await Promise.race([loginPromise, timeoutPromise])) as any;
      console.log('[Auth] signInAnonymously success:', result.user.uid);
      
      // Step 3: Update profile
      toast.loading('Создание профиля...', { id: loginToast });
      await updateProfile(result.user, {
        displayName: nickname
      });
      console.log('[Auth] Profile updated successfully');

      setUser({
        ...result.user,
        displayName: nickname
      });
      
      toast.success(`С возвращением, ${nickname}!`, { id: loginToast });
    } catch (error: any) {
      console.error('[Auth] handleLogin error:', error);
      const errorMessage = error.message || 'Неизвестная ошибка';
      toast.error(`Ошибка: ${errorMessage}`, { id: loginToast, duration: 6000 });
      
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Анонимный вход не включен в консоли Firebase.', { duration: 10000 });
      } else if (error.message && error.message.includes('network')) {
        toast.error('Проблема с сетью. Проверьте Wi-Fi или мобильные данные.', { duration: 10000 });
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
