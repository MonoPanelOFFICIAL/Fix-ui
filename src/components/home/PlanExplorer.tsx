import React, { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { Plan } from '../../types';
import type { HostingKind, HostingKindInfo } from '../../hostingKinds';
import { KindIcon } from '../panel/KindIcon';

/**
 * Home "plan explorer" card: pick a hosting type from the pill tabs, drag the RAM slider through that type's
 * real plans (cheapest to biggest) and the tier card underneath shows the specs and price of the selected plan.
 * Plans come from the public API, so whatever the admin sells is what shows up here.
 */

const FEATURES_FALLBACK: Record<HostingKind, string[]> = {
  bot: ['24/7 process watchdog', 'Secrets manager', 'File manager & SFTP', 'Backups'],
  vps: ['Full root access', 'Any OS image', 'Free database & subdomain', 'Routine backups'],
  website: ['Free subdomain', 'Custom domains & HTTPS', 'Git deploys', 'Console & backups'],
  nodejs: ['Node 20, 22 and 24', 'npm / pnpm / yarn tasks', 'Git deploy', 'Live console'],
  lavalink: ['Lavalink v4 ready fast', 'Plugin manager', 'Live player stats', 'Connection details']
};

const fmtRam = (mb: number) => (mb >= 1024 ? `${Number((mb / 1024).toFixed(1))} GB` : `${mb} MB`);
const fmtPrice = (n: number) => (n > 0 ? `$${n.toFixed(2)}` : 'Free');

interface PlanExplorerProps {
  kinds: HostingKindInfo[];
  /** Active plans per hosting type, sorted by RAM ascending. */
  plansByKind: Partial<Record<HostingKind, Plan[]>>;
  startPage: string;
  onNavigate: (page: string) => void;
}

export const PlanExplorer: React.FC<PlanExplorerProps> = ({ kinds, plansByKind, startPage, onNavigate }) => {
  const [kindId, setKindId] = useState<HostingKind | null>(null);
  const [tierIdx, setTierIdx] = useState(0);

  if (!kinds.length) return null;

  const kind = kinds.find(k => k.id === kindId) ?? kinds[0];
  const tiers = plansByKind[kind.id] ?? [];
  const idx = Math.min(tierIdx, Math.max(tiers.length - 1, 0));
  const plan: Plan | undefined = tiers[idx];
  const features = (plan?.features?.length ? plan.features : FEATURES_FALLBACK[kind.id]).slice(0, 4);
  const progress = tiers.length > 1 ? (idx / (tiers.length - 1)) * 100 : 0;

  const rows: [string, string][] = plan
    ? [
        ['CPU', `${plan.cpuCores} vCPU`],
        ['RAM', fmtRam(plan.ramMB)],
        ['Storage', `${plan.diskGB} GB`],
        ['Uptime', '99.99%']
      ]
    : [];

  return (
    <div className="plan-card">
      {/* Pill tabs */}
      <div className="flex justify-center">
        <div className="plan-pills" role="group" aria-label="Hosting type">
          {kinds.map(k => (
            <button
              key={k.id}
              type="button"
              aria-pressed={k.id === kind.id}
              onClick={() => { setKindId(k.id); setTierIdx(0); }}
              className={`plan-pill${k.id === kind.id ? ' is-active' : ''}`}
            >
              {k.short}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-start">
        {/* Left: what it is + RAM slider */}
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white">
              <KindIcon kind={kind.id} className="h-4 w-4" />
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white">{kind.label}</h3>
          </div>
          <p className="mt-3 max-w-md text-sm sm:text-base leading-relaxed text-zinc-400">{kind.description}</p>

          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 max-w-md">
            {features.map(f => (
              <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-zinc-300">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white" aria-hidden="true" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {tiers.length > 1 && plan && (
            <div className="mt-8">
              <div className="flex items-end justify-between">
                <label htmlFor="plan-ram" className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">RAM</label>
                <span className="text-lg sm:text-xl font-bold text-white">{fmtRam(plan.ramMB)}</span>
              </div>
              <input
                id="plan-ram"
                type="range"
                className="plan-range mt-2"
                min={0}
                max={tiers.length - 1}
                step={1}
                value={idx}
                style={{ '--p': `${progress}%` } as React.CSSProperties}
                onChange={e => setTierIdx(Number(e.target.value))}
                aria-valuetext={`${fmtRam(plan.ramMB)} RAM, ${fmtPrice(plan.priceMonthly)} per month`}
              />
              <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
                <span>{fmtRam(tiers[0].ramMB)}</span>
                <span>{fmtRam(tiers[tiers.length - 1].ramMB)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: the selected tier */}
        <div className="plan-tier">
          {plan ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">Tier {idx + 1}</div>
                  <div className="truncate text-[11px] text-zinc-500">{plan.name}</div>
                </div>
                <div className="shrink-0 text-right text-3xl sm:text-4xl font-bold leading-none text-white">
                  {fmtPrice(plan.priceMonthly)}
                  {plan.priceMonthly > 0 && <span className="ml-1 text-xs font-medium text-zinc-500">/mo</span>}
                </div>
              </div>
              <dl className="mt-4">
                {rows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-t border-white/10 py-2.5 text-xs sm:text-sm">
                    <dt className="text-zinc-400">{label}</dt>
                    <dd className="font-semibold text-white">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button type="button" onClick={() => onNavigate(kind.publicPage)} className="plan-deploy">
                  Deploy Tier {idx + 1}
                </button>
                <button type="button" onClick={() => onNavigate('pricing')} className="plan-link">
                  View Plans <ChevronRight aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onNavigate(startPage)} className="plan-link">
                  Start for Free <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-zinc-400">Plans for {kind.label} aren&apos;t listed yet.</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <button type="button" onClick={() => onNavigate(kind.publicPage)} className="plan-deploy">Learn more</button>
                <button type="button" onClick={() => onNavigate('pricing')} className="plan-link">
                  View Plans <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
