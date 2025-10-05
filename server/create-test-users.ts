import { db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";
import { sql } from "drizzle-orm";

async function createTestUsers() {
  try {
    console.log("Creating test users...");

    // 1. Admin user with advanced subscription
    const adminPassword = await hashPassword("Admin@123456");
    const [admin] = await db
      .insert(users)
      .values({
        username: "admin",
        email: "admin@seocontent.com",
        password: adminPassword,
        role: "admin",
        subscriptionPlan: "paid",
        useOwnOpenAiKey: false, // Admin uses platform key
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          role: "admin",
          subscriptionPlan: "paid",
          useOwnOpenAiKey: false,
          subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })
      .returning();

    console.log("✅ Admin user created:");
    console.log("   Email: admin@seocontent.com");
    console.log("   Password: Admin@123456");
    console.log("   Plan: Paid (Advanced)");
    console.log("   Uses: Platform OpenAI Key");

    // 2. Advanced subscription user with all features
    const advancedPassword = await hashPassword("Advanced@123456");
    const [advanced] = await db
      .insert(users)
      .values({
        username: "advanced_user",
        email: "advanced@seocontent.com",
        password: advancedPassword,
        role: "user",
        subscriptionPlan: "paid",
        useOwnOpenAiKey: false, // Uses platform key
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          subscriptionPlan: "paid",
          useOwnOpenAiKey: false,
          subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })
      .returning();

    console.log("\n✅ Advanced subscription user created:");
    console.log("   Email: advanced@seocontent.com");
    console.log("   Password: Advanced@123456");
    console.log("   Plan: Paid (Advanced)");
    console.log("   Uses: Platform OpenAI Key");
    console.log("   Features: Unlimited posts, image generation, backlink helper, scheduled posts");

    // 3. Free plan user for comparison
    const freePassword = await hashPassword("Free@123456");
    const [freeUser] = await db
      .insert(users)
      .values({
        username: "free_user",
        email: "free@seocontent.com",
        password: freePassword,
        role: "user",
        subscriptionPlan: "free",
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          subscriptionPlan: "free",
        },
      })
      .returning();

    console.log("\n✅ Free plan user created:");
    console.log("   Email: free@seocontent.com");
    console.log("   Password: Free@123456");
    console.log("   Plan: Free");
    console.log("   Features: 1 site, 10 keywords, 3 posts/day");

    console.log("\n" + "=".repeat(60));
    console.log("✨ TEST CREDENTIALS READY ✨");
    console.log("=".repeat(60));
    console.log("\n🔐 ADMIN LOGIN (Full Access):");
    console.log("   Username: admin");
    console.log("   Email: admin@seocontent.com");
    console.log("   Password: Admin@123456");
    console.log("\n💎 ADVANCED USER (All Premium Features):");
    console.log("   Username: advanced_user");
    console.log("   Email: advanced@seocontent.com");
    console.log("   Password: Advanced@123456");
    console.log("\n🆓 FREE USER (Basic Features):");
    console.log("   Username: free_user");
    console.log("   Email: free@seocontent.com");
    console.log("   Password: Free@123456");
    console.log("\n" + "=".repeat(60));

    process.exit(0);
  } catch (error) {
    console.error("Error creating test users:", error);
    process.exit(1);
  }
}

createTestUsers();
