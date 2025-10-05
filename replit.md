# SEO Content SaaS Platform

## Overview

This platform is a fully automated, production-ready SaaS solution for generating and publishing SEO-optimized content to WordPress and Shopify sites. Its core purpose is to streamline content creation, enhance SEO performance, and automate publishing workflows. The platform leverages advanced AI for content and image generation, comprehensive SEO validation, and robust background processing for efficiency. It aims to serve businesses and individuals seeking to scale their content marketing efforts, offering features like subscription management, scheduled posting, and an admin dashboard for platform oversight.

**Latest Update (October 5, 2025)**: Completed "Built for Shopify" compliance with App Bridge 4.x NavMenu, GDPR webhooks with HMAC verification, policy pages, and dual-mode authentication (Replit Auth for standalone, Shopify OAuth for embedded).

## User Preferences

- **Design**: Dark mode default, purple primary color
- **Architecture**: Schema-first, horizontal batching, background jobs, dual-mode (standalone + Shopify embedded)
- **Quality**: Frontend excellence priority, accessibility focus
- **Compliance**: WordPress 2025 standards, Shopify "Built for Shopify" requirements
- **Payments**: Razorpay for standalone mode, Shopify Billing API for embedded mode
- **Processing**: Async job queue for all content generation and publishing

## System Architecture

The platform follows a client-server architecture. The frontend is built with **React, TypeScript, Wouter, TanStack Query, Shadcn UI, and Tailwind CSS**, supporting dark mode and ensuring a high-quality user experience. The backend is an **Express.js** server, utilizing **PostgreSQL (Neon)** with **Drizzle ORM** for type-safe database interactions.

**Core Technical Implementations:**
- **Content Generation**: AI-powered article generation using OpenAI GPT-4o and contextual image creation with DALL·E 3. Includes intelligent internal linking that references other published blog posts to improve SEO and site structure.
- **SEO Optimization**: Integrated validator performs Flesch-Kincaid readability scoring, meta tag validation, heading structure analysis, keyword density calculation, alt tag coverage, and duplicate content detection.
- **Site Integration**: Direct publishing to WordPress (via REST API with Application Passwords) and Shopify (via Admin API with Theme App Extensions).
- **Advanced Site Crawler**: Configurable depth, `robots.txt` parsing, metadata extraction, link mapping, and polite crawling.
- **Background Processing**: **Database-backed job queue** with in-process worker manages asynchronous tasks across three job types: Content Generation, Publishing, and Scheduled Posts, featuring real-time status tracking, error handling with retries, and no external infrastructure dependencies.
- **Internal Linking**: Automatically identifies relevant published posts and includes 2-3 contextual internal links in generated content to improve SEO and user engagement.
- **Security**: Comprehensive measures include rate limiting, Helmet CSP, input sanitization, XSS protection, `express-validator` for request validation, and Drizzle ORM for SQL injection prevention.
- **Subscription Management**: Integrates with Razorpay for secure payment processing and subscription lifecycle management, featuring feature gating based on user plans.
- **Scheduled Publishing**: Hourly scheduler for automated daily post generation and publishing at customizable times, selecting random keywords from a site's configured list.

**Design System:**
- **Colors**: Primary purple, dark mode default with light mode support, semantic tokens for status.
- **Components**: Cards with subtle elevation, varied button styles, badges, sortable/paginated data tables, React Hook Form with Zod validation, and modal dialogues.
- **Typography**: Bold, hierarchical headings; readable body text with good contrast; muted styles for secondary information.

## External Dependencies

- **OpenAI API**: For GPT-4o (content generation) and DALL·E 3 (image generation).
- **WordPress REST API**: For integration and content publishing to WordPress sites.
- **Shopify Admin API**: For integration and content publishing to Shopify sites.
- **Razorpay**: For secure payment gateway services, subscription management, and webhooks.
- **PostgreSQL (Neon)**: Cloud-hosted relational database with job queue persistence.