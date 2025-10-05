import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface OutreachConfig {
  fromEmail: string;
  fromName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
}

export class EmailOutreachService {
  private transporter: Transporter | null = null;

  constructor(private config: OutreachConfig) {
    if (config.smtpHost && config.smtpUser && config.smtpPassword) {
      this.initializeTransporter();
    }
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort || 587,
      secure: false,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPassword,
      },
    });
  }

  /**
   * Generate personalized outreach email template
   */
  generateTemplate(params: {
    recipientName: string;
    recipientSite: string;
    yourName: string;
    yourSite: string;
    yourArticleTitle: string;
    yourArticleUrl: string;
    relevantContent?: string;
    templateType?: "guest_post" | "link_exchange" | "resource_mention" | "broken_link";
  }): EmailTemplate {
    const { recipientName, recipientSite, yourName, yourSite, yourArticleTitle, yourArticleUrl, relevantContent, templateType = "resource_mention" } = params;

    const templates = {
      guest_post: {
        subject: `Guest Post Opportunity for ${recipientSite}`,
        body: `Hi ${recipientName},

I hope this email finds you well! I'm ${yourName}, and I've been following ${recipientSite} for a while now. Your content on [specific topic] is truly valuable to the [industry/niche] community.

I noticed you accept guest contributions, and I'd love to contribute a high-quality, original article to your site. I specialize in [your expertise], and I believe I could provide unique insights that would resonate with your audience.

Here are a few topic ideas I had in mind:
• [Topic 1 - relevant to their niche]
• [Topic 2 - solving a problem their audience faces]
• [Topic 3 - trending topic in the industry]

For reference, here's a recent piece I wrote: ${yourArticleUrl}

I'd be happy to tailor the content specifically to your audience's interests and ensure it aligns with your editorial standards. The article would be 100% original, well-researched, and include practical examples.

Would you be open to this collaboration? I'm flexible on topics and happy to discuss what would work best for your site.

Looking forward to hearing from you!

Best regards,
${yourName}
${yourSite}`,
      },

      link_exchange: {
        subject: `Collaboration Opportunity Between ${yourSite} and ${recipientSite}`,
        body: `Hi ${recipientName},

I'm ${yourName} from ${yourSite}, and I recently came across your excellent article on ${relevantContent || "[topic]"}. The depth of your coverage really impressed me!

I'm reaching out because I've written a comprehensive guide on a related topic: "${yourArticleTitle}" (${yourArticleUrl})

I think our audiences would benefit from both resources. Would you be interested in a content collaboration where we could reference each other's work? This could provide additional value to both our readers.

Benefits for your readers:
• Access to complementary, high-quality content
• A more comprehensive understanding of the topic
• Trusted resources from established sites in the industry

I'd be happy to:
1. Add a contextual link to your article in my piece
2. Mention it in our newsletter (${10000}+ subscribers)
3. Share it with our social media community

If this interests you, I'd love to discuss how we can support each other's content.

Thanks for your time, and keep up the great work!

Best regards,
${yourName}
${yourSite}`,
      },

      resource_mention: {
        subject: `Your Article Would Be Perfect for Our Resource List`,
        body: `Hi ${recipientName},

I'm ${yourName}, and I write about [niche/topic] at ${yourSite}. I've been researching ${relevantContent || "the best resources"} for an article I'm working on, and I came across your piece on ${recipientSite}.

Your content is exactly what I've been looking for! It's comprehensive, well-researched, and provides genuine value to readers.

I'm putting together a curated list of the best resources on this topic: "${yourArticleTitle}" and I'd love to feature your article as one of the top recommendations.

Here's the article where I'd mention your work: ${yourArticleUrl}

This would give your content exposure to our audience of [number] monthly readers who are specifically interested in this topic.

Would you be comfortable with me linking to your article? I want to make sure I have your permission before publishing.

Thanks for creating such valuable content!

Best regards,
${yourName}
${yourSite}`,
      },

      broken_link: {
        subject: `Quick Heads Up About a Broken Link on ${recipientSite}`,
        body: `Hi ${recipientName},

I hope you're doing well! I'm ${yourName} from ${yourSite}, and I've been a regular reader of your content on ${recipientSite}.

While going through your article "${relevantContent || "[article title]"}", I noticed that one of the outbound links appears to be broken. I thought you'd want to know so you can update it.

The broken link: [URL of broken link]
Location: [Page where it's found]

Since you're updating that section anyway, I recently published a comprehensive resource on the same topic that might be a good replacement: "${yourArticleTitle}"

Link: ${yourArticleUrl}

This article covers:
• [Key point 1]
• [Key point 2]
• [Key point 3]

Of course, no pressure to use it - I just wanted to help out and provide a potential solution. Either way, I hope the heads up about the broken link is useful!

Keep up the excellent work!

Best regards,
${yourName}
${yourSite}`,
      },
    };

    return templates[templateType];
  }

  /**
   * Generate AI-powered personalized template using OpenAI
   */
  async generateAITemplate(params: {
    recipientName: string;
    recipientSite: string;
    recipientRecentArticle?: string;
    yourName: string;
    yourSite: string;
    yourArticleTitle: string;
    yourArticleUrl: string;
    outreachGoal: string;
    openaiApiKey: string;
  }): Promise<EmailTemplate> {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: params.openaiApiKey });

    const prompt = `You are an expert in writing personalized, non-salesy outreach emails for link building and content collaboration.

Create a highly personalized outreach email with the following details:

Recipient Information:
- Name: ${params.recipientName}
- Website: ${params.recipientSite}
${params.recipientRecentArticle ? `- Recent Article: ${params.recipientRecentArticle}` : ""}

Sender Information:
- Name: ${params.yourName}
- Website: ${params.yourSite}
- Article Title: ${params.yourArticleTitle}
- Article URL: ${params.yourArticleUrl}

Outreach Goal: ${params.outreachGoal}

Requirements:
1. Be genuine and specific - reference their actual content
2. Keep it concise (under 200 words)
3. Provide clear value proposition
4. Use a conversational, friendly tone
5. Include a clear but soft call-to-action
6. Don't be pushy or salesy
7. Show that you've actually read their content
8. Make it feel like a human wrote it, not a template

Return ONLY a JSON object with this structure:
{
  "subject": "Email subject line",
  "body": "Email body content"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert email copywriter specializing in outreach for SEO and content marketing.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content) as EmailTemplate;
  }

  /**
   * Send outreach email
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    replyTo?: string;
    fromEmail?: string;
    fromName?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      return {
        success: false,
        error: "Email service not configured. Please add SMTP settings.",
      };
    }

    try {
      // Use customer's email if provided, otherwise fall back to platform email
      const senderEmail = params.fromEmail || this.config.fromEmail;
      const senderName = params.fromName || this.config.fromName;

      const info = await this.transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: params.to,
        subject: params.subject,
        text: params.body,
        html: params.body.replace(/\n/g, "<br>"),
        replyTo: params.replyTo || senderEmail,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Schedule email sending (mock implementation - would need job queue)
   */
  async scheduleEmail(params: {
    to: string;
    subject: string;
    body: string;
    sendAt: Date;
  }): Promise<{ scheduled: boolean; jobId?: string }> {
    // This would integrate with Bull queue for real scheduling
    console.log(`Email scheduled to ${params.to} at ${params.sendAt}`);
    return {
      scheduled: true,
      jobId: `email_${Date.now()}`,
    };
  }

  /**
   * Best practice templates library
   */
  static getBestPracticeTemplates() {
    return {
      resourceMention: {
        name: "Resource Mention (Highest Success Rate)",
        description: "Mention their content in your curated resource list",
        successRate: "15-25%",
      },
      brokenLink: {
        name: "Broken Link Building",
        description: "Help them fix broken links and suggest your content",
        successRate: "20-30%",
      },
      guestPost: {
        name: "Guest Post Pitch",
        description: "Offer to write valuable content for their site",
        successRate: "10-15%",
      },
      linkExchange: {
        name: "Link Exchange",
        description: "Mutual benefit through content collaboration",
        successRate: "8-12%",
      },
    };
  }

  /**
   * Get email best practices tips
   */
  static getBestPractices() {
    return [
      "Personalize every email - reference specific content they've written",
      "Keep it short - 150-200 words maximum",
      "Provide value first - don't just ask for links",
      "Use a conversational tone - avoid corporate speak",
      "Have a clear but soft CTA - make it easy to say yes",
      "Follow up once after 5-7 days if no response",
      "Never mass email - quality over quantity",
      "Build relationships - engage with their content first",
      "Use a professional email address - not gmail/yahoo",
      "Test subject lines - personalized ones get 50% better open rates",
    ];
  }
}

// Export singleton for configuration
let emailService: EmailOutreachService | null = null;

export function initializeEmailService(config: OutreachConfig) {
  emailService = new EmailOutreachService(config);
  return emailService;
}

export function getEmailService(): EmailOutreachService | null {
  return emailService;
}
