'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { S2CMessageChunk, S2CAgentStatus, S2CError, S2CMessageComplete, WSMessage } from '@agenthub/shared/types/ws_messages';
import type { LogItem } from '@/components/im/ConsolePanel';
import { apiClient } from '@/lib/api';

interface UseWebSocketOptions {
  sessionId: string | null;
  onChunk: (chunk: S2CMessageChunk['payload']) => void;
  onMessageComplete: (msg: S2CMessageComplete['payload']) => void;
  onAgentStatus: (status: S2CAgentStatus['payload']) => void;
  onError: (error: S2CError['payload']) => void;
  onLog: (type: LogItem['type'], source: string, message: string) => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000/ws';
const RECONNECT_BASE_DELAY = 2000;
const RECONNECT_MAX_DELAY = 30000;
const PING_INTERVAL = 30000;

export function useWebSocket({ sessionId, onChunk, onMessageComplete, onAgentStatus, onError, onLog }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef(sessionId);
  const reconnectAttemptRef = useRef(0);
  const pendingMessagesRef = useRef<Array<{ content: string; timestamp: string }>>([]);

  // Use refs for callbacks to avoid stale closures in ws.onclose
  const onChunkRef = useRef(onChunk);
  const onMessageCompleteRef = useRef(onMessageComplete);
  const onAgentStatusRef = useRef(onAgentStatus);
  const onErrorRef = useRef(onError);
  const onLogRef = useRef(onLog);
  useEffect(() => { onChunkRef.current = onChunk; }, [onChunk]);
  useEffect(() => { onMessageCompleteRef.current = onMessageComplete; }, [onMessageComplete]);
  useEffect(() => { onAgentStatusRef.current = onAgentStatus; }, [onAgentStatus]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onLogRef.current = onLog; }, [onLog]);

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  const cleanup = useCallback(() => {
    if (pingTimerRef.current) { clearInterval(pingTimerRef.current); pingTimerRef.current = null; }
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    if (wsRef.current) { wsRef.current.close(1000); wsRef.current = null; }
  }, []);

  const connect = useCallback(() => {
    cleanup();
    if (!sessionIdRef.current) return;

    const token = apiClient.getAccessToken();
    if (!token) {
      onLogRef.current('error', 'WebSocket', 'No access token available');
      return;
    }

    const ws = new WebSocket(`${WS_URL}?session_id=${sessionIdRef.current}&token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      onLogRef.current('success', 'WebSocket', `Connected to session ${sessionIdRef.current}`);
      // Flush pending messages from before disconnect (Bug #7)
      const pending = pendingMessagesRef.current.splice(0);
      for (const msg of pending) {
        ws.send(JSON.stringify({ type: 'sendMessage', timestamp: msg.timestamp, payload: { sessionId: sessionIdRef.current, content: msg.content } }));
        onLogRef.current('info', 'WebSocket', `重发未完成消息: ${msg.content.slice(0, 30)}...`);
      }
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        switch (msg.type) {
          case 'messageChunk':
            onChunkRef.current(msg.payload);
            break;
          case 'agentStatus':
            onAgentStatusRef.current(msg.payload);
            onLogRef.current('info', 'Agent', msg.payload.displayText);
            break;
          case 'messageComplete':
            onMessageCompleteRef.current(msg.payload);
            break;
          case 'error':
            onErrorRef.current(msg.payload);
            onLogRef.current('error', 'WebSocket', msg.payload.errorMessage);
            break;
          case 'pong':
            break;
        }
      } catch (err) {
        onLogRef.current('error', 'WebSocket', `Failed to parse message: ${err}`);
      }
    };

    ws.onclose = (event) => {
      onLogRef.current('warn', 'WebSocket', `Disconnected (code: ${event.code})`);
      if (event.code !== 1000 && sessionIdRef.current) {
        const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptRef.current), RECONNECT_MAX_DELAY);
        reconnectAttemptRef.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => onLogRef.current('error', 'WebSocket', 'Connection error');
  }, [cleanup]);

  useEffect(() => {
    if (sessionId) connect();
    else cleanup();
    return cleanup;
  }, [sessionId, connect, cleanup]);

  const sendMessage = useCallback((content: string, replyToId?: string, mentionedAgents?: string[]): boolean => {
    if (wsRef.current?.readyState !== WebSocket.OPEN || !sessionIdRef.current) {
      // Queue for resend on reconnect (Bug #7)
      pendingMessagesRef.current.push({ content, timestamp: new Date().toISOString() });
      return false;
    }
    const timestamp = new Date().toISOString();
    const payload: Record<string, unknown> = { sessionId: sessionIdRef.current, content };
    if (replyToId) payload.replyToId = replyToId;
    if (mentionedAgents && mentionedAgents.length > 0) payload.mentionedAgents = mentionedAgents;
    wsRef.current.send(JSON.stringify({
      type: 'sendMessage',
      timestamp,
      payload,
    }));
    return true;
  }, []);

  const isConnected = useCallback((): boolean => {
    return wsRef.current?.readyState === WebSocket.OPEN;
  }, []);

  const clearPending = useCallback(() => {
    pendingMessagesRef.current = [];
  }, []);

  const stopGeneration = useCallback((): boolean => {
    if (wsRef.current?.readyState !== WebSocket.OPEN || !sessionIdRef.current) {
      return false;
    }
    wsRef.current.send(JSON.stringify({
      type: 'stopGeneration',
      timestamp: new Date().toISOString(),
      payload: { sessionId: sessionIdRef.current },
    }));
    return true;
  }, []);

  return { sendMessage, isConnected, clearPending, stopGeneration };
}
