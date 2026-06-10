'use client';

interface AvatarStackProps {
  agentIds: string[];
}

const AVATAR_MAP: Record<string, { label: string; bg: string }> = {
  'agent-orch-001': { label: '🎯', bg: 'bg-minimal-accent' },
  'agent-mimo-001': { label: '🧠', bg: 'bg-minimal-success' },
  'agent-frontend-001': { label: '🎨', bg: 'bg-minimal-warning' },
  'agent-backend-001': { label: '⚙️', bg: 'bg-minimal-secondary' },
  'agent-orchestrator-001': { label: '🤖', bg: 'bg-minimal-accent' },
};

const FALLBACK_AVATARS = [
  { label: '🤖', bg: 'bg-minimal-accent' },
  { label: '👾', bg: 'bg-minimal-success' },
  { label: '🦾', bg: 'bg-minimal-warning' },
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
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-apple ring-2 ring-white transition-transform duration-300 ${avatar.bg} text-white`}
            style={{ zIndex: 3 - index }}
          >
            {avatar.label}
          </div>
        );
      })}
    </div>
  );
}
