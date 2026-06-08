'use client';

interface DeployStatusCardProps {
  status: 'building' | 'deploying' | 'success';
  url?: string;
}

const STATUS_CONFIG = {
  building: { icon: '⚡', text: '正在编译底层依赖与打包静态资源...', color: 'bg-minimal-accent' },
  deploying: { icon: '🛸', text: '正在将容器镜像推送至全球边缘节点...', color: 'bg-minimal-accent' },
  success: { icon: '✅', text: '部署成功！项目已成功上线全球网格。', color: 'bg-minimal-success' },
};

export function DeployStatusCard({ status, url }: DeployStatusCardProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="border border-minimal-glass-border rounded-minimal overflow-hidden bg-minimal-glass/60 backdrop-blur-xl w-full max-w-md shadow-minimal-glow">
      <div className="relative h-1 w-full bg-minimal-border overflow-hidden">
        <div className={`absolute inset-y-0 left-0 ${config.color} ${status !== 'success' ? 'animate-pulse w-3/4' : 'w-full'}`} />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="text-sm font-medium text-minimal-text">{config.text}</span>
        </div>
        {status === 'success' && url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-block text-sm text-minimal-accent hover:text-minimal-accent-hover underline underline-offset-4 transition-colors duration-300">
            {url}
          </a>
        )}
        {status !== 'success' && (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${config.color} animate-bounce`} style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
