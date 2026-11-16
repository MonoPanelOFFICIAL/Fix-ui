import React from 'react';
import { Github, Twitter } from 'lucide-react';
import { MonoLogo } from './MonoLogo';
import { DiscordGlyph } from './DiscordGlyph';
import { useBranding } from '../lib/BrandingContext';
import { HOSTING_KINDS } from '../hostingKinds';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { socialLinks, discordUrl, footerDescription, brandName, supportEmail, enabledHostings } = useBranding();
  const joinUrl = socialLinks.discord || discordUrl;
  const name = brandName || 'MonoPanel';

  const linkCls = 'text-xs text-zinc-400 hover:text-white transition-colors text-left';
  const headCls = 'mb-4 text-xs font-semibold text-white';
  const socialCls = 'h-8 w-8 rounded-full border border-white/15 bg-white/5 text-zinc-300 flex items-center justify-center hover:bg-white hover:text-zinc-950 transition-colors';

  return (
    <footer className="border-t border-white/10 bg-black text-zinc-400">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-12 pb-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 max-w-xs space-y-4">
            <MonoLogo onClick={() => onNavigate('home')} height={30} />
            <p className="text-xs leading-relaxed text-zinc-400">{footerDescription}</p>
            <div className="flex items-center gap-2">
              {socialLinks.discord && (
                <a id="footer_social_discord" href={socialLinks.discord} target="_blank" rel="noreferrer noopener" className={socialCls} aria-label="Discord">
                  <DiscordGlyph className="h-4 w-4" />
                </a>
              )}
              {socialLinks.twitter && (
                <a id="footer_social_twitter" href={socialLinks.twitter} target="_blank" rel="noreferrer noopener" className={socialCls} aria-label="X / Twitter">
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {socialLinks.github && (
                <a id="footer_social_github" href={socialLinks.github} target="_blank" rel="noreferrer noopener" className={socialCls} aria-label="GitHub">
                  <Github className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className={headCls}>Services</h4>
            <ul className="space-y-3">
              {HOSTING_KINDS.filter(k => enabledHostings.includes(k.id)).map(k => (
                <li key={k.id}><button onClick={() => onNavigate(k.publicPage)} className={linkCls}>{k.label}</button></li>
              ))}
              <li><button onClick={() => onNavigate('pricing')} className={linkCls}>Plans &amp; Pricing</button></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className={headCls}>Company</h4>
            <ul className="space-y-3">
              <li><button onClick={() => onNavigate('docs')} className={linkCls}>Documentation</button></li>
              <li><button onClick={() => onNavigate('status')} className={linkCls}>Status</button></li>
              <li><button onClick={() => onNavigate('support')} className={linkCls}>Support</button></li>
              {supportEmail && (
                <li><a href={`mailto:${supportEmail}`} className={`${linkCls} break-all`}>Contact</a></li>
              )}
              {joinUrl && (
                <li><a href={joinUrl} target="_blank" rel="noreferrer noopener" id="footer_join_discord" className={linkCls}>Community</a></li>
              )}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h4 className={headCls}>Tools</h4>
            <ul className="space-y-3">
              <li><button onClick={() => onNavigate('servers')} className={linkCls}>Client Area</button></li>
              <li><button onClick={() => onNavigate('billing')} className={linkCls}>Billing</button></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className={headCls}>Legal</h4>
            <ul className="space-y-3">
              <li><button onClick={() => onNavigate('terms')} className={linkCls}>Terms of Service</button></li>
              <li><button onClick={() => onNavigate('privacy')} className={linkCls}>Privacy Policy</button></li>
              <li><button onClick={() => onNavigate('acceptable-use')} className={linkCls}>Acceptable Use</button></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-[11px] text-zinc-500">
          © 2025–2026 {name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
