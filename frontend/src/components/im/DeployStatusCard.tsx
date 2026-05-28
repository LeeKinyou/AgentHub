'use client';

interface DeployStatusCardProps {
  status: 'building' | 'deploying' | 'success';
  url?: string;
}

const STATUS_CONFIG = {
  building: { icon: '⚡', text: '正在编译底层依赖与打包静态资源...', color: 'from-violet-500 to-fuchsia-500' },
  deploying: { icon: '🛸', text: '正在将容器镜像推送至全球边缘节点...', color: 'from-cyan-500 to-blue-500' },
  success: { icon: '✅', text: '部署成功！项目已成功上线全球网格。', color: 'from-emerald-500 to-green-500' },
};

export function DeployStatusCard({ status, url }: DeployStatusCardProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900/50 w-full max-w-md">
      <div className="relative h-1 w-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${config.color} ${status !== 'success' ? 'animate-pulse w-3/4' : 'w-full'}`} />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{config.text}</span>
        </div>
        {status === 'success' && url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-4 transition-colors">
            {url}
          </a>
        )}
        {status !== 'success' && (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color} animate-bounce`} style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
