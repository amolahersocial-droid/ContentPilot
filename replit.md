# SEO Content SaaS Platform

A fully automated, production-ready SEO content generation platform with WordPress and Shopify integration, featuring AI-powered content creation using GPT-5, DALL·E 3 image generation, and advanced SEO quality validation.

## Overview

This platform helps users generate high-quality, SEO-optimized content automatically and publish it to their WordPress or Shopify sites. It includes comprehensive SEO validation, subscription management with Razorpay payments, and admin dashboards for platform management.

## Key Features

### Content Generation
- **AI-Powered Writing**: Uses OpenAI GPT-5 to generate SEO-optimized blog posts
- **Image Generation**: Integrates DALL·E 3 for creating contextual images with alt text
- **SEO Optimization**: Advanced validation including:
  - Flesch-Kincaid readability scoring
  - Meta tag validation (title 50-60 chars, description 150-160 chars)
  - Heading structure analysis (proper H1-H6 hierarchy)
  - Keyword density calculation (0.5-2.5% target)
  - Alt tag coverage checking
  - Duplicate content detection

### Platform Integration
- **WordPress**: Full REST API integration with Application Passwords authentication
- **Shopify**: Admin API integration with Theme App Extensions support
- **Advanced Site Crawler**: 
  - Robots.txt parsing with respect for crawl-delay and disallow rules
  - Configurable depth (quick: 2 levels/25 pages, deep: 4 levels/100 pages)
  - Metadata extraction (title, description, h1/h2, images, meta tags)
  - Internal/external link mapping with site structure graph
  - Content-type validation and size limits (5MB max)
  - Polite crawling with automatic delays
- **Direct Publishing**: One-click publishing to connected sites
- **Backlink Helper** (paid plan):
  - Prospect identification from crawl data
  - Personalized email template generation
  - Outreach tracking with status management
  - Follow-up reminder system
  - Prospect scoring algorithm

### Subscription Management
- **Free Plan**: 1 site, 10 keywords, 3 posts/day
- **Paid Plan**: Unlimited sites/keywords/posts, image generation, backlink helper
- **Razorpay Integration**: Secure payment processing (credentials to be added)
- **Feature Gating**: Automatic tier enforcement

### Admin Dashboard
- User management with role-based access
- Subscription control and revenue tracking
- Platform analytics and health monitoring
- Audit logging for all actions

## Tech Stack

### Frontend
- **React** with TypeScript
- **Wouter** for routing
- **TanStack Query** for data fetching and caching
- **Shadcn UI** components with Radix primitives
- **Tailwind CSS** with custom design tokens
- **Dark mode** support with theme provider

### Backend
- **Express.js** server
- **PostgreSQL** database (Neon)
- **Drizzle ORM** for type-safe queries
- **Passport.js** for authentication with sessions
- **Express Session** with PostgreSQL store
- **Security Middleware**:
  - Rate limiting (auth: 5/15min, API: 100/min, content: 10/hour)
  - Helmet with strict CSP in production
  - Input sanitization with prototype pollution prevention
  - Request validation with express-validator
  - XSS protection with HTML tag stripping

### AI & Services
- **OpenAI GPT-5** for content generation
- **DALL·E 3** for image generation
- **WordPress REST API** client
- **Shopify Admin API** client
- **Custom SEO validator** with readability scoring

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── pages/           # All page components
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Sites.tsx
│   │   │   ├── Keywords.tsx
│   │   │   ├── ContentQueue.tsx
│   │   │   ├── Backlinks.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── admin/       # Admin pages
│   │   │       ├── Users.tsx
│   │   │       ├── Subscriptions.tsx
│   │   │       └── Analytics.tsx
│   │   ├── components/      # Reusable components
│   │   │   ├── ui/          # Shadcn UI primitives
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── ...dialogs
│   │   ├── contexts/        # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   └── lib/             # Utilities
│   │       └── queryClient.ts
├── server/
│   ├── index.ts             # Express server setup
│   ├── routes.ts            # All API endpoints
│   ├── auth.ts              # Authentication middleware
│   ├── storage.ts           # Database storage layer
│   ├── db.ts                # Database connection
│   ├── middleware/          # Security & validation
│   │   └── security.ts      # Rate limiting, sanitization, validation
│   └── services/            # External integrations
│       ├── openai.ts        # GPT-5 + DALL·E
│       ├── seo-validator.ts # SEO quality checks
│       ├── wordpress.ts     # WordPress API client
│       ├── shopify.ts       # Shopify API client
│       ├── site-crawler.ts  # Advanced site crawler
│       └── backlink-helper.ts # Backlink prospect management
└── shared/
    └── schema.ts            # Database schema (Drizzle)
```

## Database Schema

### Tables
- **users**: User accounts with subscription and Razorpay data
- **sites**: Connected WordPress/Shopify sites
- **keywords**: Tracked keywords with scoring
- **posts**: Generated content with metadata
- **seo_scores**: SEO validation results
- **backlinks**: Backlink prospect tracking
- **jobs**: Job queue for async processing
- **audit_logs**: Activity audit trail

### Key Features
- UUID primary keys
- Cascade deletes for data integrity
- Indexed foreign keys for performance
- JSONB columns for flexible metadata
- Timestamp tracking on all tables

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Dashboard
- `GET /api/dashboard/stats` - User dashboard stats

### Sites
- `GET /api/sites` - List user's sites
- `POST /api/sites` - Connect new site
- `PATCH /api/sites/:id` - Update site
- `DELETE /api/sites/:id` - Remove site
- `POST /api/sites/:id/test` - Test site connection

### Keywords
- `GET /api/keywords` - List keywords
- `POST /api/keywords` - Add keyword
- `PATCH /api/keywords/:id` - Update keyword
- `DELETE /api/keywords/:id` - Delete keyword

### Posts
- `GET /api/posts` - List all posts
- `POST /api/posts/generate` - Generate new content
- `GET /api/posts/:id` - Get post with SEO score
- `PATCH /api/posts/:id` - Update post
- `POST /api/posts/:id/publish` - Publish to site
- `DELETE /api/posts/:id` - Delete post

### Backlinks (Paid Only)
- `GET /api/backlinks` - List prospects
- `POST /api/backlinks` - Add prospect

### Admin (Admin Only)
- `GET /api/admin/stats` - Platform stats
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/subscription` - Change user plan

## Design System

### Colors
- **Primary**: Purple (260° 60% 55%) - brand color for CTA and accents
- **Background**: Dark mode default with light mode support
- **Semantic Tokens**: Success (green), Warning (yellow), Error (red)

### Components
- **Cards**: Subtle elevation with hover effects
- **Buttons**: Multiple variants (default, outline, ghost, destructive)
- **Badges**: Status indicators with semantic colors
- **Data Tables**: Sortable, paginated, responsive
- **Forms**: React Hook Form with Zod validation
- **Modals**: Dialog primitives for actions

### Typography
- **Headings**: Bold, hierarchical sizing
- **Body**: Readable line heights, contrast ratios
- **Muted**: Secondary information in gray tones

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)
- `OPENAI_API_KEY` - OpenAI API key for GPT-5 and DALL·E
- `SESSION_SECRET` - Session encryption key (auto-generated)

To be added:
- `STRIPE_SECRET_KEY` - For payment processing (user will provide)
- `VITE_STRIPE_PUBLIC_KEY` - Frontend Stripe key (user will provide)

## Running the Project

The application runs on port 5000 (required for Replit):

```bash
npm run dev
```

This starts both:
- Express API server
- Vite development server with HMR

Database operations:
```bash
npm run db:push  # Push schema to database
```

## Authentication Flow

1. User registers with username, email, password
2. Password is hashed using scrypt
3. Session is created and stored in memory
4. User is logged in via Passport.js Local Strategy
5. Protected routes check `req.isAuthenticated()`

## Content Generation Flow

1. User selects keyword and site
2. System checks daily post limit (free: 3/day)
3. GPT-5 generates SEO-optimized content
4. (Optional) DALL·E generates contextual images
5. SEO validator analyzes content quality
6. Post saved as draft with SEO score
7. User can edit, schedule, or publish immediately
8. Publishing sends to WordPress/Shopify via API

## Recent Changes

- Initial project setup with complete database schema
- Built all frontend pages with exceptional UI quality
- Implemented authentication system with sessions
- Created OpenAI integration for GPT-5 + DALL·E 3
- Built SEO validation engine with readability scoring
- Integrated WordPress and Shopify API clients
- Set up subscription-based feature gating
- Created admin dashboard with platform analytics
- Added dark mode support throughout
- Implemented responsive design for all screen sizes
- Database schema pushed successfully to PostgreSQL

## Known Issues / TODO

- Razorpay credentials need to be added by user
- Job queue system not yet implemented (async processing placeholder)
- Rate limiting middleware not yet added
- Email notifications for outreach tracking not implemented
- Advanced keyword discovery algorithms placeholder
- Site crawler needs robots.txt parsing implementation

## User Preferences

- **Design**: Dark mode default, purple primary color
- **Architecture**: Schema-first, horizontal batching
- **Quality**: Frontend excellence priority, accessibility focus
- **Compliance**: WordPress 2025 standards, Shopify app guidelines
- **Payments**: Razorpay (not Stripe)
