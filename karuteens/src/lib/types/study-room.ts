export interface StudyRoom {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  is_public: boolean;
  max_members: number;
  scheduled_at: string | null;
  created_at: string;
  user_id: string;
  member_count?: number;
}

export interface StudyRoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface StudyRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  role: 'host' | 'participant';
}

export interface WebRTCMessage {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  target?: string;
  sender?: string;
}
