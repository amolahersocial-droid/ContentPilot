import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@rankforge.app';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  trackingId?: string;
}

export class SendGridEmailService {
  async sendEmail(
    options: EmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!SENDGRID_API_KEY) {
      console.error("SendGrid API key not configured");
      return {
        success: false,
        error: "Email service not configured. Please add SENDGRID_API_KEY to environment variables.",
      };
    }

    try {
      let html = options.html;
      if (options.trackingId) {
        const trackingPixel = `<img src="${process.env.APP_URL || 'http://localhost:5000'}/api/outreach/track/open/${options.trackingId}" width="1" height="1" style="display:none" />`;
        html = html + trackingPixel;
      }

      const msg = {
        to: options.to,
        from: FROM_EMAIL,
        subject: options.subject,
        text: options.text || options.html.replace(/<[^>]*>/g, ""),
        html,
      };

      const response = await sgMail.send(msg);

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
      };
    } catch (error: any) {
      console.error("SendGrid send error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async verifyDomain(): Promise<boolean> {
    if (!SENDGRID_API_KEY) {
      return false;
    }
    
    try {
      const msg = {
        to: FROM_EMAIL,
        from: FROM_EMAIL,
        subject: 'Test Email',
        text: 'This is a test email to verify SendGrid configuration.',
        html: '<p>This is a test email to verify SendGrid configuration.</p>',
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error("SendGrid verification error:", error);
      return false;
    }
  }
}

export const sendGridEmailService = new SendGridEmailService();
