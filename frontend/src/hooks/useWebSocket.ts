'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { S2CMessageChunk, S2CAgentStatus, S2CError, WSMessage } from '@agenthub/shared/types/ws_messages';
import type { LogItem } from '@/components/im/ConsolePanel';

interface UseWebSocketOptions {
  sessionId: string | null;
  onChunk: (chunk: S2CMessageChunk['payload']) => void;
  onAgentStatus: (status: S2CAgentStatus['payload']) => void;
  onError: (error: S2CError['payload']) => void;
  onLog: (type: LogItem['type'], source: string, message: string) => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000/ws';
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 30000;

export function useWebSocket({ sessionId, onChunk, onAgentStatus, onError, onLog }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  const cleanup = useCallback(() => {
    if (pingTimerRef.current) { clearInterval(pingTimerRef.current); pingTimerRef.current = null; }
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
  }, []);

  const connect = useCallback(() => {
    cleanup();
    if (!sessionIdRef.current) return;

    const ws = new WebSocket(`${WS_URL}?sessionId=${sessionIdRef.current}`);
    wsRef.current = ws;

    ws.onopen = () => {
      onLog('success', 'WebSocket', `Connected to session ${sessionIdRef.current}`);
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
            onChunk(msg.payload);
            break;
          case 'agentStatus':
            onAgentStatus(msg.payload);
            onLog('info', 'Agent', msg.payload.displayText);
            break;
          case 'error':
            onError(msg.payload);
            onLog('error', 'WebSocket', msg.payload.errorMessage);
            break;
          case 'pong':
            break;
        }
      } catch (err) {
        onLog('error', 'WebSocket', `Failed to parse message: ${err}`);
      }
    };

    ws.onclose = (event) => {
      onLog('warn', 'WebSocket', `Disconnected (code: ${event.code})`);
      if (event.code !== 1000) {
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };

    ws.onerror = () => onLog('error', 'WebSocket', 'Connection error');
  }, [cleanup, onChunk, onAgentStatus, onError, onLog]);

  useEffect(() => {
    if (sessionId) connect();
    else cleanup();
    return cleanup;
  }, [sessionId, connect, cleanup]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN || !sessionIdRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: 'sendMessage',
      timestamp: new Date().toISOString(),
      payload: { sessionId: sessionIdRef.current, content },
    }));
  }, []);

  return { sendMessage };
}
