import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "paid",
]);
export const siteTypeEnum = pgEnum("site_type", ["wordpress", "shopify"]);
export const postFrequencyEnum = pgEnum("post_frequency", ["daily", "weekly", "monthly"]);
export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "scheduled",
  "published",
  "failed",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);
export const backlinkStatusEnum = pgEnum("backlink_status", [
  "prospect",
  "contacted",
  "responded",
  "confirmed",
  "rejected",
]);
export const emailToneEnum = pgEnum("email_tone", [
  "formal",
  "casual",
  "persuasive",
  "friendly",
  "professional",
]);
export const smtpProviderEnum = pgEnum("smtp_provider", [
  "gmail",
  "outlook",
  "custom",
]);
export const outreachCampaignStatusEnum = pgEnum("outreach_campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
]);
export const outreachEmailStatusEnum = pgEnum("outreach_email_status", [
  "pending",
  "sent",
  "opened",
  "clicked",
  "responded",
  "bounced",
  "failed",
]);

// Sessions table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table with subscription and Razorpay integration
export const users = pgTable("users", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  profileImageUrl: varchar("profile_image_url", { length: 512 }),
  role: userRoleEnum("role").notNull().default("user"),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan")
    .notNull()
    .default("free"),
  razorpayCustomerId: text("razorpay_customer_id"),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  openaiApiKey: text("openai_api_key"),
  useOwnOpenAiKey: boolean("use_own_openai_key").notNull().default(false),
  dailyPostsUsed: integer("daily_posts_used").notNull().default(0),
  lastPostResetDate: timestamp("last_post_reset_date").default(
    sql`CURRENT_TIMESTAMP`
  ),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Connected sites (WordPress/Shopify)
export const sites = pgTable(
  "sites",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    type: siteTypeEnum("type").notNull(),
    credentials: jsonb("credentials").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastCrawledAt: timestamp("last_crawled_at"),
    crawlData: jsonb("crawl_data"),
    autoPublishEnabled: boolean("auto_publish_enabled").notNull().default(false),
    postFrequency: postFrequencyEnum("post_frequency").default("daily"),
    dailyPostTime: text("daily_post_time").default("09:00"),
    lastAutoPublishAt: timestamp("last_auto_publish_at"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("sites_user_id_idx").on(table.userId),
  })
);

// Keywords with scoring
export const keywords = pgTable(
  "keywords",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    siteId: varchar("site_id", { length: 36 }).references(() => sites.id, {
      onDelete: "set null",
    }),
    keyword: text("keyword").notNull(),
    searchVolume: integer("search_volume"),
    difficulty: integer("difficulty"),
    relevanceScore: integer("relevance_score"),
    competitorGap: integer("competitor_gap"),
    overallScore: integer("overall_score"),
    isPinned: boolean("is_pinned").notNull().default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("keywords_user_id_idx").on(table.userId),
    siteIdIdx: index("keywords_site_id_idx").on(table.siteId),
  })
);

// Generated posts
export const posts = pgTable(
  "posts",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    siteId: varchar("site_id", { length: 36 })
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    keywordId: varchar("keyword_id", { length: 36 }).references(
      () => keywords.id,
      { onDelete: "set null" }
    ),
    title: text("title").notNull(),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    content: text("content").notNull(),
    headings: jsonb("headings"),
    images: jsonb("images"),
    internalLinks: jsonb("internal_links"),
    status: postStatusEnum("status").notNull().default("draft"),
    scheduledFor: timestamp("scheduled_for"),
    publishedAt: timestamp("published_at"),
    externalPostId: text("external_post_id"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("posts_user_id_idx").on(table.userId),
    siteIdIdx: index("posts_site_id_idx").on(table.siteId),
    statusIdx: index("posts_status_idx").on(table.status),
  })
);

// SEO scores for posts
export const seoScores = pgTable(
  "seo_scores",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    postId: varchar("post_id", { length: 36 })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    readabilityScore: integer("readability_score"),
    readabilityGrade: text("readability_grade"),
    metaTitleLength: integer("meta_title_length"),
    metaDescriptionLength: integer("meta_description_length"),
    headingStructureValid: boolean("heading_structure_valid"),
    keywordDensity: decimal("keyword_density", { precision: 5, scale: 2 }),
    altTagsCoverage: integer("alt_tags_coverage"),
    duplicateContentScore: integer("duplicate_content_score"),
    mobileResponsive: boolean("mobile_responsive"),
    lighthouseScore: integer("lighthouse_score"),
    overallSeoScore: integer("overall_seo_score"),
    validationErrors: jsonb("validation_errors"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    postIdIdx: index("seo_scores_post_id_idx").on(table.postId),
  })
);

// Backlink prospects
export const backlinks = pgTable(
  "backlinks",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    siteId: varchar("site_id", { length: 36 }).references(() => sites.id, {
      onDelete: "set null",
    }),
    prospectUrl: text("prospect_url").notNull(),
    prospectName: text("prospect_name"),
    prospectEmail: text("prospect_email"),
    status: backlinkStatusEnum("status").notNull().default("prospect"),
    outreachTemplate: text("outreach_template"),
    contactedAt: timestamp("contacted_at"),
    respondedAt: timestamp("responded_at"),
    confirmedAt: timestamp("confirmed_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("backlinks_user_id_idx").on(table.userId),
    statusIdx: index("backlinks_status_idx").on(table.status),
  })
);

// Job queue tracking
export const jobs = pgTable(
  "jobs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    status: jobStatusEnum("status").notNull().default("pending"),
    payload: jsonb("payload"),
    result: jsonb("result"),
    error: text("error"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    statusIdx: index("jobs_status_idx").on(table.status),
    typeIdx: index("jobs_type_idx").on(table.type),
  })
);

// Audit logs
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
  })
);

// SMTP Credentials for automated email outreach
export const smtpCredentials = pgTable(
  "smtp_credentials",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: smtpProviderEnum("provider").notNull(),
    email: text("email").notNull(),
    encryptedPassword: text("encrypted_password"),
    oauthAccessToken: text("oauth_access_token"),
    oauthRefreshToken: text("oauth_refresh_token"),
    oauthTokenExpiresAt: timestamp("oauth_token_expires_at"),
    smtpHost: text("smtp_host"),
    smtpPort: integer("smtp_port"),
    isActive: boolean("is_active").notNull().default(true),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("smtp_credentials_user_id_idx").on(table.userId),
  })
);

// Outreach Campaigns
export const outreachCampaigns = pgTable(
  "outreach_campaigns",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    niche: text("niche").notNull(),
    tone: emailToneEnum("tone").notNull().default("professional"),
    status: outreachCampaignStatusEnum("status").notNull().default("active"),
    targetWebsiteCount: integer("target_website_count").notNull().default(50),
    emailsSent: integer("emails_sent").notNull().default(0),
    emailsOpened: integer("emails_opened").notNull().default(0),
    emailsClicked: integer("emails_clicked").notNull().default(0),
    responses: integer("responses").notNull().default(0),
    followUpEnabled: boolean("follow_up_enabled").notNull().default(true),
    followUpDelayDays: integer("follow_up_delay_days").notNull().default(3),
    maxFollowUps: integer("max_follow_ups").notNull().default(2),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("outreach_campaigns_user_id_idx").on(table.userId),
    statusIdx: index("outreach_campaigns_status_idx").on(table.status),
  })
);

// Discovered outreach contacts
export const outreachContacts = pgTable(
  "outreach_contacts",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    campaignId: varchar("campaign_id", { length: 36 })
      .notNull()
      .references(() => outreachCampaigns.id, { onDelete: "cascade" }),
    websiteUrl: text("website_url").notNull(),
    websiteName: text("website_name"),
    contactEmail: text("contact_email").notNull(),
    contactName: text("contact_name"),
    domainAuthority: integer("domain_authority"),
    isValidated: boolean("is_validated").notNull().default(false),
    discoveryMetadata: jsonb("discovery_metadata"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    campaignIdIdx: index("outreach_contacts_campaign_id_idx").on(table.campaignId),
    emailIdx: index("outreach_contacts_email_idx").on(table.contactEmail),
  })
);

// Outreach emails sent
export const outreachEmails = pgTable(
  "outreach_emails",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    campaignId: varchar("campaign_id", { length: 36 })
      .notNull()
      .references(() => outreachCampaigns.id, { onDelete: "cascade" }),
    contactId: varchar("contact_id", { length: 36 })
      .notNull()
      .references(() => outreachContacts.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: outreachEmailStatusEnum("status").notNull().default("pending"),
    isFollowUp: boolean("is_follow_up").notNull().default(false),
    followUpNumber: integer("follow_up_number").notNull().default(0),
    personalizationData: jsonb("personalization_data"),
    sentAt: timestamp("sent_at"),
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
    respondedAt: timestamp("responded_at"),
    trackingId: text("tracking_id"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    campaignIdIdx: index("outreach_emails_campaign_id_idx").on(table.campaignId),
    contactIdIdx: index("outreach_emails_contact_id_idx").on(table.contactId),
    statusIdx: index("outreach_emails_status_idx").on(table.status),
  })
);

// Outreach events for analytics
export const outreachEvents = pgTable(
  "outreach_events",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    emailId: varchar("email_id", { length: 36 })
      .notNull()
      .references(() => outreachEmails.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    eventData: jsonb("event_data"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    emailIdIdx: index("outreach_events_email_id_idx").on(table.emailId),
    eventTypeIdx: index("outreach_events_event_type_idx").on(table.eventType),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sites: many(sites),
  keywords: many(keywords),
  posts: many(posts),
  backlinks: many(backlinks),
  jobs: many(jobs),
  auditLogs: many(auditLogs),
  smtpCredentials: many(smtpCredentials),
  outreachCampaigns: many(outreachCampaigns),
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
  user: one(users, {
    fields: [sites.userId],
    references: [users.id],
  }),
  keywords: many(keywords),
  posts: many(posts),
  backlinks: many(backlinks),
}));

export const keywordsRelations = relations(keywords, ({ one, many }) => ({
  user: one(users, {
    fields: [keywords.userId],
    references: [users.id],
  }),
  site: one(sites, {
    fields: [keywords.siteId],
    references: [sites.id],
  }),
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  site: one(sites, {
    fields: [posts.siteId],
    references: [sites.id],
  }),
  keyword: one(keywords, {
    fields: [posts.keywordId],
    references: [keywords.id],
  }),
  seoScore: one(seoScores),
}));

export const seoScoresRelations = relations(seoScores, ({ one }) => ({
  post: one(posts, {
    fields: [seoScores.postId],
    references: [posts.id],
  }),
}));

export const backlinksRelations = relations(backlinks, ({ one }) => ({
  user: one(users, {
    fields: [backlinks.userId],
    references: [users.id],
  }),
  site: one(sites, {
    fields: [backlinks.siteId],
    references: [sites.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const smtpCredentialsRelations = relations(smtpCredentials, ({ one }) => ({
  user: one(users, {
    fields: [smtpCredentials.userId],
    references: [users.id],
  }),
}));

export const outreachCampaignsRelations = relations(outreachCampaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [outreachCampaigns.userId],
    references: [users.id],
  }),
  contacts: many(outreachContacts),
  emails: many(outreachEmails),
}));

export const outreachContactsRelations = relations(outreachContacts, ({ one, many }) => ({
  campaign: one(outreachCampaigns, {
    fields: [outreachContacts.campaignId],
    references: [outreachCampaigns.id],
  }),
  emails: many(outreachEmails),
}));

export const outreachEmailsRelations = relations(outreachEmails, ({ one, many }) => ({
  campaign: one(outreachCampaigns, {
    fields: [outreachEmails.campaignId],
    references: [outreachCampaigns.id],
  }),
  contact: one(outreachContacts, {
    fields: [outreachEmails.contactId],
    references: [outreachContacts.id],
  }),
  events: many(outreachEvents),
}));

export const outreachEventsRelations = relations(outreachEvents, ({ one }) => ({
  email: one(outreachEmails, {
    fields: [outreachEvents.emailId],
    references: [outreachEmails.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  dailyPostsUsed: true,
  lastPostResetDate: true,
});

export const insertSiteSchema = createInsertSchema(sites, {
  name: z.string().min(1).max(255),
  url: z.string().url(),
  credentials: z.object({}).passthrough(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCrawledAt: true,
  crawlData: true,
});

export const insertKeywordSchema = createInsertSchema(keywords, {
  keyword: z.string().min(1).max(255),
  searchVolume: z.number().int().min(0).optional(),
  difficulty: z.number().int().min(0).max(100).optional(),
  relevanceScore: z.number().int().min(0).max(100).optional(),
  competitorGap: z.number().int().min(0).max(100).optional(),
  overallScore: z.number().int().min(0).max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts, {
  title: z.string().min(1).max(500),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  content: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  externalPostId: true,
});

export const insertBacklinkSchema = createInsertSchema(backlinks, {
  prospectUrl: z.string().url(),
  prospectName: z.string().optional(),
  prospectEmail: z.string().email().optional(),
  outreachTemplate: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  contactedAt: true,
  respondedAt: true,
  confirmedAt: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Site = typeof sites.$inferSelect;

export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type Keyword = typeof keywords.$inferSelect;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export type SeoScore = typeof seoScores.$inferSelect;

export type InsertBacklink = z.infer<typeof insertBacklinkSchema>;
export type Backlink = typeof backlinks.$inferSelect;

export type Job = typeof jobs.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

// Outreach system schemas
export const insertSmtpCredentialSchema = createInsertSchema(smtpCredentials, {
  email: z.string().email(),
  provider: z.enum(["gmail", "outlook", "custom"]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
});

export const insertOutreachCampaignSchema = createInsertSchema(outreachCampaigns, {
  name: z.string().min(1).max(255),
  niche: z.string().min(1),
  tone: z.enum(["formal", "casual", "persuasive", "friendly", "professional"]),
  targetWebsiteCount: z.number().int().min(1).max(500),
  followUpDelayDays: z.number().int().min(1).max(14),
  maxFollowUps: z.number().int().min(0).max(5),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  emailsSent: true,
  emailsOpened: true,
  emailsClicked: true,
  responses: true,
});

export const insertOutreachContactSchema = createInsertSchema(outreachContacts, {
  websiteUrl: z.string().url(),
  contactEmail: z.string().email(),
  domainAuthority: z.number().int().min(0).max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertOutreachEmailSchema = createInsertSchema(outreachEmails, {
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  openedAt: true,
  clickedAt: true,
  respondedAt: true,
});

// Outreach types
export type InsertSmtpCredential = z.infer<typeof insertSmtpCredentialSchema>;
export type SmtpCredential = typeof smtpCredentials.$inferSelect;

export type InsertOutreachCampaign = z.infer<typeof insertOutreachCampaignSchema>;
export type OutreachCampaign = typeof outreachCampaigns.$inferSelect;

export type InsertOutreachContact = z.infer<typeof insertOutreachContactSchema>;
export type OutreachContact = typeof outreachContacts.$inferSelect;

export type InsertOutreachEmail = z.infer<typeof insertOutreachEmailSchema>;
export type OutreachEmail = typeof outreachEmails.$inferSelect;

export type OutreachEvent = typeof outreachEvents.$inferSelect;
