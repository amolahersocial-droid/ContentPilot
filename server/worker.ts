import { storage } from "./storage";
import { generateSEOContent, generateMultipleImages } from "./services/openai";
import { validateSEO } from "./services/seo-validator";
import { WordPressService } from "./services/wordpress";
import { ShopifyService } from "./services/shopify";
import { getInternalLinkCandidates, buildInternalLinksPrompt, augmentContentWithInternalLinks } from "./services/internal-linking";

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

let isProcessing = false;
let workerInterval: NodeJS.Timeout | null = null;

export function startWorker() {
  if (workerInterval) {
    console.log("⚠️ Worker already running");
    return;
  }

  console.log("🔄 Starting background job worker...");
  
  workerInterval = setInterval(async () => {
    if (isProcessing) return;
    
    try {
      isProcessing = true;
      await processJobs();
    } catch (error) {
      console.error("Worker error:", error);
    } finally {
      isProcessing = false;
    }
  }, 3000);

  console.log("✅ Background job worker started");
}

export function stopWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("🛑 Background job worker stopped");
  }
}

async function processJobs() {
  const jobs = await storage.getPendingJobs(5);
  
  for (const job of jobs) {
    try {
      await storage.updateJob(job.id, {
        status: "processing",
        startedAt: new Date(),
      });

      let result;
      switch (job.type) {
        case "content-generation":
          result = await processContentGeneration(job.payload as ContentGenerationJob);
          break;
        case "publishing":
          result = await processPublishing(job.payload as PublishingJob);
          break;
        case "scheduled-post":
          result = await processScheduledPost(job.payload as ScheduledPostJob);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      await storage.updateJob(job.id, {
        status: "completed",
        result,
        completedAt: new Date(),
      });

      console.log(`✅ Job ${job.id} (${job.type}) completed`);
    } catch (error: any) {
      console.error(`❌ Job ${job.id} (${job.type}) failed:`, error.message);
      
      await storage.updateJob(job.id, {
        status: "failed",
        error: error.message,
        completedAt: new Date(),
      });
    }
  }
}

async function processContentGeneration(data: ContentGenerationJob): Promise<any> {
  const user = await storage.getUser(data.userId);
  if (!user) throw new Error("User not found");

  let keyword = null;
  if (data.keywordId) {
    keyword = await storage.getKeywordById(data.keywordId);
  }

  const internalLinks = await getInternalLinkCandidates(
    data.userId,
    data.siteId,
    data.postId
  );

  const internalLinkPrompt = buildInternalLinksPrompt(internalLinks);

  const content = await generateSEOContent(
    keyword?.keyword || "general topic",
    data.wordCount,
    user.openaiApiKey,
    user.useOwnOpenAiKey || false,
    internalLinkPrompt
  );

  let images: Array<{ url: string; altText: string }> = [];
  if (data.generateImages && (user.subscriptionPlan === "paid" || user.useOwnOpenAiKey)) {
    const imagePrompts = [`Featured image for ${keyword?.keyword || "article"}`];
    images = await generateMultipleImages(
      imagePrompts,
      user.openaiApiKey,
      user.useOwnOpenAiKey || false
    );
  }

  const seoResults = validateSEO(
    content.title,
    content.metaTitle,
    content.metaDescription,
    content.content,
    content.headings,
    images,
    keyword?.keyword || ""
  );

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

  if (data.publishImmediately) {
    await storage.createJob({
      userId: data.userId,
      type: "publishing",
      payload: {
        postId: data.postId,
        userId: data.userId,
        siteId: data.siteId,
      },
      status: "pending",
    });
  }

  return { postId: data.postId, status: "completed" };
}

async function processPublishing(data: PublishingJob): Promise<any> {
  const post = await storage.getPostById(data.postId);
  if (!post) throw new Error("Post not found");

  const site = await storage.getSiteById(data.siteId);
  if (!site) throw new Error("Site not found");

  let externalPostId = "";
  const creds = site.credentials as any;

  if (site.type === "wordpress") {
    const wp = new WordPressService(site.url, {
      username: creds.username,
      appPassword: creds.appPassword,
    });

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

    const publishedPost = await shopify.createArticle({
      title: post.title,
      body_html: post.content,
      published: true,
    });

    externalPostId = publishedPost.id.toString();
  }

  await storage.updatePost(data.postId, {
    status: "published",
    publishedAt: new Date(),
    externalPostId,
  });

  return { postId: data.postId, externalPostId, status: "published" };
}

async function processScheduledPost(data: ScheduledPostJob): Promise<any> {
  const site = await storage.getSiteById(data.siteId);
  if (!site || !site.autoPublishEnabled) {
    return { skipped: true, reason: "Auto-publish disabled" };
  }

  const now = new Date();
  const frequency = site.postFrequency || "daily";

  if (site.lastAutoPublishAt) {
    const lastPublish = new Date(site.lastAutoPublishAt);

    if (frequency === "daily") {
      if (
        lastPublish.getDate() === now.getDate() &&
        lastPublish.getMonth() === now.getMonth() &&
        lastPublish.getFullYear() === now.getFullYear()
      ) {
        return { skipped: true, reason: "Already published today" };
      }
    } else if (frequency === "weekly") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);

      if (lastPublish >= weekStart) {
        return { skipped: true, reason: "Already published this week" };
      }
    } else if (frequency === "monthly") {
      if (
        lastPublish.getMonth() === now.getMonth() &&
        lastPublish.getFullYear() === now.getFullYear()
      ) {
        return { skipped: true, reason: "Already published this month" };
      }
    }
  }

  const keywords = await storage.getKeywordsByUserId(data.userId);
  let siteKeywords = keywords.filter((k) => k.siteId === data.siteId);

  const highScoreKeywords = siteKeywords.filter(
    (k) => k.overallScore && k.overallScore > 70
  );

  if (highScoreKeywords.length > 0) {
    siteKeywords = highScoreKeywords;
  }

  if (siteKeywords.length === 0) {
    return { skipped: true, reason: "No keywords available" };
  }

  const randomKeyword =
    siteKeywords[Math.floor(Math.random() * siteKeywords.length)];

  const post = await storage.createPost({
    userId: data.userId,
    siteId: data.siteId,
    keywordId: randomKeyword.id,
    title: `Auto-generated: ${randomKeyword.keyword}`,
    content: "",
    status: "draft",
  });

  await storage.createJob({
    userId: data.userId,
    type: "content-generation",
    payload: {
      postId: post.id,
      userId: data.userId,
      siteId: data.siteId,
      keywordId: randomKeyword.id,
      wordCount: 1500,
      generateImages: true,
      publishImmediately: true,
    },
    status: "pending",
  });

  await storage.updateSite(data.siteId, {
    lastAutoPublishAt: now,
  });

  return { postId: post.id, keyword: randomKeyword.keyword };
}

export async function startScheduler() {
  setInterval(async () => {
    try {
      const users = await storage.getAllUsers();
      for (const user of users) {
        const sites = await storage.getSitesByUserId(user.id);
        for (const site of sites) {
          if (!site.autoPublishEnabled) continue;

          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          const scheduledTime = site.dailyPostTime || "09:00";
          const frequency = site.postFrequency || "daily";

          let shouldPublish = false;

          if (currentTime.split(":")[0] === scheduledTime.split(":")[0]) {
            if (frequency === "daily") {
              shouldPublish = true;
            } else if (frequency === "weekly") {
              shouldPublish = now.getDay() === 1;
            } else if (frequency === "monthly") {
              shouldPublish = now.getDate() === 1;
            }
          }

          if (shouldPublish) {
            await storage.createJob({
              userId: user.id,
              type: "scheduled-post",
              payload: {
                siteId: site.id,
                userId: user.id,
              },
              status: "pending",
            });
          }
        }
      }
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  }, 60 * 60 * 1000);
}
