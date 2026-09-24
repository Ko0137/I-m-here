export interface Room {
  id: string;
  name: string;
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  lastUpdatedBy: string;
  password?: string;
  isPrivate: boolean;
  screenSharerId?: string;
  ownerId?: string;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  type: 'chat' | 'emoji' | 'vibration';
  createdAt: any;
}

export interface Member {
  id: string;
  name: string;
  isOnline: boolean;
  peerId?: string;
  lastSeen: any;
  showCamera?: boolean;
  cameraStreamId?: string;
}

export interface CineUser {
  uid: string;
  displayName: string | null;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}
