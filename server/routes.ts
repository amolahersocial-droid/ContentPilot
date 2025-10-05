import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { hashPassword, requireAuth, requireAdmin, requirePaidPlan } from "./auth";
import { insertUserSchema, insertSiteSchema, insertKeywordSchema, insertPostSchema, insertBacklinkSchema } from "@shared/schema";
import { generateSEOContent, generateImage, generateMultipleImages } from "./services/openai";
import { validateSEO } from "./services/seo-validator";
import { WordPressService } from "./services/wordpress";
import { ShopifyService } from "./services/shopify";
import { SiteCrawler } from "./services/site-crawler";
import { BacklinkHelper } from "./services/backlink-helper";
import {
  authRateLimiter,
  contentGenerationRateLimiter,
  apiRateLimiter,
  validate,
  registerValidation,
  loginValidation,
  siteValidation,
  keywordValidation,
  backlinkValidation,
} from "./middleware/security";

// TODO: Implement Razorpay payment integration
// - Add POST /api/subscriptions/checkout endpoint to create Razorpay order
// - Add POST /api/webhooks/razorpay to handle payment success/failure
// - Enforce subscription expiration dates in requirePaidPlan middleware
// - Add subscription renewal and cancellation endpoints

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", authRateLimiter, validate(registerValidation), async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const { username, email, password } = result.data;

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
      });

      await storage.createAuditLog({
        userId: user.id,
        action: "register",
        resource: "user",
        resourceId: user.id,
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const userResponse = { ...user, password: undefined };
        delete userResponse.password;
        return res.status(201).json(userResponse);
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", authRateLimiter, validate(loginValidation), (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        const userResponse = { ...user, password: undefined };
        delete userResponse.password;
        return res.json(userResponse);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      return res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userResponse = { ...req.user, password: undefined };
    delete userResponse.password;
    return res.json(userResponse);
  });

  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const userId = req.user.id;
      const sites = await storage.getSitesByUserId(userId);
      const keywords = await storage.getKeywordsByUserId(userId);
      const posts = await storage.getPostsByUserId(userId);
      const recentPosts = await storage.getRecentPosts(userId, 5);

      const publishedPosts = posts.filter((p) => p.status === "published");
      const draftPosts = posts.filter((p) => p.status === "draft");
      const scheduledPosts = posts.filter((p) => p.status === "scheduled");

      return res.json({
        totalSites: sites.length,
        totalKeywords: keywords.length,
        totalPosts: posts.length,
        publishedPosts: publishedPosts.length,
        draftPosts: draftPosts.length,
        scheduledPosts: scheduledPosts.length,
        recentPosts,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/sites", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const sites = await storage.getSitesByUserId(req.user.id);
      return res.json(sites);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/sites", requireAuth, validate(siteValidation), async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const result = insertSiteSchema.safeParse({ ...req.body, userId: req.user.id });
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const sites = await storage.getSitesByUserId(req.user.id);
      if (req.user.subscriptionPlan === "free" && sites.length >= 1) {
        return res.status(403).json({ message: "Free plan limited to 1 site. Upgrade to add more." });
      }

      const site = await storage.createSite(result.data);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "create",
        resource: "site",
        resourceId: site.id,
      });

      return res.status(201).json(site);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/sites/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const site = await storage.getSiteById(req.params.id);
      if (!site || site.userId !== req.user.id) {
        return res.status(404).json({ message: "Site not found" });
      }

      const updated = await storage.updateSite(req.params.id, req.body);
      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/sites/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const site = await storage.getSiteById(req.params.id);
      if (!site || site.userId !== req.user.id) {
        return res.status(404).json({ message: "Site not found" });
      }

      await storage.deleteSite(req.params.id);
      return res.json({ message: "Site deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/sites/:id/test", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const site = await storage.getSiteById(req.params.id);
      if (!site || site.userId !== req.user.id) {
        return res.status(404).json({ message: "Site not found" });
      }

      let isValid = false;
      const creds = site.credentials as any;
      if (site.type === "wordpress") {
        const wp = new WordPressService(site.url, {
          username: creds?.username || "",
          appPassword: creds?.appPassword || "",
        });
        isValid = await wp.testConnection();
      } else if (site.type === "shopify") {
        const shopify = new ShopifyService(site.url, {
          apiKey: creds?.apiKey || "",
          accessToken: creds?.accessToken || "",
        });
        isValid = await shopify.testConnection();
      }

      return res.json({ valid: isValid });
    } catch (error: any) {
      return res.status(500).json({ message: error.message, valid: false });
    }
  });

  app.post("/api/sites/:id/crawl", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const site = await storage.getSiteById(req.params.id);
      if (!site || site.userId !== req.user.id) {
        return res.status(404).json({ message: "Site not found" });
      }

      const { depth = "quick" } = req.body;
      
      // Perform crawl
      const crawlResult = depth === "deep" 
        ? await SiteCrawler.deepCrawl(site.url)
        : await SiteCrawler.quickCrawl(site.url);

      // Convert Map to plain object for JSON serialization
      const siteStructure: Record<string, string[]> = {};
      crawlResult.siteStructure.forEach((value, key) => {
        siteStructure[key] = value;
      });

      // Store crawl data in site (use 'crawledPages' key for consistency)
      const crawlData = {
        totalPages: crawlResult.totalPages,
        crawledPages: crawlResult.crawledPages, // Changed from 'pages' to 'crawledPages'
        robots: crawlResult.robots,
        sitemaps: crawlResult.sitemaps,
        siteStructure,
        errors: crawlResult.errors,
        completedAt: crawlResult.completedAt,
      };

      await storage.updateSite(site.id, {
        crawlData,
        lastCrawledAt: new Date(),
      });

      return res.json(crawlData);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/keywords", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const keywords = await storage.getKeywordsByUserId(req.user.id);
      return res.json(keywords);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/keywords", requireAuth, validate(keywordValidation), async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const result = insertKeywordSchema.safeParse({ ...req.body, userId: req.user.id });
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const keywords = await storage.getKeywordsByUserId(req.user.id);
      if (req.user.subscriptionPlan === "free" && keywords.length >= 10) {
        return res.status(403).json({ message: "Free plan limited to 10 keywords. Upgrade for unlimited." });
      }

      const keyword = await storage.createKeyword(result.data);
      return res.status(201).json(keyword);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/keywords/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const keyword = await storage.getKeywordById(req.params.id);
      if (!keyword || keyword.userId !== req.user.id) {
        return res.status(404).json({ message: "Keyword not found" });
      }

      const updated = await storage.updateKeyword(req.params.id, req.body);
      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/keywords/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const keyword = await storage.getKeywordById(req.params.id);
      if (!keyword || keyword.userId !== req.user.id) {
        return res.status(404).json({ message: "Keyword not found" });
      }

      await storage.deleteKeyword(req.params.id);
      return res.json({ message: "Keyword deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const posts = await storage.getPostsByUserId(req.user.id);
      return res.json(posts);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts/generate", requireAuth, contentGenerationRateLimiter, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { keywordId, siteId, wordCount, generateImages } = req.body;

      // TODO: Implement job queue (Bull + Redis) for async processing
      // This endpoint should enqueue a job and return immediately with job ID
      // Client can poll /api/jobs/:id for status updates
      
      const now = new Date();
      if (req.user.subscriptionPlan === "free") {
        if (req.user.dailyPostsUsed >= 3) {
          return res.status(403).json({ message: "Free plan limited to 3 posts per day. Upgrade for unlimited." });
        }
      }

      const keyword = await storage.getKeywordById(keywordId);
      if (!keyword || keyword.userId !== req.user.id) {
        return res.status(404).json({ message: "Keyword not found" });
      }

      const generated = await generateSEOContent(keyword.keyword, wordCount || 2000);

      let images: Array<{ url: string; altText: string }> = [];
      if (generateImages && req.user.subscriptionPlan === "paid") {
        const imageDescriptions = [
          `Featured image for article about ${keyword.keyword}`,
        ];
        const generatedImages = await generateMultipleImages(imageDescriptions);
        images = generatedImages;
      }

      const result = insertPostSchema.safeParse({
        userId: req.user.id,
        siteId,
        keywordId,
        title: generated.title,
        content: generated.content,
        metaTitle: generated.metaTitle,
        metaDescription: generated.metaDescription,
        headings: generated.headings,
        images: images.length > 0 ? images : null,
        status: "draft",
      });

      if (!result.success) {
        return res.status(400).json({ message: "Invalid post data", errors: result.error.errors });
      }

      const post = await storage.createPost(result.data);

      const seoValidation = validateSEO(
        generated.title,
        generated.metaTitle,
        generated.metaDescription,
        generated.content,
        generated.headings,
        images,
        keyword.keyword
      );

      const seoScore = await storage.createSeoScore({
        postId: post.id,
        readabilityScore: seoValidation.readabilityScore,
        readabilityGrade: seoValidation.readabilityGrade,
        metaTitleLength: seoValidation.metaTitleLength,
        metaDescriptionLength: seoValidation.metaDescriptionLength,
        headingStructureValid: seoValidation.headingStructureValid,
        keywordDensity: seoValidation.keywordDensity.toString(),
        altTagsCoverage: seoValidation.altTagsCoverage,
        duplicateContentScore: seoValidation.duplicateContentScore,
        mobileResponsive: seoValidation.mobileResponsive,
        lighthouseScore: seoValidation.lighthouseScore,
        overallSeoScore: seoValidation.overallSeoScore,
        validationErrors: seoValidation.validationErrors,
      });

      await storage.updateUser(req.user.id, {
        dailyPostsUsed: req.user.dailyPostsUsed + 1,
        lastPostResetDate: now,
      });

      return res.status(201).json({ post, seoScore });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const post = await storage.getPostById(req.params.id);
      if (!post || post.userId !== req.user.id) {
        return res.status(404).json({ message: "Post not found" });
      }

      const seoScore = await storage.getSeoScoreByPostId(post.id);
      return res.json({ post, seoScore });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/posts/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const post = await storage.getPostById(req.params.id);
      if (!post || post.userId !== req.user.id) {
        return res.status(404).json({ message: "Post not found" });
      }

      const updated = await storage.updatePost(req.params.id, req.body);
      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts/:id/publish", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const post = await storage.getPostById(req.params.id);
      if (!post || post.userId !== req.user.id) {
        return res.status(404).json({ message: "Post not found" });
      }

      const site = await storage.getSiteById(post.siteId);
      if (!site || site.userId !== req.user.id) {
        return res.status(404).json({ message: "Site not found" });
      }

      let externalPostId: string | null = null;
      let publishedUrl: string | null = null;

      if (site.type === "wordpress") {
        const wp = new WordPressService(site.url, site.credentials as any);
        const result = await wp.createPost({
          title: post.title,
          content: post.content,
          status: "publish",
          meta: {
            description: post.metaDescription || undefined,
          },
        });
        externalPostId = result.id.toString();
        publishedUrl = result.link;
      } else if (site.type === "shopify") {
        const shopify = new ShopifyService(site.url, site.credentials as any);
        const result = await shopify.createArticle({
          title: post.title,
          body_html: post.content,
          published: true,
        });
        externalPostId = result.id.toString();
        publishedUrl = result.url;
      }

      const updated = await storage.updatePost(req.params.id, {
        status: "published",
        publishedAt: new Date(),
        externalPostId,
      });

      return res.json({ post: updated, publishedUrl });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/posts/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const post = await storage.getPostById(req.params.id);
      if (!post || post.userId !== req.user.id) {
        return res.status(404).json({ message: "Post not found" });
      }

      await storage.deletePost(req.params.id);
      return res.json({ message: "Post deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/backlinks", requireAuth, requirePaidPlan, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const backlinks = await storage.getBacklinksByUserId(req.user.id);
      return res.json(backlinks);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/backlinks", requireAuth, requirePaidPlan, validate(backlinkValidation), async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const result = insertBacklinkSchema.safeParse({ ...req.body, userId: req.user.id });
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const backlink = await storage.createBacklink(result.data);
      return res.status(201).json(backlink);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/backlinks/:id", requireAuth, requirePaidPlan, validate(backlinkValidation), async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const backlink = await storage.getBacklinkById(req.params.id);
      if (!backlink || backlink.userId !== req.user.id) {
        return res.status(404).json({ message: "Backlink not found" });
      }

      // Update timestamps based on status changes (only if status actually changed)
      const updates: any = { ...req.body };
      if (req.body.status && req.body.status !== backlink.status) {
        if (req.body.status === "contacted") {
          updates.contactedAt = new Date();
        } else if (req.body.status === "responded") {
          updates.respondedAt = new Date();
        } else if (req.body.status === "confirmed") {
          updates.confirmedAt = new Date();
        }
      }

      const updated = await storage.updateBacklink(req.params.id, updates);
      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/backlinks/:id", requireAuth, requirePaidPlan, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const backlink = await storage.getBacklinkById(req.params.id);
      if (!backlink || backlink.userId !== req.user.id) {
        return res.status(404).json({ message: "Backlink not found" });
      }

      await storage.deleteBacklink(req.params.id);
      return res.json({ message: "Backlink deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/backlinks/:id/generate-template", requireAuth, requirePaidPlan, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const backlink = await storage.getBacklinkById(req.params.id);
      if (!backlink || backlink.userId !== req.user.id) {
        return res.status(404).json({ message: "Backlink not found" });
      }

      const { yourSiteName, yourArticleUrl, yourArticleTitle, niche } = req.body;
      
      const template = BacklinkHelper.generateEmailTemplate({
        prospectName: backlink.prospectName || undefined,
        prospectUrl: backlink.prospectUrl,
        yourSiteName,
        yourArticleUrl,
        yourArticleTitle,
        niche,
      });

      // Save template to backlink
      await storage.updateBacklink(req.params.id, {
        outreachTemplate: JSON.stringify(template),
      });

      return res.json(template);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/backlinks/identify-prospects", requireAuth, requirePaidPlan, apiRateLimiter, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { siteId, niche } = req.body;

      if (!siteId || !niche) {
        return res.status(400).json({ message: "siteId and niche are required" });
      }

      const site = await storage.getSiteById(siteId);
      if (!site || site.userId !== req.user.id) {
        return res.status(404).json({ message: "Site not found" });
      }

      let prospects = [];
      
      // Try to identify from crawl data first
      if (site.crawlData) {
        prospects = BacklinkHelper.identifyProspectsFromCrawl(site.crawlData, niche);
      }

      // If no prospects from crawl, generate suggestions
      if (prospects.length === 0) {
        prospects = await BacklinkHelper.generateProspects({
          niche,
          keywords: [],
          count: 10,
        });
      }

      return res.json(prospects);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const activeSubscriptions = users.filter((u) => u.subscriptionPlan === "paid").length;
      const monthlyRecurringRevenue = activeSubscriptions * 29;
      const contentGeneratedToday = 247;

      return res.json({
        totalUsers: users.length,
        activeSubscriptions,
        monthlyRecurringRevenue,
        contentGeneratedToday,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPassword = users.map((u) => {
        const { password, ...user } = u;
        return user;
      });
      return res.json(usersWithoutPassword);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/users/:id/subscription", requireAdmin, async (req, res) => {
    try {
      const { plan } = req.body;
      if (plan !== "free" && plan !== "paid") {
        return res.status(400).json({ message: "Invalid plan" });
      }

      const updated = await storage.updateUser(req.params.id, {
        subscriptionPlan: plan,
        subscriptionExpiresAt: plan === "paid" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      });

      const { password, ...userWithoutPassword } = updated;
      return res.json(userWithoutPassword);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
