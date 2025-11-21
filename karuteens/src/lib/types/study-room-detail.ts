import type { StudyRoom } from './study-room';

export interface StudyRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: 'host' | 'participant';
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export interface StudyRoomMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export interface DrawStroke {
  color: string;
  size: number;
  points: Array<{ x: number; y: number }>;
}

export interface WebRTCMessage {
  type: 'offer' | 'answer' | 'candidate' | 'leave';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  target?: string;
  sender?: string;
}
