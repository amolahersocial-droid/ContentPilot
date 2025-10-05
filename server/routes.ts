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
import { getRazorpayInstance } from "./services/razorpay";
import { contentGenerationQueue, publishingQueue } from "./queue";
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

// Razorpay payment integration
const RAZORPAY_PLAN_ID = process.env.RAZORPAY_PLAN_ID || "";

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

  app.post("/api/keywords/auto-generate/:siteId", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const site = await storage.getSiteById(req.params.siteId);
      if (!site || site.userId !== req.user.id) {
        return res.status(404).json({ message: "Site not found" });
      }

      if (!site.crawlData) {
        return res.status(400).json({ message: "No crawl data available. Please crawl the site first." });
      }

      const { KeywordExtractor } = await import("./services/keyword-extractor");
      const extractedKeywords = KeywordExtractor.extractFromCrawlData(site.crawlData);

      // Create top keywords in database
      const createdKeywords = [];
      const limit = req.user.subscriptionPlan === "free" ? 10 : 30; // Free users get top 10, paid get top 30
      
      for (const kw of extractedKeywords.slice(0, limit)) {
        // Check if keyword already exists for this user
        const existing = await storage.getKeywordsByUserId(req.user.id);
        const alreadyExists = existing.some(k => k.keyword.toLowerCase() === kw.keyword.toLowerCase());
        
        if (!alreadyExists) {
          const created = await storage.createKeyword({
            userId: req.user.id,
            siteId: site.id,
            keyword: kw.keyword,
            searchVolume: null,
            difficulty: null,
            relevanceScore: kw.score,
            overallScore: kw.score,
            isPinned: false,
          });
          createdKeywords.push(created);
        }
      }

      return res.json({
        message: `Generated ${createdKeywords.length} keywords from crawled data`,
        keywords: createdKeywords,
        totalExtracted: extractedKeywords.length,
      });
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
      const { keywordId, siteId, wordCount, generateImages, publishImmediately } = req.body;

      // Check daily limits for free plan
      const now = new Date();
      if (req.user.subscriptionPlan === "free") {
        if (req.user.dailyPostsUsed >= 3) {
          return res.status(403).json({ message: "Free plan limited to 3 posts per day. Upgrade for unlimited." });
        }
      }

      // Verify keyword exists and belongs to user
      if (keywordId) {
        const keyword = await storage.getKeywordById(keywordId);
        if (!keyword || keyword.userId !== req.user.id) {
          return res.status(404).json({ message: "Keyword not found" });
        }
      }

      // Verify site exists and belongs to user
      const site = await storage.getSiteById(siteId);
      if (!site || site.userId !== req.user.id) {
        return res.status(404).json({ message: "Site not found" });
      }

      // Create placeholder post
      const post = await storage.createPost({
        userId: req.user.id,
        siteId,
        keywordId: keywordId || null,
        title: "Generating...",
        content: "",
        status: "draft",
      });

      // Queue content generation job
      const job = await contentGenerationQueue.add({
        postId: post.id,
        userId: req.user.id,
        siteId,
        keywordId,
        wordCount: wordCount || 1500,
        generateImages: generateImages && req.user.subscriptionPlan === "paid",
        publishImmediately: publishImmediately || false,
      });

      // Update daily posts counter
      await storage.updateUser(req.user.id, {
        dailyPostsUsed: req.user.dailyPostsUsed + 1,
        lastPostResetDate: now,
      });

      return res.status(202).json({ 
        post, 
        jobId: job.id,
        message: "Content generation started. Check job status for progress." 
      });
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

      // Queue publishing job
      const job = await publishingQueue.add({
        postId: post.id,
        userId: req.user.id,
        siteId: post.siteId,
      });

      // Update post status to scheduled
      await storage.updatePost(req.params.id, {
        status: "scheduled",
        scheduledFor: new Date(),
      });

      return res.json({ 
        message: "Publishing queued",
        jobId: job.id,
        post
      });
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

      let prospects: any[] = [];
      
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

  // Job status endpoints
  app.get("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const job = await contentGenerationQueue.getJob(req.params.id) || 
                  await publishingQueue.getJob(req.params.id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const state = await job.getState();
      const progress = job.progress();
      const result = job.returnvalue;
      const error = job.failedReason;

      return res.json({
        id: job.id,
        state,
        progress,
        result,
        error,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Razorpay payment endpoints
  app.post("/api/subscriptions/create", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ message: "Payment service not configured. Please ask admin to add Razorpay credentials." });
      }

      const razorpay = getRazorpayInstance();
      
      const subscription = await razorpay.createSubscription({
        planId: RAZORPAY_PLAN_ID,
        customerId: req.user.razorpayCustomerId || undefined,
        customerEmail: req.user.email,
        customerName: req.user.username,
      });

      // Update user with Razorpay customer ID
      if (!req.user.razorpayCustomerId) {
        await storage.updateUser(req.user.id, {
          razorpayCustomerId: subscription.customerId,
        });
      }

      return res.json({
        subscriptionId: subscription.subscriptionId,
        shortUrl: subscription.shortUrl,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/subscriptions/verify", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const { paymentId, subscriptionId, signature } = req.body;

      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ message: "Payment service not configured" });
      }

      const razorpay = getRazorpayInstance();
      
      const isValid = razorpay.verifyPaymentSignature({
        paymentId,
        subscriptionId,
        signature,
      });

      if (!isValid) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      // Get subscription details
      const subscription = await razorpay.getSubscription(subscriptionId);

      // Update user subscription
      await storage.updateUser(req.user.id, {
        subscriptionPlan: "paid",
        razorpaySubscriptionId: subscriptionId,
        subscriptionExpiresAt: new Date(subscription.end_at * 1000),
      });

      return res.json({ 
        message: "Subscription activated successfully",
        plan: "paid",
        expiresAt: new Date(subscription.end_at * 1000),
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/subscriptions/cancel", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      if (!req.user.razorpaySubscriptionId) {
        return res.status(400).json({ message: "No active subscription" });
      }

      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ message: "Payment service not configured" });
      }

      const razorpay = getRazorpayInstance();
      
      await razorpay.cancelSubscription(req.user.razorpaySubscriptionId);

      // Update user subscription
      await storage.updateUser(req.user.id, {
        subscriptionPlan: "free",
        razorpaySubscriptionId: null,
        subscriptionExpiresAt: null,
      });

      return res.json({ message: "Subscription cancelled successfully" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/webhooks/razorpay", async (req, res) => {
    try {
      const { event, payload } = req.body;

      // Verify webhook signature (in production, verify using Razorpay webhook secret)
      // const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      // const signature = req.headers['x-razorpay-signature'];
      // Verify signature here...

      switch (event) {
        case "subscription.charged":
          // Subscription payment successful, extend expiry
          const subscriptionId = payload.subscription.entity.id;
          const users = await storage.getAllUsers();
          const user = users.find(u => u.razorpaySubscriptionId === subscriptionId);
          
          if (user) {
            await storage.updateUser(user.id, {
              subscriptionExpiresAt: new Date(payload.subscription.entity.end_at * 1000),
            });
          }
          break;

        case "subscription.cancelled":
        case "subscription.halted":
          // Subscription cancelled, revert to free plan
          const cancelledSubscriptionId = payload.subscription.entity.id;
          const allUsers = await storage.getAllUsers();
          const cancelledUser = allUsers.find(u => u.razorpaySubscriptionId === cancelledSubscriptionId);
          
          if (cancelledUser) {
            await storage.updateUser(cancelledUser.id, {
              subscriptionPlan: "free",
              razorpaySubscriptionId: null,
              subscriptionExpiresAt: null,
            });
          }
          break;
      }

      return res.json({ status: "ok" });
    } catch (error: any) {
      console.error("Razorpay webhook error:", error);
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
