import React from 'react';
import { Mail, Phone, MapPin, Linkedin, Instagram, Github, Youtube, ArrowUpRight } from 'lucide-react';
import { NAINCODE } from '@/lib/humanify/branding';

const SOCIAL_ICONS = [
  { href: NAINCODE.social.linkedin, label: 'LinkedIn', Icon: Linkedin },
  { href: NAINCODE.social.instagram, label: 'Instagram', Icon: Instagram },
  { href: NAINCODE.social.github, label: 'GitHub', Icon: Github },
  { href: NAINCODE.social.youtube, label: 'YouTube', Icon: Youtube },
] as const;

function FooterColumn({
  title,
  links,
  light,
}: {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
  light?: boolean;
}) {
  return (
    <div>
      <h3 className={`text-sm font-semibold mb-6 ${light ? 'text-slate-900' : 'text-white'}`}>{title}</h3>
      <ul className="space-y-4">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group inline-flex items-center gap-1.5 text-sm transition-all duration-300 ${
                light 
                  ? 'text-slate-500 hover:text-violet-600' 
                  : 'text-violet-200/60 hover:text-white hover:translate-x-1'
              }`}
            >
              {link.label}
              {!link.href.startsWith('/') && !link.href.startsWith('#') && (
                <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NaincodeFooter({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const light = variant === 'light';

  return (
    <footer className={`relative overflow-hidden z-10 ${light ? 'bg-white' : 'bg-[#05040a]'}`}>
      {/* Decorative Top Border */}
      <div className={`absolute top-0 inset-x-0 h-px ${light ? 'bg-gradient-to-r from-transparent via-slate-200 to-transparent' : 'bg-gradient-to-r from-transparent via-violet-500/20 to-transparent'}`} />
      
      {/* Ambient background glow (only on dark mode) */}
      {!light && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-fuchsia-600/5 rounded-full blur-[150px]" />
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* Brand Column */}
          <div className="md:col-span-2 lg:col-span-5 pr-0 lg:pr-12">
            <a
              href={NAINCODE.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block group mb-8"
            >
              <img
                src={NAINCODE.logoTextPath}
                alt={NAINCODE.name}
                className="h-12 w-auto transition-transform group-hover:scale-105"
                width={228}
                height={90}
              />
            </a>

            <p className={`mb-8 text-sm leading-relaxed max-w-md ${light ? 'text-slate-600' : 'text-violet-200/60'}`}>
              {NAINCODE.footerTagline}
            </p>

            <ul className="space-y-4">
              <li>
                <a
                  href={`mailto:${NAINCODE.email}`}
                  className={`group inline-flex items-center gap-4 text-sm transition-colors ${light ? 'text-slate-600 hover:text-violet-600' : 'text-violet-300/60 hover:text-violet-200'}`}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${light ? 'bg-violet-50 text-violet-600 group-hover:bg-violet-100' : 'bg-white/5 text-violet-400 group-hover:bg-white/10'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  {NAINCODE.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${NAINCODE.phone.replace(/\s/g, '')}`}
                  className={`group inline-flex items-center gap-4 text-sm transition-colors ${light ? 'text-slate-600 hover:text-violet-600' : 'text-violet-300/60 hover:text-violet-200'}`}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${light ? 'bg-violet-50 text-violet-600 group-hover:bg-violet-100' : 'bg-white/5 text-violet-400 group-hover:bg-white/10'}`}>
                    <Phone className="w-4 h-4" />
                  </div>
                  {NAINCODE.phone}
                </a>
              </li>
              <li className={`inline-flex items-center gap-4 text-sm leading-relaxed ${light ? 'text-slate-600' : 'text-violet-300/60'}`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${light ? 'bg-slate-50 text-slate-500' : 'bg-white/5 text-violet-400'}`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <span>{NAINCODE.address}</span>
              </li>
            </ul>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-2 lg:col-start-7">
            <FooterColumn title="Services" links={NAINCODE.footerLinks.services} light={light} />
          </div>

          <div className="lg:col-span-2">
            <FooterColumn title="Industries" links={NAINCODE.footerLinks.industries} light={light} />
          </div>

          <div className="lg:col-span-2">
            <FooterColumn title="Company" links={NAINCODE.footerLinks.company} light={light} />
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className={`mt-20 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t ${light ? 'border-slate-200' : 'border-white/[0.06]'}`}>
          <div className="flex items-center gap-3">
            {SOCIAL_ICONS.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 hover:-translate-y-1 ${
                  light
                    ? 'border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 shadow-sm'
                    : 'border-white/[0.08] bg-white/[0.02] text-violet-300/50 hover:text-white hover:border-violet-500/30 hover:bg-violet-500/20 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
          
          <div className={`flex flex-col md:flex-row items-center gap-2 md:gap-6 text-sm ${light ? 'text-slate-500' : 'text-violet-400/50'}`}>
            <p>
              © {new Date().getFullYear()} {NAINCODE.legalName}. All rights reserved.
            </p>
            <div className={`hidden md:block w-1 h-1 rounded-full ${light ? 'bg-slate-300' : 'bg-white/20'}`} />
            <p className="flex items-center gap-1">
              Made with <span className="text-rose-500">❤️</span> in Indonesia
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
