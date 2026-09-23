import React from 'react';
import { MonitorPlay, PlayCircle, Users, MessageSquare, Zap } from 'lucide-react';

interface LandingProps {
  onLogin: (nickname: string) => void;
}

export default function Landing({ onLogin }: LandingProps) {
  const [nickname, setNickname] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      onLogin(nickname.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Background with Generated Hero */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/src/assets/images/cinema_hero_background_1790155373589.jpg" 
          alt="Cinema Experience" 
          className="w-full h-full object-cover opacity-30 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-950"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <MonitorPlay className="w-12 h-12 text-rose-500" />
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">CineSync</h1>
        </div>

        <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          Смотрите фильмы вместе с друзьями в реальном времени. 
          Чат, звонки и общие эмоции — как будто вы в одном зале.
        </p>

        <form 
          onSubmit={handleSubmit}
          className="w-full max-w-sm flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200"
        >
          <input 
            type="text" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ваше имя или никнейм"
            required
            className="w-full px-6 py-4 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-rose-500 outline-none text-center text-lg font-medium"
          />
          <button 
            type="submit"
            className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-rose-900/20 transition-all hover:scale-105 active:scale-95"
          >
            Начать просмотр
          </button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Feature icon={<PlayCircle className="w-6 h-6" />} label="Синхронный плеер" />
          <Feature icon={<MessageSquare className="w-6 h-6" />} label="Живой чат" />
          <Feature icon={<Users className="w-6 h-6" />} label="Голосовая связь" />
          <Feature icon={<Zap className="w-6 h-6" />} label="Вибро-отклик" />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
      <div className="text-rose-400">{icon}</div>
      <span className="text-sm font-medium text-slate-300">{label}</span>
    </div>
  );
}
