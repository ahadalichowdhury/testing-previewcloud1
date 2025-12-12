import nodemailer, { Transporter } from "nodemailer";
import { logger } from "../utils/logger";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter(): void {
    // Check if SMTP is configured
    if (!process.env.SMTP_HOST) {
      logger.warn(
        "SMTP not configured. Emails will be logged instead of sent."
      );
      logger.warn(
        "Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env"
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      logger.info(
        `Email service initialized with SMTP: ${process.env.SMTP_HOST}`
      );
    } catch (error) {
      logger.error("Failed to initialize email service:", error);
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    const { to, subject, html, text } = options;

    // If no transporter, just log the email
    if (!this.transporter) {
      logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      logger.info("📧 EMAIL (SMTP not configured - would be sent):");
      logger.info(`To: ${to}`);
      logger.info(`Subject: ${subject}`);
      logger.info(`Body: ${text || html.substring(0, 200)}...`);
      logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return;
    }

    try {
      await this.transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          '"PreviewCloud" <noreply@previewcloud.cloud>',
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      logger.info(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    verificationToken: string
  ): Promise<void> {
    const verificationUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/verify-email?token=${verificationToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Welcome to PreviewCloud!</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>Thanks for signing up for PreviewCloud! We're excited to have you on board.</p>
      
      <p>To get started, please verify your email address by clicking the button below:</p>
      
      <a href="${verificationUrl}" class="button">Verify Email Address</a>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background: #fff; padding: 10px; border-radius: 5px; word-break: break-all;">${verificationUrl}</p>
      
      <p><strong>This link will expire in 24 hours.</strong></p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      
      <h3>🎯 Next Steps:</h3>
      <ol>
        <li>Verify your email</li>
        <li>Get your API token from the dashboard</li>
        <li>Add PreviewCloud to your GitHub repository</li>
        <li>Open a PR and get automatic preview environments!</li>
      </ol>
      
      <p>Need help? Check out our <a href="https://docs.previewcloud.cloud">documentation</a>.</p>
    </div>
    <div class="footer">
      <p>You're receiving this email because you signed up for PreviewCloud.</p>
      <p>PreviewCloud - Preview Environments for Every PR</p>
      <p><a href="https://previewcloud.cloud">previewcloud.cloud</a></p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Welcome to PreviewCloud!

Hi ${name},

Thanks for signing up! Please verify your email address:

${verificationUrl}

This link will expire in 24 hours.

Next Steps:
1. Verify your email
2. Get your API token from the dashboard
3. Add PreviewCloud to your GitHub repository
4. Open a PR and get automatic preview environments!

Need help? Visit https://docs.previewcloud.cloud

- The PreviewCloud Team
    `;

    await this.sendEmail({
      to: email,
      subject: "Verify your PreviewCloud account",
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ): Promise<void> {
    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/reset-password?token=${resetToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ff6b6b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .button { display: inline-block; padding: 12px 30px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔑 Password Reset Request</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>We received a request to reset your password for your PreviewCloud account.</p>
      
      <p>Click the button below to reset your password:</p>
      
      <a href="${resetUrl}" class="button">Reset Password</a>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background: #fff; padding: 10px; border-radius: 5px; word-break: break-all;">${resetUrl}</p>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong>
        <ul>
          <li>This link will expire in 1 hour</li>
          <li>If you didn't request this, please ignore this email</li>
          <li>Your password won't change unless you click the link</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>PreviewCloud - Preview Environments for Every PR</p>
      <p><a href="https://previewcloud.cloud">previewcloud.cloud</a></p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Password Reset Request

Hi ${name},

We received a request to reset your password for your PreviewCloud account.

Click this link to reset your password:
${resetUrl}

This link will expire in 1 hour.

⚠️ If you didn't request this, you can safely ignore this email.
Your password won't change unless you click the link above.

- The PreviewCloud Team
    `;

    await this.sendEmail({
      to: email,
      subject: "Reset your PreviewCloud password",
      html,
      text,
    });
  }

  /**
   * Send welcome email (after email verification)
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const dashboardUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/dashboard`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to PreviewCloud!</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>Your email is verified! You're all set to start creating preview environments.</p>
      
      <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
      
      <h3>🚀 Quick Start:</h3>
      
      <div class="feature">
        <strong>1. Get your API token</strong>
        <p>Visit your dashboard and copy your unique API token</p>
      </div>
      
      <div class="feature">
        <strong>2. Add to GitHub</strong>
        <p>Add the token as a GitHub secret: PREVIEWCLOUD_TOKEN</p>
      </div>
      
      <div class="feature">
        <strong>3. Create preview.yaml</strong>
        <p>Define your services and database configuration</p>
      </div>
      
      <div class="feature">
        <strong>4. Add GitHub Action</strong>
        <p>Install our GitHub Action workflow</p>
      </div>
      
      <div class="feature">
        <strong>5. Open a PR</strong>
        <p>Get automatic preview URLs in 2-3 minutes!</p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      
      <p><strong>📚 Resources:</strong></p>
      <ul>
        <li><a href="https://docs.previewcloud.cloud/quickstart">Quick Start Guide</a></li>
        <li><a href="https://docs.previewcloud.cloud/config">Configuration Reference</a></li>
        <li><a href="https://docs.previewcloud.cloud/examples">Example Projects</a></li>
      </ul>
      
      <p>Questions? Reply to this email or visit our <a href="https://previewcloud.cloud/support">support center</a>.</p>
    </div>
    <div class="footer">
      <p>Happy previewing! 🚀</p>
      <p>PreviewCloud - Preview Environments for Every PR</p>
      <p><a href="https://previewcloud.cloud">previewcloud.cloud</a></p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Welcome to PreviewCloud!

Hi ${name},

Your email is verified! You're all set to start creating preview environments.

Quick Start:
1. Get your API token from the dashboard
2. Add it to GitHub as a secret: PREVIEWCLOUD_TOKEN
3. Create preview.yaml in your repo
4. Add our GitHub Action workflow
5. Open a PR and get automatic preview URLs!

Visit your dashboard: ${dashboardUrl}

Resources:
- Quick Start: https://docs.previewcloud.cloud/quickstart
- Configuration: https://docs.previewcloud.cloud/config
- Examples: https://docs.previewcloud.cloud/examples

Questions? Visit https://previewcloud.cloud/support

Happy previewing! 🚀
- The PreviewCloud Team
    `;

    await this.sendEmail({
      to: email,
      subject: "Welcome to PreviewCloud! 🚀",
      html,
      text,
    });
  }

  /**
   * Send preview ready notification
   */
  async sendPreviewReadyEmail(
    email: string,
    prNumber: number,
    repoName: string,
    urls: Record<string, string>
  ): Promise<void> {
    const urlList = Object.entries(urls)
      .map(([name, url]) => `• ${name}: ${url}`)
      .join("\n");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .urls { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Preview Environment Ready!</h1>
    </div>
    <div class="content">
      <h2>PR #${prNumber} - ${repoName}</h2>
      <p>Your preview environment is now live and ready for testing!</p>
      
      <div class="urls">
        <h3>🌐 Preview URLs:</h3>
        ${Object.entries(urls)
          .map(
            ([name, url]) =>
              `<p><strong>${name}:</strong><br><a href="${url}">${url}</a></p>`
          )
          .join("")}
      </div>
      
      <p>This preview will automatically update when you push new commits to the PR.</p>
      <p>It will be destroyed when the PR is closed or merged.</p>
    </div>
    <div class="footer">
      <p>PreviewCloud - Preview Environments for Every PR</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Preview Environment Ready!

PR #${prNumber} - ${repoName}

Your preview environment is now live:

${urlList}

This preview will auto-update on new commits and be destroyed when the PR closes.

- PreviewCloud
    `;

    await this.sendEmail({
      to: email,
      subject: `Preview Ready: PR #${prNumber}`,
      html,
      text,
    });
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info("SMTP connection verified successfully");
      return true;
    } catch (error) {
      logger.error("SMTP connection verification failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
