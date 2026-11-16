import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { StatusComponentState } from '../../types';

/**
 * Live view of the nodes added in the panel (Admin > Nodes and Admin > VPS > Nodes), shown by name.
 * Data comes from the same health checks that power the status page; nothing here is hard-coded.
 * Renders nothing until at least one node exists, so a fresh install does not show an empty box.
 */

interface LiveNode {
  id: string;
  name: string;
  description: string;
  status: StatusComponentState;
  latencyMs?: number;
  details?: string;
  uptimePercent90Days: number;
}

const LABEL: Record<StatusComponentState, string> = {
  operational: 'Online',
  degraded: 'Checking',
  partial_outage: 'Degraded',
  major_outage: 'Offline',
  maintenance: 'Maintenance'
};

const DOT: Record<StatusComponentState, string> = {
  operational: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  partial_outage: 'bg-orange-400',
  major_outage: 'bg-rose-500',
  maintenance: 'bg-sky-400'
};

interface Props {
  onNavigate: (page: string) => void;
  /** Poll while the tab is visible. Off when the visitor prefers reduced motion is NOT relevant: this is data, not animation. */
  pollMs?: number;
}

export const LiveNodes: React.FC<Props> = ({ onNavigate, pollMs = 30000 }) => {
  const [nodes, setNodes] = useState<LiveNode[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await apiRequest('/status/nodes');
        if (!cancelled && res.success && Array.isArray(res.data?.nodes)) setNodes(res.data.nodes);
      } catch { /* keep the last good data */ }
    };
    void load();
    const t = setInterval(load, pollMs);
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [pollMs]);

  if (!nodes || nodes.length === 0) return null;

  const online = nodes.filter(n => n.status === 'operational' || n.status === 'maintenance').length;

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]" aria-label="Live node status">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${online === nodes.length ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${online === nodes.length ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </span>
          <span className="text-xs sm:text-sm font-semibold text-white">
            {online} of {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'} online
          </span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('status')}
          className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          Full status <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
      <ul className="divide-y divide-white/10">
        {nodes.map(n => (
          <li key={n.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <div className="truncate text-xs sm:text-sm font-semibold text-white">{n.name}</div>
              <div className="truncate text-[11px] text-zinc-500">{n.details || n.description}</div>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-[11px]">
              {n.latencyMs !== undefined && <span className="font-mono text-zinc-400">{n.latencyMs} ms</span>}
              <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-200">
                <span className={`h-1.5 w-1.5 rounded-full ${DOT[n.status]}`} aria-hidden="true" />
                {LABEL[n.status]}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
