'use client';

import { useMemo } from 'react';
import { ReactFlow, Background, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface AgentNode {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'done' | 'error';
}

interface OrchestratorVisualizerProps {
  agents: AgentNode[];
  edges?: Array<{ from: string; to: string }>;
}

const statusColors: Record<string, string> = {
  idle: '#86868B',
  working: '#0071E3',
  done: '#34C759',
  error: '#FF3B30',
};

function AgentCard({ data }: { data: { name: string; status: string } }) {
  return (
    <div className="px-4 py-3 rounded-lg border border-minimal-border dark:border-minimal-dark-border bg-white dark:bg-minimal-dark-surface shadow-sm min-w-[140px]">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColors[data.status] ?? statusColors.idle }}
        />
        <span className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text truncate">
          {data.name}
        </span>
      </div>
      <p className="text-[10px] text-minimal-secondary dark:text-minimal-dark-secondary mt-1 capitalize">
        {data.status}
      </p>
    </div>
  );
}

const nodeTypes = { agentCard: AgentCard };

export function OrchestratorVisualizer({ agents, edges = [] }: OrchestratorVisualizerProps) {
  const { nodes, flowEdges } = useMemo(() => {
    const spacing = 180;
    const n: Node[] = agents.map((agent, i) => ({
      id: agent.id,
      type: 'agentCard',
      position: { x: 50, y: i * spacing },
      data: { name: agent.name, status: agent.status },
    }));
    const e: Edge[] = edges.map((edge, i) => ({
      id: `e-${i}`,
      source: edge.from,
      target: edge.to,
      animated: agents.find((a) => a.id === edge.from)?.status === 'working',
      style: { stroke: '#86868B' },
    }));
    return { nodes: n, flowEdges: e };
  }, [agents, edges]);

  return (
    <div className="w-full h-full min-h-[400px]">
      <ReactFlow nodes={nodes} edges={flowEdges} nodeTypes={nodeTypes} fitView>
        <Background gap={20} size={1} color="#E5E5EA" />
      </ReactFlow>
    </div>
  );
}
