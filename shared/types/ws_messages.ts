/* eslint-disable */
/**
 * This file was automatically generated from ws_messages.json
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file.
 */

import type { Message } from './entities';

export interface C2SPing {
  type: 'ping';
  timestamp: string;
}

export interface C2SSendMessage {
  type: 'sendMessage';
  timestamp: string;
  payload: {
    sessionId: string;
    content: string;
  };
}

export interface C2STriggerAction {
  type: 'triggerAction';
  timestamp: string;
  payload: {
    messageId: string;
    actionType: 'applyDiff' | 'retry' | 'pin';
    payload?: Record<string, unknown>;
  };
}

export interface S2CPong {
  type: 'pong';
  timestamp: string;
}

export interface S2CAgentStatus {
  type: 'agentStatus';
  timestamp: string;
  payload: {
    sessionId: string;
    agentId: string;
    status: 'analyzing' | 'executing' | 'completed' | 'failed';
    displayText: string;
  };
}

export interface S2CMessageChunk {
  type: 'messageChunk';
  timestamp: string;
  payload: {
    messageId: string;
    sessionId: string;
    agentId: string;
    chunkType: 'text' | 'code_diff' | 'web_preview' | 'deploy_status';
    deltaContent: string;
    chunkIndex: number;
    isFinal: boolean;
  };
}

export interface S2CMessageComplete {
  type: 'messageComplete';
  timestamp: string;
  payload: Message;
}

export interface S2CError {
  type: 'error';
  timestamp: string;
  payload: {
    sessionId: string;
    errorCode: string;
    errorMessage: string;
    recoverable: boolean;
  };
}

export type WSMessage = C2SPing | C2SSendMessage | C2STriggerAction | S2CPong | S2CAgentStatus | S2CMessageChunk | S2CMessageComplete | S2CError;
