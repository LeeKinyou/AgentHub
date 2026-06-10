'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_PREFIX = '/api';

interface ApiResponse<T = unknown> {
  code: number;
  data: T | null;
  message: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: UserRead;
}

interface UserRead {
  id: string;
  username: string;
  email: string;
}

interface AgentProfileRead {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  role: 'orchestrator' | 'expert';
  adapterType: string;
  description?: string;
  systemPrompt?: string;
  agentConfig?: Record<string, unknown>;
  status: 'online' | 'offline' | 'busy' | 'error';
}

interface AgentProfileCreate {
  name: string;
  avatar?: string;
  role: 'orchestrator' | 'expert';
  adapterType?: string;
  description?: string;
  systemPrompt?: string;
  agentConfig?: Record<string, unknown>;
}

interface AgentProfileUpdate {
  name?: string;
  avatar?: string;
  description?: string;
  systemPrompt?: string;
  agentConfig?: Record<string, unknown>;
  status?: 'online' | 'offline' | 'busy' | 'error';
}

interface SessionRead {
  id: string;
  userId: string;
  title: string;
  type: 'single' | 'group';
  agentIds: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  lastActiveAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionCreate {
  title?: string;
  type?: 'single' | 'group';
  agentIds: string[];
}

interface MessageRead {
  id: string;
  sessionId: string;
  senderType: 'user' | 'agent';
  senderId: string;
  content: string;
  contentType: string;
  cardData?: Record<string, unknown>;
  createdAt: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  private setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  isAuthenticated(): boolean {
    if (!this.accessToken) return false;
    try {
      const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return false;
      }
      return true;
    } catch {
      return !!this.accessToken;
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const url = `${API_BASE}${API_PREFIX}${path}`;
    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch {
      return { code: 0, data: null, message: '网络请求失败，请检查网络连接' };
    }

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        try {
          const retryResponse = await fetch(url, { ...options, headers });
          return this.parseResponse<T>(retryResponse);
        } catch {
          return { code: 0, data: null, message: '重试请求失败' };
        }
      }
    }

    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const result = await response.json();
      if (!response.ok && !result.code) {
        return { code: response.status, data: null, message: result.message || `请求失败 (${response.status})` };
      }
      return result;
    } catch {
      return { code: response.status, data: null, message: `响应解析失败 (${response.status})` };
    }
  }

  private async tryRefresh(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this._doRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async _doRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE}${API_PREFIX}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const result: ApiResponse<TokenResponse> = await response.json();
        if (result.data) {
          this.setTokens(result.data.accessToken, result.data.refreshToken);
          return true;
        }
      }
    } catch {
      // Refresh failed
    }

    this.clearTokens();
    return false;
  }

  // Auth
  async register(username: string, email: string, password: string): Promise<ApiResponse<TokenResponse>> {
    const result = await this.request<TokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    if (result.data) {
      this.setTokens(result.data.accessToken, result.data.refreshToken);
    }
    return result;
  }

  async login(username: string, password: string): Promise<ApiResponse<TokenResponse>> {
    const result = await this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (result.data) {
      this.setTokens(result.data.accessToken, result.data.refreshToken);
    }
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  async getMe(): Promise<ApiResponse<UserRead>> {
    return this.request<UserRead>('/auth/me');
  }

  // Agents
  async listAgents(userId?: string): Promise<ApiResponse<AgentProfileRead[]>> {
    const params = userId ? `?user_id=${userId}` : '';
    return this.request<AgentProfileRead[]>(`/agents${params}`);
  }

  async getAgent(agentId: string): Promise<ApiResponse<AgentProfileRead>> {
    return this.request<AgentProfileRead>(`/agents/${agentId}`);
  }

  async createAgent(data: AgentProfileCreate): Promise<ApiResponse<AgentProfileRead>> {
    return this.request<AgentProfileRead>('/agents', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        role: data.role,
        ...(data.adapterType !== undefined && { adapter_type: data.adapterType }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.systemPrompt !== undefined && { system_prompt: data.systemPrompt }),
        ...(data.agentConfig !== undefined && { agent_config: data.agentConfig }),
      }),
    });
  }

  async updateAgent(agentId: string, data: AgentProfileUpdate): Promise<ApiResponse<AgentProfileRead>> {
    return this.request<AgentProfileRead>(`/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.systemPrompt !== undefined && { system_prompt: data.systemPrompt }),
        ...(data.agentConfig !== undefined && { agent_config: data.agentConfig }),
        ...(data.status !== undefined && { status: data.status }),
      }),
    });
  }

  async deleteAgent(agentId: string): Promise<ApiResponse> {
    return this.request(`/agents/${agentId}`, { method: 'DELETE' });
  }

  // Sessions
  async listSessions(userId: string): Promise<ApiResponse<SessionRead[]>> {
    return this.request<SessionRead[]>(`/users/${userId}/sessions`);
  }

  async createSession(userId: string, data: SessionCreate): Promise<ApiResponse<SessionRead>> {
    return this.request<SessionRead>(`/users/${userId}/sessions`, {
      method: 'POST',
      body: JSON.stringify({
        title: data.title ?? '新对话',
        type: data.type ?? 'single',
        agent_ids: data.agentIds,
      }),
    });
  }

  async getSession(userId: string, sessionId: string): Promise<ApiResponse<SessionRead>> {
    return this.request<SessionRead>(`/users/${userId}/sessions/${sessionId}`);
  }

  async updateSession(userId: string, sessionId: string, data: { title?: string; isPinned?: boolean; isArchived?: boolean }): Promise<ApiResponse<SessionRead>> {
    return this.request<SessionRead>(`/users/${userId}/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.isPinned !== undefined && { is_pinned: data.isPinned }),
        ...(data.isArchived !== undefined && { is_archived: data.isArchived }),
      }),
    });
  }

  async deleteSession(userId: string, sessionId: string): Promise<ApiResponse> {
    return this.request(`/users/${userId}/sessions/${sessionId}`, { method: 'DELETE' });
  }

  // Messages
  async listMessages(sessionId: string, cursor?: string, limit?: number): Promise<ApiResponse<MessageRead[]>> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<MessageRead[]>(`/sessions/${sessionId}/messages${query}`);
  }

  // Deploy
  async createDeploy(data: { sessionId: string; projectName: string; sourceCode: string; deployType: 'static' | 'container' }): Promise<ApiResponse<{ deployId: string; status: string; message: string }>> {
    return this.request('/deploy', {
      method: 'POST',
      body: JSON.stringify({ session_id: data.sessionId, project_name: data.projectName, source_code: data.sourceCode, deploy_type: data.deployType }),
    });
  }

  async getDeployStatus(deployId: string): Promise<ApiResponse<{ deployId: string; status: string; url: string | null; createdAt: string }>> {
    return this.request(`/deploy/${deployId}`);
  }

  async listDeploys(sessionId?: string): Promise<ApiResponse<Array<{ deployId: string; status: string; url: string | null; createdAt: string }>>> {
    const query = sessionId ? `?session_id=${sessionId}` : '';
    return this.request(`/deploy${query}`);
  }

  // Upload
  async uploadFile(file: File): Promise<ApiResponse<{ url: string; filename: string; size: number; mimeType: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    try {
      const response = await fetch(`${API_BASE}${API_PREFIX}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      return this.parseResponse(response);
    } catch {
      return { code: 0, data: null, message: '文件上传失败' };
    }
  }
}

export const apiClient = new ApiClient();

export type {
  ApiResponse,
  UserRead,
  AgentProfileRead,
  AgentProfileCreate,
  AgentProfileUpdate,
  SessionRead,
  SessionCreate,
  MessageRead,
};
