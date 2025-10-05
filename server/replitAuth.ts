import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure in production (HTTPS)
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user: any = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const domains = process.env.REPLIT_DOMAINS!.split(",");
  
  // Also support localhost with common ports for development
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || '5000';
    domains.push(
      `localhost:${port}`,
      `127.0.0.1:${port}`,
      `0.0.0.0:${port}`,
      'localhost',
      '127.0.0.1',
      '0.0.0.0'
    );
  }
  
  for (const domain of domains) {
    // Use http:// for localhost domains in development, https:// for production
    const isLocalhost = domain.includes('localhost') || domain.includes('127.0.0.1') || domain.includes('0.0.0.0');
    const protocol = isLocalhost && process.env.NODE_ENV === 'development' ? 'http' : 'https';
    
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `${protocol}://${domain}/api/callback`,
      },
      verify
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Use req.get('host') which includes port (e.g., localhost:5000)
    const host = req.get('host') || req.hostname;
    const strategyName = `replitauth:${host}`;
    
    // Check if strategy exists, fallback to hostname-only strategy
    const strategy = passport._strategy(strategyName) || passport._strategy(`replitauth:${req.hostname}`);
    
    if (!strategy) {
      return res.status(500).json({ message: "Authentication not configured" });
    }
    
    passport.authenticate(strategy.name, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Use req.get('host') which includes port (e.g., localhost:5000)
    const host = req.get('host') || req.hostname;
    const strategyName = `replitauth:${host}`;
    
    // Check if strategy exists, fallback to hostname-only strategy
    const strategy = passport._strategy(strategyName) || passport._strategy(`replitauth:${req.hostname}`);
    
    if (!strategy) {
      return res.status(500).json({ message: "Authentication not configured" });
    }
    
    passport.authenticate(strategy.name, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Get user from database and attach to req
export const loadUser: RequestHandler = async (req: any, res, next) => {
  try {
    const sessionUser = req.user as any;
    if (!sessionUser || !sessionUser.claims) {
      return next();
    }
    
    const userId = sessionUser.claims.sub;
    const dbUser = await storage.getUser(userId);
    
    if (dbUser) {
      req.user = { ...sessionUser, ...dbUser };
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin: RequestHandler = async (req: any, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const sessionUser = req.user as any;
  const userId = sessionUser.claims?.sub;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const dbUser = await storage.getUser(userId);
  
  if (!dbUser || dbUser.role !== "admin") {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }
  
  req.user = { ...sessionUser, ...dbUser };
  next();
};

export const requirePaidPlan: RequestHandler = async (req: any, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const sessionUser = req.user as any;
  const userId = sessionUser.claims?.sub;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const dbUser = await storage.getUser(userId);
  
  if (!dbUser || dbUser.subscriptionPlan !== "paid") {
    return res.status(403).json({ message: "Upgrade to paid plan required" });
  }
  
  req.user = { ...sessionUser, ...dbUser };
  next();
};
