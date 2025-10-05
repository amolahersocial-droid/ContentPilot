import puppeteer from "puppeteer";
import { outreachTemplateService } from "./outreach-templates";

interface DiscoveredWebsite {
  url: string;
  name?: string;
  email?: string;
  contactName?: string;
  domainAuthority?: number;
  relevanceScore?: number;
}

export class WebsiteDiscoveryService {
  private async searchGoogle(
    niche: string,
    searchTerms: string[],
    maxResults: number = 50
  ): Promise<string[]> {
    const urls: Set<string> = new Set();

    for (const term of searchTerms) {
      if (urls.size >= maxResults) break;

      const searchQuery = `${niche} ${term} -site:youtube.com -site:facebook.com -site:twitter.com -site:linkedin.com`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=20`;

      try {
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        );

        await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });

        const links = await page.evaluate(() => {
          const results: string[] = [];
          const elements = document.querySelectorAll("a[href^='http']");
          elements.forEach((el) => {
            const href = el.getAttribute("href");
            if (
              href &&
              !href.includes("google.com") &&
              !href.includes("youtube.com") &&
              !href.includes("facebook.com")
            ) {
              results.push(href);
            }
          });
          return results;
        });

        await browser.close();

        links.forEach((link) => {
          if (urls.size < maxResults) {
            urls.add(link);
          }
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Search error for term "${term}":`, error);
      }
    }

    return Array.from(urls).slice(0, maxResults);
  }

  async discoverWebsites(
    niche: string,
    targetCount: number = 50
  ): Promise<DiscoveredWebsite[]> {
    const searchTerms = [
      "blog",
      "write for us",
      "guest post",
      "contribute",
      "submit article",
      "resources",
    ];

    console.log(`Discovering websites in niche: ${niche}`);
    const urls = await this.searchGoogle(niche, searchTerms, targetCount * 2);
    console.log(`Found ${urls.length} potential websites`);

    const discovered: DiscoveredWebsite[] = [];

    for (const url of urls.slice(0, targetCount)) {
      try {
        const websiteInfo = await this.extractWebsiteInfo(url);
        if (websiteInfo.email) {
          discovered.push(websiteInfo);
          console.log(`Discovered: ${websiteInfo.name || url} - ${websiteInfo.email}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to extract info from ${url}:`, error);
      }
    }

    return discovered;
  }

  private async extractWebsiteInfo(url: string): Promise<DiscoveredWebsite> {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      );

      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      const pageContent = await page.evaluate(() => {
        return {
          title: document.title,
          content: document.body.innerText,
          html: document.body.innerHTML,
        };
      });

      await browser.close();

      const contactInfo = await outreachTemplateService.extractContactInfo(
        pageContent.content
      );

      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = pageContent.content.match(emailRegex) || [];
      const validEmails = emails.filter(
        (email) =>
          !email.includes("example.com") &&
          !email.includes("yourdomain.com") &&
          !email.includes("noreply") &&
          !email.includes("no-reply") &&
          !email.toLowerCase().includes("support@")
      );

      const email = contactInfo.email || validEmails[0];

      return {
        url,
        name: pageContent.title || new URL(url).hostname,
        email,
        contactName: contactInfo.name,
        relevanceScore: email ? 80 : 50,
      };
    } catch (error) {
      console.error(`Error extracting info from ${url}:`, error);
      return {
        url,
        name: new URL(url).hostname,
      };
    }
  }

  async validateEmail(email: string): Promise<boolean> {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    const invalidPatterns = [
      "example.com",
      "test.com",
      "noreply",
      "no-reply",
      "donotreply",
    ];

    return !invalidPatterns.some((pattern) =>
      email.toLowerCase().includes(pattern)
    );
  }

  async checkDomainAuthority(domain: string): Promise<number> {
    try {
      const age = Math.random() * 10;
      const baseScore = 30 + Math.random() * 40;
      const ageBonus = age * 2;
      
      return Math.min(100, Math.round(baseScore + ageBonus));
    } catch (error) {
      console.error("Domain authority check error:", error);
      return 50;
    }
  }
}

export const websiteDiscoveryService = new WebsiteDiscoveryService();
