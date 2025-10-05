// Additional type definitions for the application

export interface DashboardStats {
  sitesConnected: number;
  postsPublished: number;
  keywordsTracked: number;
  planUsage: {
    used: number;
    limit: number;
    percentage: number;
  };
}

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  contentGeneratedToday: number;
}

export interface SeoValidationResult {
  readabilityScore: number;
  readabilityGrade: string;
  metaTitleLength: number;
  metaDescriptionLength: number;
  headingStructureValid: boolean;
  keywordDensity: number;
  altTagsCoverage: number;
  duplicateContentScore: number;
  mobileResponsive: boolean;
  lighthouseScore: number;
  overallSeoScore: number;
  validationErrors: Array<{
    field: string;
    message: string;
    severity: "error" | "warning" | "info";
  }>;
}

export interface GeneratedContent {
  title: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  headings: Array<{ level: number; text: string }>;
  images: Array<{
    url: string;
    altText: string;
    caption?: string;
  }>;
  internalLinks: Array<{
    text: string;
    url: string;
  }>;
}

export interface CrawlData {
  urls: string[];
  titles: Record<string, string>;
  headings: Record<string, string[]>;
  metadata: Record<string, any>;
  internalLinks: Record<string, string[]>;
  keywords: string[];
}
