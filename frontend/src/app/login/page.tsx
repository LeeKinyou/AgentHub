'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!email.includes('@')) {
          setError('请输入有效的邮箱地址');
          setIsLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('密码至少需要8个字符');
          setIsLoading(false);
          return;
        }
      }

      let result;
      if (mode === 'login') {
        result = await login(username, password);
      } else {
        result = await register(username, email, password);
      }

      if (result.success) {
        router.push('/');
      } else {
        setError(result.message ?? '操作失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-minimal-bg dark:bg-minimal-dark-bg">
      <div className="w-full max-w-sm p-8 bg-minimal-glass/80 dark:bg-minimal-dark-glass/80 backdrop-blur-xl rounded-minimal border border-minimal-glass-border dark:border-minimal-dark-glass-border shadow-minimal-glass shadow-minimal-glow">
        <div className="text-center mb-10">
          <h1 className="text-xl font-semibold text-minimal-text dark:text-minimal-dark-text tracking-tight">AgentHub</h1>
          <p className="text-sm text-minimal-secondary dark:text-minimal-dark-secondary mt-1.5">
            {mode === 'login' ? '登录您的账户' : '创建新账户'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
          <div>
            <label className="block text-xs text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5 font-medium">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-white/60 dark:bg-minimal-dark-surface/60 backdrop-blur-sm border border-minimal-glass-border dark:border-minimal-dark-glass-border rounded-minimal text-sm text-minimal-text dark:text-minimal-dark-text placeholder:text-minimal-tertiary dark:placeholder:text-minimal-dark-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300"
              placeholder="请输入用户名"
              data-testid="login-username"
              required
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5 font-medium">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white/60 dark:bg-minimal-dark-surface/60 backdrop-blur-sm border border-minimal-glass-border dark:border-minimal-dark-glass-border rounded-minimal text-sm text-minimal-text dark:text-minimal-dark-text placeholder:text-minimal-tertiary dark:placeholder:text-minimal-dark-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300"
                placeholder="请输入邮箱"
                data-testid="login-email"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5 font-medium">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/60 dark:bg-minimal-dark-surface/60 backdrop-blur-sm border border-minimal-glass-border dark:border-minimal-dark-glass-border rounded-minimal text-sm text-minimal-text dark:text-minimal-dark-text placeholder:text-minimal-tertiary dark:placeholder:text-minimal-dark-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300"
              placeholder={mode === 'register' ? '请输入密码（至少8位）' : '请输入密码'}
              data-testid="login-password"
              required
              minLength={mode === 'register' ? 8 : undefined}
            />
          </div>

          {error && (
            <div className="p-3 bg-minimal-error/5 border border-minimal-error/20 rounded-minimal">
              <p className="text-sm text-minimal-error">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-minimal-accent hover:bg-minimal-accent-hover disabled:bg-minimal-border dark:disabled:bg-minimal-dark-border disabled:text-minimal-tertiary dark:disabled:text-minimal-dark-tertiary text-white text-sm font-medium rounded-minimal transition-colors duration-300"
            data-testid="login-submit"
          >
            {isLoading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="text-sm text-minimal-accent hover:text-minimal-accent-hover transition-colors duration-300"
            data-testid="login-toggle-mode"
          >
            {mode === 'login' ? '没有账户？点击注册' : '已有账户？点击登录'}
          </button>
        </div>
      </div>
    </div>
  );
}
