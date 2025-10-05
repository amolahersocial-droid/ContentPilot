import Queue from "bull";
import { storage } from "./storage";
import { generateSEOContent, generateMultipleImages } from "./services/openai";
import { validateSEO } from "./services/seo-validator";
import { WordPressService } from "./services/wordpress";
import { ShopifyService } from "./services/shopify";

// Initialize Redis connection
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

console.log(`🔴 Connecting to Redis at: ${REDIS_URL}`);

// Create queues
export const contentGenerationQueue = new Queue("content-generation", REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const publishingQueue = new Queue("publishing", REDIS_URL, {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const scheduledPostQueue = new Queue("scheduled-posts", REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: true,
  },
});

// Add error handlers for all queues
[contentGenerationQueue, publishingQueue, scheduledPostQueue].forEach(queue => {
  queue.on('error', (error) => {
    console.error(`❌ Queue error in ${queue.name}:`, error.message);
  });
  
  queue.on('failed', (job, error) => {
    console.error(`❌ Job failed in ${queue.name}:`, {
      jobId: job.id,
      error: error.message,
      data: job.data
    });
  });
  
  queue.on('completed', (job) => {
    console.log(`✅ Job completed in ${queue.name}:`, job.id);
  });
});

// Job data types
export interface ContentGenerationJob {
  postId: string;
  userId: string;
  siteId: string;
  keywordId: string | null;
  wordCount: number;
  generateImages: boolean;
  publishImmediately?: boolean;
}

export interface PublishingJob {
  postId: string;
  userId: string;
  siteId: string;
}

export interface ScheduledPostJob {
  siteId: string;
  userId: string;
}

// Content Generation Processor
contentGenerationQueue.process(async (job) => {
  const data: ContentGenerationJob = job.data;
  
  try {
    await job.progress(10);
    
    // Get keyword if specified
    let keyword = null;
    if (data.keywordId) {
      keyword = await storage.getKeywordById(data.keywordId);
    }

    await job.progress(20);

    // Generate content
    const content = await generateSEOContent(
      keyword?.keyword || "general topic",
      data.wordCount
    );

    await job.progress(50);

    // Generate images if requested
    let images: Array<{ url: string; altText: string }> = [];
    if (data.generateImages) {
      const imagePrompts = [`Featured image for ${keyword?.keyword || "article"}`];
      images = await generateMultipleImages(imagePrompts);
    }

    await job.progress(70);

    // Validate SEO
    const seoResults = validateSEO(
      content.title,
      content.metaTitle,
      content.metaDescription,
      content.content,
      content.headings,
      images,
      keyword?.keyword || ""
    );

    await job.progress(90);

    // Update post with generated content
    await storage.updatePost(data.postId, {
      title: content.title,
      content: content.content,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      headings: content.headings,
      images,
      status: data.publishImmediately ? "scheduled" : "draft",
      scheduledFor: data.publishImmediately ? new Date() : null,
    });

    // Create SEO score record
    await storage.createSeoScore({
      postId: data.postId,
      readabilityScore: seoResults.readabilityScore,
      readabilityGrade: seoResults.readabilityGrade,
      metaTitleLength: seoResults.metaTitleLength,
      metaDescriptionLength: seoResults.metaDescriptionLength,
      headingStructureValid: seoResults.headingStructureValid,
      keywordDensity: seoResults.keywordDensity.toString(),
      altTagsCoverage: seoResults.altTagsCoverage,
      duplicateContentScore: seoResults.duplicateContentScore,
      mobileResponsive: seoResults.mobileResponsive,
      lighthouseScore: seoResults.lighthouseScore,
      overallSeoScore: seoResults.overallSeoScore,
      validationErrors: seoResults.validationErrors,
    });

    await job.progress(95);

    // If publish immediately, queue publishing job
    if (data.publishImmediately) {
      await publishingQueue.add({
        postId: data.postId,
        userId: data.userId,
        siteId: data.siteId,
      }, {
        delay: 2000, // 2 second delay to ensure content is saved
      });
    }

    await job.progress(100);

    return { postId: data.postId, status: "completed" };
  } catch (error: any) {
    // Update post status to failed
    await storage.updatePost(data.postId, {
      status: "failed",
    });
    throw error;
  }
});

// Publishing Processor
publishingQueue.process(async (job) => {
  const data: PublishingJob = job.data;

  try {
    await job.progress(10);

    const post = await storage.getPostById(data.postId);
    if (!post) throw new Error("Post not found");

    const site = await storage.getSiteById(data.siteId);
    if (!site) throw new Error("Site not found");

    await job.progress(30);

    let externalPostId = "";
    const creds = site.credentials as any;

    if (site.type === "wordpress") {
      const wp = new WordPressService(site.url, {
        username: creds.username,
        appPassword: creds.appPassword,
      });

      await job.progress(50);

      const publishedPost = await wp.createPost({
        title: post.title,
        content: post.content,
        status: "publish",
        meta: {
          description: post.metaDescription || undefined,
        },
      });

      externalPostId = publishedPost.id.toString();
    } else if (site.type === "shopify") {
      const shopify = new ShopifyService(site.url, {
        apiKey: creds.apiKey,
        accessToken: creds.accessToken,
      });

      await job.progress(50);

      const publishedPost = await shopify.createArticle({
        title: post.title,
        body_html: post.content,
        published: true,
      });

      externalPostId = publishedPost.id.toString();
    }

    await job.progress(80);

    // Update post status
    await storage.updatePost(data.postId, {
      status: "published",
      publishedAt: new Date(),
      externalPostId,
    });

    await job.progress(100);

    return { postId: data.postId, externalPostId, status: "published" };
  } catch (error: any) {
    // Mark as failed
    await storage.updatePost(data.postId, {
      status: "failed",
    });
    throw error;
  }
});

// Scheduled Posts Processor (checks daily schedules)
scheduledPostQueue.process(async (job) => {
  const data: ScheduledPostJob = job.data;

  try {
    const site = await storage.getSiteById(data.siteId);
    if (!site || !site.autoPublishEnabled) {
      return { skipped: true, reason: "Auto-publish disabled" };
    }

    // Check if already published based on frequency
    const now = new Date();
    const frequency = site.postFrequency || "daily";
    
    if (site.lastAutoPublishAt) {
      const lastPublish = new Date(site.lastAutoPublishAt);
      
      if (frequency === "daily") {
        // Check if already published today
        if (
          lastPublish.getDate() === now.getDate() &&
          lastPublish.getMonth() === now.getMonth() &&
          lastPublish.getFullYear() === now.getFullYear()
        ) {
          return { skipped: true, reason: "Already published today" };
        }
      } else if (frequency === "weekly") {
        // Check if already published this week
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
        weekStart.setHours(0, 0, 0, 0);
        
        if (lastPublish >= weekStart) {
          return { skipped: true, reason: "Already published this week" };
        }
      } else if (frequency === "monthly") {
        // Check if already published this month
        if (
          lastPublish.getMonth() === now.getMonth() &&
          lastPublish.getFullYear() === now.getFullYear()
        ) {
          return { skipped: true, reason: "Already published this month" };
        }
      }
    }

    // Get a random keyword for this site (prioritize high-scoring keywords)
    const keywords = await storage.getKeywordsByUserId(data.userId);
    let siteKeywords = keywords.filter(k => k.siteId === data.siteId);
    
    // First try to use high-scoring keywords (score > 70)
    const highScoreKeywords = siteKeywords.filter(k => k.overallScore && k.overallScore > 70);
    
    // Use high-score keywords if available, otherwise use all keywords
    if (highScoreKeywords.length > 0) {
      siteKeywords = highScoreKeywords;
    }
    
    if (siteKeywords.length === 0) {
      return { skipped: true, reason: "No keywords available" };
    }

    const randomKeyword = siteKeywords[Math.floor(Math.random() * siteKeywords.length)];

    // Create a new post
    const post = await storage.createPost({
      userId: data.userId,
      siteId: data.siteId,
      keywordId: randomKeyword.id,
      title: `Auto-generated: ${randomKeyword.keyword}`,
      content: "",
      status: "draft",
    });

    // Queue content generation and immediate publishing
    await contentGenerationQueue.add({
      postId: post.id,
      userId: data.userId,
      siteId: data.siteId,
      keywordId: randomKeyword.id,
      wordCount: 1500,
      generateImages: true,
      publishImmediately: true,
    });

    // Update last auto publish time
    await storage.updateSite(data.siteId, {
      lastAutoPublishAt: now,
    });

    return { postId: post.id, keyword: randomKeyword.keyword };
  } catch (error: any) {
    throw error;
  }
});

// Start scheduler (runs every hour to check for due posts)
export function startScheduler() {
  setInterval(async () => {
    try {
      // Get all sites with auto-publish enabled
      const users = await storage.getAllUsers();
      for (const user of users) {
        const sites = await storage.getSitesByUserId(user.id);
        for (const site of sites) {
          if (!site.autoPublishEnabled) continue;

          // Check if it's time to publish based on frequency
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          const scheduledTime = site.dailyPostTime || "09:00";
          const frequency = site.postFrequency || "daily";
          
          let shouldPublish = false;
          
          // Check if current time matches scheduled time (within the hour)
          if (currentTime.split(":")[0] === scheduledTime.split(":")[0]) {
            if (frequency === "daily") {
              shouldPublish = true;
            } else if (frequency === "weekly") {
              // Publish only on Mondays
              shouldPublish = now.getDay() === 1;
            } else if (frequency === "monthly") {
              // Publish only on the 1st of the month
              shouldPublish = now.getDate() === 1;
            }
          }

          if (shouldPublish) {
            await scheduledPostQueue.add({
              siteId: site.id,
              userId: user.id,
            });
          }
        }
      }
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  }, 60 * 60 * 1000); // Run every hour
}

// Error handling
contentGenerationQueue.on("failed", (job, err) => {
  console.error(`Content generation job ${job.id} failed:`, err.message);
});

publishingQueue.on("failed", (job, err) => {
  console.error(`Publishing job ${job.id} failed:`, err.message);
});

scheduledPostQueue.on("failed", (job, err) => {
  console.error(`Scheduled post job ${job.id} failed:`, err.message);
});

console.log("✓ Job queues initialized");
