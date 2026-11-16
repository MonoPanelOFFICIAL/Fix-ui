import type { DatabaseSchema } from './db';
import type { DayUptime, StatusComponent, StatusComponentState } from '../src/types';

/**
 * Live status for the nodes added in Admin > Nodes (hosting) and Admin > VPS > Nodes.
 * The panel already health-checks every node every 45s; this file turns those results into public status
 * components (named after the node) and keeps a per-day tally so the 90-day bar is real, not generated.
 */

const DAY_MS = 86_400_000;
const KEEP_DAYS = 90;
const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

type Loggable = { uptimeLog?: Record<string, [number, number]> };

/** Call after each health check. Stores [ok, total] per UTC day and drops anything older than 90 days. */
export function recordNodeCheck(node: Loggable, online: boolean): void {
  const log = (node.uptimeLog ||= {});
  const key = dayKey(Date.now());
  const cur = log[key] || [0, 0];
  log[key] = [cur[0] + (online ? 1 : 0), cur[1] + 1];
  const cutoff = dayKey(Date.now() - KEEP_DAYS * DAY_MS);
  for (const k of Object.keys(log)) if (k < cutoff) delete log[k];
}

function historyOf(node: Loggable): { days: DayUptime[]; percent: number } {
  const log = node.uptimeLog || {};
  const days: DayUptime[] = [];
  let ok = 0, total = 0;
  for (let i = KEEP_DAYS - 1; i >= 0; i--) {
    const date = dayKey(Date.now() - i * DAY_MS);
    const [o, t] = log[date] || [0, 0];
    ok += o; total += t;
    if (!t) { days.push({ date, status: 'no_data', uptimePercent: 0 }); continue; }
    const pct = Math.round((o / t) * 10000) / 100;
    const status: StatusComponentState = pct >= 99.5 ? 'operational' : pct >= 95 ? 'degraded' : pct >= 50 ? 'partial_outage' : 'major_outage';
    days.push({ date, status, uptimePercent: pct });
  }
  return { days, percent: total ? Math.round((ok / total) * 10000) / 100 : 100 };
}

const pct = (free: number, total: number) => (total > 0 ? Math.round(((total - free) / total) * 100) : null);
const fmtUp = (s: number) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };

interface Shape {
  id: string; name: string; location: string; maintenance: boolean; kind: 'Hosting' | 'VPS'; order: number;
  status: { online?: boolean; checkedAt?: string; latencyMs?: number; system?: any };
  log: Loggable;
}

function toComponent(n: Shape, withHistory: boolean): StatusComponent {
  const s = n.status || {};
  const sys = s.system;
  let state: StatusComponentState;
  let details: string;
  if (n.maintenance) { state = 'maintenance'; details = 'Under maintenance.'; }
  else if (!s.checkedAt) { state = 'degraded'; details = 'Waiting for the first health check.'; }
  else if (!s.online) { state = 'major_outage'; details = 'Node is not responding.'; }
  else {
    state = 'operational';
    // Hosting daemons report memTotal/memFree in bytes; VPS daemons report memTotalMb/memFreeMb.
    const memTotal = sys ? (sys.memTotal ?? (sys.memTotalMb ? sys.memTotalMb * 1048576 : 0)) : 0;
    const memFree = sys ? (sys.memFree ?? (sys.memFreeMb ? sys.memFreeMb * 1048576 : 0)) : 0;
    const diskTotal = sys ? (sys.diskTotal ?? (sys.diskTotalMb ? sys.diskTotalMb * 1048576 : 0)) : 0;
    const diskFree = sys ? (sys.diskFree ?? (sys.diskFreeMb ? sys.diskFreeMb * 1048576 : 0)) : 0;
    const load = Array.isArray(sys?.load) ? sys.load[0] : Array.isArray(sys?.loadavg) ? sys.loadavg[0] : undefined;
    const up = sys?.uptime ?? sys?.uptimeS;
    const bits = [
      n.location,
      sys?.cpus && typeof load === 'number' ? `CPU load ${Math.min(100, Math.round((load / sys.cpus) * 100))}%` : '',
      pct(memFree, memTotal) !== null ? `RAM ${pct(memFree, memTotal)}% used` : '',
      pct(diskFree, diskTotal) !== null ? `Disk ${pct(diskFree, diskTotal)}% used` : '',
      typeof up === 'number' && up > 0 ? `Up ${fmtUp(up)}` : ''
    ].filter(Boolean);
    details = bits.join(' • ') || 'Online.';
  }
  const h = historyOf(n.log);
  return {
    id: `node_${n.id}`, nodeId: n.id, name: n.name, type: 'node',
    description: `${n.kind} node${n.location ? ` • ${n.location}` : ''}`,
    group: 'Compute Nodes', status: state, uptimePercent90Days: h.percent,
    lastCheckedAt: s.checkedAt || new Date(0).toISOString(),
    latencyMs: s.online ? s.latencyMs : undefined,
    details, order: n.order, isPublic: true,
    ...(withHistory ? { history90Days: h.days } : {})
  };
}

/** One component per node added in the panel, named after the node. Hidden hosting nodes stay hidden. */
export function nodeComponents(db: DatabaseSchema, withHistory = true): StatusComponent[] {
  const shapes: Shape[] = [
    ...(db.nodes || []).filter(n => n.isPublic !== false).map((n, i): Shape => ({
      id: n.id, name: n.name, location: n.locationName || '', maintenance: !!n.isMaintenance, kind: 'Hosting', order: i, status: n.status, log: n
    })),
    ...(db.vpsNodes || []).map((n, i): Shape => ({
      id: n.id, name: n.name, location: n.location || '', maintenance: false, kind: 'VPS', order: 1000 + i, status: n.status, log: n
    }))
  ];
  return shapes.map(s => toComponent(s, withHistory));
}
