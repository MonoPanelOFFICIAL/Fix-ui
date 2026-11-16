import React, { useCallback, useRef, useState } from 'react';
import { ArrowRight, Bot, Cpu, Database, Globe, Hexagon, Music, RotateCw, Server, Terminal } from 'lucide-react';
import { HostingKind } from '../hostingKinds';
import type { LucideIcon } from 'lucide-react';
import { DiscordGlyph } from './DiscordGlyph';

/**
 * Home hero slider — the big top section.
 *
 * Left: two-line title (second word in italic), short description, starting price and two buttons.
 * Right: artwork that crossfades per product. Bottom: a tab bar (one tab per enabled hosting type) whose
 * active tab fills a thin progress line and auto-advances. Swipe, arrow keys and the tabs also switch slides.
 *
 * Want real photos instead of the built-in artwork? Drop images into /public/hero/ and set `imageUrl`
 * on a slide below, e.g. imageUrl: '/hero/bot.jpg'. All styling lives under `.hero` in src/index.css.
 */

const SLIDE_MS = 6500;

interface HeroSliderProps {
  /** Starting price per hosting type. Only the types in `enabled` get a slide, in this order. */
  prices: Partial<Record<HostingKind, number>>;
  enabled: HostingKind[];
  /** Auto-advance the slides. Turned off for reduced-motion users and when page animations are disabled. */
  autoplay: boolean;
  /** Where the primary "Start for Free" button goes (register for visitors, the client area when signed in). */
  startPage: string;
  onNavigate: (page: string) => void;
}

interface Slide {
  id: string;
  tabLabel: string;
  TabIcon: LucideIcon;
  titleTop: string;
  titleBottom: string;
  description: string;
  price: number;
  page: string;
  imageUrl?: string;
  art: React.ReactNode;
}

const DOTS = [
  { l: '12%', t: '20%', d: '0s' }, { l: '30%', t: '8%', d: '-1.2s' }, { l: '48%', t: '14%', d: '-2.4s' },
  { l: '70%', t: '10%', d: '-0.6s' }, { l: '88%', t: '26%', d: '-1.8s' }, { l: '6%', t: '52%', d: '-3s' },
  { l: '92%', t: '58%', d: '-0.9s' }, { l: '18%', t: '84%', d: '-2.1s' }, { l: '46%', t: '92%', d: '-1.5s' },
  { l: '74%', t: '88%', d: '-2.7s' }, { l: '60%', t: '70%', d: '-0.3s' }, { l: '34%', t: '64%', d: '-3.3s' }
];

const BotArt: React.FC = () => (
  <div className="art art--bot">
    <div className="art__glow" />
    <div className="art__ring art__ring--1" />
    <div className="art__ring art__ring--2" />
    {DOTS.map((d, i) => (
      <i key={i} className="art__dot" style={{ left: d.l, top: d.t, animationDelay: d.d }} />
    ))}
    <div className="art__stage">
      <div className="tile tile--a"><Terminal /></div>
      <div className="tile tile--b"><Cpu /></div>
      <div className="tile tile--c"><RotateCw /></div>
      <div className="tile tile--d"><Database /></div>
      <div className="tile tile--main"><DiscordGlyph /></div>
    </div>
  </div>
);

/** Artwork for the hosting types without hand-made art: the bot scene with that type's icon in the middle. */
const KindArt: React.FC<{ Icon: LucideIcon }> = ({ Icon }) => (
  <div className="art art--bot">
    <div className="art__glow" />
    <div className="art__ring art__ring--1" />
    <div className="art__ring art__ring--2" />
    {DOTS.map((d, i) => (
      <i key={i} className="art__dot" style={{ left: d.l, top: d.t, animationDelay: d.d }} />
    ))}
    <div className="art__stage">
      <div className="tile tile--a"><Terminal /></div>
      <div className="tile tile--b"><Cpu /></div>
      <div className="tile tile--c"><RotateCw /></div>
      <div className="tile tile--d"><Database /></div>
      <div className="tile tile--main"><Icon /></div>
    </div>
  </div>
);

const VpsArt: React.FC = () => (
  <div className="art art--vps">
    <div className="art__glow" />
    <div className="art__ring art__ring--1" />
    {DOTS.map((d, i) => (
      <i key={i} className="art__dot" style={{ left: d.l, top: d.t, animationDelay: d.d }} />
    ))}
    <div className="art__stage art__stage--rack">
      <div className="rack">
        {[0, 1, 2, 3].map(n => (
          <div key={n} className="unit">
            <span className="unit__leds">
              <i style={{ animationDelay: `${-n * 0.7}s` }} />
              <i />
              <i />
            </span>
            <span className="unit__bays">
              {Array.from({ length: 7 }).map((_, b) => <i key={b} />)}
            </span>
            <span className="unit__pwr" />
          </div>
        ))}
      </div>
      <div className="chip chip--term"><Terminal /><span>root@vps:~$</span><b /></div>
      <div className="chip chip--spec"><Cpu /><span>vCPU + NVMe</span></div>
    </div>
  </div>
);

export const HeroSlider: React.FC<HeroSliderProps> = ({ prices, enabled, autoplay, startPage, onNavigate }) => {
  const [active, setActive] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const ALL: Record<HostingKind, Slide> = {
    bot: {
      id: 'bot', tabLabel: 'Bot', TabIcon: Bot, titleTop: 'Bot', titleBottom: 'Hosting',
      description: 'Deploy your bots on high-performance nodes with a 24/7 process watchdog, a secrets manager and setup support included.',
      price: prices.bot ?? 0, page: 'bot', art: <BotArt />
    },
    vps: {
      id: 'vps', tabLabel: 'VPS', TabIcon: Server, titleTop: 'VPS', titleBottom: 'Hosting',
      description: 'Dedicated vCPU cores with full root access, a free database and subdomain, plus routine backups and uptime monitoring.',
      price: prices.vps ?? 0, page: 'vps', art: <VpsArt />
    },
    website: {
      id: 'website', tabLabel: 'Website', TabIcon: Globe, titleTop: 'Website', titleBottom: 'Hosting',
      description: 'Deploy Next.js, Express, Vite or static sites from Git with a free subdomain, custom domains and HTTPS.',
      price: prices.website ?? 0, page: 'website', art: <KindArt Icon={Globe} />
    },
    nodejs: {
      id: 'nodejs', tabLabel: 'Node.js', TabIcon: Hexagon, titleTop: 'Node.js', titleBottom: 'Hosting',
      description: 'Run any API or worker on Node 20, 22 or 24 with npm, pnpm or yarn tasks, a live console and one-click Git updates.',
      price: prices.nodejs ?? 0, page: 'nodejs', art: <KindArt Icon={Hexagon} />
    },
    lavalink: {
      id: 'lavalink', tabLabel: 'Lavalink', TabIcon: Music, titleTop: 'Lavalink', titleBottom: 'Hosting',
      description: 'Low-latency Lavalink v4 audio nodes for music bots with a plugin manager, generated config and live player stats.',
      price: prices.lavalink ?? 0, page: 'lavalink', art: <KindArt Icon={Music} />
    }
  };
  const slides: Slide[] = (['bot', 'vps', 'website', 'nodejs', 'lavalink'] as HostingKind[]).filter(k => enabled.includes(k)).map(k => ALL[k]);

  const count = slides.length;
  const go = useCallback((i: number) => { if (count) setActive(((i % count) + count) % count); }, [count]);

  const paused = hoverPaused || focusPaused;

  if (!count) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 50) go(active + (dx < 0 ? 1 : -1));
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
  };

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Hosting products"
      onPointerEnter={e => { if (e.pointerType === 'mouse') setHoverPaused(true); }}
      onPointerLeave={() => setHoverPaused(false)}
      onFocusCapture={e => { if ((e.target as HTMLElement).matches(':focus-visible')) setFocusPaused(true); }}
      onBlurCapture={() => setFocusPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKeyDown}
    >
      {/* Artwork (crossfades) */}
      <div className="hero__bg" aria-hidden="true">
        {slides.map((s, i) => (
          <div key={s.id} className={`hero__art${i === active ? ' is-active' : ''}`}>
            {s.imageUrl ? (
              <img className="hero__photo" src={s.imageUrl} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
            ) : (
              <div className="hero__art-inner">{s.art}</div>
            )}
          </div>
        ))}
        <div className="hero__beams" />
        <div className="hero__shade" />
      </div>

      {/* Text (swaps with the artwork) */}
      <div className="hero__content">
        <div className="hero__stage" aria-live={paused ? 'polite' : 'off'}>
          {slides.map((s, i) => (
            <div
              key={s.id}
              className={`hero__slide${i === active ? ' is-active' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={i !== active}
            >
              <h1 className="hero__title">
                <span className="hero__title-line">{s.titleTop}</span>
                <span className={`hero__title-accent${autoplay ? ' mono-heading-shimmer' : ' hero__title-accent--plain'}`}>{s.titleBottom}</span>
              </h1>
              <p className="hero__desc">{s.description}</p>
              <div className="hero__price">
                <small>Starts at</small>
                <strong>${s.price.toFixed(2)}<span>/mo</span></strong>
              </div>
              <div className="hero__cta">
                <button type="button" className="hero__btn hero__btn--primary" tabIndex={i === active ? 0 : -1} onClick={() => onNavigate(startPage)}>
                  Start for Free
                </button>
                <button type="button" className="hero__btn hero__btn--ghost" tabIndex={i === active ? 0 : -1} onClick={() => onNavigate('pricing')}>
                  View Plans <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar + progress line */}
      <nav className="hero__nav" aria-label="Choose a hosting product">
        <div className="hero__nav-inner">
          {slides.map((s, i) => {
            const isActive = i === active;
            return (
              <button
                key={s.id}
                type="button"
                className="hero__tab"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => go(i)}
              >
                <s.TabIcon aria-hidden="true" />
                <span>{s.tabLabel}</span>
                <span className="hero__bar" aria-hidden="true">
                  {isActive && (
                    <span
                      className={`hero__bar-fill${autoplay ? '' : ' is-static'}`}
                      style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                      onAnimationEnd={() => go(active + 1)}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </section>
  );
};
