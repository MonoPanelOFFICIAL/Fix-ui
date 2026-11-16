import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, ArrowRight, Star, Check, UserPlus, CreditCard, Play, Headphones,
  RotateCw, ShieldCheck, Database, Lock, Terminal, Cpu
} from 'lucide-react';
import { useBranding } from '../../lib/BrandingContext';
import { useAuth } from '../../lib/AuthContext';
import { apiRequest } from '../../lib/api';
import { Plan, Product } from '../../types';
import { HOSTING_KINDS, HostingKind } from '../../hostingKinds';
import { HeroSlider } from '../../components/HeroSlider';
import { PlanExplorer } from '../../components/home/PlanExplorer';
import { LiveNodes } from '../../components/home/LiveNodes';
import { KindIcon } from '../../components/panel/KindIcon';
import { Reveal, useHeroScroll, useScrollingFlag } from '../../components/animation/ScrollFx';

/**
 * Home page. Section order: hero slider → ticker → stats strip → plan explorer card → products → how it works →
 * built for uptime (with live node status) → runtimes → server locations → reviews → FAQ → final call to action.
 * (The navbar above and the footer below are the shared site chrome.)
 */

interface HomeProps {
  onNavigate: (page: string) => void;
}

const FALLBACK_PRICE: Record<HostingKind, number> = { bot: 0.5, vps: 3.5, website: 3, nodejs: 3, lavalink: 3 };

const KIND_TICKER: Record<HostingKind, string[]> = {
  bot: ['DISCORD BOT HOSTING', '24/7 PROCESS WATCHDOG'],
  vps: ['FULL ROOT ACCESS VPS'],
  website: ['FULL-STACK WEBSITE HOSTING', 'CUSTOM DOMAINS & HTTPS'],
  nodejs: ['NODE.JS HOSTING', 'GIT DEPLOYS & BUILD TASKS'],
  lavalink: ['LAVALINK V4 NODES', 'PLUGINS & LIVE PLAYER STATS']
};

const FEATURES_FALLBACK: Record<HostingKind, string[]> = {
  bot: ['24/7 process watchdog', 'Environment variables & secrets manager', 'Setup & configuration support included', 'Low latency connection to bot gateways'],
  vps: ['High-clock dedicated vCPU cores', 'Full root access, any OS image', 'Free MySQL/Postgres database & subdomain', 'Routine backups & uptime monitoring'],
  website: ['Free subdomain & custom domains', 'Git deploys with build steps', 'Front end and back end together', 'Console, files and backups'],
  nodejs: ['Node 20, 22 and 24', 'npm / pnpm / yarn tasks', 'Git deploy & one-click update', 'Live console and file manager'],
  lavalink: ['Lavalink v4 ready in a minute', 'Plugin manager & generated config', 'Live players, memory and CPU', 'Copy-paste connection details']
};

const RUNTIMES = [
  { name: 'Node.js', note: 'v18 – v22' },
  { name: 'Python', note: '3.9 – 3.12' },
  { name: 'Bun', note: 'Fast JS runtime' },
  { name: 'Go', note: 'Compiled binaries' }
];

const FAQS: { q: string; a: string; kinds?: HostingKind[] }[] = [
  {
    q: 'How fast can my service go live?',
    a: 'Once your payment is verified by our team, your service is set up and delivered to your dashboard. Deployment is designed to be quick, so you can go live in minutes.'
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. You can deploy a free server straight from your dashboard. Free servers are kept alive by renewing them now and then, and paid plans remove that step and unlock more resources.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'The payment methods currently enabled are shown at checkout — by default that includes UPI, bank transfer, and gift card redemption.'
  },
  {
    kinds: ['bot', 'nodejs', 'website'],
    q: 'What runtimes are supported?',
    a: 'Node.js (v18-v22), Python (3.9-3.12), Bun, and Go are supported, with automatic restart on crash and an environment variables & secrets manager.'
  },
  {
    q: 'Can you help me move over from another host?',
    a: 'Yes. Free migration assistance is available — open a support ticket from your dashboard and our team will help you get moved.'
  },
  {
    kinds: ['bot', 'nodejs', 'website'],
    q: 'How do I get my bot or app onto the server?',
    a: 'Open the File Manager to upload files or a whole folder from your device, pull a file from a URL, or clone a GitHub repository from the Startup tab. You can also connect with SFTP on plans that include it.'
  },
  {
    kinds: ['bot', 'nodejs', 'website'],
    q: 'Where do I set my main file and environment variables?',
    a: 'In the Startup tab of your server. Set the main file, extra Node packages, Git details and other variables there, then restart the server to apply them.'
  },
  {
    kinds: ['bot', 'nodejs', 'website', 'lavalink'],
    q: 'What if I delete a file by accident?',
    a: 'Deleted files go to the Recycle Bin first. You can restore them for 3 days before they are removed for good.'
  },
  {
    kinds: ['bot', 'nodejs', 'website', 'lavalink'],
    q: 'Can I give friends access to my server?',
    a: 'Yes. Paid plans let you add users to a server and choose exactly what each of them can do, such as viewing the console, editing files or restarting the server.'
  },
  {
    kinds: ['vps'],
    q: "What's included with VPS Hosting?",
    a: 'VPS plans include high-clock dedicated vCPU cores, full root access with any OS image, a free MySQL/Postgres database & subdomain, and routine backups with uptime monitoring.'
  }
];

const TESTIMONIALS = [
  { name: 'Aarav M.', role: 'Discord bot developer', quote: 'I moved my bot over in one evening. The file manager and recycle bin saved me twice already, and it has not gone offline once.' },
  { name: 'Lena K.', role: 'Community manager', quote: 'Setup took minutes. The console and startup tab feel like a proper control panel, and support answered my ticket in under an hour.' },
  { name: 'Diego R.', role: 'Minecraft server owner', quote: 'Our Paper server runs smoothly with zero lag spikes, even during events. The activity log makes it easy to see who changed what.' }
];

interface LocationMeta { region: string; city: string; country: string; code: string }

/** Plans store a location id (e.g. "us-east"); this turns the common ones into something readable. */
const LOCATION_META: Record<string, LocationMeta> = {
  'us-east': { region: 'North America', city: 'New York', country: 'United States', code: 'US' },
  'us-west': { region: 'North America', city: 'Los Angeles', country: 'United States', code: 'US' },
  'us-central': { region: 'North America', city: 'Dallas', country: 'United States', code: 'US' },
  'ca-east': { region: 'North America', city: 'Beauharnois', country: 'Canada', code: 'CA' },
  'eu-central': { region: 'Europe', city: 'Frankfurt', country: 'Germany', code: 'DE' },
  'eu-west': { region: 'Europe', city: 'Amsterdam', country: 'Netherlands', code: 'NL' },
  'eu-north': { region: 'Europe', city: 'Helsinki', country: 'Finland', code: 'FI' },
  'ap-south': { region: 'Asia Pacific', city: 'Mumbai', country: 'India', code: 'IN' },
  'ap-southeast': { region: 'Asia Pacific', city: 'Singapore', country: 'Singapore', code: 'SG' },
  'ap-northeast': { region: 'Asia Pacific', city: 'Tokyo', country: 'Japan', code: 'JP' },
  'sa-east': { region: 'South America', city: 'São Paulo', country: 'Brazil', code: 'BR' }
};
const DEFAULT_LOCATION_IDS = ['us-east', 'eu-central', 'ap-south'];

const prettyLocation = (id: string): LocationMeta =>
  LOCATION_META[id] ?? {
    region: 'Global',
    city: id.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    country: '',
    code: id.slice(0, 2).toUpperCase()
  };

interface ProductCardProps {
  kind: HostingKind;
  title: string;
  price: number;
  features: string[];
  page: string;
  onNavigate: (page: string) => void;
}

// Module-level on purpose: a component declared inside Home gets a new identity every render and remounts.
const ProductCard: React.FC<ProductCardProps> = ({ kind, title, price, features, page, onNavigate }) => (
  <div className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 transition-colors hover:border-white/25">
    <div>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white">
        <KindIcon kind={kind} className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-lg sm:text-xl font-bold text-white">{title}</h3>
      <p className="mt-1 text-[11px] text-zinc-500">Starting at</p>
      <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
        {price > 0 ? `$${price.toFixed(2)}` : 'Free'}
        {price > 0 && <span className="ml-1 text-xs font-medium tracking-normal text-zinc-500">/month</span>}
      </p>
      <ul className="mt-5 space-y-2.5 text-xs sm:text-sm text-zinc-300">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white" aria-hidden="true" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
    <button
      type="button"
      onClick={() => onNavigate(page)}
      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-2.5 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-white hover:text-zinc-950"
    >
      Learn more <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  </div>
);

const SECTION = 'mx-auto w-full max-w-6xl';
const H2 = 'text-2xl sm:text-3xl font-bold text-white';
const SUB = 'mt-2 text-xs sm:text-sm text-zinc-400';

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { pageAnimationsEnabled, brandName, socialLinks, discordUrl, enabledHostings } = useBranding();
  const { user } = useAuth();
  const joinUrl = socialLinks?.discord || discordUrl;
  const startPage = user ? 'servers' : 'register';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const [res, prodRes] = await Promise.all([apiRequest('/public/plans'), apiRequest('/public/products')]);
        if (res.success && Array.isArray(res.data)) {
          setPlans(res.data);
        } else if (res.error) {
          console.error('Failed to load plans on home:', res.error.message);
        }
        if (prodRes.success && Array.isArray(prodRes.data)) setProducts(prodRes.data);
      } catch (err: any) {
        console.error('Failed to load plans on home:', err.message || err);
      }
    };

    loadPlans();
  }, []);

  // Plans belong to a hosting type through their product's category (older seeds: by id prefix).
  const kindOfPlan = (p: Plan): HostingKind | null => {
    const cat = products.find(x => x.id === p.productId)?.category;
    if (cat && (HOSTING_KINDS as { id: string }[]).some(k => k.id === cat)) return cat as HostingKind;
    if (p.productId === 'prod_vps' || p.id.startsWith('plan_vps_')) return 'vps';
    if (p.productId === 'prod_bot' || p.id.startsWith('plan_bot_')) return 'bot';
    return null;
  };

  const plansByKind: Partial<Record<HostingKind, Plan[]>> = {};
  for (const p of plans) {
    if (p.isActive === false) continue;
    const k = kindOfPlan(p);
    if (k) (plansByKind[k] ||= []).push(p);
  }
  for (const list of Object.values(plansByKind)) list?.sort((a, b) => a.ramMB - b.ramMB || a.priceMonthly - b.priceMonthly);

  const prices: Partial<Record<HostingKind, number>> = {};
  for (const k of enabledHostings) {
    const cheapest = (plansByKind[k] || []).reduce<number | null>((m, p) => (m === null || p.priceMonthly < m ? p.priceMonthly : m), null);
    prices[k] = cheapest ?? FALLBACK_PRICE[k];
  }

  const shownKinds = HOSTING_KINDS.filter(k => enabledHostings.includes(k.id));
  const faqs = FAQS.filter(f => !f.kinds || f.kinds.some(k => enabledHostings.includes(k)));

  const tickerItems = ['99.99% UPTIME SLA', ...shownKinds.flatMap(k => KIND_TICKER[k.id]), 'REAL HUMAN SUPPORT', 'FREE MIGRATION ASSISTANCE'];

  // Product cards show the cheapest plan's features (falling back to sensible defaults when a type has no plans yet).
  const cheapestPlan = (k: HostingKind): Plan | undefined =>
    (plansByKind[k] || []).reduce<Plan | undefined>((m, p) => (!m || p.priceMonthly < m.priceMonthly ? p : m), undefined);
  const kindFeatures = (k: HostingKind) => (cheapestPlan(k)?.features?.length ? cheapestPlan(k)!.features : FEATURES_FALLBACK[k]).slice(0, 4);

  const kindWords = shownKinds.map(k => k.short);
  const orList = kindWords.length <= 1 ? (kindWords[0] || 'hosting') : kindWords.slice(0, -1).join(', ') + ' or ' + kindWords[kindWords.length - 1];
  const hasVps = enabledHostings.includes('vps');
  const hasRuntimes = enabledHostings.some(k => k === 'bot' || k === 'nodejs' || k === 'website');
  const runtimeBlurb = [
    hasRuntimes ? `${shownKinds.filter(k => k.id !== 'vps' && k.id !== 'lavalink').map(k => k.label).join(', ')} support the runtimes below` : '',
    hasVps ? 'a VPS gives you full root access with any OS image' : ''
  ].filter(Boolean).join(', and ') + '.';

  const locationIds = Array.from(new Set(plans.flatMap(p => p.locations || []).filter(l => l && l !== 'local')));
  const locations = (locationIds.length ? locationIds : DEFAULT_LOCATION_IDS).slice(0, 4).map(prettyLocation);

  const stats = [
    { value: '99.99%', label: 'Uptime SLA' },
    { value: '24/7', label: 'Process watchdog' },
    { value: String(shownKinds.length), label: shownKinds.length === 1 ? 'Hosting type' : 'Hosting types' }
  ];

  const animate = pageAnimationsEnabled && !prefersReducedMotion;

  // hero parallax (+ pause its animations off-screen) and the scroll flag that rests the title shimmer
  const heroRef = useRef<HTMLDivElement>(null);
  const heroLayerRef = useRef<HTMLDivElement>(null);
  useHeroScroll(heroRef, heroLayerRef, animate);
  useScrollingFlag(animate);

  return (
    <div className="home relative isolate">

      {/* ================= HERO ================= */}
      <div ref={heroRef} className="hero-wrap">
        <div ref={heroLayerRef} className="hero-layer">
          <HeroSlider prices={prices} enabled={enabledHostings} autoplay={animate} startPage={startPage} onNavigate={onNavigate} />
        </div>
      </div>

      {/* ================= TICKER ================= */}
      <div className="-mx-4 lg:-mx-6 overflow-hidden border-b border-white/10 bg-black" aria-hidden="true">
        <div className={`flex w-max whitespace-nowrap py-3 font-mono text-[11px] sm:text-xs font-bold tracking-widest text-zinc-500 ${animate ? 'animate-marquee' : ''}`}>
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="flex items-center">
              <span className="px-6">{item}</span>
              <span className="text-zinc-700">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* ================= STATS ================= */}
      <section className={`${SECTION} pt-10 sm:pt-14`} aria-label="Highlights">
        <Reveal y={36}>
          <div className="grid divide-x divide-white/10" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
            {stats.map(s => (
              <div key={s.label} className="px-2 text-center">
                <div className="text-2xl sm:text-5xl font-bold tracking-tight text-white">{s.value}</div>
                <div className="mt-1 text-[11px] sm:text-sm text-zinc-400">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ================= PLAN EXPLORER ================= */}
      <section className={`${SECTION} mt-8 sm:mt-12`} aria-label="Plans">
        <Reveal y={40}>
          <PlanExplorer kinds={shownKinds} plansByKind={plansByKind} startPage={startPage} onNavigate={onNavigate} />
        </Reveal>
      </section>

      {/* ================= PRODUCTS ================= */}
      <section className={`${SECTION} mt-16 sm:mt-24`} aria-label="Products">
        <Reveal y={36}>
          <h2 className={H2}>Our Products</h2>
          <p className={SUB}>
            {shownKinds.length === 1 ? 'One product, done properly' : `${shownKinds.length} products, done properly`} — no confusing tiers, no filler hosting types.
          </p>
        </Reveal>
        <div className={`mt-6 grid grid-cols-1 gap-3 sm:gap-4 ${shownKinds.length === 1 ? 'max-w-md' : shownKinds.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {shownKinds.map((k, i) => (
            <Reveal key={k.id} delay={(i % 3) * 0.1} y={36} className="h-full">
              <ProductCard kind={k.id} title={k.label} price={prices[k.id] ?? FALLBACK_PRICE[k.id]} features={kindFeatures(k.id)} page={k.publicPage} onNavigate={onNavigate} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className={`${SECTION} mt-16 sm:mt-24`} aria-label="How it works">
        <Reveal y={36}>
          <h2 className={H2}>Live in three steps</h2>
          <p className={SUB}>From sign-up to a running service, without the back-and-forth.</p>
        </Reveal>
        <ol className="mt-6 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          {[
            { icon: UserPlus, title: 'Create a free account', text: 'Sign up in a minute and open your dashboard. No card needed to look around.' },
            { icon: CreditCard, title: 'Pick a plan and pay', text: `Choose ${orList} hosting and pay with the methods shown at checkout, like UPI, bank transfer or gift card.` },
            { icon: Play, title: 'Deploy from your dashboard', text: 'Once payment is verified, your credentials land in the dashboard and you can go live.' }
          ].map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 0.1} y={36} className="h-full">
              <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="text-3xl font-bold text-white/15" aria-hidden="true">{i + 1}</span>
                </div>
                <h3 className="mt-5 text-base sm:text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-400">{text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ================= BUILT FOR UPTIME (+ live node status) ================= */}
      <section className={`${SECTION} mt-16 sm:mt-24`} aria-label="Infrastructure">
        <Reveal y={36}>
          <h2 className={`${H2} ${animate ? 'mono-heading-shimmer' : ''}`}>Built for Uptime</h2>
          <p className="mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-400">
            {brandName} keeps your services running with process watchdogs, routine backups, uptime monitoring, and a team that answers tickets.
          </p>
        </Reveal>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {[
            { icon: RotateCw, label: 'Auto-restart on crash' },
            { icon: ShieldCheck, label: 'Uptime monitoring' },
            { icon: Database, label: 'Routine backups' },
            ...(hasVps ? [{ icon: Lock, label: 'Full root access' }] : []),
            ...(hasRuntimes ? [{ icon: Terminal, label: 'Multi-runtime apps' }] : []),
            { icon: Headphones, label: 'Real human support' }
          ].map(({ icon: Icon, label }, i) => (
            <Reveal key={label} delay={(i % 3) * 0.08} y={30} className="h-full">
              <div className="flex h-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 transition-colors hover:border-white/25">
                <Icon className="h-5 w-5 shrink-0 text-white" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-semibold leading-snug text-zinc-200">{label}</span>
              </div>
            </Reveal>
          ))}
        </div>
        <LiveNodes onNavigate={onNavigate} />
      </section>

      {/* ================= RUNTIMES ================= */}
      {hasRuntimes && (
        <section className={`${SECTION} mt-16 sm:mt-24`} aria-label="Runtimes">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.3fr] lg:gap-14">
            <Reveal y={36}>
              <h2 className={H2}>Run what you already build</h2>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-zinc-400">Bring your project as it is. {runtimeBlurb}</p>
            </Reveal>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {RUNTIMES.map((r, i) => (
                <Reveal key={r.name} delay={i * 0.08} y={30} className="h-full">
                  <div className="flex h-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-950">
                      <Cpu className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold text-white">{r.name}</div>
                      <div className="text-[11px] sm:text-xs text-zinc-500">{r.note}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= LOCATIONS ================= */}
      <section className={`${SECTION} mt-16 sm:mt-24`}>
        <Reveal y={36}>
          <h2 className={H2}>Our Premium Server Locations</h2>
          <p className="mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-400">
            {brandName} services run in secure, professional data centers on high-quality networks from trusted providers.
            This lets us deliver fast speeds, low latency and reliable connections for users around the world, wherever your players or visitors are.
          </p>
          <div className="loc-grid mt-6">
            {locations.map(l => (
              <div key={l.city + l.code} className="loc-cell">
                <span className="loc-code" aria-hidden="true">{l.code}</span>
                <span className="mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{l.region}</span>
                <span className="text-sm sm:text-base font-bold text-white">{l.city}</span>
                {l.country && <span className="text-[11px] text-zinc-500">{l.country}</span>}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ================= REVIEWS ================= */}
      <section className={`${SECTION} mt-16 sm:mt-24`}>
        <Reveal y={36}>
          <h2 className={H2}>What Our Users Say</h2>
          <p className={SUB}>Don&apos;t just take our word for it. Hear from the {brandName} community.</p>
          {joinUrl && (
            <a href={joinUrl} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-white hover:text-zinc-300 transition-colors">
              Join the community <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </Reveal>
        <div className="mt-6 grid gap-3 sm:gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1} y={36} className="h-full">
              <figure className="review-card">
                <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                  {[0, 1, 2, 3, 4].map(n => <Star key={n} className="h-3 w-3 fill-white text-white" aria-hidden="true" />)}
                </div>
                <blockquote className="mt-3 flex-1 text-xs sm:text-sm leading-relaxed text-zinc-300">“{t.quote}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-2.5 border-t border-white/10 pt-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[11px] font-bold text-white" aria-hidden="true">{t.name[0]}</span>
                  <span>
                    <span className="block text-xs font-semibold text-white">{t.name}</span>
                    <span className="block text-[10px] text-zinc-500">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className={`${SECTION} mt-16 sm:mt-24`}>
        <Reveal y={36}>
          <h2 className={H2}>Frequently Asked Questions</h2>
          <p className={SUB}>Got questions? We&apos;ve got answers.</p>
          <div className="mt-6 border-t border-white/10">
            {faqs.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={item.q} className="border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left"
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                  >
                    <span className="text-xs sm:text-sm font-medium text-white">{item.q}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <p id={`faq-a-${i}`} className="pb-4 pr-8 text-xs sm:text-sm leading-relaxed text-zinc-400">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Reveal>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className={`${SECTION} mt-16 sm:mt-24 pb-16 sm:pb-24`} aria-label="Get started">
        <Reveal y={40}>
          <div className="rounded-3xl bg-white px-6 py-10 text-center shadow-2xl sm:px-12 sm:py-14">
            <h2 className="text-2xl sm:text-4xl font-bold text-zinc-950">Ready to launch?</h2>
            <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm leading-relaxed text-zinc-600">
              Create a free account and deploy your first service in minutes. Free migration assistance available.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => onNavigate(startPage)}
                className="rounded-xl bg-zinc-950 px-7 py-3 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                {user ? 'Open Dashboard' : 'Create Free Account'}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('pricing')}
                className="rounded-xl border border-zinc-300 bg-zinc-100 px-7 py-3 text-xs sm:text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200"
              >
                Browse All Plans
              </button>
              {joinUrl && (
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-xl bg-emerald-500 px-7 py-3 text-center text-xs sm:text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
                >
                  Join our Discord
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};
