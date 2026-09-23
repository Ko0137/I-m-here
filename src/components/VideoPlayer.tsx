import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2,
  MessageSquare,
  Send,
  Vibrate,
  Search
} from 'lucide-react';
import { Room, Message } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

interface VideoPlayerProps {
  room: Room;
  user: FirebaseUser;
  onSync: (playback: { isPlaying: boolean; currentTime: number }) => void;
}

export default function VideoPlayer({ room, user, onSync }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLocalUpdate, setIsLocalUpdate] = useState(false);
  const [showOverlayChat, setShowOverlayChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Synchronize incoming room state to local video
  useEffect(() => {
    if (!videoRef.current || isLocalUpdate) return;

    const video = videoRef.current;
    const roomTime = Number(room.currentTime);
    if (!isFinite(roomTime)) return;

    const timeDiff = Math.abs(video.currentTime - roomTime);
    if (timeDiff > 1) {
      video.currentTime = roomTime;
    }

    if (room.isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!room.isPlaying && !video.paused) {
      video.pause();
    }
  }, [room.isPlaying, room.currentTime, isLocalUpdate]);

  // Overlay chat messages
  useEffect(() => {
    const q = query(
      collection(db, 'rooms', room.id, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse());
    });
  }, [room.id]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    const newIsPlaying = videoRef.current.paused;
    
    setIsLocalUpdate(true);
    if (newIsPlaying) videoRef.current.play();
    else videoRef.current.pause();
    
    onSync({
      isPlaying: newIsPlaying,
      currentTime: videoRef.current.currentTime
    });
    
    setTimeout(() => setIsLocalUpdate(false), 500);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newProgress = parseFloat(e.target.value);
    const duration = videoRef.current.duration;
    if (!isFinite(duration) || duration === 0) return;
    
    const newTime = (newProgress / 100) * duration;
    
    if (!isFinite(newTime)) return;

    setIsLocalUpdate(true);
    videoRef.current.currentTime = newTime;
    onSync({
      isPlaying: room.isPlaying,
      currentTime: newTime
    });
    setTimeout(() => setIsLocalUpdate(false), 500);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await addDoc(collection(db, 'rooms', room.id, 'messages'), {
      roomId: room.id,
      userId: user.uid,
      userName: user.displayName,
      text,
      type: 'chat',
      createdAt: serverTimestamp()
    });
  };

  const sendVibration = async () => {
    await addDoc(collection(db, 'rooms', room.id, 'messages'), {
      roomId: room.id,
      userId: user.uid,
      userName: user.displayName,
      text: 'отправил вибрацию!',
      type: 'vibration',
      createdAt: serverTimestamp()
    });
  };

  if (!room.videoUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 p-12 text-center">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
          <Play className="w-10 h-10 text-rose-500 fill-current translate-x-0.5" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Добро пожаловать в кинозал!</h3>
        <p className="text-slate-400 max-w-sm mb-8">
          Воспользуйтесь поиском выше или вставьте прямую ссылку на видео, чтобы начать совместный просмотр.
        </p>
        <div className="flex items-center gap-2 text-rose-400 text-sm font-medium animate-bounce">
          <Search className="w-4 h-4" />
          <span>Используйте поиск над плеером</span>
        </div>
      </div>
    );
  }

  const isYouTube = room.videoUrl.includes('youtube.com') || room.videoUrl.includes('youtu.be');
  const isDirectVideo = room.videoUrl.match(/\.(mp4|webm|ogg|m4v|mp3)(\?.*)?$/i);

  if (isYouTube) {
    const getYouTubeId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    };
    const videoId = getYouTubeId(room.videoUrl);

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 p-6 text-center">
        <iframe
          className="w-full aspect-video rounded-2xl shadow-2xl border-4 border-slate-800"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-rose-400 font-bold text-sm">YouTube Режим</p>
          <p className="text-slate-500 text-[11px] max-w-xs">Управление (пауза/перемотка) в YouTube не синхронизируется автоматически. Используйте прямые ссылки для полного контроля.</p>
        </div>
      </div>
    );
  }

  if (!isDirectVideo && room.videoUrl.startsWith('http')) {
    return (
      <div className="w-full h-full flex flex-col bg-white">
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 border-b border-slate-200">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1 flex items-center gap-2 overflow-hidden shadow-inner">
            <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
            <span className="text-[10px] text-slate-400 truncate font-mono">{room.videoUrl}</span>
          </div>
        </div>
        <div className="flex-1 relative">
          <iframe 
            src={room.videoUrl}
            className="w-full h-full"
            title="CineSync Browser"
            allow="autoplay; encrypted-media; fullscreen"
          />
        </div>
        <div className="p-2 bg-slate-50 text-center border-t border-slate-200">
          <p className="text-[10px] text-slate-400 font-medium italic">Если сайт не загружается, значит он блокирует встраивание (X-Frame-Options). Попробуйте найти прямую ссылку на видео.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group w-full h-full flex items-center justify-center bg-black overflow-hidden">
      <video 
        ref={videoRef}
        src={room.videoUrl}
        className="max-w-full max-h-full"
        onTimeUpdate={handleTimeUpdate}
        muted={isMuted}
        playsInline
      />

      {/* Overlay Chat in Fullscreen/Normal */}
      {(showOverlayChat || isFullScreen) && (
        <div className={cn(
          "absolute left-6 bottom-32 w-80 max-h-[40%] bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col z-50 transition-all duration-300",
          isFullScreen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
          showOverlayChat && !isFullScreen && "opacity-100 scale-100 pointer-events-auto"
        )}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {messages.map((msg) => (
              <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                <p className="text-[11px] font-black text-rose-400 uppercase tracking-wider mb-0.5">{msg.userName}</p>
                <p className="text-sm text-white/90 leading-relaxed bg-white/5 rounded-lg px-3 py-2 inline-block">{msg.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="p-3 border-t border-white/10 flex gap-2 bg-slate-950/40">
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Напишите сообщение..."
              className="flex-1 bg-white/10 border-none focus:ring-1 focus:ring-rose-500 text-sm text-white px-4 py-2 rounded-xl placeholder:text-white/30"
            />
            <button type="submit" className="p-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-white transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Custom Controls Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
        <input 
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress || 0}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500 mb-6"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={handlePlayPause}
              className="text-white hover:text-rose-500 transition-colors"
            >
              {room.isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
            </button>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="text-white hover:text-slate-300 transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={sendVibration}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              title="Вибрация"
            >
              <Vibrate className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowOverlayChat(!showOverlayChat)}
              className={cn(
                "p-2 rounded-lg transition-all",
                showOverlayChat ? "bg-rose-600 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
              )}
              title="Чат поверх видео"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button 
              onClick={() => videoRef.current?.requestFullscreen()}
              className="text-white hover:text-slate-300 transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
