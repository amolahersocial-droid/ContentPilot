import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TemplateGenerationOptions {
  niche: string;
  tone: "formal" | "casual" | "persuasive" | "friendly" | "professional";
  websiteName?: string;
  websiteUrl?: string;
  senderName: string;
  senderWebsite: string;
  contextInfo?: string;
}

interface PersonalizationData {
  recipientName?: string;
  recipientWebsite: string;
  recipientNiche?: string;
  senderName: string;
  senderWebsite: string;
  customMessage?: string;
}

export class OutreachTemplateService {
  async generateEmailTemplate(options: TemplateGenerationOptions): Promise<{
    subject: string;
    body: string;
  }> {
    const {
      niche,
      tone,
      websiteName,
      websiteUrl,
      senderName,
      senderWebsite,
      contextInfo,
    } = options;

    const toneDescriptions = {
      formal: "professional and respectful",
      casual: "friendly and approachable",
      persuasive: "compelling and value-focused",
      friendly: "warm and conversational",
      professional: "polished and business-oriented",
    };

    const prompt = `You are an expert email marketer specializing in backlink outreach campaigns. Generate a compelling outreach email template for the following scenario:

**Campaign Details:**
- Niche/Industry: ${niche}
- Email Tone: ${toneDescriptions[tone]}
- Sender Name: ${senderName}
- Sender Website: ${senderWebsite}
${websiteName ? `- Recipient Website Name: ${websiteName}` : ""}
${websiteUrl ? `- Recipient Website URL: ${websiteUrl}` : ""}
${contextInfo ? `- Additional Context: ${contextInfo}` : ""}

**Requirements:**
1. Create a personalized subject line that encourages opens (max 60 characters)
2. Write a concise email body (200-300 words) that:
   - Opens with genuine personalization
   - Briefly mentions something specific about their website/content
   - Explains the mutual value of collaborating
   - Includes a clear, soft call-to-action for a backlink or guest post
   - Maintains the ${tone} tone throughout
3. Use placeholders: {{recipientName}}, {{recipientWebsite}}, {{senderName}}, {{senderWebsite}}
4. Avoid being too salesy or pushy
5. Focus on building a genuine relationship

**Output Format:**
Return ONLY a valid JSON object with this exact structure:
{
  "subject": "Your subject line here",
  "body": "Your email body here with placeholders"
}

Generate the email now:`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert email marketing specialist. You always return valid JSON responses without markdown formatting.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });

      let responseText = completion.choices[0].message.content || "{}";
      
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const parsed = JSON.parse(responseText);

      if (!parsed.subject || !parsed.body) {
        throw new Error("Invalid template structure returned from AI");
      }

      return {
        subject: parsed.subject,
        body: parsed.body,
      };
    } catch (error: any) {
      console.error("Template generation error:", error);
      throw new Error(`Failed to generate email template: ${error.message}`);
    }
  }

  async generateFollowUpTemplate(
    originalSubject: string,
    originalBody: string,
    followUpNumber: number,
    tone: "formal" | "casual" | "persuasive" | "friendly" | "professional"
  ): Promise<{
    subject: string;
    body: string;
  }> {
    const toneDescriptions = {
      formal: "professional and respectful",
      casual: "friendly and approachable",
      persuasive: "compelling and value-focused",
      friendly: "warm and conversational",
      professional: "polished and business-oriented",
    };

    const prompt = `Generate a follow-up email for a backlink outreach campaign.

**Original Email:**
Subject: ${originalSubject}
Body: ${originalBody}

**Follow-up Details:**
- This is follow-up #${followUpNumber}
- Maintain ${toneDescriptions[tone]} tone
- Keep it brief and respectful
- Reference the original email without being pushy
- Add value or a different angle

**Requirements:**
1. Create a new subject line (can reference original or be new)
2. Write a short follow-up (100-150 words)
3. Maintain personalization placeholders: {{recipientName}}, {{recipientWebsite}}, {{senderName}}
4. Be polite and understanding of their busy schedule

**Output Format:**
Return ONLY valid JSON:
{
  "subject": "Follow-up subject",
  "body": "Follow-up body with placeholders"
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert at crafting polite, effective follow-up emails. Always return valid JSON without markdown.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      });

      let responseText = completion.choices[0].message.content || "{}";
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const parsed = JSON.parse(responseText);

      if (!parsed.subject || !parsed.body) {
        throw new Error("Invalid follow-up template structure");
      }

      return {
        subject: parsed.subject,
        body: parsed.body,
      };
    } catch (error: any) {
      console.error("Follow-up generation error:", error);
      throw new Error(`Failed to generate follow-up: ${error.message}`);
    }
  }

  personalizeEmail(
    template: { subject: string; body: string },
    data: PersonalizationData
  ): { subject: string; body: string } {
    let { subject, body } = template;

    const replacements: Record<string, string> = {
      "{{recipientName}}": data.recipientName || "there",
      "{{recipientWebsite}}": data.recipientWebsite,
      "{{senderName}}": data.senderName,
      "{{senderWebsite}}": data.senderWebsite,
      "{{customMessage}}": data.customMessage || "",
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder, "g");
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    return { subject, body };
  }

  async extractContactInfo(websiteContent: string): Promise<{
    email?: string;
    name?: string;
  }> {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = websiteContent.match(emailRegex) || [];

    const validEmails = emails.filter(
      (email) =>
        !email.includes("example.com") &&
        !email.includes("yourdomain.com") &&
        !email.includes("noreply") &&
        !email.includes("no-reply")
    );

    const email = validEmails[0];

    const prompt = `Extract the website owner's name from this content. Return ONLY the name or "Unknown" if not found:

${websiteContent.substring(0, 1000)}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Extract names from website content. Return only the name or 'Unknown'.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 50,
      });

      const name = completion.choices[0].message.content?.trim() || "Unknown";

      return {
        email,
        name: name !== "Unknown" ? name : undefined,
      };
    } catch (error) {
      console.error("Contact extraction error:", error);
      return { email };
    }
  }
}

export const outreachTemplateService = new OutreachTemplateService();
