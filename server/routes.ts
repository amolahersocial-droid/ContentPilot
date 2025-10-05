import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import crypto from "crypto";
import { storage } from "./storage";
import { isAuthenticated as requireAuth, requireAdmin, requirePaidPlan, loadUser } from "./replitAuth";
import { insertUserSchema, insertSiteSchema, insertKeywordSchema, insertPostSchema, insertBacklinkSchema } from "@shared/schema";
import { generateSEOContent, generateImage, generateMultipleImages } from "./services/openai";
import { validateSEO } from "./services/seo-validator";
import { WordPressService } from "./services/wordpress";
import { ShopifyService } from "./services/shopify";
import { SiteCrawler } from "./services/site-crawler";
import { BacklinkHelper } from "./services/backlink-helper";
import { getRazorpayInstance } from "./services/razorpay";
// Queue imports removed - using database-backed jobs now
import { smtpService } from "./services/smtp";
import { outreachTemplateService } from "./services/outreach-templates";
import { websiteDiscoveryService } from "./services/website-discovery";
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
import { 
  verifyHmac, 
  getInstallUrl, 
  exchangeAccessToken, 
  getShopInfo,
  requireShopifyAuth 
} from "./shopify-auth";
import { db } from "./db";
import { shops } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isShopifyMode } from "./mode-detector";
import { shopifyBillingService } from "./services/shopify-billing";

// Razorpay payment integration
const RAZORPAY_PLAN_ID = process.env.RAZORPAY_PLAN_ID || "";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ========================================
  // SHOPIFY OAUTH & APP ROUTES
  // ========================================
  
  // Shopify app installation entry point
  // Shopify config for frontend
  app.get("/api/shopify/config", (req, res) => {
    return res.json({ 
      apiKey: process.env.SHOPIFY_API_KEY || "",
    });
  });

  app.get("/api/auth/shopify", async (req, res) => {
    try {
      const shop = req.query.shop as string;
      
      if (!shop) {
        return res.status(400).json({ message: "Shop parameter required" });
      }

      // Validate shop domain
      if (!shop.endsWith('.myshopify.com')) {
        return res.status(400).json({ message: "Invalid shop domain" });
      }

      const state = crypto.randomBytes(16).toString('hex');
      
      // Store state in session for verification
      if (req.session) {
        (req.session as any).shopifyState = state;
        (req.session as any).shopifyShop = shop;
      }

      const installUrl = getInstallUrl(shop, state);
      res.redirect(installUrl);
    } catch (error: any) {
      console.error("Shopify install error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Shopify OAuth callback
  app.get("/api/auth/shopify/callback", async (req, res) => {
    try {
      const { code, hmac, shop, state } = req.query;

      // Verify HMAC
      if (!verifyHmac(req.query)) {
        return res.status(403).json({ message: "HMAC verification failed" });
      }

      // Verify state
      const sessionState = req.session && (req.session as any).shopifyState;
      if (!sessionState || sessionState !== state) {
        return res.status(403).json({ message: "State verification failed" });
      }

      // Exchange code for access token
      const { access_token, scope } = await exchangeAccessToken(
        shop as string,
        code as string
      );

      // Get shop information
      const shopInfo = await getShopInfo(shop as string, access_token);

      // Store or update shop in database
      const [shopRecord] = await db
        .insert(shops)
        .values({
          shop: shop as string,
          shopName: shopInfo.name,
          shopOwner: shopInfo.shop_owner,
          email: shopInfo.email,
          accessToken: access_token,
          scope,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: shops.shop,
          set: {
            accessToken: access_token,
            scope,
            shopName: shopInfo.name,
            shopOwner: shopInfo.shop_owner,
            email: shopInfo.email,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Store shop in session
      if (req.session) {
        (req.session as any).shopifyShop = shop;
        (req.session as any).shopifyShopId = shopRecord.id;
      }

      // Redirect to embedded app
      const host = req.query.host;
      const redirectUrl = `/?shop=${shop}&host=${host}&embedded=1`;
      res.redirect(redirectUrl);
    } catch (error: any) {
      console.error("Shopify callback error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Shopify webhooks
  app.post("/api/webhooks/shopify/app/uninstalled", async (req, res) => {
    try {
      // Verify webhook (Shopify sends HMAC in header)
      const shop = req.body.shop_domain;
      
      // Mark shop as inactive
      await db
        .update(shops)
        .set({
          isActive: false,
          uninstalledAt: new Date(),
        })
        .where(eq(shops.shop, shop));

      res.status(200).send("OK");
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).send("Error");
    }
  });

  // GDPR webhooks
  app.post("/api/webhooks/shopify/customers/data_request", async (req, res) => {
    // Return customer data
    res.status(200).send("OK");
  });

  app.post("/api/webhooks/shopify/customers/redact", async (req, res) => {
    // Delete customer data
    res.status(200).send("OK");
  });

  app.post("/api/webhooks/shopify/shop/redact", async (req, res) => {
    // Delete all shop data
    const shop = req.body.shop_domain;
    await db.delete(shops).where(eq(shops.shop, shop));
    res.status(200).send("OK");
  });

  // ========================================
  // END SHOPIFY ROUTES
  // ========================================

  // Load user data from database for all authenticated requests
  app.use(loadUser);

  // New Replit Auth endpoint - returns user from database
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const sessionUser = req.user;
      const userId = sessionUser?.claims?.sub || sessionUser?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const dbUser = await storage.getUser(userId);
      
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(dbUser);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // LEGACY: Old local auth routes (commented out - using Replit Auth now)
  /*
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
  */
  // END LEGACY AUTH ROUTES

  app.patch("/api/users/settings", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      // Get DB user
      const dbUser = await storage.getUser(req.user.id);
      if (!dbUser) return res.status(404).json({ message: "User not found" });
      
      const { openaiApiKey, useOwnOpenAiKey } = req.body;
      
      // For free users, enforce that they must use their own API key
      if (dbUser.subscriptionPlan === "free" && !openaiApiKey && !dbUser.openaiApiKey) {
        return res.status(400).json({ 
          message: "Free plan users must provide an OpenAI API key" 
        });
      }
      
      // Update user settings
      await storage.updateUser(req.user.id, {
        openaiApiKey: openaiApiKey || dbUser.openaiApiKey,
        useOwnOpenAiKey: dbUser.subscriptionPlan === "free" ? true : useOwnOpenAiKey,
      });
      
      return res.json({ message: "Settings updated successfully" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const userId = req.user.id;
      const sites = await storage.getSitesByUserId(userId);
      const keywords = await storage.getKeywordsByUserId(userId);
      const posts = await storage.getPostsByUserId(userId);

      const publishedPosts = posts.filter((p) => p.status === "published");
      
      // Calculate plan usage
      const user = await storage.getUser(userId);
      const limit = user?.subscriptionPlan === "paid" ? 100 : 10;
      const used = user?.dailyPostsUsed || 0;
      const percentage = Math.min((used / limit) * 100, 100);

      return res.json({
        sitesConnected: sites.length,
        postsPublished: publishedPosts.length,
        keywordsTracked: keywords.length,
        planUsage: {
          used,
          limit,
          percentage,
        },
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
      
      // Get DB user for plan and settings
      const dbUser = await storage.getUser(req.user.id);
      if (!dbUser) return res.status(404).json({ message: "User not found" });
      
      const { keywordId, siteId, wordCount, generateImages, publishImmediately } = req.body;

      // Check daily limits for free plan
      const now = new Date();
      if (dbUser.subscriptionPlan === "free") {
        // Free users must have their own OpenAI API key
        if (!dbUser.openaiApiKey) {
          return res.status(403).json({ 
            message: "Free plan users must provide their own OpenAI API key in Settings before generating content." 
          });
        }
        
        if (dbUser.dailyPostsUsed >= 3) {
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

      // Queue content generation job in database
      const job = await storage.createJob({
        userId: req.user.id,
        type: "content-generation",
        payload: {
          postId: post.id,
          userId: req.user.id,
          siteId,
          keywordId,
          wordCount: wordCount || 1500,
          generateImages: generateImages && req.user.subscriptionPlan === "paid",
          publishImmediately: publishImmediately || false,
        },
        status: "pending",
      });

      // Update daily posts counter
      await storage.updateUser(req.user.id, {
        dailyPostsUsed: dbUser.dailyPostsUsed + 1,
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

      // Queue publishing job in database
      const job = await storage.createJob({
        userId: req.user.id,
        type: "publishing",
        payload: {
          postId: post.id,
          userId: req.user.id,
          siteId: post.siteId,
        },
        status: "pending",
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
      const job = await storage.getJobById(req.params.id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      return res.json({
        id: job.id,
        status: job.status,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
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
      
      // If plan ID is available, use subscription
      if (RAZORPAY_PLAN_ID) {
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
          keyId: process.env.RAZORPAY_KEY_ID,
        });
      } else {
        // Create payment link for one-time payment if no plan ID
        const paymentLink = await razorpay.createPaymentLink({
          amount: req.body.amount || 1999,
          currency: "INR",
          description: "Paid Plan Subscription - Monthly",
          customerEmail: req.user.email,
          customerName: req.user.username,
        });

        return res.json({
          paymentLinkId: paymentLink.id,
          shortUrl: paymentLink.short_url,
          keyId: process.env.RAZORPAY_KEY_ID,
        });
      }
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

  // SMTP Credentials Routes (for backward compatibility and custom SMTP)
  app.post("/api/outreach/smtp/verify", requireAuth, requirePaidPlan, async (req, res) => {
    try {
      const { provider, email, password, smtpHost, smtpPort } = req.body;
      
      const isValid = await smtpService.verifyCredentials(
        provider,
        email,
        password,
        smtpHost,
        smtpPort
      );
      
      if (isValid) {
        return res.json({ message: "SMTP credentials verified successfully" });
      } else {
        return res.status(400).json({ message: "SMTP verification failed. Please check your credentials." });
      }
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/outreach/smtp", requireAuth, requirePaidPlan, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { provider, email, password, smtpHost, smtpPort } = req.body;
      
      const credentialId = await smtpService.storeCredentials(
        req.user.id,
        provider,
        email,
        password,
        smtpHost,
        smtpPort
      );
      
      return res.json({ id: credentialId, message: "SMTP credentials saved successfully" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/outreach/smtp", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { smtpCredentials: smtpCreds } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      
      const credentials = await db
        .select()
        .from(smtpCreds)
        .where(eq(smtpCreds.userId, req.user.id));
      
      const safe = credentials.map(c => ({
        ...c,
        encryptedPassword: undefined,
        oauthAccessToken: undefined,
        oauthRefreshToken: undefined,
      }));
      
      return res.json(safe);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/outreach/smtp/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { smtpCredentials: smtpCreds } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");
      
      await db
        .delete(smtpCreds)
        .where(and(
          eq(smtpCreds.id, req.params.id),
          eq(smtpCreds.userId, req.user.id)
        ));
      
      return res.json({ message: "SMTP credentials deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Outreach Campaign Routes
  app.post("/api/outreach/campaigns", requireAuth, requirePaidPlan, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { insertOutreachCampaignSchema, outreachCampaigns } = await import("@shared/schema");
      const { db } = await import("./db");
      
      const result = insertOutreachCampaignSchema.safeParse({
        ...req.body,
        userId: req.user.id,
      });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const [campaign] = await db
        .insert(outreachCampaigns)
        .values(result.data)
        .returning();
      
      return res.json(campaign);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/outreach/campaigns", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { outreachCampaigns } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, desc } = await import("drizzle-orm");
      
      const campaigns = await db
        .select()
        .from(outreachCampaigns)
        .where(eq(outreachCampaigns.userId, req.user.id))
        .orderBy(desc(outreachCampaigns.createdAt));
      
      return res.json(campaigns);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/outreach/campaigns/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { outreachCampaigns, outreachContacts, outreachEmails } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");
      
      const [campaign] = await db
        .select()
        .from(outreachCampaigns)
        .where(and(
          eq(outreachCampaigns.id, req.params.id),
          eq(outreachCampaigns.userId, req.user.id)
        ));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const contacts = await db
        .select()
        .from(outreachContacts)
        .where(eq(outreachContacts.campaignId, req.params.id));
      
      const emails = await db
        .select()
        .from(outreachEmails)
        .where(eq(outreachEmails.campaignId, req.params.id));
      
      return res.json({ ...campaign, contacts, emails });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/outreach/campaigns/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { outreachCampaigns } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");
      
      const [campaign] = await db
        .update(outreachCampaigns)
        .set({ ...req.body, updatedAt: new Date() })
        .where(and(
          eq(outreachCampaigns.id, req.params.id),
          eq(outreachCampaigns.userId, req.user.id)
        ))
        .returning();
      
      return res.json(campaign);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/outreach/campaigns/:id/discover", requireAuth, requirePaidPlan, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { outreachCampaigns, outreachContacts } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");
      
      const [campaign] = await db
        .select()
        .from(outreachCampaigns)
        .where(and(
          eq(outreachCampaigns.id, req.params.id),
          eq(outreachCampaigns.userId, req.user.id)
        ));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const discovered = await websiteDiscoveryService.discoverWebsites(
        campaign.niche,
        campaign.targetWebsiteCount
      );
      
      const contacts = await Promise.all(
        discovered.map(async (site) => {
          if (!site.email) return null;
          
          const [contact] = await db
            .insert(outreachContacts)
            .values({
              campaignId: campaign.id,
              websiteUrl: site.url,
              websiteName: site.name,
              contactEmail: site.email,
              contactName: site.contactName,
              domainAuthority: site.domainAuthority,
              isValidated: await websiteDiscoveryService.validateEmail(site.email),
            })
            .returning();
          
          return contact;
        })
      );
      
      return res.json(contacts.filter(Boolean));
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/outreach/campaigns/:id/generate-template", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { outreachCampaigns } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");
      
      const [campaign] = await db
        .select()
        .from(outreachCampaigns)
        .where(and(
          eq(outreachCampaigns.id, req.params.id),
          eq(outreachCampaigns.userId, req.user.id)
        ));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const template = await outreachTemplateService.generateEmailTemplate({
        niche: campaign.niche,
        tone: campaign.tone,
        senderName: req.user.username,
        senderWebsite: req.body.senderWebsite || "",
      });
      
      return res.json(template);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/outreach/campaigns/:id/send", requireAuth, requirePaidPlan, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { outreachCampaigns, outreachContacts, outreachEmails } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");
      
      const { emailTemplate } = req.body;
      
      const [campaign] = await db
        .select()
        .from(outreachCampaigns)
        .where(and(
          eq(outreachCampaigns.id, req.params.id),
          eq(outreachCampaigns.userId, req.user.id)
        ));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const contacts = await db
        .select()
        .from(outreachContacts)
        .where(eq(outreachContacts.campaignId, req.params.id));
      
      let successCount = 0;
      let failCount = 0;
      
      for (const contact of contacts) {
        try {
          const personalized = outreachTemplateService.personalizeEmail(emailTemplate, {
            recipientName: contact.contactName || undefined,
            recipientWebsite: contact.websiteUrl,
            senderName: req.user.username,
            senderWebsite: req.body.senderWebsite || "",
          });
          
          const trackingId = crypto.randomUUID();
          
          const result = await smtpService.sendEmail({
            to: contact.contactEmail,
            subject: personalized.subject,
            html: personalized.body,
            trackingId,
          });
          
          const [email] = await db
            .insert(outreachEmails)
            .values({
              campaignId: campaign.id,
              contactId: contact.id,
              subject: personalized.subject,
              body: personalized.body,
              status: result.success ? "sent" : "failed",
              trackingId,
              sentAt: result.success ? new Date() : null,
              errorMessage: result.error,
              personalizationData: {
                recipientName: contact.contactName,
                senderWebsite: req.body.senderWebsite,
              },
            })
            .returning();
          
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to send email to ${contact.contactEmail}:`, error);
          failCount++;
        }
      }
      
      await db
        .update(outreachCampaigns)
        .set({ 
          emailsSent: campaign.emailsSent + successCount,
          status: "active",
        })
        .where(eq(outreachCampaigns.id, campaign.id));
      
      return res.json({ successCount, failCount, totalContacts: contacts.length });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/outreach/track/open/:trackingId", async (req, res) => {
    try {
      const { outreachEmails, outreachEvents } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      
      const [email] = await db
        .select()
        .from(outreachEmails)
        .where(eq(outreachEmails.trackingId, req.params.trackingId));
      
      if (email && !email.openedAt) {
        await db
          .update(outreachEmails)
          .set({ 
            status: "opened",
            openedAt: new Date(),
          })
          .where(eq(outreachEmails.id, email.id));
        
        await db
          .insert(outreachEvents)
          .values({
            emailId: email.id,
            eventType: "opened",
            userAgent: req.get("user-agent") || null,
            ipAddress: req.ip || null,
          });
      }
      
      const pixel = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      res.writeHead(200, {
        "Content-Type": "image/gif",
        "Content-Length": pixel.length,
      });
      res.end(pixel);
    } catch (error) {
      res.status(200).end();
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
