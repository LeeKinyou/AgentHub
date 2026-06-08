'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, type AgentProfileRead, type SessionRead, type MessageRead } from '@/lib/api';
import { useAuth } from './useAuth';

interface BackendDataState {
  agents: AgentProfileRead[];
  sessions: SessionRead[];
  messages: Record<string, MessageRead[]>;
  isLoading: boolean;
  error: string | null;
}

export function useBackendData() {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<BackendDataState>({
    agents: [],
    sessions: [],
    messages: {},
    isLoading: false,
    error: null,
  });

  const fetchAgents = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      // Don't filter by user_id - return all agents so every user can see available agents
      const result = await apiClient.listAgents();
      if (result.data) {
        setState((prev) => ({ ...prev, agents: result.data! }));
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  }, [isAuthenticated]);

  const fetchSessions = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      const result = await apiClient.listSessions(user.id);
      if (result.data) {
        setState((prev) => ({ ...prev, sessions: result.data! }));
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  }, [isAuthenticated, user]);

  const fetchMessages = useCallback(async (sessionId: string, cursor?: string) => {
    if (!isAuthenticated) return;
    try {
      const result = await apiClient.listMessages(sessionId, cursor);
      if (result.data) {
        // Bug #2: Backend returns DESC order (newest first), reverse for chat UI (oldest first)
        const messages = [...result.data].reverse();
        setState((prev) => ({
          ...prev,
          messages: {
            ...prev.messages,
            [sessionId]: cursor
              ? [...messages, ...(prev.messages[sessionId] ?? [])]
              : messages,
          },
        }));
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [isAuthenticated]);

  const createAgent = useCallback(async (data: { name: string; role: 'orchestrator' | 'expert'; adapterType?: string; description?: string; systemPrompt?: string; agentConfig?: Record<string, unknown> }) => {
    if (!isAuthenticated) return null;
    try {
      const result = await apiClient.createAgent(data);
      if (result.data) {
        setState((prev) => ({ ...prev, agents: [...prev.agents, result.data!] }));
        return result.data;
      }
    } catch (err) {
      console.error('Failed to create agent:', err);
    }
    return null;
  }, [isAuthenticated]);

  const updateAgent = useCallback(async (agentId: string, data: { name?: string; description?: string; systemPrompt?: string; agentConfig?: Record<string, unknown>; status?: 'online' | 'offline' | 'busy' | 'error' }) => {
    if (!isAuthenticated) return null;
    try {
      const result = await apiClient.updateAgent(agentId, data);
      if (result.data) {
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((a) => (a.id === agentId ? result.data! : a)),
        }));
        return result.data;
      }
    } catch (err) {
      console.error('Failed to update agent:', err);
    }
    return null;
  }, [isAuthenticated]);

  const deleteAgent = useCallback(async (agentId: string) => {
    if (!isAuthenticated) return false;
    try {
      await apiClient.deleteAgent(agentId);
      setState((prev) => ({ ...prev, agents: prev.agents.filter((a) => a.id !== agentId) }));
      return true;
    } catch (err) {
      console.error('Failed to delete agent:', err);
    }
    return false;
  }, [isAuthenticated]);

  const createSession = useCallback(async (title: string, agentIds: string[], type: 'single' | 'group' = 'single') => {
    if (!isAuthenticated || !user) return { data: null, error: '未登录' };
    try {
      const result = await apiClient.createSession(user.id, { title, type, agentIds });
      if (result.data) {
        setState((prev) => ({ ...prev, sessions: [result.data!, ...prev.sessions] }));
        return { data: result.data, error: null };
      }
      return { data: null, error: result.message || '创建失败' };
    } catch (err) {
      console.error('Failed to create session:', err);
      return { data: null, error: '网络请求失败' };
    }
  }, [isAuthenticated, user]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!isAuthenticated || !user) return false;
    try {
      await apiClient.deleteSession(user.id, sessionId);
      setState((prev) => ({ ...prev, sessions: prev.sessions.filter((s) => s.id !== sessionId) }));
      return true;
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
    return false;
  }, [isAuthenticated, user]);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    if (!isAuthenticated || !user) return null;
    try {
      const result = await apiClient.updateSession(user.id, sessionId, { title });
      if (result.data) {
        setState((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => (s.id === sessionId ? result.data! : s)),
        }));
        return result.data;
      }
    } catch (err) {
      console.error('Failed to update session:', err);
    }
    return null;
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAgents();
    }
  }, [isAuthenticated, fetchAgents]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSessions();
    }
  }, [isAuthenticated, user, fetchSessions]);

  return {
    ...state,
    fetchMessages,
    createAgent,
    updateAgent,
    deleteAgent,
    createSession,
    deleteSession,
    updateSessionTitle,
    refreshAgents: fetchAgents,
    refreshSessions: fetchSessions,
  };
}
