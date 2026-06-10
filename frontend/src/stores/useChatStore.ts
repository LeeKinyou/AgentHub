import { create } from 'zustand';
import type { Message, Session } from '@agenthub/shared/types/entities';

interface StreamMessage extends Message {
  isStreaming?: boolean;
}

interface ChatState {
  messages: Record<string, StreamMessage[]>;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  addMessage: (sessionId: string, msg: StreamMessage) => void;
  updateMessage: (sessionId: string, msgId: string, patch: Partial<StreamMessage>) => void;
  removeMessage: (sessionId: string, msgId: string) => void;
  getMessages: (sessionId: string) => StreamMessage[];
  clearSessionMessages: (sessionId: string) => void;
  markStreamingDone: (sessionId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  addMessage: (sessionId, msg) =>
    set((state) => {
      const existing = state.messages[sessionId] ?? [];
      const next = [...existing, msg];
      return { messages: { ...state.messages, [sessionId]: next.slice(-1000) } };
    }),
  updateMessage: (sessionId, msgId, patch) =>
    set((state) => {
      const existing = state.messages[sessionId] ?? [];
      return {
        messages: {
          ...state.messages,
          [sessionId]: existing.map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
        },
      };
    }),
  removeMessage: (sessionId, msgId) =>
    set((state) => {
      const existing = state.messages[sessionId] ?? [];
      return {
        messages: {
          ...state.messages,
          [sessionId]: existing.filter((m) => m.id !== msgId),
        },
      };
    }),
  getMessages: (sessionId) => get().messages[sessionId] ?? [],
  clearSessionMessages: (sessionId) =>
    set((state) => ({ messages: { ...state.messages, [sessionId]: [] } })),
  markStreamingDone: (sessionId) =>
    set((state) => {
      const existing = state.messages[sessionId] ?? [];
      return {
        messages: {
          ...state.messages,
          [sessionId]: existing.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
        },
      };
    }),
}));
