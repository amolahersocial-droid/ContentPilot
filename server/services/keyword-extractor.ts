/**
 * Extract and rank keywords from crawled site data
 */

export interface ExtractedKeyword {
  keyword: string;
  frequency: number;
  sources: string[]; // Where the keyword was found
  score: number;
}

export class KeywordExtractor {
  /**
   * Extract keywords from crawled site data
   */
  static extractFromCrawlData(crawlData: any): ExtractedKeyword[] {
    const keywordMap = new Map<string, { frequency: number; sources: Set<string> }>();
    
    if (!crawlData || !crawlData.crawledPages) {
      return [];
    }

    // Process each crawled page
    for (const page of crawlData.crawledPages) {
      // Extract from title
      if (page.title) {
        this.extractFromText(page.title, 'title', keywordMap, 3); // Higher weight for titles
      }

      // Extract from meta description
      if (page.metaDescription) {
        this.extractFromText(page.metaDescription, 'meta', keywordMap, 2);
      }

      // Extract from H1 tags
      if (page.h1Tags && Array.isArray(page.h1Tags)) {
        page.h1Tags.forEach((h1: string) => {
          this.extractFromText(h1, 'h1', keywordMap, 2.5);
        });
      }

      // Extract from H2 tags
      if (page.h2Tags && Array.isArray(page.h2Tags)) {
        page.h2Tags.forEach((h2: string) => {
          this.extractFromText(h2, 'h2', keywordMap, 2);
        });
      }

      // Extract from meta keywords if present
      if (page.metaKeywords) {
        const keywords = page.metaKeywords.split(',').map((k: string) => k.trim());
        keywords.forEach((keyword: string) => {
          if (keyword) {
            this.addKeyword(keyword, 'meta_keywords', keywordMap, 2);
          }
        });
      }

      // Extract from OG meta tags
      if (page.socialMeta) {
        if (page.socialMeta.ogTitle) {
          this.extractFromText(page.socialMeta.ogTitle, 'og_title', keywordMap, 2);
        }
        if (page.socialMeta.ogDescription) {
          this.extractFromText(page.socialMeta.ogDescription, 'og_desc', keywordMap, 1.5);
        }
      }
    }

    // Convert map to array and calculate scores
    const keywords: ExtractedKeyword[] = [];
    keywordMap.forEach((data, keyword) => {
      const score = this.calculateScore(data.frequency, data.sources.size);
      keywords.push({
        keyword,
        frequency: data.frequency,
        sources: Array.from(data.sources),
        score,
      });
    });

    // Sort by score descending
    keywords.sort((a, b) => b.score - a.score);

    // Return top 50 keywords
    return keywords.slice(0, 50);
  }

  /**
   * Extract keywords from a text string
   */
  private static extractFromText(
    text: string,
    source: string,
    keywordMap: Map<string, { frequency: number; sources: Set<string> }>,
    weight: number = 1
  ): void {
    // Clean and normalize text
    const cleaned = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract n-grams (1-4 words)
    const words = cleaned.split(' ');
    
    // Single words
    words.forEach(word => {
      if (this.isValidKeyword(word)) {
        this.addKeyword(word, source, keywordMap, weight);
      }
    });

    // 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (this.isValidPhrase(phrase)) {
        this.addKeyword(phrase, source, keywordMap, weight * 1.5);
      }
    }

    // 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (this.isValidPhrase(phrase)) {
        this.addKeyword(phrase, source, keywordMap, weight * 1.8);
      }
    }

    // 4-word phrases
    for (let i = 0; i < words.length - 3; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]} ${words[i + 3]}`;
      if (this.isValidPhrase(phrase)) {
        this.addKeyword(phrase, source, keywordMap, weight * 2);
      }
    }
  }

  /**
   * Add keyword to map with weighted frequency
   */
  private static addKeyword(
    keyword: string,
    source: string,
    keywordMap: Map<string, { frequency: number; sources: Set<string> }>,
    weight: number
  ): void {
    const existing = keywordMap.get(keyword);
    if (existing) {
      existing.frequency += weight;
      existing.sources.add(source);
    } else {
      keywordMap.set(keyword, {
        frequency: weight,
        sources: new Set([source]),
      });
    }
  }

  /**
   * Check if a single word is valid for keyword extraction
   */
  private static isValidKeyword(word: string): boolean {
    // Must be at least 3 characters
    if (word.length < 3) return false;

    // Filter out common stop words
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'was',
      'has', 'had', 'his', 'her', 'its', 'our', 'out', 'who', 'get', 'about',
      'which', 'their', 'will', 'what', 'when', 'make', 'than', 'them', 'been',
      'have', 'from', 'with', 'this', 'that', 'would', 'there', 'into', 'also',
      'more', 'some', 'could', 'other', 'your', 'such', 'just', 'should',
      'these', 'those', 'through', 'being', 'where', 'after', 'above', 'before',
      'below', 'during', 'against', 'between', 'under', 'again', 'further',
      'then', 'once', 'here', 'why', 'how', 'both', 'each', 'few', 'most',
      'same', 'very', 'only', 'own', 'because', 'while', 'does', 'doing',
      'until', 'since', 'upon', 'therefore', 'though', 'however', 'yet', 'still',
    ]);

    return !stopWords.has(word);
  }

  /**
   * Check if a phrase is valid for keyword extraction
   */
  private static isValidPhrase(phrase: string): boolean {
    // Must be at least 6 characters total
    if (phrase.length < 6) return false;

    // Must not start or end with a stop word for multi-word phrases
    const words = phrase.split(' ');
    const firstWord = words[0];
    const lastWord = words[words.length - 1];

    const startStopWords = new Set(['the', 'and', 'for', 'are', 'but', 'with', 'from', 'into', 'onto']);
    
    if (startStopWords.has(firstWord) || startStopWords.has(lastWord)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate keyword score based on frequency and source diversity
   */
  private static calculateScore(frequency: number, sourceCount: number): number {
    // Base score from frequency
    let score = frequency;

    // Bonus for appearing in multiple sources
    score += sourceCount * 5;

    // Normalize to 0-100 range (roughly)
    return Math.min(100, Math.round(score));
  }

  /**
   * Generate suggested keywords based on niche/topic
   */
  static suggestKeywords(niche: string, count: number = 10): string[] {
    // This is a simple implementation - in production, you might use an AI model or API
    const templates = [
      `best ${niche} tools`,
      `${niche} guide`,
      `${niche} tips`,
      `${niche} for beginners`,
      `${niche} tutorial`,
      `how to ${niche}`,
      `${niche} strategies`,
      `${niche} techniques`,
      `${niche} examples`,
      `${niche} best practices`,
      `${niche} comparison`,
      `${niche} review`,
      `${niche} vs`,
      `learn ${niche}`,
      `${niche} checklist`,
    ];

    return templates.slice(0, count);
  }
}
