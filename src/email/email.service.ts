import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// Made with ChatGPT, I don't want to write email templates :D
@Injectable()
export class EmailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  private async sendMail(to: string, subject: string, html: string) {
    await this.transporter.sendMail({
      from: `"Elysio" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

    await this.sendMail(
      email,
      'Verify your email',
      `
            <h2>Verify your Email</h2>
            <p>Please click the button below to verify your email.</p>

            <a href="${verifyUrl}"
            style="padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px">
            Verify Email
            </a>
            `,
    );
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    await this.sendMail(
      email,
      'Reset your password',
      `
            <h2>Password Reset</h2>
            <p>Click the button below to reset your password.</p>

            <a href="${resetUrl}"
            style="padding:12px 24px;background:#dc2626;color:white;text-decoration:none;border-radius:6px">
            Reset Password
            </a>
            `,
    );
  }
}
