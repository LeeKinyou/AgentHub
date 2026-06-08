/* eslint-disable */
/**
 * This file was automatically generated.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file.
 */

/**
 * SSOT contract for AgentProfile, Session, and Message entities
 */

export interface AgentProfile {
  id: string;
  name: string;
  avatar?: string;
  role: 'orchestrator' | 'expert';
  description?: string;
  status?: 'online' | 'offline' | 'busy' | 'error';
}

export interface Session {
  id: string;
  title: string;
  type: 'single' | 'group';
  agentIds: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  lastActiveAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
}

export interface CodeBlock {
  language: string;
  code: string;
  title: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
  oldContent?: string;
}

export interface DeployLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  thumbnailUrl?: string;
}

export interface CardData {
  codeBlock?: CodeBlock;
  diffBlock?: {
    filename: string;
    language: string;
    additions: number;
    deletions: number;
    hunks: DiffHunk[];
    status: 'pending' | 'applied' | 'rejected';
  };
  previewBlock?: {
    html: string;
    css?: string;
    js?: string;
    viewport: 'mobile' | 'tablet' | 'desktop';
  };
  deployBlock?: {
    status: 'queued' | 'building' | 'deploying' | 'live' | 'failed';
    progress: number;
    previewUrl?: string | null;
    logs: DeployLogEntry[];
  };
  attachments?: FileAttachment[];
}

export interface Message {
  id: string;
  sessionId: string;
  senderType: 'user' | 'agent';
  senderId: string;
  content: string;
  contentType: 'text' | 'markdown' | 'card' | 'image' | 'file';
  cardData?: CardData;
  createdAt: string;
  isPinned?: boolean;
  replyToId?: string;
}

export interface AgentHubCoreEntities {
  [k: string]: unknown;
}
