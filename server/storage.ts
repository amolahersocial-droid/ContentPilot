import {
  users,
  sites,
  keywords,
  posts,
  seoScores,
  backlinks,
  jobs,
  auditLogs,
  type User,
  type InsertUser,
  type UpsertUser,
  type Site,
  type InsertSite,
  type Keyword,
  type InsertKeyword,
  type Post,
  type InsertPost,
  type SeoScore,
  type Backlink,
  type InsertBacklink,
  type Job,
  type AuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  getSitesByUserId(userId: string): Promise<Site[]>;
  getSiteById(id: string): Promise<Site | undefined>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: string, updates: Partial<Site>): Promise<Site>;
  deleteSite(id: string): Promise<void>;
  
  getKeywordsByUserId(userId: string): Promise<Keyword[]>;
  getKeywordById(id: string): Promise<Keyword | undefined>;
  createKeyword(keyword: InsertKeyword): Promise<Keyword>;
  updateKeyword(id: string, updates: Partial<Keyword>): Promise<Keyword>;
  deleteKeyword(id: string): Promise<void>;
  
  getPostsByUserId(userId: string): Promise<Post[]>;
  getPostById(id: string): Promise<Post | undefined>;
  getRecentPosts(userId: string, limit: number): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post>;
  deletePost(id: string): Promise<void>;
  
  getSeoScoreByPostId(postId: string): Promise<SeoScore | undefined>;
  createSeoScore(score: Partial<SeoScore>): Promise<SeoScore>;
  
  getBacklinksByUserId(userId: string): Promise<Backlink[]>;
  getBacklinkById(id: string): Promise<Backlink | undefined>;
  createBacklink(backlink: InsertBacklink): Promise<Backlink>;
  updateBacklink(id: string, updates: Partial<Backlink>): Promise<Backlink>;
  deleteBacklink(id: string): Promise<void>;
  
  createJob(job: Partial<Job>): Promise<Job>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job>;
  getJobById(id: string): Promise<Job | undefined>;
  getPendingJobs(limit?: number): Promise<Job[]>;
  
  createAuditLog(log: Partial<AuditLog>): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getSitesByUserId(userId: string): Promise<Site[]> {
    return db.select().from(sites).where(eq(sites.userId, userId));
  }

  async getSiteById(id: string): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.id, id));
    return site || undefined;
  }

  async createSite(insertSite: InsertSite): Promise<Site> {
    const [site] = await db
      .insert(sites)
      .values(insertSite)
      .returning();
    return site;
  }

  async updateSite(id: string, updates: Partial<Site>): Promise<Site> {
    const [site] = await db
      .update(sites)
      .set(updates)
      .where(eq(sites.id, id))
      .returning();
    return site;
  }

  async deleteSite(id: string): Promise<void> {
    await db.delete(sites).where(eq(sites.id, id));
  }

  async getKeywordsByUserId(userId: string): Promise<Keyword[]> {
    return db.select().from(keywords).where(eq(keywords.userId, userId));
  }

  async getKeywordById(id: string): Promise<Keyword | undefined> {
    const [keyword] = await db.select().from(keywords).where(eq(keywords.id, id));
    return keyword || undefined;
  }

  async createKeyword(insertKeyword: InsertKeyword): Promise<Keyword> {
    const [keyword] = await db
      .insert(keywords)
      .values(insertKeyword)
      .returning();
    return keyword;
  }

  async updateKeyword(id: string, updates: Partial<Keyword>): Promise<Keyword> {
    const [keyword] = await db
      .update(keywords)
      .set(updates)
      .where(eq(keywords.id, id))
      .returning();
    return keyword;
  }

  async deleteKeyword(id: string): Promise<void> {
    await db.delete(keywords).where(eq(keywords.id, id));
  }

  async getPostsByUserId(userId: string): Promise<Post[]> {
    return db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));
  }

  async getPostById(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async getRecentPosts(userId: string, limit: number): Promise<Post[]> {
    return db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values(insertPost)
      .returning();
    return post;
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post> {
    const [post] = await db
      .update(posts)
      .set(updates)
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async deletePost(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  async getSeoScoreByPostId(postId: string): Promise<SeoScore | undefined> {
    const [score] = await db.select().from(seoScores).where(eq(seoScores.postId, postId));
    return score || undefined;
  }

  async createSeoScore(scoreData: Partial<SeoScore>): Promise<SeoScore> {
    const [score] = await db
      .insert(seoScores)
      .values(scoreData as any)
      .returning();
    return score;
  }

  async getBacklinksByUserId(userId: string): Promise<Backlink[]> {
    return db.select().from(backlinks).where(eq(backlinks.userId, userId));
  }

  async getBacklinkById(id: string): Promise<Backlink | undefined> {
    const result = await db.select().from(backlinks).where(eq(backlinks.id, id));
    return result[0];
  }

  async createBacklink(insertBacklink: InsertBacklink): Promise<Backlink> {
    const [backlink] = await db
      .insert(backlinks)
      .values(insertBacklink)
      .returning();
    return backlink;
  }

  async updateBacklink(id: string, updates: Partial<Backlink>): Promise<Backlink> {
    const [backlink] = await db
      .update(backlinks)
      .set(updates)
      .where(eq(backlinks.id, id))
      .returning();
    return backlink;
  }

  async deleteBacklink(id: string): Promise<void> {
    await db.delete(backlinks).where(eq(backlinks.id, id));
  }

  async createJob(jobData: Partial<Job>): Promise<Job> {
    const [job] = await db
      .insert(jobs)
      .values(jobData as any)
      .returning();
    return job;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job> {
    const [job] = await db
      .update(jobs)
      .set(updates)
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  async getJobById(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async getPendingJobs(limit: number = 10): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .where(eq(jobs.status, "pending"))
      .orderBy(jobs.createdAt)
      .limit(limit);
  }

  async createAuditLog(logData: Partial<AuditLog>): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values(logData as any)
      .returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
