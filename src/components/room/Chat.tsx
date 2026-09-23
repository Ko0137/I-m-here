import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Send, Smile, Heart, ThumbsUp, Laugh, Angry } from 'lucide-react';
import { Message } from '../../types';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface ChatProps {
  roomId: string;
  user: FirebaseUser;
}

const EMOJIS = ['❤️', '🔥', '😂', '😮', '😢', '👍', '🎬', '🍿'];

export default function Chat({ roomId, user }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    let isInitial = true;
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      const orderedMsgs = [...msgs].reverse();
      setMessages(orderedMsgs);

      // Check for new vibrations only (after initial load)
      if (!isInitial) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const msg = { id: change.doc.id, ...change.doc.data() } as Message;
            if (msg.type === 'vibration' && msg.userId !== user.uid) {
              if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
                toast('Вас коснулись...', { icon: '📳' });
              }
            }
          }
        });
      }
      
      isInitial = false;
      
      // Handle Emoji reactions (float them)
      const lastMsg = orderedMsgs[orderedMsgs.length - 1];
      if (lastMsg && lastMsg.type === 'emoji') {
        const overlay = document.getElementById('reactions-overlay');
        if (overlay) {
          const emojiEl = document.createElement('div');
          emojiEl.innerText = lastMsg.text;
          emojiEl.className = 'absolute bottom-0 text-4xl animate-emoji-float opacity-0';
          emojiEl.style.left = `${Math.random() * 80 + 10}%`;
          overlay.appendChild(emojiEl);
          setTimeout(() => emojiEl.remove(), 3000);
        }
      }
    });
  }, [roomId, user.uid]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        roomId,
        userId: user.uid,
        userName: user.displayName,
        text: inputText,
        type: 'chat',
        createdAt: serverTimestamp()
      });
      setInputText('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const sendEmoji = async (emoji: string) => {
    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        roomId,
        userId: user.uid,
        userName: user.displayName,
        text: emoji,
        type: 'emoji',
        createdAt: serverTimestamp()
      });
      setShowEmojis(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/30">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
      >
        {messages.map((msg) => (
          msg.type === 'chat' ? (
            <div 
              key={msg.id} 
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.userId === user.uid ? "ml-auto items-end" : "items-start"
              )}
            >
              <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">{msg.userName}</span>
              <div 
                className={cn(
                  "px-4 py-2 rounded-2xl text-sm shadow-sm",
                  msg.userId === user.uid 
                    ? "bg-rose-600 text-white rounded-tr-none" 
                    : "bg-slate-800 text-slate-200 rounded-tl-none"
                )}
              >
                {msg.text}
              </div>
            </div>
          ) : null
        ))}
      </div>

      <div className="p-4 bg-slate-900/50 border-t border-slate-800 relative">
        {showEmojis && (
          <div className="absolute bottom-full left-0 right-0 p-4 bg-slate-800 border-t border-slate-700 flex flex-wrap justify-center gap-4 animate-in slide-in-from-bottom-2 duration-200">
            {EMOJIS.map(emoji => (
              <button 
                key={emoji} 
                onClick={() => sendEmoji(emoji)}
                className="text-2xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <button 
            type="button"
            onClick={() => setShowEmojis(!showEmojis)}
            className={cn(
              "p-2.5 rounded-lg transition-colors",
              showEmojis ? "bg-rose-500/20 text-rose-500" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
          >
            <Smile className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Напишите что-нибудь..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-rose-500 outline-none"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 text-white rounded-lg transition-colors shadow-lg shadow-rose-900/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
