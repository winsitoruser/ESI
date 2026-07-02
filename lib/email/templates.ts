/**
 * Email Templates untuk Tenant Lifecycle
 */

export interface WelcomeEmailData {
  ownerName: string;
  ownerEmail: string;
  tempPassword: string;
  tenantName: string;
  businessType: string;
  loginUrl: string;
}

export function generateWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const subject = `Selamat Datang di Bedagang ERP - Akun Anda Sudah Siap!`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .credentials { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Selamat Datang di Bedagang ERP!</h1>
    </div>
    <div class="content">
      <p>Halo <strong>${data.ownerName}</strong>,</p>
      
      <p>Akun Bedagang ERP Anda telah berhasil dibuat! Kami sangat senang Anda bergabung dengan kami.</p>
      
      <div class="credentials">
        <h3>📋 Informasi Akun Anda</h3>
        <p><strong>Nama Bisnis:</strong> ${data.tenantName}</p>
        <p><strong>Tipe Bisnis:</strong> ${data.businessType}</p>
        <p><strong>Email Login:</strong> ${data.ownerEmail}</p>
        <p><strong>Password Sementara:</strong> <code style="background: #f3f4f6; padding: 5px 10px; border-radius: 3px; font-size: 16px;">${data.tempPassword}</code></p>
      </div>
      
      <div class="warning">
        <strong>⚠️ Penting:</strong> Segera ubah password Anda setelah login pertama kali untuk keamanan akun Anda.
      </div>
      
      <div style="text-align: center;">
        <a href="${data.loginUrl}" class="button">Login Sekarang</a>
      </div>
      
      <h3>🚀 Langkah Selanjutnya:</h3>
      <ol>
        <li>Login menggunakan kredensial di atas</li>
        <li>Ikuti wizard setup untuk mengkonfigurasi sistem</li>
        <li>Tambahkan produk dan pengguna</li>
        <li>Mulai gunakan sistem untuk bisnis Anda</li>
      </ol>
      
      <h3>💡 Butuh Bantuan?</h3>
      <p>Tim support kami siap membantu Anda:</p>
      <ul>
        <li>📧 Email: support@bedagang.com</li>
        <li>📱 WhatsApp: +62 812-3456-7890</li>
        <li>📚 Dokumentasi: https://docs.bedagang.com</li>
      </ul>
    </div>
    <div class="footer">
      <p>Email ini dikirim secara otomatis. Mohon tidak membalas email ini.</p>
      <p>&copy; 2026 Bedagang ERP. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Selamat Datang di Bedagang ERP!

Halo ${data.ownerName},

Akun Bedagang ERP Anda telah berhasil dibuat!

INFORMASI AKUN:
- Nama Bisnis: ${data.tenantName}
- Tipe Bisnis: ${data.businessType}
- Email Login: ${data.ownerEmail}
- Password Sementara: ${data.tempPassword}

PENTING: Segera ubah password Anda setelah login pertama kali.

Login di: ${data.loginUrl}

LANGKAH SELANJUTNYA:
1. Login menggunakan kredensial di atas
2. Ikuti wizard setup untuk mengkonfigurasi sistem
3. Tambahkan produk dan pengguna
4. Mulai gunakan sistem untuk bisnis Anda

BUTUH BANTUAN?
- Email: support@bedagang.com
- WhatsApp: +62 812-3456-7890
- Dokumentasi: https://docs.bedagang.com

---
Email ini dikirim secara otomatis. Mohon tidak membalas email ini.
© 2026 Bedagang ERP. All rights reserved.
  `;

  return { subject, html, text };
}

export interface OnboardingReminderData {
  ownerName: string;
  tenantName: string;
  currentStep: number;
  totalSteps: number;
  continueUrl: string;
}

export function generateOnboardingReminder(data: OnboardingReminderData): { subject: string; html: string; text: string } {
  const subject = `Lanjutkan Setup Bedagang ERP Anda`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .progress { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Setup Belum Selesai</h2>
    </div>
    <div class="content">
      <p>Halo <strong>${data.ownerName}</strong>,</p>
      
      <p>Kami melihat Anda belum menyelesaikan setup untuk <strong>${data.tenantName}</strong>.</p>
      
      <div class="progress">
        <h3>Progress Setup Anda:</h3>
        <p>Langkah ${data.currentStep} dari ${data.totalSteps}</p>
        <div style="background: #e5e7eb; height: 10px; border-radius: 5px; overflow: hidden;">
          <div style="background: #667eea; height: 100%; width: ${(data.currentStep / data.totalSteps) * 100}%;"></div>
        </div>
      </div>
      
      <p>Selesaikan setup untuk mulai menggunakan semua fitur Bedagang ERP!</p>
      
      <div style="text-align: center;">
        <a href="${data.continueUrl}" class="button">Lanjutkan Setup</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Setup Belum Selesai

Halo ${data.ownerName},

Kami melihat Anda belum menyelesaikan setup untuk ${data.tenantName}.

Progress: Langkah ${data.currentStep} dari ${data.totalSteps}

Lanjutkan setup di: ${data.continueUrl}

Selesaikan setup untuk mulai menggunakan semua fitur Bedagang ERP!
  `;

  return { subject, html, text };
}
