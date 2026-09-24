import React from 'react';
import { LogOut, User, Mail, Calendar, ShieldCheck, Settings, Download } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { CineUser } from '../../types';

interface ProfileProps {
  user: CineUser;
}

export default function Profile({ user }: ProfileProps) {
  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-12">
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header/Cover */}
        <div className="h-32 bg-gradient-to-r from-rose-600 to-indigo-600"></div>
        
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -translate-y-12">
            <div className="flex items-end gap-6">
              <div className="w-32 h-32 rounded-3xl border-4 border-slate-900 bg-rose-600 flex items-center justify-center text-4xl font-black text-white shadow-xl uppercase">
                {user.displayName?.charAt(0) || '?'}
              </div>
              <div className="pb-2">
                <h2 className="text-3xl font-black text-white">{user.displayName}</h2>
                <p className="text-slate-400 flex items-center gap-1.5 mt-1">
                  <User className="w-4 h-4" />
                  Гостевой аккаунт
                </p>
              </div>
            </div>
            <div className="flex gap-3 mb-2">
              <div className="sm:hidden">
                <PWAInstallButton />
              </div>
              <button 
                onClick={() => auth.signOut()}
                className="px-6 py-2.5 bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-300 rounded-xl font-bold transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Выйти
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Аккаунт
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-900">
                  <span className="text-slate-500 text-sm">ID пользователя</span>
                  <span className="text-white text-xs font-mono bg-slate-900 px-2 py-1 rounded leading-none">{user.uid.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-900">
                  <span className="text-slate-500 text-sm">Дата регистрации</span>
                  <span className="text-white text-sm">{user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('ru-RU') : 'Сегодня'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500 text-sm">Последний вход</span>
                  <span className="text-white text-sm">{user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString('ru-RU') : 'Сейчас'}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
                <Download className="w-8 h-8 text-indigo-500" />
              </div>
              <h4 className="text-white font-bold mb-1">CineSync APK</h4>
              <p className="text-slate-500 text-xs">Установите приложение для стабильной работы камеры и микрофона.</p>
              <div className="mt-4 w-full">
                <PWAInstallButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
