import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../useChatStore';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {}, activeSessionId: null });
  });

  it('has correct default values', () => {
    const state = useChatStore.getState();
    expect(state.messages).toEqual({});
    expect(state.activeSessionId).toBeNull();
  });

  it('sets active session id', () => {
    useChatStore.getState().setActiveSessionId('session-1');
    expect(useChatStore.getState().activeSessionId).toBe('session-1');
  });

  it('adds a message', () => {
    const msg = {
      id: 'msg-1',
      sessionId: 'session-1',
      senderType: 'user' as const,
      senderId: 'user-1',
      content: 'Hello',
      contentType: 'text' as const,
      createdAt: new Date().toISOString(),
    };

    useChatStore.getState().addMessage('session-1', msg);
    const messages = useChatStore.getState().messages['session-1'];
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello');
  });

  it('updates a message', () => {
    const msg = {
      id: 'msg-1',
      sessionId: 'session-1',
      senderType: 'agent' as const,
      senderId: 'agent-1',
      content: 'Hello',
      contentType: 'text' as const,
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    useChatStore.getState().addMessage('session-1', msg);
    useChatStore.getState().updateMessage('session-1', 'msg-1', { content: 'Hello World', isStreaming: false });

    const updated = useChatStore.getState().messages['session-1'][0];
    expect(updated.content).toBe('Hello World');
    expect(updated.isStreaming).toBe(false);
  });

  it('removes a message', () => {
    const msg = {
      id: 'msg-1',
      sessionId: 'session-1',
      senderType: 'user' as const,
      senderId: 'user-1',
      content: 'Hello',
      contentType: 'text' as const,
      createdAt: new Date().toISOString(),
    };

    useChatStore.getState().addMessage('session-1', msg);
    useChatStore.getState().removeMessage('session-1', 'msg-1');

    expect(useChatStore.getState().messages['session-1']).toHaveLength(0);
  });

  it('gets messages for a session', () => {
    const msg1 = {
      id: 'msg-1',
      sessionId: 'session-1',
      senderType: 'user' as const,
      senderId: 'user-1',
      content: 'Hello',
      contentType: 'text' as const,
      createdAt: new Date().toISOString(),
    };
    const msg2 = {
      id: 'msg-2',
      sessionId: 'session-2',
      senderType: 'user' as const,
      senderId: 'user-1',
      content: 'World',
      contentType: 'text' as const,
      createdAt: new Date().toISOString(),
    };

    useChatStore.getState().addMessage('session-1', msg1);
    useChatStore.getState().addMessage('session-2', msg2);

    const session1Messages = useChatStore.getState().getMessages('session-1');
    expect(session1Messages).toHaveLength(1);
    expect(session1Messages[0].content).toBe('Hello');
  });

  it('clears session messages', () => {
    const msg = {
      id: 'msg-1',
      sessionId: 'session-1',
      senderType: 'user' as const,
      senderId: 'user-1',
      content: 'Hello',
      contentType: 'text' as const,
      createdAt: new Date().toISOString(),
    };

    useChatStore.getState().addMessage('session-1', msg);
    useChatStore.getState().clearSessionMessages('session-1');

    expect(useChatStore.getState().messages['session-1']).toHaveLength(0);
  });

  it('marks streaming done', () => {
    const msg1 = {
      id: 'msg-1',
      sessionId: 'session-1',
      senderType: 'agent' as const,
      senderId: 'agent-1',
      content: 'Part 1',
      contentType: 'text' as const,
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };
    const msg2 = {
      id: 'msg-2',
      sessionId: 'session-1',
      senderType: 'agent' as const,
      senderId: 'agent-1',
      content: 'Part 2',
      contentType: 'text' as const,
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    useChatStore.getState().addMessage('session-1', msg1);
    useChatStore.getState().addMessage('session-1', msg2);
    useChatStore.getState().markStreamingDone('session-1');

    const messages = useChatStore.getState().messages['session-1'];
    expect(messages[0].isStreaming).toBe(false);
    expect(messages[1].isStreaming).toBe(false);
  });
});
