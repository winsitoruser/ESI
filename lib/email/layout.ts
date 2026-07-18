/**
 * Humanify branded HTML email shell (table-based for client compatibility).
 * Logo: absolute URL so Gmail/Outlook can load the image.
 */

import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';

const DEFAULT_BASE = 'https://humanify.id';

export function emailPublicBase(): string {
  return (
    process.env.EMAIL_ASSET_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_BASE
  ).replace(/\/$/, '');
}

/** Wordmark on dark header */
export function humanifyEmailLogoUrl(): string {
  return `${emailPublicBase()}${HUMANIFY_BRAND.welcomeLogoPath}`;
}

export function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type WrapEmailOpts = {
  /** Preheader text (inbox preview) */
  preheader?: string;
  /** Optional eyebrow above title */
  eyebrow?: string;
  title: string;
  /** Inner HTML (already safe / trusted) */
  bodyHtml: string;
  /** Primary CTA */
  cta?: { label: string; href: string };
  /** Secondary link under CTA */
  secondaryHref?: string;
  secondaryLabel?: string;
  footerNote?: string;
};

/** Solid CTA button — email-safe */
export function emailCtaButton(label: string, href: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto;">
  <tr>
    <td align="center" bgcolor="#7c3aed" style="border-radius:12px;background:linear-gradient(135deg,#7c3aed 0%,#c026d3 100%);">
      <a href="${safeHref}" target="_blank"
         style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">
        ${safeLabel}
      </a>
    </td>
  </tr>
</table>`;
}

export function emailInfoCard(html: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:20px 0;background:#f8f7fc;border:1px solid #e9e4f5;border-radius:12px;">
  <tr>
    <td style="padding:18px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e1b2e;">
      ${html}
    </td>
  </tr>
</table>`;
}

export function emailCallout(html: string, tone: 'warn' | 'info' | 'ok' = 'info'): string {
  const border =
    tone === 'warn' ? '#f59e0b' : tone === 'ok' ? '#10b981' : '#7c3aed';
  const bg =
    tone === 'warn' ? '#fffbeb' : tone === 'ok' ? '#ecfdf5' : '#f5f3ff';
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:16px 0;background:${bg};border-left:4px solid ${border};border-radius:8px;">
  <tr>
    <td style="padding:14px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#374151;">
      ${html}
    </td>
  </tr>
</table>`;
}

/**
 * Full branded document. Prefer inline styles; avoid flex/grid.
 */
export function wrapHumanifyEmail(opts: WrapEmailOpts): string {
  const base = emailPublicBase();
  const logo = humanifyEmailLogoUrl();
  const year = new Date().getFullYear();
  const pre = escapeHtml(opts.preheader || opts.title);
  const title = escapeHtml(opts.title);
  const eyebrow = opts.eyebrow ? escapeHtml(opts.eyebrow) : '';
  const cta = opts.cta ? emailCtaButton(opts.cta.label, opts.cta.href) : '';
  const secondary =
    opts.secondaryHref && opts.secondaryLabel
      ? `<p style="text-align:center;margin:0 0 8px;font-size:13px;">
           <a href="${escapeHtml(opts.secondaryHref)}" style="color:#7c3aed;text-decoration:underline;">${escapeHtml(opts.secondaryLabel)}</a>
         </p>`
      : '';
  const footerNote = opts.footerNote
    ? `<p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">${escapeHtml(opts.footerNote)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${title}</title>
  <!--[if mso]><style>table,td{font-family:Arial,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#efeef5;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${pre}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efeef5;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(10,8,18,0.08);">
          <!-- Header -->
          <tr>
            <td align="center" bgcolor="#0a0812" style="background:#0a0812;padding:28px 24px 22px;">
              <a href="${escapeHtml(base)}" target="_blank" style="text-decoration:none;">
                <img src="${escapeHtml(logo)}" width="180" height="71" alt="${escapeHtml(HUMANIFY_BRAND.name)}"
                     style="display:block;width:180px;max-width:70%;height:auto;border:0;outline:none;" />
              </a>
              <p style="margin:12px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;">
                ${escapeHtml(HUMANIFY_BRAND.productType)}
              </p>
            </td>
          </tr>
          <!-- Accent bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#7c3aed,#c026d3,#22d3ee);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e1b2e;">
              ${eyebrow ? `<p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">${eyebrow}</p>` : ''}
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:#0a0812;">${title}</h1>
              <div style="font-size:15px;line-height:1.65;color:#3f3a52;">
                ${opts.bodyHtml}
              </div>
              ${cta}
              ${secondary}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:8px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <hr style="border:none;border-top:1px solid #eeeaf6;margin:8px 0 20px;" />
              ${footerNote}
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;line-height:1.5;">
                ${escapeHtml(HUMANIFY_BRAND.name)} · ${escapeHtml(HUMANIFY_BRAND.tagline)}
              </p>
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
                Produk ${escapeHtml(NAINCODE.name)} ·
                <a href="${escapeHtml(NAINCODE.website)}" style="color:#7c3aed;text-decoration:none;">${escapeHtml(NAINCODE.website.replace(/^https?:\/\//, ''))}</a>
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#c4c0d0;">
                &copy; ${year} ${escapeHtml(NAINCODE.legalName)}. Email otomatis — mohon tidak membalas.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#a1a1aa;">
          <a href="${escapeHtml(base)}/humanify/login" style="color:#7c3aed;text-decoration:none;">Login</a>
          &nbsp;·&nbsp;
          <a href="${escapeHtml(base)}/humanify/welcome" style="color:#7c3aed;text-decoration:none;">Pelajari Humanify</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
