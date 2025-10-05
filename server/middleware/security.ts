import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { body, validationResult } from "express-validator";
import type { Request, Response, NextFunction } from "express";

// Rate limiting configurations
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: "Too many authentication attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const contentGenerationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 content generations per hour (free tier gets additional daily limit)
  message: "Content generation limit reached. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limit for paid users
    return req.user?.subscriptionPlan === "paid";
  },
});

// Helmet configuration for secure headers
export const helmetConfig = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.openai.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false, // Disable CSP in dev for Vite HMR
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// Input sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  const sanitize = (obj: any, depth = 0): any => {
    // Prevent prototype pollution
    if (depth > 10) return obj;
    if (obj === null || typeof obj !== "object") {
      if (typeof obj === "string") {
        // Strip all HTML tags and dangerous patterns
        return obj
          .replace(/<[^>]*>/g, "") // Remove all HTML tags
          .replace(/javascript:/gi, "")
          .replace(/on\w+\s*=/gi, "")
          .replace(/data:/gi, "")
          .trim();
      }
      return obj;
    }

    // Prevent prototype pollution attacks
    if (obj.constructor !== Object && obj.constructor !== Array) {
      return obj;
    }

    const sanitized: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      // Skip prototype properties
      if (!obj.hasOwnProperty(key)) continue;
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      
      sanitized[key] = sanitize(obj[key], depth + 1);
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
}

// Validation middleware factory
export const validate = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: "Validation failed",
        errors: errors.array() 
      });
    }

    next();
  };
};

// Common validation rules
export const registerValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3-30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and number"),
];

export const loginValidation = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const siteValidation = [
  body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Site name required"),
  body("url").trim().isURL().withMessage("Valid URL required"),
  body("type").isIn(["wordpress", "shopify"]).withMessage("Invalid site type"),
];

export const keywordValidation = [
  body("keyword")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Keyword required (max 200 chars)"),
];

export const backlinkValidation = [
  body("prospectUrl").trim().isURL().withMessage("Valid prospect URL required"),
  body("prospectName").optional().trim().isLength({ max: 200 }),
  body("prospectEmail").optional().trim().isEmail().withMessage("Valid email required"),
  body("status")
    .optional()
    .isIn(["prospect", "contacted", "responded", "confirmed", "rejected"])
    .withMessage("Invalid status"),
  body("notes").optional().trim().isLength({ max: 2000 }),
];
