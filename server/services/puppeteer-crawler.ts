import puppeteer, { Browser, Page } from "puppeteer";
import robotsParser from "robots-parser";
import axios from "axios";

export interface CrawlOptions {
  url: string;
  depth?: number;
  maxPages?: number;
  respectRobotsTxt?: boolean;
  crawlDelay?: number; // milliseconds
  userAgent?: string;
  headless?: boolean;
}

export interface CrawlResult {
  url: string;
  title: string;
  metaDescription: string;
  h1Tags: string[];
  h2Tags: string[];
  images: Array<{ src: string; alt: string }>;
  internalLinks: string[];
  externalLinks: string[];
  wordCount: number;
  loadTime: number;
  screenshot?: string;
  structuredData?: any;
  socialMeta?: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
  };
}

export class PuppeteerCrawler {
  private browser: Browser | null = null;
  private visitedUrls: Set<string> = new Set();
  private robotsTxt: any = null;
  private crawlDelay: number;
  private userAgent: string;

  constructor(
    private options: CrawlOptions = {
      url: "",
      depth: 3,
      maxPages: 50,
      respectRobotsTxt: true,
      crawlDelay: 1000,
      userAgent: "Mozilla/5.0 (compatible; SEO-Content-Bot/1.0; +https://seo-content-saas.com/bot)",
      headless: true,
    }
  ) {
    this.crawlDelay = options.crawlDelay || 1000;
    this.userAgent = options.userAgent || "Mozilla/5.0 (compatible; SEO-Content-Bot/1.0)";
  }

  /**
   * Initialize browser and load robots.txt
   */
  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.options.headless !== false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    if (this.options.respectRobotsTxt) {
      await this.loadRobotsTxt();
    }
  }

  /**
   * Load and parse robots.txt
   */
  private async loadRobotsTxt(): Promise<void> {
    try {
      const baseUrl = new URL(this.options.url).origin;
      const robotsUrl = `${baseUrl}/robots.txt`;
      const response = await axios.get(robotsUrl, { timeout: 5000 });
      this.robotsTxt = robotsParser(robotsUrl, response.data);
    } catch (error) {
      console.log("No robots.txt found or error loading it, proceeding without restrictions");
    }
  }

  /**
   * Check if URL is allowed by robots.txt
   */
  private isAllowed(url: string): boolean {
    if (!this.options.respectRobotsTxt || !this.robotsTxt) return true;
    return this.robotsTxt.isAllowed(url, this.userAgent) ?? true;
  }

  /**
   * Get crawl delay from robots.txt or use default
   */
  private getCrawlDelay(): number {
    if (this.robotsTxt) {
      const delay = this.robotsTxt.getCrawlDelay(this.userAgent);
      if (delay) return delay * 1000; // Convert to milliseconds
    }
    return this.crawlDelay;
  }

  /**
   * Wait between requests (politeness)
   */
  private async politeWait(): Promise<void> {
    const delay = this.getCrawlDelay();
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Deduplicate URL (remove fragments, normalize)
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.hash = ""; // Remove fragment
      // Remove trailing slash
      let pathname = parsed.pathname;
      if (pathname.endsWith("/") && pathname.length > 1) {
        pathname = pathname.slice(0, -1);
      }
      parsed.pathname = pathname;
      return parsed.toString();
    } catch {
      return url;
    }
  }

  /**
   * Crawl a single page
   */
  private async crawlPage(url: string): Promise<CrawlResult | null> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }

    const normalizedUrl = this.normalizeUrl(url);

    // Check if already visited (deduplication)
    if (this.visitedUrls.has(normalizedUrl)) {
      return null;
    }

    // Check robots.txt
    if (!this.isAllowed(normalizedUrl)) {
      console.log(`URL disallowed by robots.txt: ${normalizedUrl}`);
      return null;
    }

    this.visitedUrls.add(normalizedUrl);

    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent(this.userAgent);
      await page.setViewport({ width: 1920, height: 1080 });

      const startTime = Date.now();
      
      // Navigate with timeout
      await page.goto(normalizedUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      const loadTime = Date.now() - startTime;

      // Extract data
      const data = await page.evaluate(() => {
        // Title
        const title = document.title;

        // Meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        const metaDescription = metaDesc?.getAttribute("content") || "";

        // Headings
        const h1Tags = Array.from(document.querySelectorAll("h1")).map(
          (h) => h.textContent?.trim() || ""
        );
        const h2Tags = Array.from(document.querySelectorAll("h2")).map(
          (h) => h.textContent?.trim() || ""
        );

        // Images
        const images = Array.from(document.querySelectorAll("img")).map((img) => ({
          src: img.src,
          alt: img.alt || "",
        }));

        // Links
        const links = Array.from(document.querySelectorAll("a[href]"));
        const currentDomain = window.location.hostname;
        
        const internalLinks: string[] = [];
        const externalLinks: string[] = [];

        links.forEach((link) => {
          const href = link.getAttribute("href");
          if (!href) return;

          try {
            const url = new URL(href, window.location.href);
            if (url.hostname === currentDomain) {
              internalLinks.push(url.toString());
            } else {
              externalLinks.push(url.toString());
            }
          } catch {
            // Invalid URL, skip
          }
        });

        // Word count (approximate)
        const bodyText = document.body.innerText || "";
        const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

        // Social meta tags
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
        const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute("content");
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
        const twitterCard = document.querySelector('meta[name="twitter:card"]')?.getAttribute("content");

        // Structured data
        const structuredDataElements = Array.from(
          document.querySelectorAll('script[type="application/ld+json"]')
        );
        const structuredData = structuredDataElements
          .map((el) => {
            try {
              return JSON.parse(el.textContent || "");
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        return {
          title,
          metaDescription,
          h1Tags,
          h2Tags,
          images,
          internalLinks: Array.from(new Set(internalLinks)),
          externalLinks: Array.from(new Set(externalLinks)),
          wordCount,
          structuredData,
          socialMeta: {
            ogTitle,
            ogDescription,
            ogImage,
            twitterCard,
          },
        };
      });

      // Take screenshot
      const screenshot = await page.screenshot({ encoding: "base64", fullPage: false });

      return {
        url: normalizedUrl,
        loadTime,
        screenshot,
        ...data,
      };
    } catch (error: any) {
      console.error(`Error crawling ${normalizedUrl}:`, error.message);
      return null;
    } finally {
      await page.close();
      await this.politeWait(); // Politeness delay
    }
  }

  /**
   * Crawl website recursively
   */
  async crawl(): Promise<CrawlResult[]> {
    await this.initialize();

    const results: CrawlResult[] = [];
    const queue: Array<{ url: string; depth: number }> = [
      { url: this.options.url, depth: 0 },
    ];

    const maxDepth = this.options.depth || 3;
    const maxPages = this.options.maxPages || 50;

    while (queue.length > 0 && results.length < maxPages) {
      const current = queue.shift();
      if (!current) break;

      const { url, depth } = current;

      if (depth > maxDepth) continue;

      const result = await this.crawlPage(url);
      if (!result) continue;

      results.push(result);

      // Add internal links to queue if not at max depth
      if (depth < maxDepth) {
        const baseUrl = new URL(this.options.url).origin;
        for (const link of result.internalLinks) {
          try {
            const linkUrl = new URL(link);
            // Only crawl links from the same domain
            if (linkUrl.origin === baseUrl) {
              queue.push({ url: link, depth: depth + 1 });
            }
          } catch {
            // Invalid URL, skip
          }
        }
      }
    }

    return results;
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Get crawl statistics
   */
  getStats() {
    return {
      pagesVisited: this.visitedUrls.size,
      respectingRobotsTxt: this.options.respectRobotsTxt,
      crawlDelay: this.getCrawlDelay(),
      userAgent: this.userAgent,
    };
  }
}
