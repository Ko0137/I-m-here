import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  X, 
  Users, 
  Smile, 
  Vibrate, 
  Copy, 
  Check, 
  Phone,
  PhoneOff,
  Globe,
  ArrowRight,
  Search,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff
} from 'lucide-react';
import { Room, Message, Member } from '../types';
import VideoPlayer from './VideoPlayer';
import Chat from './Chat';
import { toast } from 'react-hot-toast';
import Peer from 'peerjs';
import { cn } from '../lib/utils';

interface RoomViewProps {
  roomId: string;
  user: FirebaseUser;
  onLeave: () => void;
}

export default function RoomView({ roomId, user, onLeave }: RoomViewProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  const [browserUrl, setBrowserUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Presence and Camera State
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localCameraStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);

  // Voice Call State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [activeCalls, setActiveCalls] = useState<Record<string, any>>({});
  const [isCalling, setIsCalling] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudiosRef = useRef<HTMLDivElement>(null);
  const remoteVideosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() } as Room;
        setRoom(data);
        if (data) setBrowserUrl(data.videoUrl);
      } else {
        toast.error('Комната больше не существует');
        onLeave();
      }
    });

    const membersRef = collection(db, 'rooms', roomId, 'members');
    const unsubMembers = onSnapshot(membersRef, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Member[]);
    });

    const memberDoc = doc(db, 'rooms', roomId, 'members', user.uid);
    setDoc(memberDoc, {
      name: user.displayName,
      isOnline: true,
      lastSeen: serverTimestamp()
    }, { merge: true });

    // Heartbeat to keep presence alive
    const heartbeat = setInterval(() => {
      updateDoc(memberDoc, { lastSeen: serverTimestamp() }).catch(() => {});
    }, 30000); // Every 30 seconds

    const newPeer = new Peer();
    newPeer.on('open', (id) => {
      updateDoc(memberDoc, { peerId: id });
    });

    newPeer.on('call', (call) => {
      // Handle incoming voice or video call
      if (localCameraStreamRef.current) {
        call.answer(localCameraStreamRef.current);
      } else if (localStreamRef.current) {
        call.answer(localStreamRef.current);
      } else {
        call.answer();
      }
      handleCall(call);
    });

    setPeer(newPeer);

    const handleBeforeUnload = () => {
      deleteDoc(memberDoc);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      unsubRoom();
      unsubMembers();
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      newPeer.destroy();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localCameraStreamRef.current?.getTracks().forEach(t => t.stop());
      localScreenStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [roomId, user.uid]);

  // Call new members automatically
  useEffect(() => {
    if (!peer || members.length === 0) return;
    
    members.forEach(member => {
      if (member.id !== user.uid && member.peerId && member.isOnline) {
        const isAlreadyConnected = activeCalls[member.peerId];
        if (!isAlreadyConnected) {
          if (isScreenSharing && localScreenStreamRef.current) {
            const call = peer.call(member.peerId, localScreenStreamRef.current, { metadata: { type: 'screen' } });
            if (call) handleCall(call);
          }
          if (isCameraOn && localCameraStreamRef.current) {
            const call = peer.call(member.peerId, localCameraStreamRef.current, { metadata: { type: 'camera' } });
            if (call) handleCall(call);
          }
          if (isCalling && localStreamRef.current) {
            const call = peer.call(member.peerId, localStreamRef.current, { metadata: { type: 'audio' } });
            if (call) handleCall(call);
          }
        }
      }
    });
  }, [members, isScreenSharing, isCameraOn, isCalling, peer]);

  const handleCall = (call: any) => {
    call.on('stream', (remoteStream: MediaStream) => {
      const type = call.metadata?.type || (remoteStream.getVideoTracks().length > 0 ? 'video' : 'audio');
      const currentRoom = roomRef.current;
      
      if (type === 'screen' || (type === 'video' && currentRoom?.screenSharerId === call.peer)) {
        const video = document.getElementById('screen-video') as HTMLVideoElement || document.createElement('video');
        video.srcObject = remoteStream;
        video.autoplay = true;
        video.playsInline = true;
        video.id = 'screen-video';
        video.className = "w-full h-full object-contain bg-black";
        const container = document.getElementById('screen-container');
        if (container && !document.getElementById('screen-video')) container.appendChild(video);
      } else if (remoteStream.getVideoTracks().length > 0) {
        let video = document.getElementById(`video-${call.peer}`) as HTMLVideoElement;
        const isNew = !video;
        if (isNew) {
          video = document.createElement('video');
          video.id = `video-${call.peer}`;
          video.autoplay = true;
          video.playsInline = true;
        }
        video.srcObject = remoteStream;
        
        if (currentRoom?.screenSharerId === call.peer) {
          video.className = "w-32 h-32 md:w-48 md:h-48 rounded-2xl object-cover border-4 border-rose-600 shadow-2xl absolute bottom-4 right-4 z-50";
          if (isNew) document.getElementById('screen-container')?.appendChild(video);
        } else {
          video.className = "w-24 h-24 rounded-lg object-cover border-2 border-rose-500 shadow-lg";
          if (isNew) remoteVideosRef.current?.appendChild(video);
        }
      } else {
        if (!document.getElementById(`audio-${call.peer}`)) {
          const audio = document.createElement('audio');
          audio.srcObject = remoteStream;
          audio.autoplay = true;
          audio.id = `audio-${call.peer}`;
          remoteAudiosRef.current?.appendChild(audio);
        }
      }
    });
    call.on('close', () => {
      document.getElementById(`audio-${call.peer}`)?.remove();
      document.getElementById(`video-${call.peer}`)?.remove();
      document.getElementById('screen-video')?.remove();
      setActiveCalls(prev => {
        const next = { ...prev };
        delete next[call.peer];
        return next;
      });
    });
    setActiveCalls(prev => ({ ...prev, [call.peer]: call }));
  };

  const toggleVoice = async () => {
    if (isCalling) {
      Object.values(activeCalls).forEach((call: any) => call.close());
      setActiveCalls({});
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setIsCalling(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setIsCalling(true);
        members.forEach(member => {
          if (member.id !== user.uid && member.peerId && member.isOnline) {
            const call = peer?.call(member.peerId, stream);
            if (call) handleCall(call);
          }
        });
      } catch (err) {
        toast.error('Доступ к микрофону запрещен. Проверьте настройки браузера или установите приложение через Профиль.');
      }
    }
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      localCameraStreamRef.current?.getTracks().forEach(t => t.stop());
      localCameraStreamRef.current = null;
      setIsCameraOn(false);
      updateDoc(doc(db, 'rooms', roomId, 'members', user.uid), { showCamera: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localCameraStreamRef.current = stream;
        setIsCameraOn(true);
        updateDoc(doc(db, 'rooms', roomId, 'members', user.uid), { showCamera: true });
        
        members.forEach(member => {
          if (member.id !== user.uid && member.peerId && member.isOnline) {
            const call = peer?.call(member.peerId, stream, { metadata: { type: 'camera' } });
            if (call) handleCall(call);
          }
        });
      } catch (err) {
        toast.error('Доступ к камере запрещен. Проверьте настройки разрешений в браузере.');
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      localScreenStreamRef.current?.getTracks().forEach(t => t.stop());
      localScreenStreamRef.current = null;
      setIsScreenSharing(false);
      updateDoc(doc(db, 'rooms', roomId), { screenSharerId: null });
    } else {
      try {
        // @ts-ignore - some browsers might not have getDisplayMedia on navigator.mediaDevices directly in older TS versions
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        localScreenStreamRef.current = stream;
        setIsScreenSharing(true);
        
        await updateDoc(doc(db, 'rooms', roomId), { screenSharerId: user.uid });

        stream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };

        members.forEach(member => {
          if (member.id !== user.uid && member.peerId && member.isOnline) {
            const call = peer?.call(member.peerId, stream, { metadata: { type: 'screen' } });
            if (call) handleCall(call);
          }
        });
        
        toast.success('Трансляция экрана запущена!');
      } catch (err) {
        toast.error('Ошибка трансляции экрана. Возможно, ваш браузер не поддерживает эту функцию.');
      }
    }
  };

  const handleSync = async (playback: { isPlaying: boolean; currentTime: number }) => {
    if (!room || !isFinite(playback.currentTime)) return;
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      isPlaying: playback.isPlaying,
      currentTime: playback.currentTime,
      lastUpdatedBy: user.uid
    });
  };

  const updateVideoUrl = async (url: string) => {
    if (!room || !url) return;
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      videoUrl: url,
      currentTime: 0,
      isPlaying: false,
      lastUpdatedBy: user.uid
    });
    toast.success('Источник видео обновлен');
  };

  const handleSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryStr = searchQuery.trim();
    if (!queryStr) return;

    if (queryStr.startsWith('http')) {
      updateVideoUrl(queryStr);
      setSearchQuery('');
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch('/api/search-movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryStr })
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      toast.error('Ошибка поиска');
    } finally {
      setIsSearching(false);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Ссылка скопирована!');
  };

  if (!room) return null;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-950">
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <div className="p-4 flex flex-col gap-4 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onLeave} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-white truncate max-w-[200px]">{room.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 mr-2">
                {members.map((m, i) => (
                  <div 
                    key={m.id} 
                    className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden"
                    title={m.name}
                    style={{ zIndex: members.length - i }}
                  >
                    <div className={cn(
                      "w-full h-full flex items-center justify-center text-[10px] font-bold text-white uppercase",
                      m.isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
                    )}>
                      {m.name?.charAt(0) || '?'}
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={toggleScreenShare}
                className={cn(
                  "p-3 rounded-xl transition-all hidden md:flex",
                  isScreenSharing ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
                title="Трансляция экрана (Только для ПК)"
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </button>
              <button 
                onClick={toggleCamera}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  isCameraOn ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
                title="Включить камеру"
              >
                {isCameraOn ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
              </button>
              <button 
                onClick={toggleVoice}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all",
                  isCalling ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
              >
                {isCalling ? <PhoneOff className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                <span className="hidden sm:inline">{isCalling ? 'Выйти' : 'Голос'}</span>
              </button>
              <button onClick={copyInvite} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300">
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
              <button 
                onClick={async () => {
                  try {
                    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                      roomId,
                      userId: user.uid,
                      userName: user.displayName,
                      text: 'Прикосновение...',
                      type: 'vibration',
                      createdAt: serverTimestamp()
                    });
                    toast('Вы коснулись плеча!', { icon: '📳' });
                  } catch (e) {}
                }}
                className="p-3 bg-rose-600/20 hover:bg-rose-600/30 rounded-xl text-rose-500 transition-all border border-rose-500/30"
                title="Постучать по плечу"
              >
                <Heart className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <form onSubmit={handleSmartSearch} className="flex gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-rose-500/30 focus-within:border-rose-500/60 transition-all shadow-lg shadow-black/20">
              <div className="flex items-center gap-3 px-3 text-rose-500">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск фильма или вставьте ссылку..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm md:text-base text-slate-100 py-2.5 placeholder:text-slate-500"
              />
              <button 
                type="submit" 
                disabled={isSearching} 
                className="px-6 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl text-white font-bold transition-all shadow-lg shadow-rose-900/20"
              >
                {isSearching ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : 'Найти'}
              </button>
            </form>
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-4 right-4 mt-2 bg-slate-900 border border-rose-500/30 rounded-2xl p-4 grid grid-cols-1 gap-3 z-[60] shadow-2xl shadow-black animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Результаты поиска</span>
                <button onClick={() => setSearchResults([])} className="text-slate-500 hover:text-white text-xs">Закрыть</button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 scrollbar-hide">
                {searchResults.map((res, i) => (
                  <button 
                    key={i} 
                    onClick={() => { updateVideoUrl(res.url); setSearchResults([]); }}
                    className="w-full flex flex-col items-start p-4 bg-slate-800/40 hover:bg-rose-500/10 rounded-xl border border-slate-700/50 hover:border-rose-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-white text-sm group-hover:text-rose-400 transition-colors">{res.title}</span>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-rose-500" />
                    </div>
                    <span className="text-[10px] text-slate-500 line-clamp-1 mt-1 uppercase tracking-tight">{res.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 relative bg-black">
          {room.screenSharerId ? (
            <div id="screen-container" className="w-full h-full flex items-center justify-center relative">
              {isScreenSharing && localScreenStreamRef.current && (
                <video 
                  ref={(el) => { if (el) el.srcObject = localScreenStreamRef.current; }}
                  autoPlay muted playsInline
                  className="w-full h-full object-contain"
                />
              )}
              {/* Twitch-style overlay for the sharer if camera is also on */}
              {isScreenSharing && isCameraOn && localCameraStreamRef.current && (
                <div className="absolute bottom-4 right-4 z-50">
                  <video 
                    ref={(el) => { if (el) el.srcObject = localCameraStreamRef.current; }}
                    autoPlay muted playsInline
                    className="w-32 h-32 md:w-48 md:h-48 rounded-2xl object-cover border-4 border-rose-600 shadow-2xl"
                  />
                </div>
              )}
            </div>
          ) : (
            <VideoPlayer room={room} user={user} onSync={handleSync} />
          )}
          
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20 pointer-events-none" id="remote-videos-container">
            {isCameraOn && !isScreenSharing && localCameraStreamRef.current && (
              <video 
                ref={(el) => { if (el) el.srcObject = localCameraStreamRef.current; }}
                autoPlay muted playsInline
                className="w-24 h-24 rounded-lg object-cover border-2 border-rose-500 shadow-xl pointer-events-auto"
              />
            )}
            <div ref={remoteVideosRef} className="flex flex-col gap-2 pointer-events-auto" />
          </div>

          <div className="absolute inset-0 pointer-events-none overflow-hidden" id="reactions-overlay"></div>
        </div>
      </div>

      <div className="w-full md:w-80 border-l border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col">
        <Chat roomId={roomId} user={user} />
      </div>

      <div ref={remoteAudiosRef} className="hidden" />
    </div>
  );
}
