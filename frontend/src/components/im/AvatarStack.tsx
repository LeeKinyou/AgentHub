'use client';

interface AvatarStackProps {
  agentIds: string[];
}

const AVATAR_MAP: Record<string, { label: string; bg: string; text: string }> = {
  'agent-orch-001': { label: '🎯', bg: 'bg-gradient-to-br from-violet-500 to-fuchsia-600', text: 'text-white' },
  'agent-mimo-001': { label: '🧠', bg: 'bg-gradient-to-br from-violet-500 to-purple-600', text: 'text-white' },
  'agent-frontend-001': { label: '🎨', bg: 'bg-gradient-to-br from-cyan-500 to-blue-600', text: 'text-white' },
  'agent-backend-001': { label: '⚙️', bg: 'bg-gradient-to-br from-amber-500 to-orange-600', text: 'text-white' },
  'agent-orchestrator-001': { label: '🤖', bg: 'bg-gradient-to-br from-indigo-500 to-purple-600', text: 'text-white' },
};

const FALLBACK_AVATARS = [
  { label: '🤖', bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', text: 'text-white' },
  { label: '👾', bg: 'bg-gradient-to-br from-pink-500 to-rose-600', text: 'text-white' },
  { label: '🦾', bg: 'bg-gradient-to-br from-indigo-500 to-purple-600', text: 'text-white' },
];

function getAvatar(id: string, index: number) {
  return AVATAR_MAP[id] ?? FALLBACK_AVATARS[index % FALLBACK_AVATARS.length];
}

export function AvatarStack({ agentIds }: AvatarStackProps) {
  const visible = agentIds.slice(0, 3);

  return (
    <div className="flex items-center -space-x-3 isolate hover:space-x-1 transition-all duration-300 ease-in-out">
      {visible.map((id, index) => {
        const avatar = getAvatar(id, index);
        return (
          <div
            key={id}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ring-2 ring-white dark:ring-zinc-950 transition-transform duration-300 ${avatar.bg} ${avatar.text}`}
            style={{ zIndex: 3 - index }}
          >
            {avatar.label}
          </div>
        );
      })}
    </div>
  );
}
