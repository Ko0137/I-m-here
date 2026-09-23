import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all active:scale-95"
      >
        <Download className="w-4 h-4" />
        Установить APK
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-700 transition-all"
        >
          <PlusSquare className="w-4 h-4" />
          Установить на iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-bold text-white mb-4">Установка на iPhone</h3>
              <div className="space-y-6 text-slate-400">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 font-bold text-white">1</div>
                  <p className="text-sm">Нажмите кнопку <strong className="text-white flex items-center gap-1 inline-flex">Поделиться <Share className="w-4 h-4" /></strong> в нижней панели Safari.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 font-bold text-white">2</div>
                  <p className="text-sm">Прокрутите меню вниз и выберите <strong className="text-white">«На экран "Домой"»</strong>.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 font-bold text-white">3</div>
                  <p className="text-sm">Нажмите <strong className="text-white font-bold">«Добавить»</strong> в верхнем правом углу.</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-8 w-full rounded-xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/20"
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
