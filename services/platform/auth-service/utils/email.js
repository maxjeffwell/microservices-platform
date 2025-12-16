import { createLogger } from '@platform/logger';

const logger = createLogger('auth-service:email');

// Email configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@example.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Auth Service';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Send email using SendGrid API
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 * @returns {Promise<boolean>}
 */
async function sendEmail({ to, subject, text, html }) {
  if (!SENDGRID_API_KEY) {
    logger.warn('SENDGRID_API_KEY not configured, skipping email send', { to, subject });
    // In development, log the email content instead
    if (process.env.NODE_ENV === 'development') {
      logger.info('Email would be sent:', { to, subject, text });
    }
    return false;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: EMAIL_FROM, name: EMAIL_FROM_NAME },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (response.ok || response.status === 202) {
      logger.info('Email sent successfully', { to, subject });
      return true;
    }

    const errorText = await response.text();
    logger.error('Failed to send email', { to, subject, status: response.status, error: errorText });
    return false;
  } catch (error) {
    logger.error('Error sending email', { error: error.message, to, subject });
    return false;
  }
}

/**
 * Send password reset email
 * @param {string} email - User's email
 * @param {string} token - Reset token
 * @returns {Promise<boolean>}
 */
export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  const subject = 'Reset Your Password';

  const text = `
You requested a password reset.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Reset Your Password</h2>
    <p>You requested a password reset for your account.</p>
    <p>Click the button below to reset your password:</p>
    <a href="${resetUrl}" class="button">Reset Password</a>
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p><strong>This link will expire in 1 hour.</strong></p>
    <div class="footer">
      <p>If you didn't request this password reset, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to: email, subject, text, html });
}

/**
 * Send email verification email
 * @param {string} email - User's email
 * @param {string} token - Verification token
 * @returns {Promise<boolean>}
 */
export async function sendEmailVerificationEmail(email, token) {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  const subject = 'Verify Your Email Address';

  const text = `
Welcome! Please verify your email address.

Click the link below to verify your email:
${verifyUrl}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verify Your Email Address</h2>
    <p>Welcome! Please verify your email address to complete your registration.</p>
    <a href="${verifyUrl}" class="button">Verify Email</a>
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p><strong>This link will expire in 24 hours.</strong></p>
    <div class="footer">
      <p>If you didn't create an account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to: email, subject, text, html });
}

/**
 * Send account locked notification email
 * @param {string} email - User's email
 * @param {number} lockoutMinutes - How long the account is locked
 * @returns {Promise<boolean>}
 */
export async function sendAccountLockedEmail(email, lockoutMinutes) {
  const subject = 'Account Temporarily Locked';

  const text = `
Your account has been temporarily locked due to multiple failed login attempts.

For security reasons, your account will be locked for ${lockoutMinutes} minutes.

If this wasn't you, please reset your password immediately.
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .warning { background-color: #FEF2F2; border: 1px solid #FCA5A5; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Account Temporarily Locked</h2>
    <div class="warning">
      <p><strong>Security Alert:</strong> Your account has been temporarily locked due to multiple failed login attempts.</p>
    </div>
    <p>For security reasons, your account will be locked for <strong>${lockoutMinutes} minutes</strong>.</p>
    <p>After this time, you can try logging in again.</p>
    <div class="footer">
      <p>If you didn't attempt to log in, we recommend resetting your password immediately.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to: email, subject, text, html });
}

export default {
  sendEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendAccountLockedEmail,
};
