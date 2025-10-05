interface WordPressCredentials {
  username: string;
  appPassword: string;
}

interface WordPressPost {
  title: string;
  content: string;
  status: "draft" | "publish";
  meta?: {
    description?: string;
  };
}

export class WordPressService {
  private baseUrl: string;
  private credentials: WordPressCredentials;

  constructor(siteUrl: string, credentials: WordPressCredentials) {
    this.baseUrl = siteUrl.replace(/\/$/, "");
    this.credentials = credentials;
  }

  private getAuthHeader(): string {
    const auth = Buffer.from(
      `${this.credentials.username}:${this.credentials.appPassword}`
    ).toString("base64");
    return `Basic ${auth}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/users/me`, {
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async createPost(post: WordPressPost): Promise<{ id: number; link: string }> {
    try {
      console.log(`📝 Creating WordPress post at: ${this.baseUrl}/wp-json/wp/v2/posts`);
      console.log(`🔑 Using username: ${this.credentials.username}`);
      
      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify({
          title: post.title,
          content: post.content,
          status: post.status,
          meta: post.meta || {},
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        const statusCode = response.status;
        
        console.error(`❌ WordPress API error (${statusCode}):`, error);
        
        if (statusCode === 401 || statusCode === 403) {
          throw new Error(`WordPress authentication failed (${statusCode}). Check: 1) Application Password is correct, 2) Username is correct, 3) REST API is enabled. Error: ${error}`);
        }
        if (statusCode === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        
        throw new Error(`WordPress API error (${statusCode}): ${error}`);
      }

      const result = await response.json();
      
      if (!result.id || !result.link) {
        throw new Error("Invalid response from WordPress API");
      }
      
      return {
        id: result.id,
        link: result.link,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to create WordPress post");
    }
  }

  async uploadMedia(imageUrl: string, altText: string): Promise<number> {
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    const formData = new FormData();
    formData.append("file", new Blob([imageBuffer]), "image.jpg");
    formData.append("alt_text", altText);

    const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: this.getAuthHeader(),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload media to WordPress");
    }

    const result = await response.json();
    return result.id;
  }

  async crawlSite(): Promise<{
    urls: string[];
    titles: Record<string, string>;
    metadata: Record<string, any>;
  }> {
    try {
      const postsResponse = await fetch(`${this.baseUrl}/wp-json/wp/v2/posts?per_page=100`);
      if (!postsResponse.ok) throw new Error("Failed to fetch posts");

      const posts = await postsResponse.json();
      const urls: string[] = [];
      const titles: Record<string, string> = {};
      const metadata: Record<string, any> = {};

      for (const post of posts) {
        urls.push(post.link);
        titles[post.link] = post.title.rendered;
        metadata[post.link] = {
          excerpt: post.excerpt.rendered,
          date: post.date,
          categories: post.categories,
          tags: post.tags,
        };
      }

      return { urls, titles, metadata };
    } catch (error) {
      throw new Error(`Failed to crawl WordPress site: ${(error as Error).message}`);
    }
  }
}
