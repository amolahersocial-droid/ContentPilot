interface ShopifyCredentials {
  apiKey: string;
  accessToken: string;
}

interface ShopifyArticle {
  title: string;
  body_html: string;
  published: boolean;
  tags?: string;
  metafields?: Array<{
    namespace: string;
    key: string;
    value: string;
    type: string;
  }>;
}

export class ShopifyService {
  private shopDomain: string;
  private credentials: ShopifyCredentials;

  constructor(shopUrl: string, credentials: ShopifyCredentials) {
    const urlObj = new URL(shopUrl);
    this.shopDomain = urlObj.hostname.replace(/^www\./, "");
    this.credentials = credentials;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": this.credentials.accessToken,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `https://${this.shopDomain}/admin/api/2024-01/shop.json`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getBlogId(): Promise<number> {
    const response = await fetch(
      `https://${this.shopDomain}/admin/api/2024-01/blogs.json`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Shopify blogs");
    }

    const data = await response.json();
    if (data.blogs && data.blogs.length > 0) {
      return data.blogs[0].id;
    }

    throw new Error("No blogs found on Shopify store");
  }

  async createArticle(article: ShopifyArticle): Promise<{ id: number; url: string }> {
    try {
      const blogId = await this.getBlogId();

      const response = await fetch(
        `https://${this.shopDomain}/admin/api/2024-01/blogs/${blogId}/articles.json`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            article: {
              title: article.title,
              body_html: article.body_html,
              published: article.published,
              tags: article.tags,
              metafields: article.metafields,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        const statusCode = response.status;
        
        if (statusCode === 401 || statusCode === 403) {
          throw new Error("Shopify authentication failed. Please check your access token.");
        }
        if (statusCode === 429) {
          throw new Error("Shopify rate limit exceeded. Please try again later.");
        }
        
        throw new Error(`Shopify API error (${statusCode}): ${error}`);
      }

      const result = await response.json();
      
      if (!result.article?.id || !result.article?.handle) {
        throw new Error("Invalid response from Shopify API");
      }
      
      return {
        id: result.article.id,
        url: `https://${this.shopDomain}/blogs/${result.article.blog_id}/articles/${result.article.handle}`,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to create Shopify article");
    }
  }

  async crawlSite(): Promise<{
    urls: string[];
    titles: Record<string, string>;
    metadata: Record<string, any>;
  }> {
    try {
      const blogId = await this.getBlogId();
      const response = await fetch(
        `https://${this.shopDomain}/admin/api/2024-01/blogs/${blogId}/articles.json?limit=250`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch articles");

      const data = await response.json();
      const urls: string[] = [];
      const titles: Record<string, string> = {};
      const metadata: Record<string, any> = {};

      for (const article of data.articles) {
        const url = `https://${this.shopDomain}/blogs/${article.blog_id}/articles/${article.handle}`;
        urls.push(url);
        titles[url] = article.title;
        metadata[url] = {
          summary: article.summary_html,
          published_at: article.published_at,
          tags: article.tags,
        };
      }

      return { urls, titles, metadata };
    } catch (error) {
      throw new Error(`Failed to crawl Shopify site: ${(error as Error).message}`);
    }
  }
}
