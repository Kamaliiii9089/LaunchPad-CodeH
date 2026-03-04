import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: options.from ?? `"BreachBuddy" <${process.env.SMTP_USER}>`,
    ...options,
  });
}

// ── Convenience helpers ──────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendMail({
    to,
    subject: 'Welcome to BreachBuddy!',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1d4ed8">Welcome to BreachBuddy, ${name}!</h2>
        <p>Your account has been created successfully. You can now log in and start monitoring your security posture.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/login"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          Go to Dashboard
        </a>
        <p style="margin-top:32px;color:#6b7280;font-size:12px">
          If you did not create this account, please ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendMail({
    to,
    subject: 'Reset your BreachBuddy password',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1d4ed8">Password Reset Request</h2>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#dc2626;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="margin-top:16px;color:#6b7280;font-size:12px">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function send2FACodeEmail(to: string, code: string): Promise<void> {
  await sendMail({
    to,
    subject: `Your BreachBuddy verification code: ${code}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1d4ed8">Your Verification Code</h2>
        <p>Use the code below to complete your sign-in. It expires in 10 minutes.</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;margin:24px 0;color:#111827">
          ${code}
        </div>
        <p style="color:#6b7280;font-size:12px">
          Never share this code with anyone. BreachBuddy will never ask for it.
        </p>
      </div>
    `,
  });
}
