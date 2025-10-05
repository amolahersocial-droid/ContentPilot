import nodemailer, { Transporter } from "nodemailer";
import { db } from "../db";
import { smtpCredentials } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift()!, "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  trackingId?: string;
}

export class SmtpService {
  private transporters: Map<string, Transporter> = new Map();

  async createTransporter(credentialId: string): Promise<Transporter> {
    const cached = this.transporters.get(credentialId);
    if (cached) return cached;

    const [credential] = await db
      .select()
      .from(smtpCredentials)
      .where(eq(smtpCredentials.id, credentialId))
      .limit(1);

    if (!credential) {
      throw new Error("SMTP credentials not found");
    }

    if (!credential.isActive) {
      throw new Error("SMTP credentials are not active");
    }

    let transporter: Transporter;

    if (credential.provider === "gmail") {
      if (credential.oauthAccessToken) {
        transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            type: "OAuth2",
            user: credential.email,
            accessToken: credential.oauthAccessToken,
            refreshToken: credential.oauthRefreshToken,
          },
        } as any);
      } else if (credential.encryptedPassword) {
        const password = decrypt(credential.encryptedPassword);
        transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: credential.email,
            pass: password,
          },
        });
      } else {
        throw new Error("Gmail credentials incomplete");
      }
    } else if (credential.provider === "outlook") {
      if (credential.encryptedPassword) {
        const password = decrypt(credential.encryptedPassword);
        transporter = nodemailer.createTransport({
          host: "smtp-mail.outlook.com",
          port: 587,
          secure: false,
          auth: {
            user: credential.email,
            pass: password,
          },
        });
      } else {
        throw new Error("Outlook credentials incomplete");
      }
    } else {
      if (!credential.smtpHost || !credential.smtpPort || !credential.encryptedPassword) {
        throw new Error("Custom SMTP credentials incomplete");
      }
      const password = decrypt(credential.encryptedPassword);
      transporter = nodemailer.createTransport({
        host: credential.smtpHost,
        port: credential.smtpPort,
        secure: credential.smtpPort === 465,
        auth: {
          user: credential.email,
          pass: password,
        },
      });
    }

    this.transporters.set(credentialId, transporter);
    return transporter;
  }

  async sendEmail(
    credentialId: string,
    options: EmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const transporter = await this.createTransporter(credentialId);

      const [credential] = await db
        .select()
        .from(smtpCredentials)
        .where(eq(smtpCredentials.id, credentialId))
        .limit(1);

      let html = options.html;
      if (options.trackingId) {
        const trackingPixel = `<img src="${process.env.BASE_URL || 'http://localhost:5000'}/api/outreach/track/open/${options.trackingId}" width="1" height="1" style="display:none" />`;
        html = html + trackingPixel;
      }

      const info = await transporter.sendMail({
        from: credential.email,
        to: options.to,
        subject: options.subject,
        html,
        text: options.text || options.html.replace(/<[^>]*>/g, ""),
      });

      await db
        .update(smtpCredentials)
        .set({ lastUsedAt: new Date() })
        .where(eq(smtpCredentials.id, credentialId));

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error("SMTP send error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async verifyCredentials(
    provider: "gmail" | "outlook" | "custom",
    email: string,
    password: string,
    customHost?: string,
    customPort?: number
  ): Promise<boolean> {
    try {
      let transporter: Transporter;

      if (provider === "gmail") {
        transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: email,
            pass: password,
          },
        });
      } else if (provider === "outlook") {
        transporter = nodemailer.createTransport({
          host: "smtp-mail.outlook.com",
          port: 587,
          secure: false,
          auth: {
            user: email,
            pass: password,
          },
        });
      } else {
        if (!customHost || !customPort) {
          throw new Error("Custom SMTP host and port are required");
        }
        transporter = nodemailer.createTransport({
          host: customHost,
          port: customPort,
          secure: customPort === 465,
          auth: {
            user: email,
            pass: password,
          },
        });
      }

      await transporter.verify();
      return true;
    } catch (error) {
      console.error("SMTP verification error:", error);
      return false;
    }
  }

  async verifyStoredCredentials(credentialId: string): Promise<boolean> {
    try {
      const transporter = await this.createTransporter(credentialId);
      await transporter.verify();
      return true;
    } catch (error) {
      console.error("SMTP verification error:", error);
      return false;
    }
  }

  async storeCredentials(
    userId: string,
    provider: "gmail" | "outlook" | "custom",
    email: string,
    password?: string,
    customHost?: string,
    customPort?: number
  ): Promise<string> {
    const encryptedPassword = password ? encrypt(password) : null;

    const [credential] = await db
      .insert(smtpCredentials)
      .values({
        userId,
        provider,
        email,
        encryptedPassword,
        smtpHost: customHost,
        smtpPort: customPort,
      })
      .returning();

    return credential.id;
  }

  clearTransporterCache(credentialId: string): void {
    this.transporters.delete(credentialId);
  }
}

export const smtpService = new SmtpService();
