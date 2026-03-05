import { Injectable } from "@nestjs/common";
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailService {

    // Nodemailer.com

    private transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })

    async sendVerificationEmail(email: string, token: string) {
        const verifyUrl = `${process.env.FRONTEND_URL}/auth/register/sendverificationemail?token=${token}`

        await this.transporter.sendMail({
            from: `"Elysio" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Verify your email',
            html: `
                <h2>Verify your Email</h2>
                <p>Please click the button below to verify your email.</p>

                <a href="${verifyUrl}" 
                style="padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px">
                Verify Email
                </a>
            `
        })
    }
}