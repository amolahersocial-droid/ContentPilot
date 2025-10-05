export interface ProspectSuggestion {
  url: string;
  name: string;
  email?: string;
  domainAuthority?: number;
  relevanceScore: number;
  reason: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
  followUpSubject?: string;
  followUpBody?: string;
}

export class BacklinkHelper {
  /**
   * Generate personalized outreach email template
   */
  static generateEmailTemplate(params: {
    prospectName?: string;
    prospectUrl: string;
    yourSiteName: string;
    yourArticleUrl: string;
    yourArticleTitle: string;
    niche: string;
  }): EmailTemplate {
    const { prospectName, prospectUrl, yourSiteName, yourArticleUrl, yourArticleTitle, niche } = params;
    
    const greeting = prospectName ? `Hi ${prospectName}` : "Hi there";
    const domain = new URL(prospectUrl).hostname.replace("www.", "");

    const subject = `Quick question about ${domain}`;
    
    const body = `${greeting},

I hope this email finds you well! I'm reaching out because I recently came across ${domain} while researching ${niche} content.

I particularly enjoyed your work and noticed you have some great resources on this topic. I recently published an article on ${yourSiteName} that I think would be a valuable addition to your content:

"${yourArticleTitle}"
${yourArticleUrl}

This article provides [brief value proposition - e.g., "an in-depth analysis", "practical tips", "the latest research"] on this subject, and I believe it could be a helpful resource for your readers.

Would you be interested in checking it out? If you find it valuable, I'd be honored if you'd consider linking to it from one of your relevant articles.

Either way, keep up the great work on ${domain}!

Best regards,
[Your Name]
${yourSiteName}`;

    const followUpSubject = `Following up: ${domain}`;
    
    const followUpBody = `${greeting},

I wanted to follow up on my previous email about potentially collaborating on some content.

I understand you're probably busy, but I genuinely think the article I mentioned could add value to your readers on ${domain}.

Here's the link again: ${yourArticleUrl}

No pressure at all - just wanted to make sure my email didn't get lost in your inbox!

Thanks for your time.

Best,
[Your Name]
${yourSiteName}`;

    return {
      subject,
      body,
      followUpSubject,
      followUpBody,
    };
  }

  /**
   * Identify potential backlink prospects from crawl data
   */
  static identifyProspectsFromCrawl(crawlData: any, niche: string): ProspectSuggestion[] {
    if (!crawlData?.crawledPages) return [];

    const prospects: ProspectSuggestion[] = [];
    
    // Find pages with external links (good for resource pages)
    for (const page of crawlData.crawledPages) {
      if (page.externalLinks && page.externalLinks.length > 5) {
        // This page has many external links - likely a resource/links page
        for (const link of page.externalLinks) {
          try {
            const url = new URL(link);
            const domain = url.hostname;
            
            // Skip common platforms
            if (this.isCommonPlatform(domain)) continue;

            prospects.push({
              url: link,
              name: domain.replace("www.", ""),
              relevanceScore: 70,
              reason: `Found on resource page: ${page.title || page.url}`,
            });
          } catch {
            // Invalid URL, skip
          }
        }
      }
    }

    // Remove duplicates
    const seen = new Set<string>();
    return prospects.filter((p) => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    }).slice(0, 20); // Limit to top 20
  }

  /**
   * Generate prospect suggestions based on niche/keywords
   */
  static async generateProspects(params: {
    niche: string;
    keywords: string[];
    count?: number;
  }): Promise<ProspectSuggestion[]> {
    const { niche, keywords, count = 10 } = params;

    // In a production app, this would integrate with:
    // - SEMrush API for competitor analysis
    // - Ahrefs API for backlink opportunities
    // - Google Search API for finding relevant sites
    // - Moz API for domain authority

    // For now, return template suggestions
    const prospects: ProspectSuggestion[] = [
      {
        url: `https://example-${niche}-blog.com`,
        name: `${niche} Blog`,
        relevanceScore: 85,
        reason: "High domain authority in your niche",
      },
      {
        url: `https://${niche}-resources.com`,
        name: `${niche} Resources`,
        relevanceScore: 78,
        reason: "Resource page with similar content",
      },
      {
        url: `https://www.${niche}-guide.org`,
        name: `${niche} Guide`,
        relevanceScore: 72,
        reason: "Educational site accepting guest posts",
      },
    ];

    return prospects.slice(0, count);
  }

  /**
   * Extract email addresses from webpage
   */
  static extractEmailFromContent(content: string): string | null {
    // Common email patterns
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const matches = content.match(emailRegex);
    
    if (!matches) return null;

    // Filter out common noise
    const filtered = matches.filter((email) => {
      const lower = email.toLowerCase();
      return (
        !lower.includes("example.com") &&
        !lower.includes("yourdomain.com") &&
        !lower.includes("test@") &&
        !lower.includes("noreply") &&
        !lower.includes("support@") // Usually automated
      );
    });

    return filtered[0] || null;
  }

  /**
   * Check if domain is a common platform (not a prospect)
   */
  private static isCommonPlatform(domain: string): boolean {
    const commonPlatforms = [
      "facebook.com",
      "twitter.com",
      "instagram.com",
      "linkedin.com",
      "youtube.com",
      "google.com",
      "amazon.com",
      "wikipedia.org",
      "github.com",
      "medium.com",
    ];

    return commonPlatforms.some((platform) => domain.includes(platform));
  }

  /**
   * Calculate prospect score based on multiple factors
   */
  static calculateProspectScore(prospect: {
    hasContactInfo: boolean;
    hasResourcePage: boolean;
    domainAuthority?: number;
    contentRelevance: number;
  }): number {
    let score = 0;

    // Contact info available (easier to reach out)
    if (prospect.hasContactInfo) score += 25;

    // Has resource/links page
    if (prospect.hasResourcePage) score += 20;

    // Domain authority (0-100)
    if (prospect.domainAuthority) {
      score += (prospect.domainAuthority / 100) * 30;
    } else {
      score += 15; // Default mid-range
    }

    // Content relevance (0-100)
    score += (prospect.contentRelevance / 100) * 25;

    return Math.round(score);
  }

  /**
   * Generate follow-up reminder text
   */
  static generateFollowUpReminder(daysSinceContact: number): string {
    if (daysSinceContact < 7) {
      return "Too early for follow-up. Wait at least 7 days.";
    } else if (daysSinceContact >= 7 && daysSinceContact < 14) {
      return "Good time for first follow-up.";
    } else if (daysSinceContact >= 14 && daysSinceContact < 21) {
      return "Time for second follow-up if no response.";
    } else {
      return "Consider this prospect unresponsive. Move to next prospect.";
    }
  }
}
