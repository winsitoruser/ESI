import React from 'react';
import { Mail, Phone, MapPin, Linkedin, Instagram, Github, Youtube, ArrowUpRight } from 'lucide-react';
import { HUMANIFY_MARKETING, NAINCODE } from '@/lib/humanify/branding';

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
      <h3 className={`mb-6 text-sm font-semibold ${light ? 'text-slate-900' : 'text-white'}`}>{title}</h3>
      <ul className="space-y-4">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group inline-flex items-center gap-1.5 text-sm transition-all duration-300 ${
                light
                  ? 'text-slate-500 hover:text-[#592277]'
                  : 'text-white/70 hover:translate-x-1 hover:text-white'
              }`}
            >
              {link.label}
              {!link.href.startsWith('/') && !link.href.startsWith('#') && (
                <ArrowUpRight className="h-3 w-3 -translate-y-1 translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Naincode corporate footer.
 * - light: white surface
 * - dark | brand: landing purple footer (#501f6b) — matches Humanify welcome
 */
export function NaincodeFooter({
  variant = 'brand',
}: {
  variant?: 'dark' | 'light' | 'brand';
}) {
  const light = variant === 'light';
  const brandBg = HUMANIFY_MARKETING.footerBg;

  return (
    <footer
      className={`relative z-10 overflow-hidden ${light ? 'bg-white' : ''}`}
      style={light ? undefined : { background: brandBg }}
    >
      <div
        className={`absolute inset-x-0 top-0 h-px ${
          light
            ? 'bg-gradient-to-r from-transparent via-slate-200 to-transparent'
            : 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
        }`}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="pr-0 md:col-span-2 lg:col-span-5 lg:pr-12">
            <a
              href={NAINCODE.website}
              target="_blank"
              rel="noopener noreferrer"
              className="group mb-8 inline-block"
            >
              <img
                src={NAINCODE.logoTextPath}
                alt={NAINCODE.name}
                className={`h-12 w-auto transition-transform group-hover:scale-105 ${light ? '' : 'brightness-0 invert'}`}
                width={228}
                height={90}
              />
            </a>

            <p className={`mb-8 max-w-md text-sm leading-relaxed ${light ? 'text-slate-600' : 'text-white/70'}`}>
              {NAINCODE.footerTagline}
            </p>

            <ul className="space-y-4">
              <li>
                <a
                  href={`mailto:${NAINCODE.email}`}
                  className={`group inline-flex items-center gap-4 text-sm transition-colors ${
                    light ? 'text-slate-600 hover:text-[#592277]' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      light
                        ? 'bg-[#f6e6ff] text-[#592277] group-hover:bg-[#e6deeb]'
                        : 'bg-white/10 text-white group-hover:bg-white/15'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                  </div>
                  {NAINCODE.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${NAINCODE.phone.replace(/\s/g, '')}`}
                  className={`group inline-flex items-center gap-4 text-sm transition-colors ${
                    light ? 'text-slate-600 hover:text-[#592277]' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      light
                        ? 'bg-[#f6e6ff] text-[#592277] group-hover:bg-[#e6deeb]'
                        : 'bg-white/10 text-white group-hover:bg-white/15'
                    }`}
                  >
                    <Phone className="h-4 w-4" />
                  </div>
                  {NAINCODE.phone}
                </a>
              </li>
              <li
                className={`inline-flex items-center gap-4 text-sm leading-relaxed ${
                  light ? 'text-slate-600' : 'text-white/70'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    light ? 'bg-slate-50 text-slate-500' : 'bg-white/10 text-white'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                </div>
                <span>{NAINCODE.address}</span>
              </li>
            </ul>
          </div>

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

        <div
          className={`mt-20 flex flex-col items-center justify-between gap-6 border-t pt-8 md:flex-row ${
            light ? 'border-slate-200' : 'border-white/15'
          }`}
        >
          <div className="flex items-center gap-3">
            {SOCIAL_ICONS.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 hover:-translate-y-1 ${
                  light
                    ? 'border-slate-200 bg-white text-slate-500 shadow-sm hover:border-[#eee9f1] hover:bg-[#f6e6ff] hover:text-[#592277]'
                    : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>

          <div
            className={`flex flex-col items-center gap-2 text-sm md:flex-row md:gap-6 ${
              light ? 'text-slate-500' : 'text-white/60'
            }`}
          >
            <p>
              © {new Date().getFullYear()} {NAINCODE.legalName}. All rights reserved.
            </p>
            <div className={`hidden h-1 w-1 rounded-full md:block ${light ? 'bg-slate-300' : 'bg-white/30'}`} />
            <p className="flex items-center gap-1">
              Made with <span className="text-rose-400">♥</span> in Indonesia
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
