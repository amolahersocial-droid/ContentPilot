import axios from "axios";
import * as cheerio from "cheerio";

export interface RobotsTxtRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelay?: number;
  sitemap?: string[];
}

export interface PageMetadata {
  url: string;
  title: string;
  description: string;
  h1: string[];
  h2: string[];
  images: { src: string; alt: string }[];
  internalLinks: string[];
  externalLinks: string[];
  wordCount: number;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonical: string;
  statusCode: number;
  loadTime: number;
}

export interface CrawlResult {
  startUrl: string;
  totalPages: number;
  crawledPages: PageMetadata[];
  robots: RobotsTxtRule | null;
  sitemaps: string[];
  siteStructure: Map<string, string[]>;
  errors: { url: string; error: string }[];
  completedAt: Date;
}

export class SiteCrawler {
  private baseUrl: string;
  private maxDepth: number;
  private maxPages: number;
  private visited: Set<string>;
  private queue: { url: string; depth: number }[];
  private robots: RobotsTxtRule | null;
  private crawlData: PageMetadata[];
  private errors: { url: string; error: string }[];

  constructor(baseUrl: string, maxDepth = 3, maxPages = 50) {
    this.baseUrl = this.normalizeUrl(baseUrl);
    this.maxDepth = maxDepth;
    this.maxPages = maxPages;
    this.visited = new Set();
    this.queue = [];
    this.robots = null;
    this.crawlData = [];
    this.errors = [];
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  private isInternalUrl(url: string): boolean {
    try {
      const parsed = new URL(url, this.baseUrl);
      const base = new URL(this.baseUrl);
      return parsed.host === base.host;
    } catch {
      return false;
    }
  }

  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return "";
    }
  }

  private async fetchRobotsTxt(): Promise<RobotsTxtRule | null> {
    try {
      const robotsUrl = `${this.baseUrl}/robots.txt`;
      const response = await axios.get(robotsUrl, { timeout: 5000 });
      return this.parseRobotsTxt(response.data);
    } catch {
      return null;
    }
  }

  private parseRobotsTxt(content: string): RobotsTxtRule {
    const lines = content.split("\n");
    const rule: RobotsTxtRule = {
      userAgent: "*",
      disallow: [],
      allow: [],
      sitemap: [],
    };

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith("disallow:")) {
        const path = line.substring(line.indexOf(":") + 1).trim();
        if (path) rule.disallow.push(path);
      } else if (trimmed.startsWith("allow:")) {
        const path = line.substring(line.indexOf(":") + 1).trim();
        if (path) rule.allow.push(path);
      } else if (trimmed.startsWith("sitemap:")) {
        const url = line.substring(line.indexOf(":") + 1).trim();
        if (url) rule.sitemap!.push(url);
      } else if (trimmed.startsWith("crawl-delay:")) {
        const delay = line.substring(line.indexOf(":") + 1).trim();
        rule.crawlDelay = parseInt(delay, 10);
      }
    }

    return rule;
  }

  private isAllowedByRobots(url: string): boolean {
    if (!this.robots) return true;

    const path = new URL(url).pathname;

    // Check disallow rules
    for (const disallowPath of this.robots.disallow) {
      if (path.startsWith(disallowPath)) {
        // Check if there's an allow rule that overrides
        for (const allowPath of this.robots.allow) {
          if (path.startsWith(allowPath)) return true;
        }
        return false;
      }
    }

    return true;
  }

  private async crawlPage(url: string, depth: number): Promise<PageMetadata | null> {
    try {
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: 10000,
        maxContentLength: 5 * 1024 * 1024, // 5MB max
        headers: {
          "User-Agent": "SEO-Content-Bot/1.0",
        },
        validateStatus: (status) => status >= 200 && status < 400,
      });
      const loadTime = Date.now() - startTime;

      // Only process HTML content
      const contentType = response.headers["content-type"] || "";
      if (!contentType.includes("text/html")) {
        this.errors.push({ url, error: `Not HTML content: ${contentType}` });
        return null;
      }

      const $ = cheerio.load(response.data);
      
      // Extract metadata
      const title = $("title").first().text().trim();
      const description = $('meta[name="description"]').attr("content") || "";
      const metaKeywords = $('meta[name="keywords"]').attr("content") || "";
      const ogTitle = $('meta[property="og:title"]').attr("content") || "";
      const ogDescription = $('meta[property="og:description"]').attr("content") || "";
      const canonical = $('link[rel="canonical"]').attr("href") || url;

      // Extract headings
      const h1 = $("h1")
        .map((_, el) => $(el).text().trim())
        .get();
      const h2 = $("h2")
        .map((_, el) => $(el).text().trim())
        .get();

      // Extract images
      const images = $("img")
        .map((_, el) => ({
          src: this.resolveUrl($(el).attr("src") || "", url),
          alt: $(el).attr("alt") || "",
        }))
        .get();

      // Extract links
      const allLinks = $("a[href]")
        .map((_, el) => this.resolveUrl($(el).attr("href") || "", url))
        .get()
        .filter((link) => link && !link.startsWith("#") && !link.startsWith("mailto:") && !link.startsWith("tel:"));

      const internalLinks = allLinks.filter((link) => this.isInternalUrl(link));
      const externalLinks = allLinks.filter((link) => !this.isInternalUrl(link));

      // Count words (rough estimate)
      const text = $("body").text();
      const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;

      // Add unvisited INTERNAL links to queue (never external)
      if (depth < this.maxDepth) {
        for (const link of internalLinks) {
          if (!this.visited.has(link) && 
              this.isInternalUrl(link) && 
              this.isAllowedByRobots(link)) {
            this.queue.push({ url: link, depth: depth + 1 });
          }
        }
      }

      return {
        url,
        title,
        description,
        h1,
        h2,
        images,
        internalLinks,
        externalLinks,
        wordCount,
        metaKeywords,
        ogTitle,
        ogDescription,
        canonical,
        statusCode: response.status,
        loadTime,
      };
    } catch (error: any) {
      // Limit error array size
      if (this.errors.length < 100) {
        this.errors.push({
          url,
          error: error.message || "Failed to crawl page",
        });
      }
      return null;
    }
  }

  async crawl(): Promise<CrawlResult> {
    // Fetch robots.txt
    this.robots = await this.fetchRobotsTxt();

    // Start crawling from base URL
    this.queue.push({ url: this.baseUrl, depth: 0 });

    while (this.queue.length > 0 && this.visited.size < this.maxPages) {
      const { url, depth } = this.queue.shift()!;

      if (this.visited.has(url)) continue;
      this.visited.add(url);

      if (!this.isAllowedByRobots(url)) {
        this.errors.push({ url, error: "Disallowed by robots.txt" });
        continue;
      }

      const pageData = await this.crawlPage(url, depth);
      if (pageData) {
        this.crawlData.push(pageData);
      }

      // Respect crawl delay
      const crawlDelay = this.robots?.crawlDelay;
      if (crawlDelay && crawlDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, crawlDelay * 1000));
      } else {
        // Default delay to be polite
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Build site structure (parent-child relationships)
    const siteStructure = new Map<string, string[]>();
    for (const page of this.crawlData) {
      siteStructure.set(page.url, page.internalLinks);
    }

    return {
      startUrl: this.baseUrl,
      totalPages: this.crawlData.length,
      crawledPages: this.crawlData,
      robots: this.robots,
      sitemaps: this.robots?.sitemap || [],
      siteStructure,
      errors: this.errors,
      completedAt: new Date(),
    };
  }

  static async quickCrawl(url: string): Promise<CrawlResult> {
    const crawler = new SiteCrawler(url, 2, 25);
    return await crawler.crawl();
  }

  static async deepCrawl(url: string): Promise<CrawlResult> {
    const crawler = new SiteCrawler(url, 4, 100);
    return await crawler.crawl();
  }
}
