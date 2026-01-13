export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  statusText?: string;
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  ownerId: string;
  createdAt: Date;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdAt: Date;
  createdBy: string;
  members: string[]; // user IDs
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  reactions: Reaction[];
  threadId?: string; // for threaded messages
  attachments?: Attachment[];
}

export interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface DirectMessage {
  id: string;
  participants: string[]; // user IDs
  lastMessage?: Message;
  updatedAt: Date;
}
