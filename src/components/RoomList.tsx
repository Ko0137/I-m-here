import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Plus, Search, Film, Users as UsersIcon, Lock, Unlock, Trash2 } from 'lucide-react';
import { Room } from '../types';
import { toast } from 'react-hot-toast';

interface RoomListProps {
  onJoinRoom: (roomId: string) => void;
  user: FirebaseUser;
}

export default function RoomList({ onJoinRoom, user }: RoomListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomVideo, setNewRoomVideo] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const [joiningRoom, setJoiningRoom] = useState<Room | null>(null);
  const [joinPassword, setJoinPassword] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];
      setRooms(roomData);
    });
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName) return;

    try {
      const docRef = await addDoc(collection(db, 'rooms'), {
        name: newRoomName,
        videoUrl: newRoomVideo || '',
        isPlaying: false,
        currentTime: 0,
        isPrivate: isPrivate,
        password: isPrivate ? newRoomPassword : '',
        ownerId: user.uid,
        lastUpdatedBy: user.uid,
        createdAt: serverTimestamp()
      });
      onJoinRoom(docRef.id);
      setIsCreating(false);
    } catch (error) {
      toast.error('Не удалось создать комнату');
    }
  };

  const handleJoinClick = (room: Room) => {
    if (room.isPrivate) {
      setJoiningRoom(room);
    } else {
      onJoinRoom(room.id);
    }
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (joiningRoom && joinPassword === joiningRoom.password) {
      onJoinRoom(joiningRoom.id);
      setJoiningRoom(null);
      setJoinPassword('');
    } else {
      toast.error('Неверный пароль');
    }
  };

  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (!window.confirm('Вы уверены, что хотите удалить эту комнату?')) return;
    
    try {
      await deleteDoc(doc(db, 'rooms', roomId));
      toast.success('Комната удалена');
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-6 py-12">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-3xl font-black text-white mb-2">Все комнаты</h2>
          <p className="text-slate-400">Присоединяйтесь к просмотру или создайте свой</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-lg font-bold transition-all"
        >
          <Plus className="w-5 h-5" />
          Создать комнату
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-white mb-6">Новая комната</h3>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Название комнаты</label>
                <input 
                  type="text" 
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Вечер кино"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Ссылка на видео (необязательно)</label>
                <input 
                  type="url" 
                  value={newRoomVideo}
                  onChange={(e) => setNewRoomVideo(e.target.value)}
                  placeholder="https://example.com/movie.mp4"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
                <p className="mt-1.5 text-[11px] text-slate-500 italic">Можно оставить пустым и выбрать фильм уже внутри комнаты</p>
              </div>
              <div className="flex items-center gap-3 py-2">
                <button 
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`flex items-center gap-2 text-sm font-bold ${isPrivate ? 'text-rose-500' : 'text-slate-400'}`}
                >
                  {isPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  {isPrivate ? 'Закрытая комната' : 'Публичная комната'}
                </button>
              </div>
              {isPrivate && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Пароль</label>
                  <input 
                    type="password" 
                    value={newRoomPassword}
                    onChange={(e) => setNewRoomPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                    required
                  />
                </div>
              )}
              <div className="flex gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold transition-colors"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {joiningRoom && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold text-white mb-2">Введите пароль</h3>
            <p className="text-slate-400 mb-6 text-sm">Эта комната защищена паролем</p>
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <input 
                type="password" 
                autoFocus
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                required
              />
              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => {setJoiningRoom(null); setJoinPassword('');}}
                  className="flex-1 px-4 py-2.5 rounded-lg font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold transition-colors"
                >
                  Войти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
            <Film className="w-16 h-16 text-slate-700 mb-4" />
            <p className="text-slate-500 font-medium">Нет активных комнат. Будьте первым!</p>
          </div>
        ) : (
          rooms.map(room => (
            <div 
              key={room.id}
              onClick={() => handleJoinClick(room)}
              className="group bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:bg-slate-900 hover:border-slate-700 transition-all cursor-pointer hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-slate-800 rounded-xl group-hover:bg-rose-500/10 group-hover:text-rose-500 transition-colors">
                  <Film className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {room.ownerId === user.uid && (
                      <button 
                        onClick={(e) => handleDeleteRoom(e, room.id)}
                        className="p-1.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Удалить комнату"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {room.isPrivate && (
                      <span className="text-rose-400 p-1">
                        <Lock className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                  {room.isPlaying && (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider bg-emerald-400/10 px-2 py-1 rounded">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                      В эфире
                    </span>
                  )}
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-rose-500 transition-colors line-clamp-1">{room.name}</h3>
              <p className="text-sm text-slate-500 mb-6 truncate">{room.videoUrl}</p>
              
              <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                <UsersIcon className="w-4 h-4" />
                <span>Войти в комнату</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
