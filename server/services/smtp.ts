import { sendEmailViaGmailOAuth } from "./gmail-oauth";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  trackingId?: string;
}

export class SmtpService {
  async sendEmail(
    options: EmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      let html = options.html;
      if (options.trackingId) {
        const trackingPixel = `<img src="${process.env.BASE_URL || 'http://localhost:5000'}/api/outreach/track/open/${options.trackingId}" width="1" height="1" style="display:none" />`;
        html = html + trackingPixel;
      }

      const result = await sendEmailViaGmailOAuth(
        options.to,
        options.subject,
        html,
        options.text || options.html.replace(/<[^>]*>/g, "")
      );

      return result;
    } catch (error: any) {
      console.error("Gmail OAuth send error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const smtpService = new SmtpService();
