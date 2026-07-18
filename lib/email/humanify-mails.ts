/**
 * Humanify transactional email bodies — all wrapped with branded layout + logo.
 */
import {
  emailCallout,
  emailInfoCard,
  escapeHtml,
  wrapHumanifyEmail,
} from './layout';

export function humanifyInviteEmail(opts: {
  inviteUrl: string;
  resend?: boolean;
}): { subject: string; html: string; text: string } {
  const subject = opts.resend
    ? 'Undangan Humanify (dikirim ulang)'
    : 'Undangan bergabung di Humanify';
  const bodyHtml = `
    <p style="margin:0 0 12px;">Anda diundang bergabung ke tim di <strong>Humanify</strong> — platform HRIS untuk mengelola orang &amp; pertumbuhan.</p>
    ${emailCallout('<strong>Berlaku 7 hari.</strong> Setelah menerima undangan, Anda dapat membuat password dan mulai bekerja.', 'info')}
    <p style="margin:0;font-size:13px;color:#6b7280;">Jika tombol tidak berfungsi, salin tautan ini ke browser:<br/>
      <a href="${escapeHtml(opts.inviteUrl)}" style="color:#7c3aed;word-break:break-all;">${escapeHtml(opts.inviteUrl)}</a>
    </p>`;
  const html = wrapHumanifyEmail({
    preheader: 'Terima undangan dan buat akun Humanify Anda',
    eyebrow: 'Undangan tim',
    title: opts.resend ? 'Undangan dikirim ulang' : 'Anda diundang ke Humanify',
    bodyHtml,
    cta: { label: 'Terima undangan', href: opts.inviteUrl },
    footerNote: 'Abaikan email ini jika Anda tidak mengenal pengirim undangan.',
  });
  const text = `${subject}\n\nTerima undangan: ${opts.inviteUrl}\nBerlaku 7 hari.`;
  return { subject, html, text };
}

export function humanifyVerifyEmail(opts: {
  verifyUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = 'Verifikasi email Humanify';
  const bodyHtml = `
    <p style="margin:0 0 12px;">Selamat datang di <strong>Humanify</strong>. Satu langkah lagi untuk mengaktifkan akun Anda.</p>
    ${emailCallout('Link verifikasi berlaku <strong>48 jam</strong>.', 'info')}
    <p style="margin:0;font-size:13px;color:#6b7280;">Atau buka:<br/>
      <a href="${escapeHtml(opts.verifyUrl)}" style="color:#7c3aed;word-break:break-all;">${escapeHtml(opts.verifyUrl)}</a>
    </p>`;
  const html = wrapHumanifyEmail({
    preheader: 'Verifikasi email untuk mengaktifkan akun Humanify',
    eyebrow: 'Keamanan akun',
    title: 'Verifikasi alamat email Anda',
    bodyHtml,
    cta: { label: 'Verifikasi email', href: opts.verifyUrl },
  });
  const text = `${subject}\n\n${opts.verifyUrl}\nBerlaku 48 jam.`;
  return { subject, html, text };
}

export function humanifyResetPasswordEmail(opts: {
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = 'Reset password Humanify';
  const bodyHtml = `
    <p style="margin:0 0 12px;">Kami menerima permintaan reset password untuk akun Humanify Anda.</p>
    ${emailCallout('<strong>Link berlaku 1 jam.</strong> Abaikan email ini jika Anda tidak meminta reset — password tidak akan berubah.', 'warn')}
    <p style="margin:0;font-size:13px;color:#6b7280;">Atau buka:<br/>
      <a href="${escapeHtml(opts.resetUrl)}" style="color:#7c3aed;word-break:break-all;">${escapeHtml(opts.resetUrl)}</a>
    </p>`;
  const html = wrapHumanifyEmail({
    preheader: 'Buat password baru untuk akun Humanify',
    eyebrow: 'Keamanan',
    title: 'Reset password',
    bodyHtml,
    cta: { label: 'Buat password baru', href: opts.resetUrl },
  });
  const text = `${subject}\n\n${opts.resetUrl}\nBerlaku 1 jam. Abaikan jika bukan Anda.`;
  return { subject, html, text };
}

export function humanifyObsAlertEmail(opts: {
  message: string;
  uiUrl: string;
  errors: number;
  windowMin: number;
}): { subject: string; html: string; text: string } {
  const subject = `[Humanify] Alert: ${opts.errors} errors / ${opts.windowMin}m`;
  const bodyHtml = `
    <p style="margin:0 0 12px;">Terdeteksi lonjakan error pada monitoring internal.</p>
    ${emailInfoCard(`
      <p style="margin:0 0 6px;"><strong>Detail</strong></p>
      <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;">${escapeHtml(opts.message)}</p>
    `)}
    <p style="margin:0;font-size:13px;color:#6b7280;">Periksa ring buffer &amp; event di dashboard observability.</p>`;
  const html = wrapHumanifyEmail({
    preheader: opts.message,
    eyebrow: 'Observability',
    title: 'Alert error spike',
    bodyHtml,
    cta: { label: 'Buka Observability', href: opts.uiUrl },
  });
  const text = `${subject}\n\n${opts.message}\n${opts.uiUrl}`;
  return { subject, html, text };
}

export function humanifyDigestEmail(opts: {
  tenantName: string;
  critical: number;
  warning: number;
  itemsHtml: string;
  billingUrl: string;
  goLiveUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Humanify — ${opts.critical} kritikal, ${opts.warning} peringatan untuk ${opts.tenantName}`;
  const bodyHtml = `
    <p style="margin:0 0 12px;">Halo,</p>
    <p style="margin:0 0 12px;">Ada beberapa hal yang perlu perhatian pada akun <strong>${escapeHtml(opts.tenantName)}</strong>:</p>
    <ul style="margin:0 0 16px;padding-left:18px;line-height:1.7;">${opts.itemsHtml}</ul>
    <p style="margin:0;font-size:13px;color:#6b7280;">Kelola di Billing atau lengkapi Go-live checklist.</p>`;
  const html = wrapHumanifyEmail({
    preheader: subject,
    eyebrow: 'Ringkasan akun',
    title: 'Peringatan yang perlu ditindaklanjuti',
    bodyHtml,
    cta: { label: 'Buka Billing', href: opts.billingUrl },
    secondaryHref: opts.goLiveUrl,
    secondaryLabel: 'Go-live checklist',
  });
  const text = `${subject}\n\nLihat: ${opts.billingUrl}`;
  return { subject, html, text };
}

export function humanifyWelcomeEmail(data: {
  ownerName: string;
  ownerEmail: string;
  tempPassword: string;
  tenantName: string;
  businessType: string;
  loginUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = 'Selamat datang di Humanify — akun Anda siap';
  const bodyHtml = `
    <p style="margin:0 0 12px;">Halo <strong>${escapeHtml(data.ownerName)}</strong>,</p>
    <p style="margin:0 0 12px;">Akun Humanify untuk <strong>${escapeHtml(data.tenantName)}</strong> sudah dibuat. Silakan masuk dan selesaikan setup.</p>
    ${emailInfoCard(`
      <p style="margin:0 0 8px;"><strong>Informasi akun</strong></p>
      <p style="margin:0 0 4px;">Bisnis: ${escapeHtml(data.tenantName)}</p>
      <p style="margin:0 0 4px;">Tipe: ${escapeHtml(data.businessType)}</p>
      <p style="margin:0 0 4px;">Email: ${escapeHtml(data.ownerEmail)}</p>
      <p style="margin:8px 0 0;">Password sementara:<br/>
        <code style="display:inline-block;margin-top:6px;padding:8px 12px;background:#0a0812;color:#f5f3ff;border-radius:8px;font-size:15px;letter-spacing:0.04em;">${escapeHtml(data.tempPassword)}</code>
      </p>
    `)}
    ${emailCallout('<strong>Penting:</strong> Ganti password segera setelah login pertama.', 'warn')}
    <p style="margin:0;font-size:14px;">Langkah berikutnya: login → wizard setup → undang tim → mulai absensi &amp; payroll.</p>`;
  const html = wrapHumanifyEmail({
    preheader: 'Akun Humanify siap — login dan mulai setup',
    eyebrow: 'Welcome',
    title: 'Selamat datang di Humanify',
    bodyHtml,
    cta: { label: 'Login sekarang', href: data.loginUrl },
    footerNote: 'Butuh bantuan? hubungi hello@naincode.com',
  });
  const text = `${subject}\n\nEmail: ${data.ownerEmail}\nPassword: ${data.tempPassword}\nLogin: ${data.loginUrl}`;
  return { subject, html, text };
}

export function humanifyOnboardingReminderEmail(data: {
  ownerName: string;
  tenantName: string;
  currentStep: number;
  totalSteps: number;
  continueUrl: string;
}): { subject: string; html: string; text: string } {
  const pct = Math.min(100, Math.round((data.currentStep / Math.max(1, data.totalSteps)) * 100));
  const subject = 'Lanjutkan setup Humanify Anda';
  const bodyHtml = `
    <p style="margin:0 0 12px;">Halo <strong>${escapeHtml(data.ownerName)}</strong>,</p>
    <p style="margin:0 0 12px;">Setup untuk <strong>${escapeHtml(data.tenantName)}</strong> belum selesai.</p>
    ${emailInfoCard(`
      <p style="margin:0 0 8px;"><strong>Progress:</strong> langkah ${data.currentStep} dari ${data.totalSteps}</p>
      <div style="background:#e5e7eb;height:10px;border-radius:999px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#7c3aed,#c026d3);height:10px;width:${pct}%;"></div>
      </div>
    `)}
    <p style="margin:0;">Selesaikan setup untuk membuka fitur absensi, payroll, dan portal karyawan.</p>`;
  const html = wrapHumanifyEmail({
    preheader: `Setup ${pct}% — lanjutkan sekarang`,
    eyebrow: 'Onboarding',
    title: 'Setup belum selesai',
    bodyHtml,
    cta: { label: 'Lanjutkan setup', href: data.continueUrl },
  });
  const text = `${subject}\n\nLangkah ${data.currentStep}/${data.totalSteps}\n${data.continueUrl}`;
  return { subject, html, text };
}
