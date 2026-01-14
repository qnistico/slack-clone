export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  statusText?: string;
  lastSeen?: Date;
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  ownerId: string;
  members: string[]; // user IDs who can access this workspace
  createdAt: Date;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
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
