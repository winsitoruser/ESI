import React from 'react';
import { Mail, Phone, MapPin, Linkedin, Instagram, Github, Youtube } from 'lucide-react';
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
      <h3 className={`text-xs font-bold uppercase tracking-[0.18em] mb-5 ${light ? 'text-slate-700' : 'text-white'}`}>{title}</h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm transition-colors ${light ? 'text-slate-500 hover:text-blue-700' : 'text-violet-300/50 hover:text-violet-200'}`}
            >
              {link.label}
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
    <footer className={`relative z-10 border-t ${light ? 'border-slate-200 bg-white' : 'border-white/[0.06] bg-[#050508]'}`}>
      <div className="max-w-7xl mx-auto px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-5">
            <a
              href={NAINCODE.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block group"
            >
              <img
                src={NAINCODE.logoTextPath}
                alt={NAINCODE.name}
                className="h-9 w-auto"
                width={228}
                height={90}
              />
            </a>

            <p className={`mt-5 mb-6 text-sm leading-relaxed max-w-md ${light ? 'text-slate-500' : 'text-violet-200/60'}`}>
              {NAINCODE.footerTagline}
            </p>

            <ul className="space-y-3.5">
              <li>
                <a
                  href={`mailto:${NAINCODE.email}`}
                  className={`inline-flex items-start gap-3 text-sm transition-colors ${light ? 'text-slate-500 hover:text-blue-700' : 'text-violet-300/50 hover:text-violet-200'}`}
                >
                  <Mail className={`w-4 h-4 mt-0.5 shrink-0 ${light ? 'text-blue-500' : 'text-violet-400/60'}`} />
                  {NAINCODE.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${NAINCODE.phone.replace(/\s/g, '')}`}
                  className={`inline-flex items-start gap-3 text-sm transition-colors ${light ? 'text-slate-500 hover:text-blue-700' : 'text-violet-300/50 hover:text-violet-200'}`}
                >
                  <Phone className={`w-4 h-4 mt-0.5 shrink-0 ${light ? 'text-blue-500' : 'text-violet-400/60'}`} />
                  {NAINCODE.phone}
                </a>
              </li>
              <li className={`inline-flex items-start gap-3 text-sm leading-relaxed ${light ? 'text-slate-500' : 'text-violet-300/50'}`}>
                <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${light ? 'text-blue-500' : 'text-violet-400/60'}`} />
                <span>{NAINCODE.address}</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <FooterColumn title="Services" links={NAINCODE.footerLinks.services} light={light} />
          </div>

          <div className="lg:col-span-2">
            <FooterColumn title="Industries" links={NAINCODE.footerLinks.industries} light={light} />
          </div>

          <div className="lg:col-span-3">
            <FooterColumn title="Company" links={NAINCODE.footerLinks.company} light={light} />

            <div className="flex items-center gap-2.5 mt-8">
              {SOCIAL_ICONS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                    light
                      ? 'border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                      : 'border-white/[0.08] bg-white/[0.03] text-violet-300/50 hover:text-violet-100 hover:border-violet-400/25 hover:bg-violet-500/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className={`mt-14 pt-6 border-t ${light ? 'border-slate-200' : 'border-white/[0.06]'}`}>
          <p className={`text-xs ${light ? 'text-slate-400' : 'text-violet-400/40'}`}>
            © {new Date().getFullYear()} {NAINCODE.legalName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
